// MobileModels Device Database API - Cloudflare Worker
// Uses GitHub API instead of raw.githubusercontent.com
// Data Source: github.com/KHwang9883/MobileModels

const GITHUB_OWNER = "KHwang9883";
const GITHUB_REPO = "MobileModels";
const GITHUB_BRANCH = "master";
const GH_API = "https://api.github.com/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/brands";

const BRAND_FILES = [
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

var BRAND_NAMES = {
  "360shouji":"360手机","apple":"Apple (Global)","apple_cn":"Apple (CN)","apple_en":"Apple (EN)",
  "asus_cn":"ASUS (CN)","asus_en":"ASUS (Global)","blackshark":"Black Shark (CN)",
  "coolpad":"Coolpad","google":"Google","honor_cn":"Honor (CN)","honor_global_en":"Honor (Global)",
  "huawei_cn":"Huawei (CN)","huawei_global_en":"Huawei (Global)","lenovo_cn":"Lenovo (CN)",
  "letv":"LeTV","meizu":"Meizu (CN)","meizu_en":"Meizu (Global)","mitv_cn":"Mi TV (CN)",
  "mitv_global_en":"Mi TV (Global)","motorola_cn":"Motorola (CN)","nokia_cn":"Nokia (CN)",
  "nothing":"Nothing","nubia":"Nubia","oneplus":"OnePlus (CN)","oneplus_en":"OnePlus (Global)",
  "oppo_cn":"OPPO (CN)","oppo_global_en":"OPPO (Global)","realme_cn":"realme (CN)",
  "realme_global_en":"realme (Global)","samsung_cn":"Samsung (CN)","samsung_global_en":"Samsung (Global)",
  "smartisan":"Smartisan","sony":"Sony (Global)","sony_cn":"Sony (CN)","vivo_cn":"vivo (CN)",
  "vivo_global_en":"vivo (Global)","xiaomi":"Xiaomi (Global)","xiaomi_cn":"Xiaomi (CN)",
  "xiaomi_en":"Xiaomi (EN)","xiaomi-wear":"Xiaomi Wear","zhixuan":"Zhixuan","zte_cn":"ZTE (CN)"
};

// Regex patterns
var R_SERIES = new RegExp("^##\\s+(.+)");
var R_DEVICE_CODENAME = new RegExp("^\\*\\*(.+?)\\s*\\(`([^`]+)`\\)\\s*:\\*\\*");
var R_DEVICE_SIMPLE = new RegExp("^\\*\\*(.+?)\\s*:\\*\\*");
var R_MODEL = new RegExp("^`([^`]+)`\\s*:\\s*(.+)");

function parseMD(text, brand) {
  var lines = text.split('\n');
  var devices = [];
  var series = "", device = "", codename = "";

  for (var i = 0; i < lines.length; i++) {
    var l = lines[i].trim();
    if (!l) continue;
    
    var m = l.match(R_SERIES);
    if (m) { series = m[1].trim(); continue; }
    
    m = l.match(R_DEVICE_CODENAME);
    if (m) { device = m[1].trim(); codename = m[2].trim(); continue; }
    
    m = l.match(R_DEVICE_SIMPLE);
    if (m && l.indexOf('`') === -1) { device = m[1].trim(); codename = ""; continue; }
    
    m = l.match(R_MODEL);
    if (m && device) {
      devices.push({ brand: brand, series: series, device: device, codename: codename, model: m[1].trim(), desc: m[2].trim() });
    }
  }
  return devices;
}

var cache = null;
var cacheTime = 0;

async function getDb() {
  if (!cache || Date.now() - cacheTime > 3600000) {
    var all = [];
    var ps = [];
    
    for (var j = 0; j < BRAND_FILES.length; j++) {
      var id = BRAND_FILES[j][0];
      var file = BRAND_FILES[j][1];
      var url = GH_API + "/" + file + "?ref=" + GITHUB_BRANCH;
      
      ps.push(
        fetch(url, { 
          headers: { "Accept": "application/vnd.github.v3.raw", "User-Agent": "MobileModels-API/1.0" } 
        }).then(function(r) {
          if (!r.ok) return null;
          return r.text();
        }).then(function(text) {
          if (!text) return;
          var parsed = parseMD(text, id);
          for (var k = 0; k < parsed.length; k++) all.push(parsed[k]);
        }).catch(function(e) {
          console.log("Error fetching " + id + ": " + e.message);
        })
      );
    }
    
    await Promise.all(ps);
    cache = all;
    cacheTime = Date.now();
  }
  return cache;
}

function json(data, s) {
  return new Response(JSON.stringify(data), {
    status: s || 200,
    headers: { 
      "Content-Type": "application/json; charset=utf-8", 
      "Access-Control-Allow-Origin": "*", 
      "Cache-Control": "public, max-age=300" 
    }
  });
}

var PAGE = "<html><head><meta charset='utf-8'><title>MobileModels API</title>" +
  "<style>body{font-family:sans-serif;background:#0f172a;color:#e2e8f0;max-width:800px;margin:0 auto;padding:2rem}" +
  "h1{background:linear-gradient(135deg,#60a5fa,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}" +
  ".e{background:#1e293b;padding:1rem;border-radius:8px;margin:0.5rem 0;border:1px solid #334155;font-family:monospace}" +
  ".m{display:inline-block;background:#22c55e;color:#000;padding:2px 8px;border-radius:4px;margin-right:8px}" +
  "pre{background:#1e293b;padding:1rem;border-radius:8px;border:1px solid #334155}" +
  "a{color:#60a5fa}</style></head><body>" +
  "<h1>MobileModels 设备数据库 API</h1>" +
  "<p>数据: github.com/KHwang9883/MobileModels | 部署于 Cloudflare Workers</p>" +
  "<h2>API 端点</h2>" +
  "<div class='e'><span class='m'>GET</span> /api/brands - 品牌列表</div>" +
  "<div class='e'><span class='m'>GET</span> /api/brands/:id - 品牌设备</div>" +
  "<div class='e'><span class='m'>GET</span> /api/search?q=xxx - 搜索</div>" +
  "<div class='e'><span class='m'>GET</span> /api/model/A2404 - 型号查询</div>" +
  "<div class='e'><span class='m'>GET</span> /api/stats - 统计</div>" +
  "<h2>示例</h2>" +
  "<pre>curl https://mobile-models-db.max208.workers.dev/api/search?q=iPhone\\n" +
  "curl https://mobile-models-db.max208.workers.dev/api/brands/xiaomi_cn\\n" +
  "curl https://mobile-models-db.max208.workers.dev/api/model/A2404</pre>" +
  "<p style='color:#64748b;text-align:center;margin-top:2rem'>Cloudflare Workers</p></body></html>";

export default {
  async fetch(request) {
    var url = new URL(request.url);
    var path = url.pathname;

    if (path === "/") {
      return new Response(PAGE, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    try {
      var db = await getDb();

      if (path === "/api/brands") {
        var brands = {};
        for (var j = 0; j < BRAND_FILES.length; j++) {
          var id = BRAND_FILES[j][0];
          var count = 0;
          for (var k = 0; k < db.length; k++) {
            if (db[k].brand === id) count++;
          }
          brands[id] = { name: BRAND_NAMES[id] || id, count: count };
        }
        return json({ success: true, total: Object.keys(brands).length, brands: brands });
      }

      var bm = path.match(/^\/api\/brands\/([a-zA-Z0-9_-]+)$/);
      if (bm) {
        var bid = bm[1];
        var exists = false;
        for (var j = 0; j < BRAND_FILES.length; j++) {
          if (BRAND_FILES[j][0] === bid) { exists = true; break; }
        }
        if (!exists) return json({ error: "not found" }, 404);
        var devices = [];
        for (var k = 0; k < db.length; k++) {
          if (db[k].brand === bid) devices.push(db[k]);
        }
        return json({ success: true, brand: bid, name: BRAND_NAMES[bid] || bid, total: devices.length, devices: devices });
      }

      if (path === "/api/search") {
        var q = (url.searchParams.get("q") || "").toLowerCase();
        var b = url.searchParams.get("brand") || "";
        var results = [];
        for (var k = 0; k < db.length; k++) {
          var d = db[k];
          if (b && d.brand !== b) continue;
          if (q && d.device.toLowerCase().indexOf(q) === -1 && 
              d.model.toLowerCase().indexOf(q) === -1 && 
              d.codename.toLowerCase().indexOf(q) === -1 &&
              d.desc.toLowerCase().indexOf(q) === -1 &&
              d.series.toLowerCase().indexOf(q) === -1) continue;
          results.push(d);
        }
        return json({ success: true, total: results.length, results: results.slice(0, 200) });
      }

      var mm = path.match(/^\/api\/model\/([A-Za-z0-9\-\/]+)$/);
      if (mm) {
        var mn = mm[1].toUpperCase();
        var results = [];
        for (var k = 0; k < db.length; k++) {
          if (db[k].model.indexOf(mn) !== -1) results.push(db[k]);
        }
        return json({ success: true, model: mn, total: results.length, results: results });
      }

      if (path === "/api/stats") {
        var s = {};
        for (var k = 0; k < db.length; k++) {
          s[db[k].series] = true;
        }
        var seriesCount = 0;
        for (var x in s) seriesCount++;
        return json({ success: true, stats: { devices: db.length, brands: BRAND_FILES.length, series: seriesCount } });
      }

      return json({ error: "not found" }, 404);
    } catch(e) {
      return json({ error: e.message }, 500);
    }
  }
};
