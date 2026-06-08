/**
 * MobileModels Device Database Builder
 * 
 * Pre-builds the device database from GitHub Markdown files
 * into a single JSON file for static deployment.
 * 
 * Usage: node scripts/build-db.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const GITHUB_OWNER = 'KHwang9883';
const GITHUB_REPO = 'MobileModels';
const GITHUB_BRANCH = 'master';
const RAW_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;

const BRAND_FILES = {
  "360shouji": { file: "360shouji.md", name: "360手机", region: "cn" },
  "apple": { file: "apple_all.md", name: "Apple (Global)", region: "global" },
  "apple_cn": { file: "apple_cn.md", name: "Apple (CN)", region: "cn" },
  "apple_en": { file: "apple_all_en.md", name: "Apple (EN)", region: "global" },
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
  "xiaomi_en": { file: "xiaomi_en.md", name: "Xiaomi (EN)", region: "global" },
  "xiaomi-wear": { file: "xiaomi-wear.md", name: "Xiaomi Wear", region: "cn" },
  "zhixuan": { file: "zhixuan.md", name: "Zhixuan", region: "cn" },
  "zte_cn": { file: "zte_cn.md", name: "ZTE (CN)", region: "cn" }
};

function parseDevices(content, brandId) {
  const lines = content.split('\n');
  const devices = [];
  let curSeries = '';
  let curDevice = '';
  let curCodename = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Series: ## Series Name
    const sm = line.match(/^##\s+(.+)/);
    if (sm) { curSeries = sm[1].trim(); continue; }

    // Device with codename: **DevName (`codename`):**
    let m = line.match(/^\*\*(.+?)\s*\(`([^`]+)`\)\s*:\*\*/);
    if (m) { curDevice = m[1].trim(); curCodename = m[2].trim(); continue; }

    // Device: **DevName:**
    m = line.match(/^\*\*(.+?)\s*:\*\*/);
    if (m && !line.includes('`')) { curDevice = m[1].trim(); curCodename = ''; continue; }

    // `MODEL`: Description
    m = line.match(/^`([^`]+)`\s*:\s*(.+)/);
    if (m && curDevice) {
      devices.push({ brand: brandId, series: curSeries, device: curDevice, codename: curCodename, model: m[1].trim(), desc: m[2].trim() });
      continue;
    }

    // `MODEL1` `MODEL2`: Description
    m = line.match(/^`([^`]+)`\s+`([^`]+)`\s*:\s*(.+)/);
    if (m && curDevice) {
      devices.push({ brand: brandId, series: curSeries, device: curDevice, codename: curCodename, model: m[1].trim() + ' / ' + m[2].trim(), desc: m[3].trim() });
      continue;
    }
  }
  return devices;
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function build() {
  console.log('📱 Building MobileModels Device Database...\n');

  const allDevices = [];
  const brandInfo = {};

  const entries = Object.entries(BRAND_FILES);
  for (let i = 0; i < entries.length; i++) {
    const [id, info] = entries[i];
    const url = `${RAW_URL}/brands/${info.file}`;
    
    process.stdout.write(`  [${i + 1}/${entries.length}] ${info.name.padEnd(20)} `);
    
    try {
      const content = await fetchUrl(url);
      const devices = parseDevices(content, id);
      allDevices.push(...devices);
      brandInfo[id] = { name: info.name, region: info.region, count: devices.length };
      console.log(`✓ ${devices.length} devices`);
    } catch (e) {
      console.log(`✗ ${e.message}`);
    }
  }

  console.log(`\n✅ Total: ${allDevices.length} devices from ${Object.keys(brandInfo).length} brands`);

  // Build output
  const seriesSet = new Set(allDevices.map(d => d.series));
  const modelSet = new Set(allDevices.map(d => d.model));

  const output = {
    meta: {
      version: '1.0.0',
      builtAt: new Date().toISOString(),
      source: `${GITHUB_OWNER}/${GITHUB_REPO}`,
      totalDevices: allDevices.length,
      totalBrands: Object.keys(brandInfo).length,
      totalSeries: seriesSet.size,
      uniqueModels: modelSet.size
    },
    brands: brandInfo,
    devices: allDevices
  };

  // Write JSON
  const outDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  
  const jsonPath = path.join(outDir, 'devices.json');
  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n📦 Written to: ${jsonPath}`);
  console.log(`   Size: ${(fs.statSync(jsonPath).size / 1024 / 1024).toFixed(2)} MB`);

  // Write minified version
  const minPath = path.join(outDir, 'devices.min.json');
  fs.writeFileSync(minPath, JSON.stringify(output), 'utf-8');
  console.log(`   Minified: ${(fs.statSync(minPath).size / 1024 / 1024).toFixed(2)} MB`);
}

build().catch(console.error);
