// ==UserScript==
// @name         Filter YouTube Videos by View Count
// @namespace    http://tampermonkey.net/
// @version      3.6
// @description  Filters out videos/shorts with less than 1000 views from the recommendations and subscriptions feed on YouTube.
// @author       NiceL
// @match        *://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// ==/UserScript==

// ---------------------------------------------------------------------------

// Configurable threshold for video filtering
const VIEW_THRESHOLD = 1000;

// Flags for enabling/disabling filters
let g_VideosFiltering = true;
let g_ShortsFiltering = true;

// Utility functions for checking page type
function IsSubscriptions() { return location.pathname.startsWith("/feed/subscriptions"); }
function IsChannel() { return location.pathname.startsWith("/@"); }
function IsShorts() { return location.pathname.startsWith("/shorts"); }

// Utility functions for checking characters
function IsNumber(i) { return i >= '0' && i <= '9'; }
function IsSpace(i) { return i == ' '; }
function IsSeparator(i) { return i == '.' || i == ','; }

// Function to check if a video has low views
function HasLowViews(videoViews) {
    if (!videoViews || !videoViews.innerText) {
        return false;
    }

    let text = videoViews.innerText;
    let numbersExists = false;
    let twoWordsExists = false;

    for (let i = 0; i < text.length; i++) {
        // Verify that there's more than zero views by looking for a number
        if (IsNumber(text[i])) {
            numbersExists = true;
            break;
        }
    }

    for (let i = 0; i < text.length - 2; i++) {
        // not number + space + not number OR number + separator + number
        if ((!IsNumber(text[i]) && IsSpace(text[i + 1]) && !IsNumber(text[i + 2])) ||
            (IsNumber(text[i]) && IsSeparator(text[i + 1]) && IsNumber(text[i + 2]))) {
            twoWordsExists = true;
            break;
        }
    }

    return !(numbersExists && twoWordsExists);
}

// Function to check if a short has low views
function HasLowViewsShorts(videoViews) {
    if (!videoViews || !videoViews.innerText) {
        return false;
    }

    return !videoViews.innerText.includes('\xa0'); // Short view check
}

// Main function to filter videos based on view count
function UpdateVideoFiltering() {
    let videosList;

    if (IsChannel() || IsSubscriptions()) return;

    if (IsShorts() && g_ShortsFiltering) {
        videosList = document.getElementsByClassName("reel-video-in-sequence style-scope ytd-shorts");
        for (let i = 0; i < videosList.length; i++) {
            if (!videosList[i].isActive) continue;

            let videoViews = videosList[i].getElementsByClassName("yt-spec-button-shape-with-label__label")[0];
            if (HasLowViewsShorts(videoViews)) {
                document.getElementsByClassName("navigation-button style-scope ytd-shorts")[1]
                    .getElementsByClassName("yt-spec-touch-feedback-shape__fill")[0]
                    .click(); // Go to next video
            }
        }
    } else if (g_VideosFiltering) {
        // Remove videos from recommendations (right-side panel)
        videosList = document.getElementsByClassName("style-scope ytd-compact-video-renderer");
        let badVideos = [];
        for (let i = 0; i < videosList.length; i++) {
            let videoViews = videosList[i].getElementsByClassName("inline-metadata-item style-scope ytd-video-meta-block")[0];
            if (HasLowViews(videoViews)) {
                badVideos.push(videosList[i]);
            }
        }
        badVideos.forEach(video => video.parentElement.remove());

        // Remove videos from the main page
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

// Function to observe changes in the DOM and apply filtering dynamically
function observeDOMChanges() {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                debounceUpdate();
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Debounce to avoid multiple redundant calls
let debounceTimeout;
function debounceUpdate() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(UpdateVideoFiltering, 200);
}

// Add event listener for page load
window.addEventListener("load", function() {
    UpdateVideoFiltering(); // Initial filtering on page load
    observeDOMChanges();    // Start observing for dynamic content
});

// Add event listeners for page navigation and other actions
document.addEventListener("yt-navigate-finish", debounceUpdate);
window.addEventListener("message", debounceUpdate);
window.addEventListener("scroll", debounceUpdate);
window.addEventListener("click", debounceUpdate);

// ---------------------------------------------------------------------------
