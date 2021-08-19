const fetch = require('node-fetch');
const log = require('./log');

// chapter object to make my life a little bit easier.
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

// Groups chapters together to only fetch manga info once per manga instead of once per chapter.
async function groupFetches(chapters, ratelimit = null) {
    let mangaInfo = new Map();

    // function to actually grab the info pog
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

    // go through each chapter. if the manga info is in the map, use it. otherwise, fetch it.
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

// gets a list of completed chapters objects from the following feed.
async function getFollowingFeed(sessionToken, prevCheck, ratelimit = null) {
    let offset = 0;
    let chapters = [];

    // loops until end of feed is hit in case theres more than 500 manga.
    while (true) {
        let url =   `https://api.mangadex.org/user/follows/manga/feed` + 
                `?limit=500` + 
                `&translatedLanguage[]=en` + 
                `&order[publishAt]=asc` + 
                //`&publishAtSince=${prevCheck.toISOString().slice(0,-5)}` + 
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

        // Break when theres no manga
        if (content['total'] == 0) break;

        // If the last chapter in a response isnt new, then all the ones above it are also old.
        // That means we can skip out on filtering and modifying them later which should speed up code significantly.
        let test_chapter = new Chapter(content['results'][content['results'].length - 1]);
        if (test_chapter['timestamp'] >= prevCheck) chapters = chapters.concat(content['results']);


        if (content['total'] > content['offset'] + content['limit']) {
            offset += content['limit'];
        } else {
            break;
        }
    }

    // turns each api chapter into a chapter object.
    chapters = chapters.map(c => new Chapter(c));

    // this wont do much later, but publishAtSince is broken so I have to manually sort for now.
    chapters = chapters.filter(c => c['timestamp'] >= prevCheck);

    // fills in mangaTitle and coverUrl
    chapters = await groupFetches(chapters, ratelimit);

    // Not likely anymore, but null check in case a manga is messed up.
    chapters = chapters.filter(c => c['mangaTitle'] != null);
    return chapters;
}

exports.Chapter = Chapter;
exports.getFollowingFeed = getFollowingFeed;
