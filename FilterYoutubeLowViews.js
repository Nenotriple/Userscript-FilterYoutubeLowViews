// ==UserScript==
// @name         Filter YouTube Videos by View Count
// @namespace    http://tampermonkey.net/
// @version      3.6
// @description  Hides videos with fewer than 1000 views from the YouTube recommendations and subscriptions feed.
// @author       NiceL + Nenotriple
// @match        *://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// ==/UserScript==

// ---------------------------------------------------------------------------

// Configurable threshold for filtering videos by view count
const VIEW_THRESHOLD = 1000;  // Minimum number of views required for a video to be displayed

// Flags to control filtering of videos and YouTube Shorts
let g_VideosFiltering = true;   // Set to true to filter regular videos
let g_ShortsFiltering = true;   // Set to true to filter YouTube Shorts

// ---------------------------------------------------------------------------

// Utility Functions

/**
 * Checks if the current page is the subscriptions feed.
 * @returns {boolean} True if the current page is the subscriptions feed, false otherwise.
 */
function IsSubscriptions() {
    return location.pathname.startsWith("/feed/subscriptions");
}

/**
 * Checks if the current page is a YouTube channel.
 * @returns {boolean} True if the current page is a YouTube channel, false otherwise.
 */
function IsChannel() {
    return location.pathname.startsWith("/@");
}

/**
 * Checks if the current page is YouTube Shorts.
 * @returns {boolean} True if the current page is YouTube Shorts, false otherwise.
 */
function IsShorts() {
    return location.pathname.startsWith("/shorts");
}

/**
 * Checks if a given character is a number.
 * @param {string} i - The character to check.
 * @returns {boolean} True if the character is a number, false otherwise.
 */
function IsNumber(i) {
    return i >= '0' && i <= '9';
}

/**
 * Checks if a given character is a space.
 * @param {string} i - The character to check.
 * @returns {boolean} True if the character is a space, false otherwise.
 */
function IsSpace(i) {
    return i == ' ';
}

/**
 * Checks if a given character is a separator (comma or period).
 * @param {string} i - The character to check.
 * @returns {boolean} True if the character is a comma or period, false otherwise.
 */
function IsSeparator(i) {
    return i == '.' || i == ',';
}

// ---------------------------------------------------------------------------

// Filtering Logic

/**
 * Determines if a regular YouTube video has low views based on its view count text.
 * @param {HTMLElement} videoViews - The HTML element containing the view count.
 * @returns {boolean} True if the video has fewer views than the threshold or invalid data, false otherwise.
 */
function HasLowViews(videoViews) {
    if (!videoViews || !videoViews.innerText) {
        return false;  // If no view data is found, treat it as a valid video
    }

    let text = videoViews.innerText;
    let numbersExists = false;
    let twoWordsExists = false;

    // Check if there are any numbers (indicating view count)
    for (let i = 0; i < text.length; i++) {
        if (IsNumber(text[i])) {
            numbersExists = true;
            break;
        }
    }

    // Check if the text contains at least two parts separated by a space or a separator (i.e., a number with a unit like '1.2M views')
    for (let i = 0; i < text.length - 2; i++) {
        if ((!IsNumber(text[i]) && IsSpace(text[i + 1]) && !IsNumber(text[i + 2])) ||
            (IsNumber(text[i]) && IsSeparator(text[i + 1]) && IsNumber(text[i + 2]))) {
            twoWordsExists = true;
            break;
        }
    }

    return !(numbersExists && twoWordsExists);  // If both conditions aren't met, consider the video to have low views
}

/**
 * Determines if a YouTube Short video has low views based on its view count.
 * @param {HTMLElement} videoViews - The HTML element containing the view count for Shorts.
 * @returns {boolean} True if the Short has fewer views than the threshold, false otherwise.
 */
function HasLowViewsShorts(videoViews) {
    if (!videoViews || !videoViews.innerText) {
        return false;  // No view count available, consider it as a valid Short
    }

    // Check if the view count is available (Shorts use a non-breaking space character)
    return !videoViews.innerText.includes('\xa0');
}

// ---------------------------------------------------------------------------

// Main Filtering Function

/**
 * Filters out videos from YouTube based on their view count, applied to both the main page and the recommendations panel.
 */
function UpdateVideoFiltering() {
    let videosList;

    // Skip filtering on channels or subscriptions pages
    if (IsChannel() || IsSubscriptions()) return;

    // Filter Shorts if the flag is enabled
    if (IsShorts() && g_ShortsFiltering) {
        videosList = document.getElementsByClassName("reel-video-in-sequence style-scope ytd-shorts");
        for (let i = 0; i < videosList.length; i++) {
            if (!videosList[i].isActive) continue;

            let videoViews = videosList[i].getElementsByClassName("yt-spec-button-shape-with-label__label")[0];
            if (HasLowViewsShorts(videoViews)) {
                document.getElementsByClassName("navigation-button style-scope ytd-shorts")[1]
                    .getElementsByClassName("yt-spec-touch-feedback-shape__fill")[0]
                    .click();  // Skip the Short with low views
            }
        }
    }
    // Filter regular videos if the flag is enabled
    else if (g_VideosFiltering) {
        // Remove low-view videos from the recommendations panel
        videosList = document.getElementsByClassName("style-scope ytd-compact-video-renderer");
        let badVideos = [];
        for (let i = 0; i < videosList.length; i++) {
            let videoViews = videosList[i].getElementsByClassName("inline-metadata-item style-scope ytd-video-meta-block")[0];
            if (HasLowViews(videoViews)) {
                badVideos.push(videosList[i]);
            }
        }
        badVideos.forEach(video => video.parentElement.remove());  // Remove each low-view video

        // Remove low-view videos from the main page feed
        videosList = document.getElementsByClassName("style-scope ytd-rich-item-renderer");
        badVideos = [];
        for (let i = 0; i < videosList.length; i++) {
            if (videosList[i].id != "content") continue;

            let videoViews = videosList[i].getElementsByClassName("inline-metadata-item style-scope ytd-video-meta-block")[0];
            if (HasLowViews(videoViews)) {
                badVideos.push(videosList[i]);
            }
        }
        badVideos.forEach(video => video.parentElement.remove());
    }
}

// ---------------------------------------------------------------------------

// Dynamic Content Observation

/**
 * Observes changes to the DOM and updates the filtering dynamically when new content is added.
 */
function observeDOMChanges() {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                debounceUpdate();  // Trigger filtering after a delay
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// ---------------------------------------------------------------------------

// Debouncing to Optimize Updates

let debounceTimeout;

/**
 * Debounces the update calls to avoid redundant filtering when multiple DOM changes occur in quick succession.
 */
function debounceUpdate() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(UpdateVideoFiltering, 200);  // Delay of 200ms
}

// ---------------------------------------------------------------------------

// Event Listeners

// Trigger the initial filtering when the page loads
window.addEventListener("load", function() {
    UpdateVideoFiltering();  // Apply filtering on page load
    observeDOMChanges();     // Start observing for dynamic content changes
});

// Trigger the filtering on various user actions like navigation and interaction
document.addEventListener("yt-navigate-finish", debounceUpdate);
window.addEventListener("message", debounceUpdate);
window.addEventListener("scroll", debounceUpdate);
window.addEventListener("click", debounceUpdate);

// ---------------------------------------------------------------------------
