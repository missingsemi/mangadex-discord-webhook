const Ratelimit = require('ratelimit');
const { validateToken, refreshTokens, generateTokens } = require('./auth.js');
const config = require('./config.js');
const fetch = require('node-fetch');
const { getFollowingFeed } = require('./mangadex.js');
const { sendWebhook, sendWebhooks } = require('./discord.js');
const log = require('./log.js')

const md_ratelimit = new Ratelimit(5, 1000);
const discord_ratelimit = new Ratelimit(1, 2200);
var interval = null;

async function authenticate() {
    let sessionToken = config.get('sessionToken');
    if (validateToken(sessionToken)) return;
    
    let refreshToken = config.get('refreshToken');
    if (validateToken(refreshToken)) {
        let tokens = await refreshTokens(refreshToken, md_ratelimit);
        config.set('sessionToken', tokens['session']);
        config.set('refreshToken', tokens['refresh']);
        return;
    }

    let username = config.get('username');
    let password = config.get('password');
    let tokens = await generateTokens(username, password, md_ratelimit);
    config.set('sessionToken', tokens['session']);
    config.set('refreshToken', tokens['refresh']);
    return;
}

async function update() {
    await log({
        severity: "INFO",
        uuid: "UPDATE",
        message: "Checking for updated manga",
        timestamp: new Date(Date.now()),
        nolog: true
    })

    await authenticate();
    let chs = await getFollowingFeed(config.get('sessionToken'), new Date(config.get('prevCheck')), md_ratelimit);
    config.set('prevCheck', Date.now());
    await sendWebhooks(chs, config.get('webhookUrl'), discord_ratelimit);
}

async function main() {
    update();
    interval = setInterval(update, 1000 * 60 * 10);
}

main().catch(console.error)
    //.finally(md_ratelimit.kill.bind(md_ratelimit))
    //.finally(discord_ratelimit.kill.bind(discord_ratelimit))
    //.finally(_ => clearInterval(interval));