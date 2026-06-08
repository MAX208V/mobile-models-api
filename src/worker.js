// MobileModels Device Database API - Cloudflare Worker
// Data Source: github.com/KHwang9883/MobileModels

const GITHUB_OWNER = "KHwang9883";
const GITHUB_REPO = "MobileModels";
const GITHUB_BRANCH = "master";
const CACHE_TTL = 3600;
const GITHUB_RAW = "https://raw.githubusercontent.com";

const BRAND_FILES = {
  "360shouji": { file: "360shouji.md", name: "360手机", region: "cn" },
  "apple": { file: "apple_all.md", name: "Apple (Global)", region: "global" },
  "apple_cn": { file: "apple_cn.md", name: "Apple (CN)", region: "cn" },
  "apple_en": { file: "apple_all_en.md", name: "Apple (Global EN)", region: "global" },
  "asus_cn": { file: "asus_cn.md", name: "ASUS (CN)", region: "cn" },
  "asus_en": { file: "asus_en.md", name: "ASUS (Global)", region: "global" },
  "blackshark": { file: "blackshark.md", name: "Black Shark (CN)", region: "cn" },
  "coolpad": { file: "coolpad.md", name: "Coolpad", region: "cn" },
  "google": { file: "google.md", name: "Google", region: "global" },
  "honor_cn": { file: "honor_cn.md", name: "Honor (CN)", region: "cn" },
  "honor_global_en": { file: "honor_global_en.md", name: "Honor (Global)", region: "global" },
  "huawei_cn": { file: "huawei_cn.md", name: "Huawei (CN)", region: "cn" },
  "huawei_global_en": { file: "huawei_global_en.md", name: "Huawei (Global)", region: "global" },
  "lenovo_cn": { file: "lenovo_cn.md", name: "Lenovo (CN)", region: "cn" },
  "letv": { file: "letv.md", name: "LeTV", region: "cn" },
  "meizu": { file: "meizu.md", name: "Meizu (CN)", region: "cn" },
  "meizu_en": { file: "meizu_en.md", name: "Meizu (Global)", region: "global" },
  "mitv_cn": { file: "mitv_cn.md", name: "Mi TV (CN)", region: "cn" },
  "mitv_global_en": { file: "mitv_global_en.md", name: "Mi TV (Global)", region: "global" },
  "motorola_cn": { file: "motorola_cn.md", name: "Motorola (CN)", region: "cn" },
  "nokia_cn": { file: "nokia_cn.md", name: "Nokia (CN)", region: "cn" },
  "nothing": { file: "nothing.md", name: "Nothing", region: "global" },
  "nubia": { file: "nubia.md", name: "Nubia", region: "cn" },
  "oneplus": { file: "oneplus.md", name: "OnePlus (CN)", region: "cn" },
  "oneplus_en": { file: "oneplus_en.md", name: "OnePlus (Global)", region: "global" },
  "oppo_cn": { file: "oppo_cn.md", name: "OPPO (CN)", region: "cn" },
  "oppo_global_en": { file: "oppo_global_en.md", name: "OPPO (Global)", region: "global" },
  "realme_cn": { file: "realme_cn.md", name: "realme (CN)", region: "cn" },
  "realme_global_en": { file: "realme_global_en.md", name: "realme (Global)", region: "global" },
  "samsung_cn": { file: "samsung_cn.md", name: "Samsung (CN)", region: "cn" },
  "samsung_global_en": { file: "samsung_global_en.md", name: "Samsung (Global)", region: "global" },
  "smartisan": { file: "smartisan.md", name: "Smartisan", region: "cn" },
  "sony": { file: "sony.md", name: "Sony (Global)", region: "global" },
  "sony_cn": { file: "sony_cn.md", name: "Sony (CN)", region: "cn" },
  "vivo_cn": { file: "vivo_cn.md", name: "vivo (CN)", region: "cn" },
  "vivo_global_en": { file: "vivo_global_en.md", name: "vivo (Global)", region: "global" },
  "xiaomi": { file: "xiaomi.md", name: "Xiaomi (Global)", region: "global" },
  "xiaomi_cn": { file: "xiaomi_cn.md", name: "Xiaomi (CN)", region: "cn" },
  "xiaomi_en": { file: "xiaomi_en.md", name: "Xiaomi (Global EN)", region: "global" },
  "xiaomi-wear": { file: "xiaomi-wear.md", name: "Xiaomi Wear", region: "cn" },
  "zhixuan": { file: "zhixuan.md", name: "Zhixuan", region: "cn" },
  "zte_cn": { file: "zte_cn.md", name: "ZTE (CN)", region: "cn" }
};

function parseDevices(content, brandId) {
  const lines = content.split('\n');
  const devices = [];
  let curSeries = "";
  let curDevice = "";
  let curCodename = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Series headers: ## Series Name
    const sm = line.match(/^##\s+(.+)/);
    if (sm) { curSeries = sm[1].trim(); continue; }

    // Device with codename: **DevName (`codename`):**
    let m = line.match(/^\*\*(.+?)\s*\(`([^`]+)`\)\s*:\*\*/);
    if (m) { curDevice = m[1].trim(); curCodename = m[2].trim(); continue; }

    // Device simple: **DevName:**
    m = line.match(/^\*\*(.+?)\s*:\*\*/);
    if (m && !line.includes('`')) { curDevice = m[1].trim(); curCodename = ""; continue; }

    // Model line: `MODEL`: Description
    m = line.match(/^`([^`]+)`\s*:\s*(.+)/);
    if (m && curDevice) {
      devices.push({ brand: brandId, series: curSeries, device: curDevice, codename: curCodename, model: m[1].trim(), desc: m[2].trim() });
      continue;
    }
    
    // Model line with multiple models: `MODEL1` `MODEL2`: Description
    m = line.match(/^`([^`]+)`\s+`([^`]+)`\s*:\s*(.+)/);
    if (m && curDevice) {
      devices.push({ brand: brandId, series: curSeries, device: curDevice, codename: curCodename, model: m[1].trim() + ' / ' + m[2].trim(), desc: m[3].trim() });
      continue;
    }
  }
  return devices;
}

let cache = null;
let cacheTime = 0;

async function buildDb() {
  const all = [];
  const fetchPromises = [];
  
  for (const [id, info] of Object.entries(BRAND_FILES)) {
    const url = GITHUB_RAW + '/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/' + GITHUB_BRANCH + '/brands/' + info.file;
    fetchPromises.push(
      fetch(url).then(r => {
        if (!r.ok) return null;
        return r.text();
      }).then(text => {
        if (!text) return;
        const parsed = parseDevices(text, id);
        for (const d of parsed) all.push(d);
      }).catch(() => {})
    );
  }
  
  await Promise.all(fetchPromises);
  return all;
}

async function getDb() {
  if (!cache || Date.now() - cacheTime > CACHE_TTL * 1000) {
    cache = await buildDb();
    cacheTime = Date.now();
  }
  return cache;
}

function json(data, status) {
  return new Response(JSON.stringify(data, null, 2), {
    status: status || 200,
    headers: { 
      "Content-Type": "application/json; charset=utf-8", 
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300" 
    }
  });
}

const LANDING_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>MobileModels 设备数据库 API</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.6}
.container{max-width:960px;margin:0 auto;padding:2rem}
h1{font-size:2.5rem;background:linear-gradient(135deg,#60a5fa,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:0.5rem}
.sub{color:#94a3b8;margin-bottom:2rem}
h2{color:#60a5fa;margin:2rem 0 1rem}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:2rem}
.stat-card{background:#1e293b;border-radius:12px;padding:1.2rem;text-align:center;border:1px solid #334155}
.stat-card .n{font-size:2rem;font-weight:bold;color:#60a5fa}
.stat-card .l{color:#94a3b8;font-size:0.9rem;margin-top:0.3rem}
.endpoint{background:#1e293b;border-radius:8px;padding:1rem;margin-bottom:0.8rem;border:1px solid #334155}
.endpoint .method{display:inline-block;background:#22c55e;color:#000;font-weight:bold;padding:2px 8px;border-radius:4px;margin-right:8px;font-size:0.8rem}
.endpoint .path{font-family:monospace;color:#f472b6}
code{background:#334155;padding:2px 6px;border-radius:4px;font-size:0.9em}
pre{background:#1e293b;padding:1rem;border-radius:8px;overflow-x:auto;border:1px solid #334155;margin:0.5rem 0}
.footer{margin-top:3rem;padding-top:1.5rem;border-top:1px solid #334155;color:#64748b;text-align:center;font-size:0.85rem}
a{color:#60a5fa;text-decoration:none}
a:hover{text-decoration:underline}
</style></head>
<body><div class="container">
<h1>📱 MobileModels 设备数据库 API</h1>
<p class="sub">数据来源: <a href="https://github.com/KHwang9883/MobileModels" target="_blank">github.com/KHwang9883/MobileModels</a> | 部署于 Cloudflare Workers</p>

<div class="stats" id="stats">
  <div class="stat-card"><div class="n" id="devCount">-</div><div class="l">设备记录</div></div>
  <div class="stat-card"><div class="n" id="brandCount">-</div><div class="l">品牌文件</div></div>
  <div class="stat-card"><div class="n" id="seriesCount">-</div><div class="l">产品系列</div></div>
</div>

<h2>🚀 API 端点</h2>
<div class="endpoint"><span class="method">GET</span> <span class="path">/api/brands</span> — 获取所有品牌列表</div>
<div class="endpoint"><span class="method">GET</span> <span class="path">/api/brands/:brandId</span> — 获取指定品牌的所有设备</div>
<div class="endpoint"><span class="method">GET</span> <span class="path">/api/devices?brand=xxx&series=xxx</span> — 查询设备</div>
<div class="endpoint"><span class="method">GET</span> <span class="path">/api/search?q=关键词</span> — 全文搜索</div>
<div class="endpoint"><span class="method">GET</span> <span class="path">/api/model/MODEL</span> — 按型号号码查询 (如 A2404)</div>
<div class="endpoint"><span class="method">GET</span> <span class="path">/api/stats</span> — 数据库统计</div>

<h2>💡 使用示例</h2>
<pre># 搜索 iPhone 设备
curl https://mobile-models-db.你的域名.workers.dev/api/search?q=iPhone

# 查看小米国行所有设备
curl https://mobile-models-db.你的域名.workers.dev/api/brands/xiaomi_cn

# 按型号查询
curl https://mobile-models-db.你的域名.workers.dev/api/model/A2404</pre>

<script>
fetch('/api/stats').then(r=>r.json()).then(d=>{
  if(d.success){
    document.getElementById('devCount').textContent=d.stats.totalDevices;
    document.getElementById('brandCount').textContent=d.stats.totalBrands;
    document.getElementById('seriesCount').textContent=d.stats.totalSeries;
  }
});
</script>
</div></body></html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/' || path === '') {
      return new Response(LANDING_HTML, { 
        headers: { "Content-Type": "text/html; charset=utf-8" } 
      });
    }

    try {
      const db = await getDb();

      // GET /api/brands
      if (path === '/api/brands') {
        const brands = {};
        for (const [id, info] of Object.entries(BRAND_FILES)) {
          brands[id] = { 
            name: info.name, 
            region: info.region, 
            count: db.filter(d => d.brand === id).length 
          };
        }
        return json({ success: true, brands });
      }

      // GET /api/brands/:id
      const brandMatch = path.match(/^\/api\/brands\/([a-zA-Z0-9_-]+)$/);
      if (brandMatch) {
        const id = brandMatch[1];
        if (!BRAND_FILES[id]) {
          return json({ success: false, error: "Brand not found" }, 404);
        }
        const devices = db.filter(d => d.brand === id);
        const seriesMap = {};
        for (const d of devices) {
          if (!seriesMap[d.series]) seriesMap[d.series] = [];
          seriesMap[d.series].push(d);
        }
        return json({ 
          success: true, 
          brand: { id, ...BRAND_FILES[id] }, 
          series: seriesMap,
          total: devices.length 
        });
      }

      // GET /api/search
      if (path === '/api/search') {
        const q = (url.searchParams.get('q') || '').toLowerCase();
        const model = (url.searchParams.get('model') || '').toUpperCase();
        const brand = url.searchParams.get('brand') || '';
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);

        let results = db;
        if (brand) results = results.filter(d => d.brand === brand);
        if (q) {
          results = results.filter(d => 
            d.device.toLowerCase().includes(q) ||
            d.codename.toLowerCase().includes(q) ||
            d.model.toLowerCase().includes(q) ||
            d.series.toLowerCase().includes(q) ||
            d.desc.toLowerCase().includes(q)
          );
        }
        if (model) results = results.filter(d => d.model.includes(model));

        const total = results.length;
        const start = (page - 1) * limit;
        const paged = results.slice(start, start + limit);

        return json({
          success: true,
          query: { q, model, brand },
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
          results: paged
        });
      }

      // GET /api/model/:modelNumber
      const modelMatch = path.match(/^\/api\/model\/([A-Za-z0-9\-\/]+)$/);
      if (modelMatch) {
        const mn = modelMatch[1].toUpperCase();
        const results = db.filter(d => d.model.includes(mn));
        return json({ success: true, modelNumber: mn, total: results.length, results });
      }

      // GET /api/devices
      if (path === '/api/devices') {
        const brand = url.searchParams.get('brand') || '';
        const series = url.searchParams.get('series') || '';
        const q = (url.searchParams.get('q') || '').toLowerCase();
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);

        let results = db;
        if (brand) results = results.filter(d => d.brand === brand);
        if (series) results = results.filter(d => d.series.includes(series));
        if (q) results = results.filter(d => d.device.toLowerCase().includes(q) || d.model.toLowerCase().includes(q));

        const total = results.length;
        const start = (page - 1) * limit;
        const paged = results.slice(start, start + limit);

        return json({
          success: true,
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
          results: paged
        });
      }

      // GET /api/stats
      if (path === '/api/stats') {
        const brands = {};
        const seriesSet = new Set();
        for (const [id, info] of Object.entries(BRAND_FILES)) {
          const c = db.filter(d => d.brand === id).length;
          brands[id] = { name: info.name, count: c };
        }
        for (const d of db) seriesSet.add(d.series);
        return json({
          success: true,
          stats: {
            totalDevices: db.length,
            totalBrands: Object.keys(BRAND_FILES).length,
            totalSeries: seriesSet.size,
            brands
          }
        });
      }

      return json({ success: false, error: 'Not found' }, 404);
    } catch (e) {
      return json({ success: false, error: e.message }, 500);
    }
  }
};
