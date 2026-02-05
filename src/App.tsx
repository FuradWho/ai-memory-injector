import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Box, CssBaseline, ThemeProvider, createTheme,
  Typography, Button, IconButton, Tabs, Tab, Paper,
  Card, CardContent, TextField, Chip, Fab, Fade,
  Stack, Zoom, Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  PsychologyAlt as BrainIcon,
  Rule as RuleIcon,
  AutoFixHigh as SkillIcon,
  Description as ContextIcon,
  Search as SearchIcon,
  PlayArrowRounded as RunIcon,
  PushPin as PinIcon,           // 实心图钉 (已置顶)
  PushPinOutlined as PinOutIcon // 空心图钉 (未置顶)
} from '@mui/icons-material';

// --- 类型定义 ---
type MemoryType = 'context' | 'rule' | 'skill';

interface Memory {
  id: string;
  type: MemoryType;
  title?: string;
  content: string;
  isActive: boolean;
  isPinned: boolean; // ✨ 新增：置顶状态
  createdAt: number;
}

// --- 主题定制 ---
const theme = createTheme({
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 13,
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: { borderRadius: 12 },
  palette: {
    primary: { main: '#3b82f6' },
    text: { primary: '#1e293b', secondary: '#64748b' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    divider: '#e2e8f0',
  },
  components: {
    MuiButton: { styleOverrides: { root: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } }, contained: { color: 'white' } } },
    MuiPaper: { styleOverrides: { elevation1: { boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)' } } },
    MuiTab: { styleOverrides: { root: { minHeight: 36, fontSize: 12, borderRadius: 18, margin: '0 4px', transition: '0.2s', '&.Mui-selected': { backgroundColor: '#eff6ff', color: '#3b82f6' } } } }
  }
});

// 颜色配置
const TYPE_CONFIG = {
  context: { color: '#10b981', bg: '#ecfdf5', icon: <ContextIcon fontSize="inherit" />, label: '资料' },
  rule: { color: '#f59e0b', bg: '#fffbeb', icon: <RuleIcon fontSize="inherit" />, label: '规则' },
  skill: { color: '#8b5cf6', bg: '#f5f3ff', icon: <SkillIcon fontSize="inherit" />, label: '技能' }
};

function App() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [activeTab, setActiveTab] = useState<MemoryType>('context');
  const [input, setInput] = useState('');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState<MemoryType>('context');

  const [floatingBtn, setFloatingBtn] = useState({ x: 0, y: 0, text: '', visible: false });
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Data Loading ---
  const refreshData = useCallback(() => {
    chrome.storage.local.get(['memories'], (result) => {
      const rawList = (result.memories as any[]) || [];

      // 清洗数据：补全新字段 isPinned
      const cleanList: Memory[] = rawList.map(m => ({
        id: m.id || crypto.randomUUID(),
        type: m.type || 'context',
        title: m.title || (m.type === 'rule' ? '新建规则' : ''),
        content: m.content || '',
        isActive: m.isActive ?? true,
        isPinned: m.isPinned ?? false, // ✨ 默认不置顶
        createdAt: m.createdAt || Date.now()
      }));

      setMemories(cleanList);
    });
  }, []);

  useEffect(() => {
    refreshData();

    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.memories) {
        refreshData();
      }
    };
    chrome.storage.onChanged.addListener(storageListener);

    const messageListener = (msg: any) => {
      if (msg.action === 'refresh_memories') {
        refreshData();
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#internal-floating-btn')) {
        setFloatingBtn(prev => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener('mousedown', handleGlobalClick);

    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
      chrome.runtime.onMessage.removeListener(messageListener);
      window.removeEventListener('mousedown', handleGlobalClick);
    };
  }, [refreshData]);

  // --- Logic ---
  const syncStorage = (newMemories: Memory[]) => {
    chrome.storage.local.set({ memories: newMemories });
    setMemories(newMemories);
  };

  const handleAdd = () => {
    const newMemory: Memory = {
      id: crypto.randomUUID(),
      type: activeTab,
      title: activeTab === 'skill' ? '新技能' : (activeTab === 'rule' ? '新规则' : ''),
      content: "",
      isActive: true,
      isPinned: false, // 新增默认值
      createdAt: Date.now()
    };
    syncStorage([newMemory, ...memories]);
    startEditing(newMemory);
  };

  const handleDelete = (id: string) => {
    syncStorage(memories.filter(m => m.id !== id));
  };

  const handleToggle = (id: string) => {
    syncStorage(memories.map(m => m.id === id ? { ...m, isActive: !m.isActive } : m));
  };

  // ✨ 新增：处理置顶逻辑
  const handlePin = (id: string) => {
    syncStorage(memories.map(m => m.id === id ? { ...m, isPinned: !m.isPinned } : m));
  };

  const startEditing = (m: Memory) => {
    setEditingId(m.id);
    setEditContent(m.content);
    setEditTitle(m.title || '');
    setEditType(m.type);
  };

  const handleCancelEdit = () => {
    const target = memories.find(m => m.id === editingId);
    if (target && target.content === "" && !target.title) {
      handleDelete(editingId!);
    }
    setEditingId(null);
  };

  const saveEdit = () => {
    if (!editingId) return;
    if (!editContent.trim()) {
      handleDelete(editingId);
    } else {
      syncStorage(memories.map(m => m.id === editingId ? {
        ...m, content: editContent, title: editTitle, type: editType
      } : m));
    }
    setEditingId(null);
  };

  const generatePrompt = (skillTemplate?: string) => {
    // 组装 Prompt 时只关注 isActive，isPinned 只是 UI 排序用
    const activeRules = memories.filter(m => m.type === 'rule' && m.isActive).map(m => `【Rule: ${m.title}】\n${m.content}`).join('\n\n');
    const activeContexts = memories.filter(m => m.type === 'context' && m.isActive).map((m, i) => `【Context ${i + 1}】\n${m.content}`).join('\n\n');

    let userPart = input;
    if (skillTemplate) {
      userPart = skillTemplate.includes('{input}') ? skillTemplate.replace('{input}', input || '{{CONTENT}}') : `${skillTemplate}\n\n${input}`;
    }

    const parts = [];
    if (activeRules) parts.push(`--- System ---\n${activeRules}`);
    if (activeContexts) parts.push(`--- Context ---\n${activeContexts}`);
    parts.push(`--- User ---\n${userPart}`);
    return parts.join('\n\n');
  };

  const handleCopy = (skillTemplate?: string) => {
    const text = generatePrompt(skillTemplate);
    if (!text.trim()) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopyStatus(skillTemplate ? 'Skill Applied!' : 'Copied!');
      setTimeout(() => setCopyStatus(null), 1500);
    });
  };

  // --- Internal Selection Logic ---
  const handleMouseUp = () => {
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (!text) return;
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      if (rect && rect.width > 0 && !editingId) {
        setFloatingBtn({
          visible: true,
          text: text,
          x: rect.left + (rect.width / 2),
          y: rect.top - 50
        });
      }
    }, 10);
  };

  const handleQuickAdd = (text: string) => {
    const newMemory: Memory = {
      id: crypto.randomUUID(),
      type: 'context',
      content: text,
      isActive: true,
      isPinned: false, // 默认不置顶
      createdAt: Date.now()
    };
    syncStorage([newMemory, ...memories]);
    setFloatingBtn(prev => ({ ...prev, visible: false }));
    setActiveTab('context');
    window.getSelection()?.removeAllRanges();
  };

  // ✨ 核心修改：排序逻辑 (Pinned -> CreatedAt Desc)
  const currentList = useMemo(() => {
    const list = memories.filter(m => m.type === activeTab);
    return list.sort((a, b) => {
      // 1. 置顶优先
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // 2. 按时间倒序 (新的在上面)
      return b.createdAt - a.createdAt;
    });
  }, [memories, activeTab]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        ref={containerRef}
        onMouseUp={handleMouseUp}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          bgcolor: 'background.default'
        }}
      >

        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            pt: 2, pb: 1, px: 2,
            bgcolor: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid', borderColor: 'divider',
            zIndex: 10,
            flexShrink: 0
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <BrainIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" fontWeight="800" letterSpacing="-0.5px">Brain</Typography>
            </Stack>
            <Button
              variant="contained" size="small" disableElevation
              startIcon={<AddIcon />} onClick={handleAdd}
              sx={{ borderRadius: 20, px: 2 }}
            >
              New
            </Button>
          </Stack>

          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="fullWidth"
            sx={{ '& .MuiTabs-indicator': { display: 'none' } }}
          >
            {Object.entries(TYPE_CONFIG).map(([key, config]) => (
              <Tab
                key={key} value={key} label={config.label} icon={config.icon} iconPosition="start"
                sx={{ color: 'text.secondary', '&.Mui-selected': { color: config.color, bgcolor: config.bg } }}
              />
            ))}
          </Tabs>
        </Paper>

        {/* List */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          {currentList.length === 0 && (
            <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', color: 'text.disabled', gap: 1 }}>
              <SearchIcon sx={{ fontSize: 48, opacity: 0.2 }} />
              <Typography variant="body2">No {activeTab}s yet.</Typography>
            </Stack>
          )}

          <Stack spacing={2}>
            {currentList.map(m => {
              const config = TYPE_CONFIG[m.type] || TYPE_CONFIG['context'];
              const isEditing = editingId === m.id;

              return (
                <Zoom in key={m.id} style={{ transitionDelay: '50ms' }}>
                  <Card
                    elevation={isEditing ? 4 : 0}
                    sx={{
                      border: '1px solid',
                      // ✨ 置顶时的特殊样式：边框变色，背景微调
                      borderColor: isEditing ? 'primary.main' : (m.isPinned ? config.color : 'transparent'),
                      bgcolor: m.isActive || isEditing ? (m.isPinned ? '#fafafa' : 'background.paper') : '#f1f5f9',
                      opacity: m.isActive || isEditing ? 1 : 0.7,
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      overflow: 'visible',
                      '&:hover': { transform: isEditing ? 'none' : 'translateY(-2px)', boxShadow: 2 }
                    }}
                    onClick={() => {
                      if (isEditing) return;
                      if (window.getSelection()?.toString().length! > 0) return;
                      startEditing(m);
                    }}
                  >
                    {/* Active Strip */}
                    {m.isActive && !isEditing && (
                      <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: config.color }} />
                    )}

                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      {isEditing ? (
                        <Stack spacing={2}>
                          <Stack direction="row" spacing={1}>
                            <TextField
                              select size="small" value={editType}
                              onChange={e => setEditType(e.target.value as MemoryType)}
                              SelectProps={{ native: true }}
                              sx={{ width: 100 }}
                            >
                              <option value="context">资料</option>
                              <option value="rule">规则</option>
                              <option value="skill">技能</option>
                            </TextField>
                            {editType !== 'context' && (
                              <TextField
                                fullWidth size="small" placeholder="Title"
                                value={editTitle} onChange={e => setEditTitle(e.target.value)}
                              />
                            )}
                          </Stack>
                          <TextField
                            multiline minRows={3} maxRows={8} autoFocus
                            value={editContent} onChange={e => setEditContent(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            onMouseUp={e => e.stopPropagation()}
                            onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') saveEdit(); }}
                            sx={{ '& fieldset': { borderRadius: 2 } }}
                          />
                          <Stack direction="row" justifyContent="flex-end" spacing={1}>
                            <Button size="small" color="inherit" onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}>Cancel</Button>
                            <Button size="small" variant="contained" disableElevation onClick={(e) => { e.stopPropagation(); saveEdit(); }}>Save</Button>
                          </Stack>
                        </Stack>
                      ) : (
                        <Box sx={{ pl: 1 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Box sx={{ flex: 1, mr: 1, minWidth: 0 }}>
                              {/* 标题区域 */}
                              {(m.title || m.isPinned) && (
                                <Stack direction="row" spacing={0.5} sx={{ mb: 0.5 }}>
                                  {m.title && (
                                    <Chip
                                      label={m.title} size="small"
                                      sx={{ height: 20, fontSize: 10, fontWeight: 'bold', bgcolor: config.bg, color: config.color }}
                                    />
                                  )}
                                  {/* 显示 PIN 标记在标题旁 */}
                                  {m.isPinned && (
                                    <PinIcon sx={{ fontSize: 16, color: config.color, transform: 'rotate(45deg)' }} />
                                  )}
                                </Stack>
                              )}

                              <Typography
                                variant="body2"
                                sx={{
                                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                  color: 'text.primary', lineHeight: 1.6
                                }}
                              >
                                {m.content || <span style={{ color: '#ccc', fontStyle: 'italic' }}>Empty content...</span>}
                              </Typography>
                            </Box>

                            {/* 操作按钮组 */}
                            <Stack direction="column" alignItems="center" spacing={0} onClick={e => e.stopPropagation()}>

                              {/* ✨ 新增：置顶按钮 */}
                              <Tooltip title={m.isPinned ? "Unpin" : "Pin to top"} placement="left">
                                <IconButton size="small" onClick={() => handlePin(m.id)} sx={{ color: m.isPinned ? config.color : 'text.disabled' }}>
                                  {m.isPinned ? <PinIcon fontSize="small" /> : <PinOutIcon fontSize="small" />}
                                </IconButton>
                              </Tooltip>

                              {m.type === 'skill' ? (
                                <IconButton size="small" onClick={() => handleCopy(m.content)} sx={{ color: config.color, bgcolor: config.bg, mt: 0.5 }}>
                                  <RunIcon fontSize="small" />
                                </IconButton>
                              ) : (
                                <IconButton size="small" onClick={() => handleToggle(m.id)} sx={{ color: m.isActive ? config.color : 'text.disabled' }}>
                                  <CheckIcon fontSize="small" />
                                </IconButton>
                              )}

                              <IconButton size="small" onClick={() => handleDelete(m.id)} sx={{ color: 'text.disabled', opacity: 0.5, '&:hover': { color: 'error.main', opacity: 1 } }}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Stack>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Zoom>
              );
            })}
          </Stack>
        </Box>

        {/* Footer */}
        <Paper elevation={4} sx={{ p: 2, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
          <TextField
            fullWidth placeholder="Ask anything or paste code..."
            multiline maxRows={4} value={input}
            onChange={e => setInput(e.target.value)}
            size="small"
            InputProps={{ sx: { borderRadius: 3, bgcolor: '#f8fafc' } }}
          />
          <Button
            fullWidth variant="contained" disableElevation
            onClick={() => handleCopy()}
            startIcon={copyStatus ? <CheckIcon /> : <CopyIcon />}
            sx={{
              mt: 1.5, borderRadius: 3, py: 1,
              bgcolor: copyStatus ? 'success.main' : 'primary.main',
            }}
          >
            {copyStatus || "Assemble & Copy Prompt"}
          </Button>
        </Paper>

        <Fade in={floatingBtn.visible}>
          <Fab
            id="internal-floating-btn"
            color="primary" size="small"
            sx={{
              position: 'fixed', zIndex: 9999,
              left: Math.min(Math.max(10, floatingBtn.x - 20), window.innerWidth - 50),
              top: Math.max(10, floatingBtn.y),
              boxShadow: 4
            }}
            onClick={(e) => { e.stopPropagation(); handleQuickAdd(floatingBtn.text); }}
          >
            <BrainIcon />
          </Fab>
        </Fade>
      </Box>
    </ThemeProvider>
  );
}

export default App;