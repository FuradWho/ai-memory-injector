English | [中文](README_zh-CN.md)

# 🧠 My AI Brain - Project Documentation

## 1. Introduction
**My AI Brain** is a Chrome Browser Extension (Manifest V3) designed to be your "Second Brain". It enables users to quickly collect snippets of information (Contexts, Rules, Skills) while browsing, manage and combine them in the side panel, and generate structured AI prompts with a single click.

> 💡 **Core Value**: Solves the pain point of repeatedly copy-pasting background materials and setting repetitive rules when using AI tools like ChatGPT or Claude.

## 2. Core Principles & Architecture
Built with **React + TypeScript + MUI**, based on Chrome Extension V3 architecture.

### 🔄 Data Flow & Synchronization (Core Challenge Solved)
To ensure millisecond-level responsiveness in the Side Panel UI after user actions (Right-click / Floating Ball), we implemented a "Double Insurance" synchronization mechanism:

1.  **Single Source of Truth**
    *   All data is stored in `chrome.storage.local`.
2.  **Writer (Content Script / Background)**
    *   User saves selection -> Write to Storage -> Broadcast message (`chrome.runtime.sendMessage({ action: 'refresh_memories' })`).
3.  **Receiver (React Side Panel)**
    *   **Listener 1**: `chrome.storage.onChanged` — Listens for underlying data changes.
    *   **Listener 2**: `chrome.runtime.onMessage` — Receives active refresh commands (as a fallback).
4.  **Data Cleaning Gateway**
    *   All data entering the React state passes through the `refreshData()` function, which backfills missing fields to prevent white-screen crashes caused by malformed data.

### 🛠️ Key Technologies
*   **Shadow DOM / Content Script Injection**: Injects the floating ball into any webpage, using Z-Index management to prevent occlusion by page elements.
*   **Extension Context Keep-Alive**: Includes a liveness check (`isExtensionValid`) in the Content Script to prevent errors on old pages after the extension updates.
*   **Layout Stability**: Uses Flexbox + 100vh to lock the layout, ensuring the input box is always fixed at the bottom while the list area scrolls independently, regardless of screen or sidebar width.

## 3. Features

### A. Multi-dimensional Memory Management
The extension categorizes collected information into three types (distinguished by color in the UI):
*   🟩 **Context**: Background information for the AI (e.g., article paragraphs, API docs, error logs).
*   🟨 **Rule**: Constraints on AI behavior (e.g., "Answer in Chinese", "Code must include comments").
*   🟪 **Skill (Template)**: Preset Prompt templates (e.g., "Translate this passage", "Summarize key points").

### B. Efficient Collection Methods
*   🖱️ **Floating Ball**
    *   Select text on a webpage -> Release mouse -> 🧠 Floating ball appears -> Click to save.
    *   *Interaction Detail*: Supports animation feedback; hides automatically when clicking blank space.
*   🖱️ **Context Menu**
    *   Select text -> Right-click -> Choose "Save to Brain 🧠".
*   ⌨️ **Manual Input**
    *   Click the "New" button directly in the Side Panel.

### C. Prompt Assembly
This is the ultimate goal of the tool. When clicking the "Assemble & Copy Prompt" button at the bottom, the program executes the following logic:
1.  Filters all **Rules** where `isActive = true`.
2.  Filters all **Contexts** where `isActive = true`.
3.  Combines with the content from the bottom user input box.
4.  Concatenates into a complete Prompt structure: `System (Rules)` -> `Context` -> `User Input` and copies it to the clipboard.

## 4. File Structure

```text
src/
├── background.ts      # [Background Process] Handles context menu events, data writing, and broadcasting
├── content.ts         # [Content Script] Injects floating ball, handles selection interactions, checks extension liveness
├── App.tsx            # [Main UI] React component, core UI and business logic for the Side Panel
└── index.css          # [Global Styles] Resets scrollbar styles and handles 100% height layout

public/
└── manifest.json      # [Configuration] Permissions (storage, sidePanel, contextMenus, etc.)
```

## 5. Usage Guide

### Step 1: Collect Material
*   When browsing, select useful paragraphs, click the floating ball to save as "Context".
*   If you see a specification you need to follow, select it and right-click to save.

### Step 2: Organize Brain (Side Panel)
*   Click the extension icon in the browser toolbar to open the Side Panel.
*   You can modify the type of the captured content here (e.g., change a text segment from "Context" to "Rule").
*   **Toggle Control**: Click the ✅/❎ button on the right of the card to decide if this memory participates in the next Prompt generation.

### Step 3: Generate & Ask
*   Enter your current question in the bottom input box (e.g., "Analyze the content above").
*   Click **"Assemble & Copy Prompt"**.
*   Paste (Ctrl+V) into ChatGPT/Claude. You will send a perfectly structured Prompt containing background, rules, and your question.

## 6. Version 1.0 Highlights
*   ✅ **Seamless Sync**: Save on the web, Side Panel updates instantly without refreshing.
*   ✅ **Crash Prevention**: Comprehensive TypeScript type checking and null safety.
*   ✅ **Beautiful UI**: Modern design based on Material UI.
*   ✅ **Edit Mode**: Support direct content modification on list cards.
