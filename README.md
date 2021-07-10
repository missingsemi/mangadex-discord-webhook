## Config
Put your mangadex username and password into config.json.
Then create a discord webhook and append `?wait=true` to the end.
Then save it 👍

Run `npm i` and then `node index.js` to run it. The first run will grab every new chapter in your feed since mangadex went down. Then it'll run every 10 minutes to show new chapters.
