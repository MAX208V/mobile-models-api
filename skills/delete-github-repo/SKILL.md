---
name: delete-github-repo
description: >-
  删除GitHub仓库。当用户想删除、移除、清理GitHub上的仓库(repo/repository)时**必须**使用此技能。
  包括"删掉仓库"、"删除repo"、"清掉项目"、"把xxx仓库删了"、"批量删仓库"、"清理GitHub"、
  "删掉没用的仓库"、"移除仓库"等表述，无论用户是否明确知道仓库名。
  也适用于用户想查看自己的仓库列表并从中选择删除的场景。
  这是一个危险操作，本技能内置了确认流程确保安全。任何涉及GitHub仓库删除的请求都必须使用此技能。
---

# Delete GitHub Repo Skill

## 概述

本 Skill 用于通过 GitHub API 安全删除 GitHub 仓库。支持**单个删除**和**批量删除**。

> ⚠️ **删除仓库是不可逆操作**，请务必谨慎。

---

## 🔑 Token 配置（必读）

本 Skill 需要 GitHub 认证才能操作。以下是三种配置方式，**选一种即可**：

### 方式一：GitHub CLI 认证（推荐 ⭐）

一行命令搞定，CLI 自动管理 Token：

```bash
gh auth login
```

跟着提示走，选择 "GitHub.com" → "HTTPS" → "Login with a browser" → 复制 code 去浏览器验证即可。

完成后验证：
```bash
gh auth status
# ✅ 看到 "Logged in to github.com" 就对了
```

> 💡 `gh` CLI 的 Token 是自动管理的，你不需要关心它存在哪里。
> 如果没装 `gh`：https://cli.github.com/

### 方式二：环境变量配置

创建 Personal Access Token：
1. 打开 https://github.com/settings/tokens
2. 点击 **Generate new token (classic)**
3. 勾选 **`delete_repo`** 权限（必须！）
4. 点击 Generate，复制 Token

配置到环境变量（二选一）：
```bash
# 临时使用（仅当前终端）
export GITHUB_TOKEN=ghp_xxxxxx

# 永久生效（写入配置文件）
echo 'export GITHUB_TOKEN=ghp_xxxxxx' >> ~/.zshrc  # macOS
# 或
echo 'export GITHUB_TOKEN=ghp_xxxxxx' >> ~/.bashrc  # Linux
source ~/.zshrc  # 重新加载
```

也支持 `$GH_TOKEN`（作用和 `$GITHUB_TOKEN` 一样）。

### 方式三：对话中提供（不推荐）

如果上面都没配置，也可以在对话时把 Token 发给 Claude。
但用完记得去 GitHub 撤销掉！

> ⚠️ **Token 安全提醒**：
> - Token 相当于密码，不要提交到代码仓库
> - 建议用完即撤销：https://github.com/settings/tokens
> - 最好使用方式一（gh CLI）或方式二（环境变量）

### 首次使用检测流程

当用户第一次使用本 Skill 时，按以下顺序检测认证状态：

```
检测 gh 是否安装 → 检测 gh auth status → 检测 $GITHUB_TOKEN / $GH_TOKEN
```

如果以上都未配置，引导用户选择一种方式配置后再继续操作。

---

## 工作流程

### Step 1：获取并展示仓库列表

**如果用户明确知道仓库名：**
直接确认目标 `owner/repo`，跳过列表展示。

**如果用户不确定或想批量删除：**
使用 `gh CLI` 列出仓库，以表格形式展示：

```bash
gh repo list <username> --limit 50 --json name,owner,description,isFork,updatedAt --template \
'{{range .}}{{tablerow (printf "%s/%s" .owner.login .name) (printf "%s" .description | truncate 40) (ternary "FORK" "SOURCE" .isFork) (timeago .updatedAt)}}{{end}}'
```

展示格式：
```
| # | 仓库名                      | 描述                   | 类型     | 更新于     |
|---|----------------------------|----------------------|---------|-----------|
| 1 | MAX208V/mobile-models-api  | MobileModels API...  | SOURCE  | 2天前      |
```

列出后询问用户要删除哪些。

### Step 2：用户指定要删除的仓库

用户可通过行号或仓库名指定，支持单个或批量。

### Step 3：汇总确认（二次确认）

列出所有要删除的仓库，让用户口头确认。

```
⚠️ 即将永久删除以下仓库（共 N 个）：
  1. owner/repo-a
  2. owner/repo-b

此操作不可逆！回复"确认"即执行。
```

用户回复"确认"、"删"、"是"、"好的"等即可执行。

### Step 4：执行删除

```bash
# 方式一：gh CLI（优先）
gh repo delete <owner>/<repo> --yes

# 方式二：curl（兜底）
TOKEN="${GITHUB_TOKEN:-$GH_TOKEN}"
curl -s -o /dev/null -w "%{http_code}" -L -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  https://api.github.com/repos/<owner>/<repo>
```

批量删除时逐个执行并实时反馈进度：
```
✅ [1/3] owner/repo-a → 成功
✅ [2/3] owner/repo-b → 成功
❌ [3/3] owner/repo-c → 失败（403 权限不足）
```

### Step 5：汇总结果

```
📋 删除操作报告
─────────────────────
✅ 成功: 2 个
❌ 失败: 1 个

失败详情：
- owner/repo-c: 403 Forbidden（权限不足）
```

## 错误处理

| 状态码 | 含义 | 处理方式 |
|--------|------|---------|
| 204 | ✅ 成功 | - |
| 403 | 权限不足 | 检查 token 是否有 delete_repo 权限，或确认你是仓库管理员 |
| 404 | 仓库不存在 | 检查 owner/repo 名称是否正确 |
| 401 | Token 无效/过期 | 重新生成 Token |

## 安全注意事项

1. **确认环节不可跳过**
2. **Token 用完提醒撤销**
3. **批量删除必须一次性列完再确认**
4. **公共仓库**删除会导致 Issues/PR/Wiki 永久丢失
5. **组织仓库**需管理员权限才能删除

## 使用示例

### 单个删除
```
用户：帮我把 MAX208V/old-test 删掉
Claude：确认要删除 MAX208V/old-test？这是不可逆操作，确认要删吗？
用户：确认
Claude：✅ 已成功删除
```

### 批量删除
```
用户：把我没用的测试仓库都清掉
Claude：列出表格... 请问要删哪些？
用户：第2、4、5行
Claude：即将删除3个仓库... 确认要删吗？
用户：删吧
Claude：✅ [1/3] ✅ [2/3] ✅ [3/3] 全部成功
```

### 权限不足
```
用户：删掉 someorg/private-repo
Claude：确认...
用户：确认
Claude：❌ 403 权限不足，只有组织管理员有权删除
```
