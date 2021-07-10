const fetch = require('node-fetch');
const log = require('./log');
const Ratelimit = require('ratelimit');

async function sleep(ms) {return new Promise(r => setTimeout(r, ms))};

// Groups chapters into groups of 10 and then sends each group as a single webhook
async function sendWebhooks(chapters, webhookUrl, ratelimit = null) {
    for (let i = 0; i < chapters.length; i += 10) {
        let embeds = [];
        for (let j = i; j < Math.min(i + 10, chapters.length); j++) {
            embeds.push(generateEmbed(chapters[j]));
        }

        await sendWebhook(embeds, webhookUrl, ratelimit);
    }
}

// Creates an embed object for an individual chapter.
function generateEmbed(chapter) {
    return {
        color: 16618806,

        title: chapter['mangaTitle'],
        url: `https://mangadex.org/chapter/${chapter['chapterId']}`,

        description: `${chapter['volume'] ? 'Volume ' + chapter['volume'] + ', ' : ''}Chapter ${chapter['chapter']}`,

        image: {
            url: `https://uploads.mangadex.org/covers/${chapter['mangaId']}/${chapter['coverFilename']}`
        },
        
        footer: {
            text: chapter['timestamp'].toLocaleString(),
            icon_url: "https://www.google.com/s2/favicons?domain_url=mangadex.org"
        }
    }
}

// Sends the embeds array to the webhook url passed.
async function sendWebhook(embeds, webhookUrl, ratelimit = null) {
    let body = {
        embeds: embeds
    }

    try {
        if (ratelimit) await ratelimit.wait();
        let response = await fetch(webhookUrl, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                "Content-Type": "application/json"
            }
        })

        if (!response.ok) {
            throw(new Error(`Failed to send webhook ${response.status} ${await response.text()}`))
        }
    } catch (e) {
        log({
            timestamp: new Date(Date.now()),
            severity: "ERROR",
            uuid: "NONE",
            message: `${e}`,
        })
    }
    
}

exports.sendWebhooks = sendWebhooks;