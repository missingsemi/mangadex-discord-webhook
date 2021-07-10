const fs = require('fs');

function Config () {
    this._config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
};

Config.prototype.get = function (key) {
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