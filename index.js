require("dotenv").config();
const parseTorrent = require("parse-torrent");
const express = require("express");
const app = express();
const fetch = require("node-fetch");
// var WebTorrent = require("webtorrent");
var torrentStream = require("torrent-stream");
const {
  addTorrentFileinRD,
  getTorrentInfofromRD,
  selectFilefromRD,
  unrestrictLinkfromRD,
  removeDuplicate,
} = require("./helper");

const REGEX = {
  season_range:
    /S(?:(eason )|(easons )|(eason )|(easons )|(aisons )|(aison ))?(?<start>\d{1,2})\s*?(?:-|&|à|et)\s*?(?<end>\d{1,2})/, //start and end Sxx-xx|Season(s) xx-xx|Sxx à xx
  ep_range: /((?:e)|(?:ep))?(?: )?(?<start>\d{1,4})-(?<end>\d{1,4})/, //xxx-xxx
  ep_rangewithS:
    /((?:e)|(?:pisode))\s*(?<start>\d{1,3}(?!\d)|\d\d\d??)(?:-?e?(?<end>\d{1,3}))?(?!\d)/, //Exxx-xxx
};

function getSize(size) {
  var gb = 1024 * 1024 * 1024;
  var mb = 1024 * 1024;

  return (
    "💾 " +
    (size / gb > 1
      ? `${(size / gb).toFixed(2)} GB`
      : `${(size / mb).toFixed(2)} MB`)
  );
}

function getQuality(name) {
  if (!name) {
    return name;
  }
  name = name.toLowerCase();

  if (["2160", "4k", "uhd"].filter((x) => name.includes(x)).length > 0)
    return "🌟4k";
  if (["1080", "fhd"].filter((x) => name.includes(x)).length > 0)
    return " 🎥FHD";
  if (["720", "hd"].filter((x) => name.includes(x)).length > 0) return "📺HD";
  if (["480p", "380p", "sd"].filter((x) => name.includes(x)).length > 0)
    return "📱SD";
  return "";
}

// ----------------------------------------------

let isVideo = (element) => {
  return (
    element["name"]?.toLowerCase()?.includes(`.mkv`) ||
    element["name"]?.toLowerCase()?.includes(`.mp4`) ||
    element["name"]?.toLowerCase()?.includes(`.avi`) ||
    element["name"]?.toLowerCase()?.includes(`.flv`)
  );
};

//------------------------------------------------------------------------------------------

const toStream = async (
  parsed,
  uri,
  tor,
  type,
  s,
  e,
  abs_season,
  abs_episode,
  abs
) => {
  const infoHash = parsed.infoHash.toLowerCase();
  let title = tor.extraTag || parsed.name;
  let index = -1;

  if (!parsed.files && uri.startsWith("magnet:?")) {
    var engine = torrentStream("magnet:" + uri, { connections: 20 });
    try {
      let res = await new Promise((resolve, reject) => {
        engine.on("ready", function () {
          resolve(engine.files);
        });
        setTimeout(() => {
          resolve([]);
        }, 18000); //
      });
      parsed.files = res;
    } catch (error) {
      console.log("Done with that error");
      return null;
    }
    engine ? engine.destroy() : null;
  }

  if (media == "series") {
    index = (parsed.files ?? []).findIndex((element, index) => {
      if (!element["name"]) {
        return false;
      }

      let name = element["name"].toLowerCase();

      if (
        name.includes("movie") ||
        name.includes("live") ||
        name.includes("ova")
      ) {
        return false;
      }

      let containEandS = (element) =>
        //SxxExx
        //SxExx
        //SxExx
        //axb
        //Sxx - Exx
        //Sxx.Exx
        //Season xx Exx
        //SasEae selon abs
        //SasEaex  selon abs
        //SasEaexx  selon abs
        element["name"]
          ?.toLowerCase()
          ?.includes(`s${s?.padStart(2, "0")}e${e?.padStart(2, "0")}`) ||
        element["name"]
          ?.toLowerCase()
          ?.includes(`s${s}e${e?.padStart(2, "0")}`) ||
        element["name"]
          ?.toLowerCase()
          ?.includes(`s${s?.padStart(2, "0")}e${e}`) ||
        element["name"]?.toLowerCase()?.includes(`${s}x${e}`) ||
        element["name"]
          ?.toLowerCase()
          ?.includes(`s${s?.padStart(2, "0")} - e${e?.padStart(2, "0")}`) ||
        element["name"]
          ?.toLowerCase()
          ?.includes(`s${s?.padStart(2, "0")}.e${e?.padStart(2, "0")}`) ||
        element["name"]
          ?.toLowerCase()
          ?.includes(`s${s}${e?.padStart(2, "0")}`) ||
        // element["name"]?.toLowerCase()?.includes(`s${s}e${e}`) ||
        element["name"]
          ?.toLowerCase()
          ?.includes(`s${s?.padStart(2, "0")}e${e}`) ||
        element["name"]?.toLowerCase()?.includes(`season ${s} e${e}`) ||
        (abs &&
          (element["name"]
            ?.toLowerCase()
            ?.includes(
              `s${abs_season?.padStart(2, "0")}e${abs_episode?.padStart(
                2,
                "0"
              )}`
            ) ||
            element["name"]
              ?.toLowerCase()
              ?.includes(
                `s${abs_season?.padStart(2, "0")}e${abs_episode?.padStart(
                  3,
                  "0"
                )}`
              ) ||
            element["name"]
              ?.toLowerCase()
              ?.includes(
                `s${abs_season?.padStart(2, "0")}e${abs_episode?.padStart(
                  4,
                  "0"
                )}`
              )));

      let containE_S = (element) =>
        //Sxx - xx
        //Sx - xx
        //Sx - x
        //Season x - x
        //Season x - xx
        element["name"]
          ?.toLowerCase()
          ?.includes(`s${s?.padStart(2, "0")} - ${e?.padStart(2, "0")}`) ||
        element["name"]
          ?.toLowerCase()
          ?.includes(`s${s} - ${e?.padStart(2, "0")}`) ||
        // element["name"]?.toLowerCase()?.includes(`s${s} - ${e}`) ||
        // element["name"]?.toLowerCase()?.includes(`season ${s} - ${e}`) ||
        element["name"]
          ?.toLowerCase()
          ?.includes(`season ${s} - ${e?.padStart(2, "0")}`) ||
        element["name"]
          ?.toLowerCase()
          ?.includes(`season ${s} - ${e?.padStart(2, "0")}`);

      let containsAbsoluteE = (element) =>
        //- xx
        //- xxx
        //- xxxx
        //- 0x
        element["name"]
          ?.toLowerCase()
          ?.includes(` ${abs_episode?.padStart(2, "0")} `) ||
        element["name"]
          ?.toLowerCase()
          ?.includes(` ${abs_episode?.padStart(3, "0")} `) ||
        element["name"]?.toLowerCase()?.includes(` 0${abs_episode} `) ||
        element["name"]
          ?.toLowerCase()
          ?.includes(` ${abs_episode?.padStart(4, "0")} `);

      let containsAbsoluteE_ = (element) =>
        // xx.
        // xxx.
        // xxxx.
        // 0x.
        element["name"]
          ?.toLowerCase()
          ?.includes(` ${abs_episode?.padStart(2, "0")}.`) ||
        element["name"]
          ?.toLowerCase()
          ?.includes(` ${abs_episode?.padStart(3, "0")}.`) ||
        element["name"]?.toLowerCase()?.includes(` 0${abs_episode}.`) ||
        element["name"]
          ?.toLowerCase()
          ?.includes(` ${abs_episode?.padStart(4, "0")}.`);

      return (
        isVideo(element) &&
        (containEandS(element) ||
          containE_S(element) ||
          (((abs && containsAbsoluteE(element)) ||
            (abs && containsAbsoluteE_(element))) &&
            !(
              element["name"]?.toLowerCase()?.includes("s0") ||
              element["name"]?.toLowerCase()?.includes(`s${abs_season}`) ||
              element["name"]?.toLowerCase()?.includes("e0") ||
              element["name"]?.toLowerCase()?.includes(`e${abs_episode}`) ||
              element["name"]?.toLowerCase()?.includes("season")
            )))
      );
    });
    //
    if (index == -1) {
      return null;
    }

    title = !!title ? title + "\n" + parsed.files[index]["name"] : null;
  }

  if (media == "movie") {
    index = (parsed?.files ?? []).findIndex((element, index) => {
      // console.log({ element: element["name"] });
      return isVideo(element);
    });
    //
    if (index == -1) {
      return null;
    }
  }

  // ========================== RD =============================
  // console.log({ parsed: parsed["name"] });
  // console.log({ magnetUri: parseTorrent.toMagnetURI(parsed) });

  console.log("Trynna some RD");
  let folderId = null;

  let details = [];
  let data = await addTorrentFileinRD(parseTorrent.toMagnetURI(parsed));
  folderId = "id" in data ? data["id"] : null;
  let added = await selectFilefromRD(folderId);
  if (folderId) {
    let torrentDetails = await getTorrentInfofromRD(folderId);
    let files = (torrentDetails["files"] ?? []).filter(
      (el) => el["selected"] == 1
    );
    let links = torrentDetails["links"] ?? [];

    let selectedIndex =
      files.length == 1
        ? 0
        : files.findIndex((el) =>
            el["path"]
              ?.toLowerCase()
              ?.includes(parsed.files[index]["name"]?.toLowerCase())
          );
    details = [await unrestrictLinkfromRD(links[selectedIndex] ?? null)];
  }

  // ===========================================================

  title = title ?? parsed.files[index]["name"];

  title += "\n" + getQuality(title);

  const subtitle = "S:" + tor["Seeders"] + " | P:" + tor["Peers"];
  title += ` | ${
    index == -1 || parsed.files == []
      ? `${getSize(0)}`
      : `${getSize(parsed.files[index]["length"] ?? 0)}`
  } | ${subtitle}`;

  if (
    details.length > 0 &&
    details[details.length > 1 ? index : 0]["download"]
  ) {
    return {
      name: `RD-${tor["Tracker"]}`,
      url: details[details.length > 1 ? index : 0]["download"],
      title: title ?? details[details.length > 1 ? index : 0]["filename"],
      behaviorHints: {
        bingeGroup: `Jackett-Addon|${infoHash}`,
      },
    };
  }

  return null;
};

//------------------------------------------------------------------------------------------

let isRedirect = async (url) => {
  try {
    // console.log({ url });
    const controller = new AbortController();
    // 5 second timeout:
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
    });

    // console.log(response.status);
    // console.log(response.headers);

    clearTimeout(timeoutId);

    if (response.status === 301 || response.status === 302) {
      const locationURL = new URL(
        response.headers.get("location"),
        response.url
      );
      if (response.headers.get("location").startsWith("http")) {
        await isRedirect(locationURL);
      } else {
        return response.headers.get("location");
      }
    } else if (response.status >= 200 && response.status < 300) {
      return response.url;
    } else {
      // return response.url;
      return null;
    }
  } catch (error) {
    // console.log({ error });
    return null;
  }
};

const streamFromMagnet = (
  tor,
  uri,
  type,
  s,
  e,
  abs_season,
  abs_episode,
  abs
) => {
  return new Promise(async (resolve, reject) => {
    //follow redirection cause some http url sent magnet url
    let realUrl = uri?.startsWith("magnet:?") ? uri : await isRedirect(uri);

    realUrl = realUrl ?? null;

    if (realUrl) {
      // console.log({ realUrl });
      if (realUrl?.startsWith("magnet:?")) {
        resolve(
          toStream(
            parseTorrent(realUrl),
            realUrl,
            tor,
            type,
            s,
            e,
            abs_season,
            abs_episode,
            abs
          )
        );
      } else if (realUrl?.startsWith("http")) {
        parseTorrent.remote(realUrl, (err, parsed) => {
          if (!err) {
            resolve(
              toStream(
                parsed,
                realUrl,
                tor,
                type,
                s,
                e,
                abs_season,
                abs_episode,
                abs
              )
            );
          } else {
            // console.log("err parsing http");
            resolve(null);
          }
        });
      } else {
        // console.log("no http nor magnet");
        resolve(realUrl);
      }
    } else {
      // console.log("no real uri");
      resolve(null);
    }
  });
};

let torrent_results = [];

const hosts = [
  {
    host: "http://193.32.2.211:9117",
    apiKey: "kb1z6jk7yo7srkhqohlxe1ack9g0ewtf",
  },
  {
    host: "http://50.121.36.88:9117",
    apiKey: "jii0bganncd310owructdzgjwkk4a9sn",
  },
  {
    host: "http://23.121.245.187:9117",
    apiKey: "2b67cqgelfurpy359pnb546gc9jj9i7d",
  },
  {
    host: "http://98.246.174.104:9117",
    apiKey: "r2q9v8pmrbzyemjk0cfa15opw9sam99f",
  },
  {
    host: "http://81.156.223.238:9117",
    apiKey: "ozh0zenhc5t9w5hzxkig5uejar4qhdp3",
  },
  {
    host: "http://216.70.20.53:9117",
    apiKey: "gnzi9k7a6q7fif1rqsxse2by2dhb3lpv",
  },
  {
    host: "http://195.154.176.233:9117",
    apiKey: "wditbmg7gimijom3ayxdicceshdbl7ou",
  },
];

let fetchTorrent = async (query, type = "series") => {
  let hostdata = hosts[Math.floor(Math.random() * hosts.length)];

  let url = `${hostdata.host}/api/v2.0/indexers/all/results?apikey=${
    hostdata.apiKey
  }&Query=${query}${
    type == "series"
      ? "&Category%5B%5D=8000"
      : type == "movie"
      ? "&Category%5B%5D=8000"
      : ""
  }&Category%5B%5D=127246&Tracker%5B%5D=torrentproject2&cache=false`;

  return await fetch(url, {
    headers: {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      "x-requested-with": "XMLHttpRequest",
      cookie:
        "Jackett=CfDJ8AG_XUDhxS5AsRKz0FldsDJIHUJANrfynyi54VzmYuhr5Ha5Uaww2hSQytMR8fFWjPvDH2lKCzaQhRYI9RuK613PZxJWz2tgHqg1wUAcPTMfi8b_8rm1Igw1-sZB_MnimHHK7ZSP7HfkWicMDaJ4bFGZwUf0xJOwcgjrwcUcFzzsVSTALt97-ibhc7PUn97v5AICX2_jsd6khO8TZosaPFt0cXNgNofimAkr5l6yMUjShg7R3TpVtJ1KxD8_0_OyBjR1mwtcxofJam2aZeFqVRxluD5hnzdyxOWrMRLSGzMPMKiaPXNCsxWy_yQhZhE66U_bVFadrsEeQqqaWb3LIFA",
    },
    referrerPolicy: "no-referrer",
    method: "GET",
  })
    .then(async (res) => {
      try {
        return await res.json();
      } catch (error) {
        console.log({ error });
        return {};
      }
    })
    .then(async (results) => {
      console.log({ Initial: results["Results"]?.length });
      // console.log({ Response: results["Results"] });
      if (results["Results"].length != 0) {
        torrent_results = await Promise.all(
          results["Results"].map((result) => {
            return new Promise((resolve, reject) => {
              resolve({
                Tracker: result["Tracker"],
                Category: result["CategoryDesc"],
                Title: result["Title"],
                Seeders: result["Seeders"],
                Peers: result["Peers"],
                Link: result["Link"],
                MagnetUri: result["MagnetUri"],
                DownloadVolumeFactor: result["DownloadVolumeFactor"],
                UploadVolumeFactor: result["UploadVolumeFactor"],
              });
            });
          })
        );
        return torrent_results;
      } else {
        return [];
      }
    })
    .catch((err) => {
      return [];
    });
};

function getMeta(id, type) {
  var [tt, s, e] = id.split(":");

  return fetch(`https://v3-cinemeta.strem.io/meta/${type}/${tt}.json`)
    .then((res) => res.json())
    .then((json) => {
      return {
        name: json.meta["name"],
        year: json.meta["releaseInfo"]?.substring(0, 4) ?? 0,
      };
    })
    .catch((err) =>
      fetch(`https://v2.sg.media-imdb.com/suggestion/t/${tt}.json`)
        .then((res) => res.json())
        .then((json) => {
          return json.d[0];
        })
        .then(({ l, y }) => ({ name: l, year: y }))
    );
}

async function getImdbFromKitsu(id) {
  var [kitsu, _id, e] = id.split(":");

  return fetch(`https://anime-kitsu.strem.fun/meta/anime/${kitsu}:${_id}.json`)
    .then((_res) => _res.json())
    .then((json) => {
      return json["meta"];
    })
    .then((json) => {
      try {
        let imdb = json["imdb_id"];
        let meta = json["videos"].find((el) => el.id == id);
        return [
          imdb,
          (meta["imdbSeason"] ?? 1).toString(),
          (meta["imdbEpisode"] ?? 1).toString(),
          (meta["season"] ?? 1).toString(),
          (meta["imdbSeason"] ?? 1).toString() == 1
            ? (meta["imdbEpisode"] ?? 1).toString()
            : (meta["episode"] ?? 1).toString(),
          meta["imdbEpisode"] != meta["episode"] || meta["imdbSeason"] == 1,
        ];
      } catch (error) {
        return null;
      }
    })
    .catch((err) => null);
}

app
  .get("/manifest.json", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Content-Type", "application/json");

    //
    var json = {
      id: "hyy.jacketttp.stream",
      version: "1.0.3",
      name: "Torrentproject2",
      description: "Movie & TV Streams from Torrentproject2",
      logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTjF-U45-kc5yetCZx8Brhf6jCG9CSer2oqLBE-Jw-QxQ&s",
      resources: [
        {
          name: "stream",
          types: ["movie", "series"],
          idPrefixes: ["tt", "kitsu"],
        },
      ],
      types: ["movie", "series", "anime", "other"],
      catalogs: [],
    };

    return res.send(json);
  })
  .get("/stream/:type/:id", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Content-Type", "application/json");

    //
    media = req.params.type;
    let id = req.params.id;
    id = id.replace(".json", "");

    let tmp = [];

    if (id.includes("kitsu")) {
      tmp = await getImdbFromKitsu(id);
      if (!tmp) {
        return res.send({ stream: {} });
      }
    } else {
      tmp = id.split(":");
    }

    let [tt, s, e, abs_season, abs_episode, abs] = tmp;

    console.log(tmp);

    let meta = await getMeta(tt, media);

    console.log({ meta: id });
    console.log({ name: meta?.name, year: meta?.year });

    let query = "";
    query = meta?.name;

    let result = [];

    if (media == "movie") {
      query += " " + meta?.year;
      result = await fetchTorrent(encodeURIComponent(query), "movie");
    } else if (media == "series") {
      let promises = [
        fetchTorrent(
          encodeURIComponent(`${query} S${(s ?? "1").padStart(2, "0")}`)
        ),
        fetchTorrent(encodeURIComponent(`${query}`)),
        fetchTorrent(encodeURIComponent(`${query} S${s ?? "1"}`)),
        // fetchTorrent(encodeURIComponent(`${query} Saison ${s ?? "1"}`)),
        fetchTorrent(
          encodeURIComponent(
            `${query} S${s?.padStart(2, "0")}E${e?.padStart(2, "0")}`
          )
        ),
      ];

      if (+s == 1) {
        promises.push(
          fetchTorrent(encodeURIComponent(`${query} ${e?.padStart(2, "0")}`))
        );
      }

      if (abs) {
        promises.push(
          fetchTorrent(
            encodeURIComponent(`${query} ${abs_episode?.padStart(3, "0")}`)
          )
        );
      }

      // console.log(`Check si s==1: ${+s == 1}`);

      result = await Promise.all(promises);

      // console.log(`Taille ${result?.length ?? 0}`);

      result = [
        ...result[0],
        ...result[1],
        ...result[2],
        ...result[3],
        // ...result[4],
        // ...(result?.length >= 4 ? result[3] : []),
        ...(result?.length >= 5 ? result[4] : []),
        ...(result?.length >= 6 ? result[5] : []),
        // ...(result?.length >= 7 ? result[6] : []),
      ];
    }

    // ------------------------------- FOR RANGE THINGS ---------------------------------------------

    let matches = [];

    for (const key in result) {
      const element = result[key];

      let r = new RegExp(REGEX.season_range, "gmi");
      let match = r.exec(element["Title"]);
      if (match && match["groups"] != null) {
        if (
          ![match["groups"]["start"], match["groups"]["end"]].includes(
            meta?.year
          )
        ) {
          if (s > +match["groups"]["start"] && s <= +match["groups"]["end"]) {
            matches.push(result[key]);
            result.splice(key, 1);
            continue;
          }
        }
      }

      r = new RegExp(REGEX.ep_range, "gmi");
      match = r.exec(element["Title"]);

      if (match && match["groups"] != null) {
        if (
          ![match["groups"]["start"], match["groups"]["end"]].includes(
            meta?.year
          )
        ) {
          if (
            abs_episode > +match["groups"]["start"] &&
            abs_episode <= +match["groups"]["end"]
          ) {
            matches.push(result[key]);
            result.splice(key, 1);
          }
        }
      }
    }
    result = [...matches, ...result];
    result = removeDuplicate(result, "Title");
    result.sort((a, b) => {
      return -(+a["Peers"] - +b["Peers"]) ?? 0;
    });

    console.log({ Retenus: result.length });

    const MAX_RES = process.env.MAX_RES ?? 20;
    result = result?.length >= MAX_RES ? result.splice(0, MAX_RES) : result;

    // ----------------------------------------------------------------------------

    let stream_results = await Promise.all(
      result.map((torrent) => {
        if (
          (torrent["MagnetUri"] != "" || torrent["Link"] != "") &&
          torrent["Peers"] >= 0
          // &&
          // (torrent["DownloadVolumeFactor"] == 0 ||
          //   (torrent["UploadVolumeFactor"] == 1 &&
          //     torrent["DownloadVolumeFactor"] == 0))
        ) {
          return streamFromMagnet(
            torrent,
            torrent["MagnetUri"] || torrent["Link"],
            media,
            s,
            e,
            abs_season
          );
        }
      })
    );

    stream_results = Array.from(new Set(stream_results)).filter((e) => !!e);

    console.log({ Final: stream_results.length });

    return res.send({ streams: stream_results });
  })
  .listen(process.env.PORT || 3000, () => {
    console.log("The server is working on " + process.env.PORT || 3000);
  });
