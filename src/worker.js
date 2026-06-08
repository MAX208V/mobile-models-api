// MobileModels Device Database API - Cloudflare Worker
// Data Source: github.com/KHwang9883/MobileModels

const GH_OWNER = "KHwang9883";
const GH_REPO = "MobileModels";
const GH_BRANCH = "master";
const GH_API = "https://api.github.com/repos/" + GH_OWNER + "/" + GH_REPO + "/contents/brands";

var BRANDS = [
  ["360shouji","360shouji.md"],["apple","apple_all.md"],["apple_cn","apple_cn.md"],
  ["apple_en","apple_all_en.md"],["asus_cn","asus_cn.md"],["asus_en","asus_en.md"],
  ["blackshark","blackshark.md"],["coolpad","coolpad.md"],["google","google.md"],
  ["honor_cn","honor_cn.md"],["honor_global_en","honor_global_en.md"],
  ["huawei_cn","huawei_cn.md"],["huawei_global_en","huawei_global_en.md"],
  ["lenovo_cn","lenovo_cn.md"],["letv","letv.md"],["meizu","meizu.md"],
  ["meizu_en","meizu_en.md"],["mitv_cn","mitv_cn.md"],["mitv_global_en","mitv_global_en.md"],
  ["motorola_cn","motorola_cn.md"],["nokia_cn","nokia_cn.md"],["nothing","nothing.md"],
  ["nubia","nubia.md"],["oneplus","oneplus.md"],["oneplus_en","oneplus_en.md"],
  ["oppo_cn","oppo_cn.md"],["oppo_global_en","oppo_global_en.md"],
  ["realme_cn","realme_cn.md"],["realme_global_en","realme_global_en.md"],
  ["samsung_cn","samsung_cn.md"],["samsung_global_en","samsung_global_en.md"],
  ["smartisan","smartisan.md"],["sony","sony.md"],["sony_cn","sony_cn.md"],
  ["vivo_cn","vivo_cn.md"],["vivo_global_en","vivo_global_en.md"],
  ["xiaomi","xiaomi.md"],["xiaomi_cn","xiaomi_cn.md"],["xiaomi_en","xiaomi_en.md"],
  ["xiaomi-wear","xiaomi-wear.md"],["zhixuan","zhixuan.md"],["zte_cn","zte_cn.md"]
];

var NAMES = {
  "360shouji":"360","apple":"Apple","apple_cn":"Apple CN","apple_en":"Apple EN",
  "asus_cn":"ASUS CN","asus_en":"ASUS","blackshark":"Black Shark",
  "coolpad":"Coolpad","google":"Google","honor_cn":"Honor CN","honor_global_en":"Honor",
  "huawei_cn":"Huawei CN","huawei_global_en":"Huawei","lenovo_cn":"Lenovo CN",
  "letv":"LeTV","meizu":"Meizu CN","meizu_en":"Meizu","mitv_cn":"Mi TV CN",
  "mitv_global_en":"Mi TV","motorola_cn":"Motorola CN","nokia_cn":"Nokia CN",
  "nothing":"Nothing","nubia":"Nubia","oneplus":"OnePlus CN","oneplus_en":"OnePlus",
  "oppo_cn":"OPPO CN","oppo_global_en":"OPPO","realme_cn":"realme CN",
  "realme_global_en":"realme","samsung_cn":"Samsung CN","samsung_global_en":"Samsung",
  "smartisan":"Smartisan","sony":"Sony","sony_cn":"Sony CN","vivo_cn":"vivo CN",
  "vivo_global_en":"vivo","xiaomi":"Xiaomi","xiaomi_cn":"Xiaomi CN",
  "xiaomi_en":"Xiaomi EN","xiaomi-wear":"Xiaomi Wear","zhixuan":"Zhixuan","zte_cn":"ZTE CN"
};

// Regex for parsing markdown
var R_SERIES = /^##\s+(.+)/;
// Match: **[`COD`] Device (`codename`):**  (Apple/Xiaomi style with bracket codename)
var R_DEV_BRACKET = /^\*\*\[`([^`]+)`\]\s+(.+?)\s*\(`([^`]+)`\)\s*:\*\*/;
// Match: **Device (`codename`):**  (Samsung/Huawei style)
var R_DEV_PAREN = /^\*\*(.+?)\s*\(`([^`]+)`\)\s*:\*\*/;
// Match: **Device:**
var R_DEV_SIMPLE = /^\*\*(.+?)\s*:\*\*/;
// Match: `MODEL`: Description
var R_MODEL = /^`([^`]+)`\s*:\s*(.+)/;

function parseMD(text, brandId) {
  var lines = text.split('\n');
  var out = [], series = "", device = "", codename = "";
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;

    // Series header: ## Name
    var m = line.match(R_SERIES);
    if (m) { series = m[1].trim(); continue; }

    // **[`COD`] Device (`codename`):**  (Apple/Xiaomi)
    m = line.match(R_DEV_BRACKET);
    if (m) { device = m[2].trim(); codename = m[3].trim(); continue; }

    // **Device (`codename`):**  (Samsung/Huawei)
    m = line.match(R_DEV_PAREN);
    if (m) { device = m[1].trim(); codename = m[2].trim(); continue; }

    // **Device:**
    m = line.match(R_DEV_SIMPLE);
    if (m && line.indexOf('`') === -1) { device = m[1].trim(); codename = ""; continue; }

    // `MODEL`: Description
    m = line.match(R_MODEL);
    if (m && device) {
      out.push({ b: brandId, s: series, d: device, c: codename, m: m[1].trim(), t: m[2].trim() });
    }
  }
  return out;
}

var cache = null, cacheTime = 0;

async function getDb() {
  if (!cache || Date.now() - cacheTime > 3600000) {
    var all = [], promises = [];
    for (var j = 0; j < BRANDS.length; j++) {
      var id = BRANDS[j][0], file = BRANDS[j][1];
      var url = GH_API + "/" + file + "?ref=" + GH_BRANCH;
      promises.push(
        fetch(url, { headers: { "Accept": "application/vnd.github.v3.raw", "User-Agent": "MobileModels-CF/1.0" } })
          .then(function(r) { return r.ok ? r.text() : null; })
          .then(function(text) {
            if (!text) return;
            var parsed = parseMD(text, id);
            for (var k = 0; k < parsed.length; k++) all.push(parsed[k]);
          })
          .catch(function() {})
      );
    }
    await Promise.all(promises);
    cache = all;
    cacheTime = Date.now();
  }
  return cache;
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

var HOME = "<h1>MobileModels API</h1><p>Data: github.com/KHwang9883/MobileModels</p><p>Endpoints: /api/brands /api/brands/:id /api/search?q= /api/model/ /api/stats</p>";

export default {
  async fetch(request) {
    var url = new URL(request.url);
    var path = url.pathname;

    if (path === "/") {
      return new Response(HOME, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    try {
      var db = await getDb();

      // /api/brands
      if (path === "/api/brands") {
        var result = {};
        for (var j = 0; j < BRANDS.length; j++) {
          var id = BRANDS[j][0], count = 0;
          for (var k = 0; k < db.length; k++) { if (db[k].b === id) count++; }
          result[id] = { name: NAMES[id] || id, count: count };
        }
        return json({ success: true, brands: result });
      }

      // /api/brands/:id
      var match = path.match(/^\/api\/brands\/([a-zA-Z0-9_-]+)$/);
      if (match) {
        var bid = match[1];
        var arr = [];
        for (var k = 0; k < db.length; k++) {
          if (db[k].b === bid) arr.push(db[k]);
        }
        return json({ success: true, brand: bid, name: NAMES[bid] || bid, total: arr.length, devices: arr });
      }

      // /api/search?q=xxx&brand=xxx
      if (path === "/api/search") {
        var q = (url.searchParams.get("q") || "").toLowerCase();
        var b = url.searchParams.get("brand") || "";
        var results = [];
        for (var k = 0; k < db.length; k++) {
          var d = db[k];
          if (b && d.b !== b) continue;
          if (q && d.d.toLowerCase().indexOf(q) === -1 && d.m.toLowerCase().indexOf(q) === -1 && d.c.toLowerCase().indexOf(q) === -1 && d.t.toLowerCase().indexOf(q) === -1 && d.s.toLowerCase().indexOf(q) === -1) continue;
          results.push(d);
        }
        return json({ success: true, total: results.length, results: results.slice(0, 200) });
      }

      // /api/model/:modelNumber
      var mm = path.match(/^\/api\/model\/([A-Za-z0-9\-\/]+)$/);
      if (mm) {
        var mn = mm[1].toUpperCase();
        var results = [];
        for (var k = 0; k < db.length; k++) {
          if (db[k].m.indexOf(mn) !== -1) results.push(db[k]);
        }
        return json({ success: true, modelNumber: mn, total: results.length, results: results });
      }

      // /api/stats
      if (path === "/api/stats") {
        var seriesSet = {};
        for (var k = 0; k < db.length; k++) seriesSet[db[k].s] = 1;
        var sc = 0; for (var x in seriesSet) sc++;
        return json({ success: true, stats: { totalDevices: db.length, totalBrands: BRANDS.length, totalSeries: sc } });
      }

      return json({ error: "not found" }, 404);
    } catch(e) {
      return json({ error: e.message }, 500);
    }
  }
};
