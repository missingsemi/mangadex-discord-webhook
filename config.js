const fs = require('fs');

function Config () {
    // Create a default config file it if doesn't exist yet.
    fs.writeFileSync('config.json', `{"prevCheck": ${Date.now()}}`, {
        encoding: 'utf8',
        flag: 'wx',
    })


    this._config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
};

Config.prototype.get = function (key) {
    if (key == "username") return process.env.MANGADEX_USERNAME;
    if (key == "password") return process.env.MANGADEX_PASSWORD;
    if (key == "webhookUrl") return process.env.MANGADEX_WEBHOOK_URL;
    return this._config[key];
}

Config.prototype.set = function (key, value) {
    this._config[key] = value;
    fs.writeFileSync('config.json', JSON.stringify(this._config, null, 4), 'utf8');
}

Config.prototype.refresh = function () {
    this._config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
}

module.exports = new Config();