## Config

Put your mangadex username into the environment variable `MANGADEX_USERNAME`
Put your password into `MANGADEX_PASSWORD`

Then create a discord webhook and append `?wait=true` to the end.
An example is `https://discord.com/api/webhooks/863111435386748958/d00qS-aA6x7Fj2fXHf7AbZaj27-_Y6AQGarMgrXf7UKYCWGBYkqvPfR0rgHB1uRRzAjR?wait=true`
Put that url in the enviroment variable `MANGADEX_WEBHOOK_URL`

Run `npm i` and then `node index.js` to run it. The first run will grab every new chapter in your feed since mangadex went down. Then it'll run every 10 minutes to show new chapters.
