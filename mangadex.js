const fetch = require('node-fetch');
const log = require('./log');

function Chapter (apiResponse) {
    this.chapterId = apiResponse['data']['id'];
    this.volume = apiResponse['data']['attributes']['volume'];
    this.chapter = apiResponse['data']['attributes']['chapter'];
    this.chapterTitle = apiResponse['data']['attributes']['title'];
    this.timestamp = new Date(apiResponse['data']['attributes']['publishAt']);
    this.mangaId = apiResponse['relationships'].filter(v => v['type'] == 'manga')[0]['id'];
    this.mangaTitle = null;
    this.coverFilename = null;
}

async function groupFetches(chapters, ratelimit = null) {
    let mangaInfo = new Map();

    let getInfo = async function (uuid) {
        if (ratelimit) await ratelimit.wait();
        let response = await fetch(`https://api.mangadex.org/manga/${uuid}?includes[]=cover_art`);
        let content = await response.json();

        if (content['result'] == "error") {
            log({
                timestamp: new Date(Date.now()),
                severity: "WARN",
                uuid: uuid,
                message: "Failed to fetch info for manga",
            })
            return {
                mangaTitle: null,
                coverFilename: null,
            }
        }

        let title = content['data']['attributes']['title'][Object.keys(content['data']['attributes']['title'])[0]]
        let filename = content['relationships'].filter(v => v['type'] == 'cover_art')[0]['attributes']['fileName'];

        return {
            mangaTitle: title,
            coverFilename: filename
        };
    } 

    for (let i = 0; i < chapters.length; i++) {
        if (mangaInfo.has(chapters[i]['mangaId'])) {
            let info = mangaInfo.get(chapters[i]['mangaId']);
            chapters[i]['mangaTitle'] = info['mangaTitle'];
            chapters[i]['coverFilename'] = info['coverFilename'];
        } else {
            let info = await getInfo(chapters[i]['mangaId']);

            mangaInfo.set(chapters[i]['mangaId'], info);
            chapters[i]['mangaTitle'] = info['mangaTitle'];
            chapters[i]['coverFilename'] = info['coverFilename'];
        }
    }

    return chapters;
}

async function getFollowingFeed(sessionToken, lastCheck, ratelimit = null) {
    let offset = 0;
    let chapters = [];

    while (true) {
        let url =   `https://api.mangadex.org/user/follows/manga/feed` + 
                `?limit=500` + 
                `&translatedLanguage[]=en` + 
                `&order[publishAt]=asc` + 
                `&publishAtSince=${lastCheck.toISOString().slice(0,-5)}` + 
                `&offset=${offset}`;

        let options = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${sessionToken}`
            }
        }

        if (ratelimit) await ratelimit.wait();
        let response = await fetch(url, options);
        let content = await response.json();

        chapters = chapters.concat(content['results']);
        if (content['total'] > content['offset'] + content['limit']) {
            offset += content['limit'];
        } else {
            break;
        }
    }

    chapters = chapters.map(c => new Chapter(c));
    chapters = chapters.filter(c => c['timestamp'] >= lastCheck);
    chapters = await groupFetches(chapters, ratelimit);
    chapters = chapters.filter(c => c['mangaTitle'] != null);
    return chapters;
}

exports.Chapter = Chapter;
exports.getFollowingFeed = getFollowingFeed;