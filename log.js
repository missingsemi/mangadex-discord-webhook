const fs = require('fs');

async function log(config) {
    let s = `[${config['timestamp'].toISOString().replace('T', ' ').split('.')[0]}] [${config['severity'].toUpperCase()}]: [${config['uuid']}] ${config['message']}`;
    if (config['severity'].toUpperCase() == "WARN") console.warn(s);
    else if (config['severity'].toUpperCase() == "ERROR") console.error(s);
    else if (config['severity'].toUpperCase() == "INFO") console.info(s);
    else console.log(s);

    if (!config['nolog']) {
        fs.appendFileSync('logs.txt', `${s}\n`, 'utf8');
    }
}

module.exports = log;