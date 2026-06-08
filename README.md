# 📱 MobileModels 设备数据库 API

基于 [KHwang9883/MobileModels](https://github.com/KHwang9883/MobileModels) 的 Markdown 设备数据，
通过 **Cloudflare Workers** 部署的轻量级 REST API 后端。

## 🌐 API 地址

```
https://mobile-models-db.max208.workers.dev
```

### 示例

```bash
# 品牌列表
curl https://mobile-models-db.max208.workers.dev/api/brands

# 查看小米国行设备
curl https://mobile-models-db.max208.workers.dev/api/brands/xiaomi_cn

# 搜索 iPhone
curl https://mobile-models-db.max208.workers.dev/api/search?q=iPhone

# 按型号查询 (iPhone 12 = A2404)
curl https://mobile-models-db.max208.workers.dev/api/model/A2404

# 搜索华为骁龙设备
curl https://mobile-models-db.max208.workers.dev/api/search?q=骁龙&brand=huawei_cn

# 统计信息
curl https://mobile-models-db.max208.workers.dev/api/stats
```

## 📖 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/` | Web 管理首页 |
| `GET` | `/api/brands` | 所有品牌列表 |
| `GET` | `/api/brands/:id` | 品牌详情 (`xiaomi_cn`, `huawei_cn`, `samsung_cn`...) |
| `GET` | `/api/search?q=xxx` | 全文搜索 |
| `GET` | `/api/model/A2404` | 按型号号码查询 |
| `GET` | `/api/devices?brand=xxx` | 设备过滤 |
| `GET` | `/api/stats` | 数据库统计 |

## 🔧 技术架构

```
GitHub KHwang9883/MobileModels (Markdown)
        │
        ▼ (Worker 启动时拉取并解析)
Cloudflare Worker (内存缓存 1h)
        │
        ▼
REST API → JSON 响应
```

## 📂 项目文件

- `src/worker.js` — Worker 完整源码
- `scripts/build-db.js` — 预构建 JSON 数据库脚本
- `wrangler.toml` — Wrangler 配置

## ⚡ 自行部署

1. 复制 `src/worker.js` 全部代码
2. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages
3. 创建 Worker → 粘贴 → 部署 ✅
