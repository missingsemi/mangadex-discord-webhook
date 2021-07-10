const fetch = require('node-fetch');
const log = require('./log');
const Ratelimit = require('ratelimit');

async function sleep(ms) {return new Promise(r => setTimeout(r, ms))};

async function sendWebhooks(chapters, webhookUrl, ratelimit = null) {
    //console.log(`${chapters.length} embeds will be send over ${Math.floor(chapters.length/10)} webhooks.`)
    for (let i = 0; i < chapters.length; i += 10) {
        //console.log(`Sending embeds ${i}-${i+9}`)
        let embeds = [];
        for (let j = i; j < Math.min(i + 10, chapters.length); j++) {
            embeds.push(generateEmbed(chapters[j]));
        }

        await sendWebhook(embeds, webhookUrl, ratelimit);
    }
    //console.log(`Finished sending webhooks`);
}

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

        // reading ratelimit headers as a just in case because discord down bad.
        //console.log(`Remaining: ${response.headers.get('x-ratelimit-remaining')} After: ${response.headers.get('x-ratelimit-reset-after')} Reset: ${response.headers.get('x-ratelimit-reset')*1000 - Date.now()}`)

        if (response.headers.get('x-ratelimit-remaining') == '0') {
            let wait = Number(response.headers.get('x-ratelimit-reset-after'));
            log({
                timestamp: new Date(Date.now()),
                severity: "WARN",
                uuid: "sendWebhook",
                message: `Ratelimited waiting for ${wait} seconds`,
            })
            console.log(`Ratelimited. Waiting for ${wait} seconds`);
            await sleep(wait * 1000);
        }

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