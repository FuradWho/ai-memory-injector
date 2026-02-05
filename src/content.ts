// src/content.ts

// ... (前面的样式代码保持不变，为了节省篇幅省略，直接用上面的样式代码即可) ...
// 请保留之前的样式注入 style 和 btn 创建代码

// --- 必须保留的 DOM 创建部分 ---
const style = document.createElement('style');
style.textContent = `
  #ai-brain-float-btn {
    position: absolute;
    z-index: 2147483647;
    background: #3b82f6;
    color: white;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    transition: transform 0.2s, opacity 0.2s, top 0.1s, left 0.1s;
    opacity: 0;
    pointer-events: none;
  }
  #ai-brain-float-btn.visible {
    opacity: 1;
    pointer-events: auto;
    transform: scale(1);
  }
  #ai-brain-float-btn:hover {
    transform: scale(1.1);
    background: #2563eb;
  }
`;
document.head.appendChild(style);

const btn = document.createElement('div');
btn.id = 'ai-brain-float-btn';
btn.innerHTML = '🧠';
document.body.appendChild(btn);
// ------------------------------

let currentSelection = '';

const isExtensionValid = () => {
    try {
        return !!chrome.runtime.id;
    } catch (e) {
        return false;
    }
};

document.addEventListener('mouseup', () => {
    if (!isExtensionValid()) return;
    setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();
        if (text && text.length > 0 && selection) {
            currentSelection = text;
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            btn.style.top = `${rect.top + window.scrollY - 45}px`;
            btn.style.left = `${rect.left + (rect.width / 2) + window.scrollX - 18}px`;
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    }, 10);
});

document.addEventListener('mousedown', (e) => {
    if (e.target !== btn) {
        btn.classList.remove('visible');
    }
});

btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isExtensionValid()) {
        console.warn('Extension context invalidated');
        return;
    }

    const newMemory = {
        id: crypto.randomUUID(),
        type: 'context',
        content: currentSelection,
        isActive: true,
        createdAt: Date.now()
    };

    try {
        const result = await chrome.storage.local.get(['memories']);
        const memories = (result.memories as any[]) || [];
        await chrome.storage.local.set({ memories: [newMemory, ...memories] });

        // 🔥 关键修改：主动发送刷新消息
        // try-catch 包裹消息发送，防止接收端不存在时报错
        chrome.runtime.sendMessage({ action: 'refresh_memories' }).catch(() => { });
        // 动画
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅';
        btn.style.backgroundColor = '#10b981';

        setTimeout(() => {
            btn.classList.remove('visible');
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.backgroundColor = '#3b82f6';
            }, 300);
            window.getSelection()?.removeAllRanges();
        }, 800);

    } catch (error) {
        console.error('Save failed:', error);
    }
});