---
name: delete-github-repo
description: >-
  删除GitHub仓库。当用户想删除、移除、清理GitHub上的仓库(repo/repository)时使用此技能。
  包括"删掉我的仓库"、"删除repo"、"清掉GitHub上那个项目"、"把xxx仓库删了"、"批量删仓库"等表述。
  这是一个危险操作，本技能内置了确认流程。务必使用此技能处理任何与删除GitHub仓库相关的请求。
---

# Delete GitHub Repo Skill

## 概述

本 Skill 用于通过 GitHub API 安全删除 GitHub 仓库。支持**单个删除**和**批量删除**。

> ⚠️ **删除仓库是不可逆操作**，请务必谨慎。

## 前置条件

执行删除操作前，需要满足以下条件之一：

### 方式一：使用 GitHub CLI (推荐)
- 系统已安装 `gh` (GitHub CLI)，已通过 `gh auth login` 完成认证
- Token 需要有 `delete_repo` 权限

### 方式二：使用 curl + Token
- 拥有 GitHub Personal Access Token (classic)，**必须勾选 `delete_repo` 权限**
- Token 可通过以下方式获取：
  - 环境变量 `$GITHUB_TOKEN` 或 `$GH_TOKEN`
  - 让用户提供（提醒用完及时撤销）

> 💡 **没有配置 Token？** 引导用户前往 https://github.com/settings/tokens 创建，
> 并明确告知需要勾选 `delete_repo` 权限。

## 工作流程

### Step 1: 获取并展示仓库列表

**如果用户想删除特定的仓库，且明确知道仓库名：**
直接确认目标 `owner/repo`，跳过列表展示。

**如果用户想删除仓库但不确定具体名称，或想批量删除：**
使用 `gh CLI` 列出用户的仓库，以表格形式展示：

```bash
gh repo list <username> --limit 50 --json name,owner,description,isFork,updatedAt --template \
'{{range .}}{{tablerow (printf "%s/%s" .owner.login .name) (printf "%s" .description | truncate 40) (ternary "FORK" "SOURCE" .isFork) (timeago .updatedAt)}}{{end}}'
```

展示效果示例：
```
| 仓库名                      | 描述                   | 类型     | 更新于     |
|----------------------------|----------------------|---------|-----------|
| MAX208V/mobile-models-api  | MobileModels API...  | SOURCE  | 2天前      |
| MAX208V/MAX208V.github.io  | 个人主页               | SOURCE  | 8个月前    |
| MAX208V/archived-project   | 已归档的老项目           | SOURCE  | 1年前      |
```

### Step 2: 用户指定要删除的仓库

用户可以通过以下方式指定：
- **单独删除**："帮我把 MAX208V/old-project 删掉"
- **批量删除**："把第1、3、5行删掉" / "删掉 mobile-models-api 和 old-project"

如果用户使用行号或模糊名称，对照表格帮用户明确对应到具体的 `owner/repo`。

### Step 3: 汇总确认（二次确认）

在用户指定完要删除的仓库后，**以列表形式汇总展示给用户确认**：

```
⚠️ 即将永久删除以下仓库（共 N 个）：
  1. MAX208V/repo-a
  2. MAX208V/repo-b
  3. MAX208V/repo-c

⚠️ 此操作不可逆！删除后无法恢复！
请确认是否继续？(回复"确认"或"删"即执行)
```

**确认方式**：用户口头回复"确认"、"删"、"是"、"好的"等肯定语句即可执行。
**如果用户反悔**或不确认，则不执行任何操作。

> 🎯 设计意图：二次确认的目的是防止误操作，而不是为难用户。
> 用汇总列表的方式让用户一目了然地看到"将要删除什么"，比强行要求输入完整仓库名更自然。
> 用户口头确认即可，尊重用户的自主决策权。

### Step 4: 执行删除

确认后，逐个执行删除操作：

```bash
# 方式一：使用 gh CLI（优先）
gh repo delete <owner>/<repo> --yes

# 方式二：使用 curl
TOKEN="${GITHUB_TOKEN:-$GH_TOKEN}"
curl -s -o /dev/null -w "%{http_code}" -L -X DELETE \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/<owner>/<repo>"
```

**批量删除时**，逐个执行并实时反馈进度：
```
✅ [1/3] MAX208V/repo-a → 删除成功
✅ [2/3] MAX208V/repo-b → 删除成功
❌ [3/3] MAX208V/repo-c → 删除失败（原因：...）
```

### Step 5: 汇总结果

删除完成后，给出一份清晰的执行报告：

```
📋 删除操作报告
─────────────────────
✅ 成功: 2 个
❌ 失败: 1 个

失败详情：
- MAX208V/repo-c: 403 Forbidden（权限不足，你不是该仓库的管理员）
```

## 错误处理参考

| HTTP 状态码 | 含义 | 解决方案 |
|------------|------|---------|
| **204** | ✅ 删除成功 | — |
| **403** | 权限不足 | Token 缺少 `delete_repo` 权限，或你不是仓库管理员 |
| **404** | 仓库不存在 | 检查 `owner/repo` 名称是否正确 |
| **401** | Token 无效/过期 | 重新生成 Token |
| **422** | 请求无效 | 检查请求参数 |

## 安全注意事项

1. **确认环节不可跳过**：无论用户如何催促，都必须执行汇总确认步骤
2. **Token 安全**：提醒用户不要将 Token 硬编码在脚本中，用完及时撤销
3. **批量删除保护**：批量删除时，所有仓库必须**一次性列出确认**，不能逐个确认后悄悄删除更多
4. **公共仓库提醒**：删除公共仓库不会删除其 fork，但所有 Issues、PR、Wiki、Pages 将永久丢失
5. **组织仓库**：只有组织 owner 或有 admin 权限的成员才能删除组织仓库。如果删除失败提示 403，提醒用户检查权限
6. **已归档仓库**：归档的仓库也可以删除，删除前提醒用户该仓库已归档

## 使用示例

### 示例 1：单个仓库
```
用户：帮我把 MAX208V/old-test 删掉

Claude：确认要删除 → MAX208V/old-test
        ⚠️ 这是不可逆操作，确认要删吗？

用户：确认

Claude：✅ 已成功删除 MAX208V/old-test
```

### 示例 2：批量删除
```
用户：把我GitHub上那些没用的测试仓库都清掉

Claude：列出仓库表格...
        请问要删哪些？

用户：第2、4、5行

Claude：即将删除以下3个仓库：
        1. MAX208V/test-a
        2. MAX208V/test-b
        3. MAX208V/test-c
        确认要删吗？

用户：删吧

1/test-a成功        ✅ [2/3] MAX208V/test-b → 成功
        ✅ [3/3] MAX208V/test-c → 成功
```

### 示例 3：权限不足
```
用户：删掉 someorg/private-repo

Claude：确认...
用户：确认

Claude：❌ 删除失败（403 Forbidden）
        原因：这个仓库属于组织 someorg，
        只有组织管理员才有权删除。
        建议联系组织管理员，或在 GitHub 网页端操作。
```
