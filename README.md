# 🧠 My AI Brain - 项目文档

## 1. 项目简介
**My AI Brain** 是一个 Chrome 浏览器扩展（Manifest V3），旨在作为用户的“第二大脑”。它可以帮助用户在浏览网页时快速收集信息片段（资料、规则、技能），并在侧边栏中对这些信息进行管理、组合，最后一键生成结构化的 AI 提示词（Prompt）。

> 💡 **核心价值**：解决了在使用 ChatGPT/Claude 等 AI 时，需要反复复制粘贴背景资料、设定重复规则的痛点。

## 2. 核心原理与架构
本项目采用 **React + TypeScript + MUI** 构建，基于 Chrome Extension V3 架构。

### 🔄 数据流向与同步机制（核心难点已攻克）
为了保证用户在网页上操作（右键/悬浮球）后，侧边栏 UI 能毫秒级响应，我们采用了“双保险”同步机制：

1.  **单一数据源 (Single Source of Truth)**
    *   所有数据存储在 `chrome.storage.local` 中。
2.  **写入端 (Content Script / Background)**
    *   用户划词保存 -> 写入 Storage -> 主动广播消息 (`chrome.runtime.sendMessage({ action: 'refresh_memories' })`)。
3.  **接收端 (React Side Panel)**
    *   **监听器 1**：`chrome.storage.onChanged` —— 监听底层数据变化。
    *   **监听器 2**：`chrome.runtime.onMessage` —— 接收主动刷新指令（作为保险）。
4.  **数据清洗网关**
    *   所有进入 React state 的数据都会经过 `refreshData()` 函数清洗，补全缺失字段，防止因数据格式错误导致的白屏崩溃。

### 🛠️ 关键技术点
*   **Shadow DOM / Content Script Injection**：在任意网页注入悬浮球，同时通过 Z-Index 管理防止被网页元素遮挡。
*   **Extension Context Keep-Alive**：在 Content Script 中加入了存活检查 (`isExtensionValid`)，防止插件更新后旧网页报错。
*   **Layout Stability**：使用 Flexbox + 100vh 锁定布局，确保在不同屏幕和侧边栏宽度下，输入框永远固定在底部，列表区域独立滚动。

## 3. 功能特点

### A. 多维度记忆管理
插件将收集的信息分为三类（UI 上用不同颜色区分）：
*   🟩 **Context (资料)**：作为背景信息提供给 AI（如：文章段落、API文档、错误日志）。
*   🟨 **Rule (规则)**：约束 AI 的行为（如：“请用中文回答”、“代码必须写注释”）。
*   🟪 **Skill (技能/模版)**：预设的 Prompt 模版（如：“翻译这段话”、“总结中心思想”）。

### B. 高效采集方式
*   🖱️ **划词悬浮球**
    *   选中网页文字 -> 鼠标抬起 -> 出现 🧠 悬浮球 -> 点击即存。
    *   *交互细节*：支持动画反馈，点击空白处自动隐藏。
*   🖱️ **右键菜单**
    *   选中文字 -> 右键 -> 选择 "Save to Brain 🧠"。
*   ⌨️ **手动输入**
    *   在侧边栏直接点击 "New" 按钮添加。

### C. 提示词组装 (Prompt Assembly)
这是本工具的最终目的。点击底部的 "Assemble & Copy Prompt" 按钮时，程序会执行以下逻辑：
1.  筛选出所有 `isActive = true` 的 **Rules**。
2.  筛选出所有 `isActive = true` 的 **Contexts**。
3.  结合底部的用户输入框内容。
4.  按照 `System (Rules)` -> `Context` -> `User Input` 的结构拼接成一段完整的 Prompt 并复制到剪贴板。

## 4. 文件结构说明

```text
src/
├── background.ts      # [后台进程] 处理右键菜单点击事件，负责后台数据写入和广播
├── content.ts         # [网页脚本] 负责注入悬浮球，处理划词交互，检测插件存活状态
├── App.tsx            # [主界面] React 组件，侧边栏的核心 UI 和业务逻辑
└── index.css          # [全局样式] 负责重置滚动条样式和 100% 高度布局

public/
└── manifest.json      # [配置文件] 权限声明 (storage, sidePanel, contextMenus 等)
```

## 5. 使用方式指南

### 步骤 1：收集素材
*   浏览网页时，看到有用的段落，直接选中文字，点击出现的悬浮球，存为“资料”。
*   看到需要遵守的规范，选中后右键存入。

### 步骤 2：整理大脑 (Side Panel)
*   点击浏览器工具栏的插件图标，打开侧边栏。
*   你可以在这里修改刚刚抓取的内容的类型（比如把某段文字从“资料”改为“规则”）。
*   **开关控制**：点击卡片右侧的 ✅/❎ 按钮，决定这条记忆是否参与下一次 Prompt 生成。

### 步骤 3：生成并提问
*   在底部输入框输入你当前的问题（例如：“帮我分析以上内容”）。
*   点击 **"Assemble & Copy Prompt"**。
*   去 ChatGPT/Claude 粘贴（Ctrl+V），你会发现发送过去的是一份包含背景、规则和问题的完美结构化 Prompt。

## 6. 当前版本亮点 (v1.0)
*   ✅ **无缝同步**：网页存完，侧边栏马上显示，无需刷新。
*   ✅ **防崩溃设计**：完善的 TypeScript 类型检查和空值保护。
*   ✅ **美观 UI**：基于 Material UI 的现代化设计，视觉舒适。
*   ✅ **编辑模式**：支持直接在列表卡片上点击修改内容。
