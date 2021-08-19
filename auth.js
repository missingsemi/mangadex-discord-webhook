const fetch = require('node-fetch');

// Checks a string loosely follows JWT format.
function validateJwt(jwt) {
    try {
        
        let split = jwt.split('.');
        if (split.length != 3) return false;
        
        let alg = JSON.parse(Buffer.from(split[0], 'base64').toString())['alg'];
        JSON.parse(Buffer.from(split[1], 'base64').toString());
        
        if (alg == undefined) return false;

        return true;
    } catch (e) {
        return false;
    }
}

// Checks if a JWT has expired yet. True if valid, false if expired
function validateToken(token) {
    if (typeof token !== 'string' || token === '' || !validateJwt(token)) return false;
    
    let b64 = token.split('.')[1];
    let original = Buffer.from(b64, 'base64').toString();
    let parsed = JSON.parse(original);

    if (Date.now() >= parsed['exp'] * 1000) return false;
    return true;
}

// Uses valid refresh token to regenerate session token.
async function refreshTokens(refreshToken, ratelimit = null, verbose = false) {
    if (ratelimit) await ratelimit.wait();

    let body = {
        token: refreshToken
    }
    
    let headers = {
        'Content-Type': 'application/json'
    }
    
    let options = {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body)
    }
    
    let response = await fetch('https://api.mangadex.org/auth/refresh', options);


    let content = await response.json()
        .catch(_ => {
            console.error('Caught by WAF.');
        })

    if (response.ok) {
        return content['token'];
    } else {
        if (verbose) console.error(`[${Date.now()}] Code: ${response.status}\n${JSON.stringify(content['errors'], null, 2)}`);
        throw(new Error('Failed to refresh tokens'));
        return null;
    }
}

// Uses username and password to create fresh refresh and session tokens
async function generateTokens(username, password, ratelimit = null, verbose = false) {
    if (ratelimit) await ratelimit.wait();

    let body = {
        username: username,
        password: password,
    }
    
    let headers = {
        'Content-Type': 'application/json'
    }
    
    let options = {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body)
    }
    
    let response = await fetch('https://api.mangadex.org/auth/login', options);


    let content = await response.json()
        .catch(async (e) => {
            await log({
                severity: "ERROR",
                uuid: "generateTokens",
                message: "Caught by WAF.",
                timestamp: new Date(Date.now()),
                nolog: false
            })
        });

    if (response.ok && content) {
        return content['token'];
    } else {
        if (verbose) {
            await log({
                severity: "ERROR",
                uuid: "generateTokens",
                message: "Failed to generate tokens.",
                timestamp: new Date(Date.now()),
                nolog: false
            })
        }
        // Error in addition to logging, because tokens are required.
        throw(new Error('Failed to generate tokens'));
    }
}

exports.validateToken = validateToken;
exports.refreshTokens = refreshTokens;
exports.generateTokens = generateTokens;
exports.validateJwt = validateJwt;