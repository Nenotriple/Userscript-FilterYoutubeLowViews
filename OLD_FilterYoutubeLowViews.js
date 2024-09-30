// ==UserScript==
// @name         youtube crappy videos remover from the recommendations
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  thanks to youtube for recommending crappy videos with ~10 views
// @author       NiceL
// @match        *://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// ==/UserScript==

// ---------------------------------------------------------------------------

let g_VideosFiltering = true;
let g_ShortsFiltering = true;

function IsSubscriptions()
{
  return location.pathname.startsWith("/feed/subscriptions");
}

function IsChannel()
{
  return location.pathname.startsWith("/@");
}

function IsShorts()
{
  return location.pathname.startsWith("/shorts");
}

function IsNumber(i)
{
    return (i >= '0' && i <= '9');
}

function IsSpace(i)
{
    return i == ' ';
}

function IsSeparator(i)
{
    return i == '.' || i == ',';
}

function IsBadVideo(videoViews)
{
    if (!videoViews) {
        return false;
    }

    let text = videoViews.innerText;
    if (text.length == 0) {
        return false;
    }

    let numbersExists = false
    for (let i = 0; i < text.length; i++)
    {
        // searches for a single number to verify that there's more than zero views
        if (IsNumber(text[i])) {
            numbersExists = true;
            break;
        }
    }

    let twoWordsExists = false
    for (let i = 0; i < text.length - 2; i++)
    {
        // not number + space + not number = this is >1000 views (this should work for all languages)
        if (!IsNumber(text[i]) && IsSpace(text[i + 1]) && !IsNumber(text[i + 2])) {
            twoWordsExists = true;
            break;
        }

        // number + separator + number = this is >1000 views (this should work for all languages)
        if (IsNumber(text[i]) && IsSeparator(text[i + 1]) && IsNumber(text[i + 2])) {
            twoWordsExists = true;
            break;
        }
    }

    let badVideo = !numbersExists || !twoWordsExists;
    if (badVideo) {
        console.log("~BadVideo: '" + text + "'"); // debug
    }

    return badVideo;
}

function IsBadShortVideo(videoViews)
{
    //console.log("IsBadShortVideo()"); // debug

    if (!videoViews) {
        return false;
    }

    let text = videoViews.innerText;
    if (text.length == 0) {
        return false;
    }

    for (let i = 0; i < text.length; i++)
    {
        // nbsp symbol is found
        if (text[i] == '\xa0') {
            return false;
        }
    }

    console.log("~BadShortVideo: '" + text + "'"); // debug
    return true;
}

// ---------------------------------------------------------------------------

function UpdateVideoFiltering()
{
    let videosList;

    if (IsChannel() || IsSubscriptions()) {
        return;
    }

    if (IsShorts())
    {
        if (g_ShortsFiltering)
        {
            // skip bad shorts
            videosList = document.getElementsByClassName("reel-video-in-sequence style-scope ytd-shorts");
            for (let i = 0; i < videosList.length; i++)
            {
                if (!videosList[i].isActive) {
                    continue;
                }

                let videoViews = videosList[i].getElementsByClassName("yt-spec-button-shape-with-label__label")[0];

                if (IsBadShortVideo(videoViews)) {
                    document.getElementsByClassName("navigation-button style-scope ytd-shorts")[1].getElementsByClassName("yt-spec-touch-feedback-shape__fill")[0].click(); // click to next video button (is it even stable lol?)
                }
            }
        }
    }
    else
    {
        if (g_VideosFiltering)
        {
            // delete videos from the right side
            videosList = document.getElementsByClassName("style-scope ytd-compact-video-renderer");
            for (let i = 0; i < videosList.length; i++)
            {
                let videoViews = videosList[i].getElementsByClassName("inline-metadata-item style-scope ytd-video-meta-block")[0];

                if (IsBadVideo(videoViews)) {
                    videosList[i].parentElement.remove();
                }
            }

            // delete videos from the main page
            videosList = document.getElementsByClassName("style-scope ytd-rich-item-renderer");
            for (let i = 0; i < videosList.length; i++)
            {
                if (videosList[i].id != "content") {
                    continue;
                }

                let videoViews = videosList[i].getElementsByClassName("inline-metadata-item style-scope ytd-video-meta-block")[0];

                if (IsBadVideo(videoViews)) {
                    videosList[i].parentElement.remove();
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------

document.addEventListener("yt-navigate-finish", (event) => {
    setTimeout(UpdateVideoFiltering, 350);
});

window.addEventListener("message", (event) => {
    if (!IsShorts()) {
        setTimeout(UpdateVideoFiltering, 200);
    }
});

window.addEventListener("load", (event) => {
    if (!IsShorts()) {
        setTimeout(UpdateVideoFiltering, 200);
    }
});

window.addEventListener("scrollend", (event) => {
    if (!IsShorts()) {
        setTimeout(UpdateVideoFiltering, 0);
    }
});

window.addEventListener("click", (event) => {
    if (!IsShorts()) {
        setTimeout(UpdateVideoFiltering, 200);
    }
});
