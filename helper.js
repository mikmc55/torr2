const fetch = require("node-fetch");

const apikey = "brdmxpks5qki6szi";
const rdapikey = "PSWDXUHUVGK666NFO4O66FGALRJAJ63NRL7JY5BIUJ7ZP2XWZ2HA";

let checkPremiumizeRes = (res = {}) => {
  if ("status" in res) {
    return res["status"] == "success";
  }
  return false;
};

let checkAccount = async () => {
  let url = `https://www.premiumize.me/api/account/info?apikey=${apikey}`;
  try {
    let res = await fetch(url);
    return checkPremiumizeRes(await res.json());
  } catch (error) {
    console.log({ errorcheckAccount: error });
    return false;
  }
};

let pmTransferList = async (id = "") => {
  let url = `https://www.premiumize.me/api/transfer/list?apikey=${apikey}`;

  try {
    let res = await fetch(url, {
      method: "GET",
    });

    let resJson = (await res.json()) ?? {};

    if (checkPremiumizeRes(resJson)) {
      return "transfers" in resJson ? resJson["transfers"] : [];
    }

    return [];
  } catch (error) {
    return [];
  }
};

let pmFolderList = async () => {
  let url = `https://www.premiumize.me/api/folder/list?apikey=${apikey}`;

  try {
    let res = await fetch(url, {
      method: "GET",
    });

    let resJson = (await res.json()) ?? {};

    if (checkPremiumizeRes(resJson)) {
      return "content" in resJson ? resJson["content"] : [];
    }

    return [];
  } catch (error) {
    return [];
  }
};

let pmItemList = async () => {
  let url = `https://www.premiumize.me/api/item/listall?apikey=${apikey}`;

  try {
    let res = await fetch(url, {
      method: "GET",
    });

    let resJson = (await res.json()) ?? {};

    if (checkPremiumizeRes(resJson)) {
      return "files" in resJson ? resJson["files"] : [];
    }

    return [];
  } catch (error) {
    return [];
  }
};

let pmItemDetails = async (id = "") => {
  let url = `https://www.premiumize.me/api/item/details?apikey=${apikey}&id=${id}`;

  try {
    let res = await fetch(url, {
      method: "GET",
    });
    let resJson = (await res.json()) ?? {};
    if ("id" in resJson && resJson["id"]) {
      return resJson;
    }

    return {};
  } catch (error) {
    return {};
  }
};

let pmFolderDetails = async (id = "") => {
  let url = `https://www.premiumize.me/api/folder/list?apikey=${apikey}&id=${id}`;

  try {
    let res = await fetch(url, {
      method: "GET",
    });

    let resJson = (await res.json()) ?? {};

    let response = [];

    if (checkPremiumizeRes(resJson)) {
      let tmp = "content" in resJson ? resJson["content"] : [];
      for (const el of tmp) {
        if (el["type"] == "file") {
          response.push(el);
        } else if ((el["type"] = "folder")) {
          let res_temp = await pmFolderDetails(el["id"]);
          response = response.concat(res_temp);
        }
      }

      return response;
    }

    return [];
  } catch (error) {
    return [];
  }
};

let checkTorrentFileinPM = async (param = "", type = "file") => {
  if (!param) return null;
  try {
    let itemList = await pmFolderList();

    if (!itemList || !itemList.length) return null;

    let file = await new Promise((resolve, reject) => {
      resolve(
        itemList.find((el) => {
          return el["name"] == param;
        })
      );
    });

    return "id" in file ? file : null;
  } catch (error) {
    return null;
  }
};

let pmFolderId = async (transferId = "") => {
  try {
    let tranfers = await pmTransferList();

    if (!tranfers || !tranfers.length) return null;

    let folder = await new Promise((resolve, reject) => {
      resolve(
        tranfers.find((el) => {
          return el["id"] == transferId || el["name"] == transferId;
        })
      );
    });

    return "folder_id" in folder ? folder["folder_id"] : null;
  } catch (error) {
    return null;
  }
};

let addMagnetToPM = async (magnet = "") => {
  // let check = await checkAccount();
  // if (!check) return null;

  let url = `https://www.premiumize.me/api/transfer/create?apikey=${apikey}`;
  let form = new URLSearchParams();

  form.append("src", magnet);

  try {
    let res = await fetch(url, {
      method: "POST",
      body: form,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    let resJson = (await res.json()) ?? {};
    if (checkPremiumizeRes(resJson)) {
      return "id" in resJson ? resJson["id"] : null;
      // {
      //   "status": "success",
      //   "id": "WsaYYCdDzDIHckfkf8dD0g",
      //   "name": "Game Of Thrones Saison 1 [1080p] MULTI BluRay-Pop .Le Trône De Fer 2011",
      //   "type": "torrent"
      // }
    }
  } catch (error) {
    console.log({ addreserror: error });
    return null;
  }
};

let deleteMagnetFromPM = async (id = "") => {
  let url = `https://www.premiumize.me/api/transfer/create?apikey=${apikey}`;
  let form = new FormData();

  form.append("id", id);

  try {
    let res = await fetch(url, {
      method: "POST",
      body: form,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    let resJson = (await res.json()) ?? {};

    if (checkPremiumizeRes(resJson)) {
      return resJson;
      // {
      //   "status": "success",
      // }
    }
  } catch (error) {
    return false;
  }
};
// ====================== RD =================================

let headers = {
  Authorization: `Bearer ${rdapikey}`,
};

let checkTorrentFileinRD = async (hash = "") => {
  let url = `https://api.real-debrid.com/rest/1.0/torrents/instantAvailability/${hash}`;
  try {
    let res = await fetch(url, { method: "GET", headers });
    if (res.statusText != "OK") return null;
    let resJson = await res.json();
    return resJson;
  } catch (error) {
    return null;
  }
};

let addTorrentFileinRD = async (magnet = "") => {
  let url = `https://api.real-debrid.com/rest/1.0/torrents/addMagnet`;
  let form = new URLSearchParams();
  form.append("magnet", magnet);
  try {
    let res = await fetch(url, { method: "POST", headers, body: form });
    let resJson = await res.json();
    return resJson;
  } catch (error) {
    return {};
  }
};

let getTorrentInfofromRD = async (id = "") => {
  if (!id) return null;

  let url = `https://api.real-debrid.com/rest/1.0/torrents/info/${id}`;
  try {
    let res = await fetch(url, { method: "GET", headers });
    if (res.statusText != "OK") return null;
    let resJson = await res.json();
    return resJson;
  } catch (error) {
    return null;
  }
};

let selectFilefromRD = async (id = "", files = "all") => {
  if (!id) return false;
  let url = `https://api.real-debrid.com/rest/1.0/torrents/selectFiles/${id}`;
  try {
    let form = new URLSearchParams();
    form.append("files", files);
    let res = await fetch(url, { method: "POST", headers, body: form });
    if (res.status < 400) return true;
    return false;
  } catch (error) {
    console.log({ add: error });
    return false;
  }
};

let unrestrictLinkfromRD = async (link = "") => {
  if (!link) return {};
  let url = `https://api.real-debrid.com/rest/1.0/unrestrict/link`;
  try {
    let form = new URLSearchParams();
    form.append("link", link);
    let res = await fetch(url, { method: "POST", headers, body: form });
    if (res.statusText == "OK") return await res.json();
    return {};
  } catch (error) {
    return {};
  }
};

let removeDuplicate = (data = [], key = "name") => {
  let response = [];
  data.forEach((one, i) => {
    let index_ = response.findIndex((el) => el[key] == one[key]);
    index_ == -1 ? response.push(one) : null;
  });
  return response;
};

module.exports = {
  apikey,
  checkAccount,
  checkPremiumizeRes,
  addMagnetToPM,
  pmFolderDetails,
  pmFolderId,
  checkTorrentFileinPM,
  pmItemDetails,
  pmItemList,
  // ====================
  rdapikey,
  checkTorrentFileinRD,
  addTorrentFileinRD,
  getTorrentInfofromRD,
  selectFilefromRD,
  unrestrictLinkfromRD,
  removeDuplicate,
};
