# 📱 MobileModels 设备数据库 API

基于 [KHwang9883/MobileModels](https://github.com/KHwang9883/MobileModels) 的 Markdown 设备数据，
通过 **Cloudflare Workers** 部署的轻量级 REST API 后端。

## 🚀 30 秒部署

**1. 打开 Cloudflare Dashboard → Workers & Pages → 创建 Worker**

**2. 删除默认代码，粘贴以下内容：**

👉 打开 [`src/worker.js`](src/worker.js) → 全选复制全部代码 → 粘贴到 Worker 编辑器

**3. 点击「部署」→ 完成！** 🎉

就这么简单，不需要任何配置或 API Key。

## 📖 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/` | Web 管理界面 |
| `GET` | `/api/brands` | 品牌列表 |
| `GET` | `/api/brands/:id` | 品牌详情 (如 `xiaomi_cn`) |
| `GET` | `/api/search?q=xxx` | 全文搜索 |
| `GET` | `/api/model/A2404` | 型号查询 |
| `GET` | `/api/devices?brand=xxx` | 设备过滤 |
| `GET` | `/api/stats` | 统计信息 |

### 示例

```bash
# 搜索 iPhone
curl https://你的域名.workers.dev/api/search?q=iPhone

# 查看小米国行所有设备
curl https://你的域名.workers.dev/api/brands/xiaomi_cn

# 查型号 A2404（iPhone 12）
curl https://你的域名.workers.dev/api/model/A2404

# 搜索三星骁龙设备
curl https://你的域名.workers.dev/api/search?q=骁龙&brand=samsung_cn
```

## 📂 项目结构

```
mobile-models-api/
├── src/
│   └── worker.js        ← Cloudflare Worker 主代码（核心）
├── scripts/
│   └── build-db.js      ← 预构建 JSON 数据库脚本
├── wrangler.toml        ← Wrangler 配置
├── package.json
└── README.md
```

## 💡 工作原理

Worker 在首次请求时从 GitHub 拉取所有品牌的 Markdown 文件，即时解析为结构化 JSON，缓存 1 小时后自动刷新。

数据覆盖 **40+ 品牌**、数千款设备，包括 Apple、Samsung、Huawei、Xiaomi、OPPO、vivo、Honor 等。

## 📝 License

MIT
