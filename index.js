const Ratelimit = require('ratelimit');
const { validateToken, refreshTokens, generateTokens } = require('./auth.js');
require('dotenv').config();
const config = require('./config.js');
const { getFollowingFeed } = require('./mangadex.js');
const { sendWebhooks } = require('./discord.js');
const log = require('./log.js')

// ratelimits that are passed throughout the program. check out my ratelimit repo for more info ;)
const md_ratelimit = new Ratelimit(5, 1000);
const discord_ratelimit = new Ratelimit(1, 2200);
var interval = null;

// Attempts to get a valid session token by all means necessary.
async function authenticate() {
    // checks if the session token is already valid
    let sessionToken = config.get('sessionToken');
    if (validateToken(sessionToken)) return;
    
    // if not, it attempts to generate a new one using the refresh token
    let refreshToken = config.get('refreshToken');
    if (validateToken(refreshToken)) {
        let tokens = await refreshTokens(refreshToken, md_ratelimit);
        config.set('sessionToken', tokens['session']);
        config.set('refreshToken', tokens['refresh']);
        return;
    }

    // if the refresh token isn't valid, it logs in.
    let username = config.get('username');
    let password = config.get('password');
    let tokens = await generateTokens(username, password, md_ratelimit);
    config.set('sessionToken', tokens['session']);
    config.set('refreshToken', tokens['refresh']);
    return;
}

// Checks for new chapters and sends webhooks if they exist.
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

// doesnt really have to be async but I like the simplicity of passing errors to console.error like this, so I'm keeping it.
async function main() {
    update();
    interval = setInterval(update, 1000 * 60 * 10);
}

main().catch(console.error)
