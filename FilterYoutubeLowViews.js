// ==UserScript==
// @name         Filter YouTube Videos by View Count
// @namespace    http://tampermonkey.net/
// @version      3.6
// @description  Hides videos with fewer than 1000 views from YouTube feeds.
// @author       NiceL + Nenotriple
// @match        *://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// ==/UserScript==


// -------------------------
// Configuration
const VIEW_THRESHOLD = 9999; // Minimum views required for a video
let g_VideosFiltering = true; // Filter regular videos
let g_ShortsFiltering = true; // Filter YouTube Shorts


// -------------------------
// Utility Functions


function IsSubscriptions() {
    return location.pathname.startsWith("/feed/subscriptions");
}


function IsChannel() {
    return location.pathname.startsWith("/@");
}


function IsShorts() {
    return location.pathname.startsWith("/shorts");
}


function IsNumber(i) {
    return i >= '0' && i <= '9';
}


function IsSpace(i) {
    return i == ' ';
}


function IsSeparator(i) {
    return i == '.' || i == ',';
}


// -------------------------
// Filtering Logic


function HasLowViews(videoViews) {
    if (!videoViews || !videoViews.innerText) return false;
    let text = videoViews.innerText;
    let numbersExists = false;
    let twoWordsExists = false;
    // Check for numbers in text
    for (let i = 0; i < text.length; i++) {
        if (IsNumber(text[i])) {
            numbersExists = true;
            break;
        }
    }
    // Check for number-unit format
    for (let i = 0; i < text.length - 2; i++) {
        if ((!IsNumber(text[i]) && IsSpace(text[i + 1]) && !IsNumber(text[i + 2])) ||
            (IsNumber(text[i]) && IsSeparator(text[i + 1]) && IsNumber(text[i + 2]))) {
            twoWordsExists = true;
            break;
        }
    }
    return !(numbersExists && twoWordsExists);
}


function HasLowViewsShorts(videoViews) {
    if (!videoViews || !videoViews.innerText) return false;
    // Check for view count availability (non-breaking space character)
    return !videoViews.innerText.includes('\xa0');
}


// -------------------------
// Main Filtering Function


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
                    .click(); // Skip low-view Short
            }
        }
    } else if (g_VideosFiltering) {
        // Remove low-view videos from recommendations
        videosList = document.getElementsByClassName("style-scope ytd-compact-video-renderer");
        let badVideos = [];
        for (let i = 0; i < videosList.length; i++) {
            let videoViews = videosList[i].getElementsByClassName("inline-metadata-item style-scope ytd-video-meta-block")[0];
            if (HasLowViews(videoViews)) {
                badVideos.push(videosList[i]);
            }
        }
        badVideos.forEach(video => video.parentElement.remove());
        // Remove low-view videos from main feed
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


// -------------------------
// Dynamic Content Observation


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



// -------------------------
// Debouncing Updates


let debounceTimeout;
function debounceUpdate() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(UpdateVideoFiltering, 200);
}


// -------------------------
// Event Listeners


window.addEventListener("load", function() {
    UpdateVideoFiltering();
    observeDOMChanges();
});


document.addEventListener("yt-navigate-finish", debounceUpdate);
window.addEventListener("message", debounceUpdate);
window.addEventListener("scroll", debounceUpdate);
window.addEventListener("click", debounceUpdate);
