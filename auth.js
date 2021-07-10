const fetch = require('node-fetch');

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

function validateToken(token) {
    if (typeof token !== 'string' || token === '' || !validateJwt(token)) return false;
    
    let b64 = token.split('.')[1];
    let original = Buffer.from(b64, 'base64').toString();
    let parsed = JSON.parse(original);

    if (Date.now() >= parsed['exp'] * 1000) return false;
    return true;
}

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
        .catch(_ => {
            console.error('Caught by WAF.');
        });

    if (response.ok) {
        return content['token'];
    } else {
        if (verbose) console.error(`[${Date.now()}] Code: ${response.status}\n${JSON.stringify(content['errors'], null, 2)}`);
        throw(new Error('Failed to generate tokens'));
        return null;
    }
}

exports.validateToken = validateToken;
exports.refreshTokens = refreshTokens;
exports.generateTokens = generateTokens;
exports.validateJwt = validateJwt;