// src/background.ts
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "save-to-brain",
        title: "Save to Brain 🧠",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "save-to-brain" && info.selectionText) {

        // 确保写入完整的字段，和 App.tsx 的清洗逻辑对应
        const newMemory = {
            id: crypto.randomUUID(),
            type: 'context',
            content: info.selectionText,
            title: tab?.title || "Web Selection",
            isActive: true,
            createdAt: Date.now()
        };

        try {
            const result = await chrome.storage.local.get(['memories']);
            const memories = (result.memories as any[]) || [];

            await chrome.storage.local.set({ memories: [newMemory, ...memories] });

            // 发送消息
            chrome.runtime.sendMessage({ action: 'refresh_memories' }).catch(() => {
                // 忽略“接收端不存在”的错误（当侧边栏未打开时）
            });

        } catch (err) {
            console.error('Failed to save:', err);
        }
    }
});