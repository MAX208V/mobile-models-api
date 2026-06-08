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

## 前置条件

执行删除操作前，需要满足以下条件之一：

### 方式一：使用 GitHub CLI（推荐）
- 系统已安装 `gh`（GitHub CLI），已通过 `gh auth login` 完成认证
- Token 需要有 `delete_repo` 权限

### 方式二：使用 curl + Token
- 拥有 GitHub Personal Access Token（classic），**必须勾选 `delete_repo` 权限**
- Token 可通过环境变量 `$GITHUB_TOKEN` 或 `$GH_TOKEN` 获取，或由用户提供

> 💡 **没有配置 Token？** 引导用户前往 https://github.com/settings/tokens 创建

## 工作流程

### Step 1：获取并展示仓库列表

**如果用户明确知道仓库名：**
直接确认目标 `owner/repo`，跳过列表展示。

**如果用户不确定或想批量删除：**
使用 `gh CLI` 列出仓库，以表格形式展示：

```
| # | 仓库名 | 描述 | 类型 | 更新于 |
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

# 方式二：curl
curl -L -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  https://api.github.com/repos/<owner>/<repo>
```

批量删除时逐个执行并反馈进度：✅ [1/3] 成功 / ❌ [2/3] 失败

### Step 5：汇总结果

报告成功/失败数量及失败原因。

## 错误处理

| 状态码 | 含义 | 处理方式 |
|--------|------|---------|
| 204 | 成功 | - |
| 403 | 权限不足 | 检查 delete_repo 权限或仓库所有权 |
| 404 | 仓库不存在 | 检查 owner/repo 名称 |
| 401 | Token 无效 | 重新生成 Token |

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
