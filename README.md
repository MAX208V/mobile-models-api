# 📱 MobileModels 设备数据库 API

> 基于 [KHwang9883/MobileModels](https://github.com/KHwang9883/MobileModels) 仓库的 Markdown 设备数据，
> 通过 **Cloudflare Workers** 部署的轻量级 REST API 后端。

## ✨ 功能

- ✅ 自动从 GitHub 拉取 40+ 品牌数据
- ✅ 解析 Markdown 为结构化 JSON
- ✅ 支持品牌、系列、型号、代号搜索
- ✅ 内存缓存（1小时 TTL），性能优异
- ✅ 全平台 CORS 跨域支持
- ✅ 美观的 Web 管理界面
- ✅ 无需任何 API Key 或数据库

## 🚀 快速部署（1 分钟）

### 方式一：Cloudflare Dashboard（最简单）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** > **创建应用程序** > **创建 Worker**
3. 删除默认代码，粘贴下方代码：
4. 点击 **部署**

代码文件：[`src/worker.js`](src/worker.js) — 直接复制全部内容到 Worker 编辑器。

### 方式二：GitHub Actions（自动部署）

1. **Fork** 本仓库
2. 在 GitHub 仓库 **Settings > Secrets and variables > Actions** 添加：
   - `CLOUDFLARE_API_TOKEN` — 你的 Cloudflare API 令牌（需 Workers 编辑权限）
   - `CLOUDFLARE_ACCOUNT_ID` — 你的 Cloudflare 账户 ID
3. Push 到 `main` 分支，自动部署

### 方式三：Wrangler CLI

```bash
npm install -g wrangler
wrangler login
git clone https://github.com/MAX208V/mobile-models-api.git
cd mobile-models-api
wrangler deploy
```

## 📖 API 文档

### `GET /` — 首页

漂亮的 Web 界面，展示所有品牌和统计数据。

### `GET /api/brands` — 品牌列表

```json
{
  "success": true,
  "brands": {
    "apple_cn": { "name": "Apple (CN)", "region": "cn", "count": 120 },
    "xiaomi_cn": { "name": "Xiaomi (CN)", "region": "cn", "count": 340 }
  }
}
```

### `GET /api/brands/:id` — 品牌详情

```
GET /api/brands/xiaomi_cn
GET /api/brands/huawei_cn
GET /api/brands/samsung_global_en
```

### `GET /api/search?q=关键词` — 全文搜索

```
GET /api/search?q=iPhone
GET /api/search?q=骁龙&brand=xiaomi_cn
GET /api/search?q=A2404
```

### `GET /api/model/:modelNumber` — 型号查询

```
GET /api/model/A2404        # 查询型号 A2404
GET /api/model/SM-G9730     # 查询三星型号
```

### `GET /api/devices?brand=xxx&series=xxx` — 设备过滤

```
GET /api/devices?brand=apple_cn
GET /api/devices?brand=xiaomi_cn&series=小米数字系列
```

### `GET /api/stats` — 统计信息

```json
{
  "success": true,
  "stats": {
    "totalDevices": 5842,
    "totalBrands": 42,
    "totalSeries": 312
  }
}
```

## 🏗 架构

```
┌──────────────────────────────────────────────────┐
│                  Cloudflare Worker               │
│                                                   │
│  ┌──────────┐    ┌────────────┐    ┌──────────┐  │
│  │ GitHub    │───▶│ Markdown   │───▶│ JSON     │  │
│  │ Raw       │    │ Parser     │    │ Database │  │
│  └──────────┘    └────────────┘    └──────────┘  │
│                                        │          │
│  ┌──────────┐    ┌────────────┐        │          │
│  │ Web UI   │    │ REST API  │◀───────┘          │
│  │ (HTML)   │    │ (JSON)    │                   │
│  └──────────┘    └────────────┘                   │
└──────────────────────────────────────────────────┘
```

## 🔧 技术栈

| 组件 | 技术 |
|------|------|
| 运行时 | Cloudflare Workers |
| 数据源 | GitHub Raw Markdown |
| 解析 | 纯 JavaScript |
| 缓存 | 内存缓存（1h TTL） |
| 部署 | Wrangler / GitHub Actions |
| 跨域 | CORS 全开放 |

## 📂 数据来源

所有设备数据来自 [KHwang9883/MobileModels](https://github.com/KHwang9883/MobileModels) 仓库，涵盖：

- **Apple**: iPhone, iPad, Apple Watch, Apple Vision, iPod touch
- **小米/Xiaomi**: 数字系列, MIX, Redmi, 平板
- **华为**: Mate, Pura, nova, 畅享, 平板, 穿戴
- **三星**: Galaxy S/Note/Z/A, Galaxy Watch, Tab
- **OPPO, vivo, 荣耀, 一加, 真我, 魅族...** 等 40+ 品牌

数据自动同步，Worker 每小时自动拉取最新版本。

## 📝 License

MIT
