let editor;
const DEFAULT_CODE = `fn main() {
    let message = "Hello from RustPad!";
    println!("{}", message);
}`;

require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });

require(['vs/editor/editor.main'], function () {
  // 1. Define Modern Dracula Dark Theme
  monaco.editor.defineTheme('dracula-custom', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff79c6', fontStyle: 'bold' },
      { token: 'string', foreground: 'f1fa8c' },
      { token: 'number', foreground: 'bd93f9' },
      { token: 'type', foreground: '8be9fd' },
      { token: 'identifier', foreground: 'f8f8f2' }
    ],
    colors: {
      'editor.background': '#282a36',
      'editor.foreground': '#f8f8f2',
      'editorLineNumber.foreground': '#6272a4',
      'editorCursor.foreground': '#f8f8f2',
      'editor.selectionBackground': '#44475a',
      'editor.lineHighlightBackground': '#44475a55'
    }
  });

  // 2. Add Built-in Rust Autocomplete & Snippet Provider
  monaco.languages.registerCompletionItemProvider('rust', {
    provideCompletionItems: (model, position) => {
      const suggestions = [
        // Standard Macros
        {
          label: 'println!',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'println!("${1:format}", ${2:args});',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Prints to the standard output, with a newline.'
        },
        {
          label: 'eprintln!',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'eprintln!("${1:format}", ${2:args});',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Prints to the standard error, with a newline.'
        },
        {
          label: 'vec!',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'vec![${1:items}]',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Creates a `Vec` containing the arguments.'
        },
        // Structures & Boilerplates
        {
          label: 'fn',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'fn ${1:name}(${2:params}) -> ${3:ReturnType} {\n\t${4:todo!()}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Function declaration'
        },
        {
          label: 'struct',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'struct ${1:Name} {\n\t${2:field}:${3:Type},\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Struct declaration'
        },
        {
          label: 'impl',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'impl ${1:Type} {\n\t${2}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Implementation block'
        },
        {
          label: 'derive',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '#[derive(${1:Debug, Clone})]',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Automatic trait derivation'
        },
        // Common types
        { label: 'String', kind: monaco.languages.CompletionItemKind.Class, insertText: 'String' },
        { label: 'Option', kind: monaco.languages.CompletionItemKind.Enum, insertText: 'Option<${1:T}>', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
        { label: 'Result', kind: monaco.languages.CompletionItemKind.Enum, insertText: 'Result<${1:T},${2:E}>', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet },
        { label: 'HashMap', kind: monaco.languages.CompletionItemKind.Class, insertText: 'std::collections::HashMap' }
      ];
      return { suggestions };
    }
  });

  // 3. Initialize Monaco
  editor = monaco.editor.create(document.getElementById('editor-container'), {
    value: DEFAULT_CODE,
    language: 'rust',
    theme: 'dracula-custom',
    automaticLayout: true,
    fontSize: 13,
    fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Monaco, Consolas, monospace',
    fontLigatures: true,
    tabSize: 4,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    padding: { top: 12, bottom: 12 }
  });

  // Run Shortcut (Cmd+Enter / Ctrl+Enter)
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, runCode);
});

// DOM Elements
const workspaceEl = document.getElementById('workspace');
const editorPanelEl = document.getElementById('editor-panel');
const editorContainerEl = document.getElementById('editor-container');
const resizerEl = document.getElementById('resizer');
const outputPanelEl = document.getElementById('output-panel');
const outputEl = document.getElementById('output');
const statusLeft = document.getElementById('status-left');

const runBtn = document.getElementById('btn-run');
const downloadBtn = document.getElementById('btn-download');
const dockBtn = document.getElementById('btn-dock');
const dockIconWrapper = document.getElementById('dock-icon-wrapper');
const toggleTerminalBtn = document.getElementById('btn-toggle-terminal');
const toggleTerminalIconWrapper = document.getElementById('toggle-terminal-icon-wrapper');
const toggleTerminalLabel = document.getElementById('toggle-terminal-label');
const newBtn = document.getElementById('btn-new');

const panelDockBtn = document.getElementById('panel-btn-dock');
const panelDockIconWrapper = document.getElementById('panel-dock-icon-wrapper');
const panelMinimizeBtn = document.getElementById('panel-btn-minimize');

// Visual SVG Icons
const ICON_DOCK_BOTTOM = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="3" width="18" height="18" rx="2"/>
  <rect x="3" y="14" width="18" height="7" rx="1" fill="currentColor" opacity="0.35"/>
  <line x1="3" y1="14" x2="21" y2="14"/>
</svg>`;

const ICON_DOCK_RIGHT = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="3" width="18" height="18" rx="2"/>
  <rect x="14" y="3" width="7" height="18" rx="1" fill="currentColor" opacity="0.35"/>
  <line x1="14" y1="3" x2="14" y2="21"/>
</svg>`;

const ICON_TERMINAL_VISIBLE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="4 17 10 11 4 5"/>
  <line x1="12" y1="19" x2="20" y2="19"/>
</svg>`;

const ICON_TERMINAL_HIDDEN = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
  <circle cx="12" cy="12" r="3"/>
</svg>`;

// Layout Configuration & LocalStorage Persistence
const STORAGE_KEY = 'rspad_layout_config';

const config = {
  dock: 'right', // 'right' | 'bottom'
  width: null,   // null => default 50%
  height: null,  // null => default ~35%
  visible: false,
  lastWidth: null,
  lastHeight: null,
};

function loadStoredConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.dock === 'bottom' || parsed.dock === 'right') {
        config.dock = parsed.dock;
      }
      if (typeof parsed.width === 'number' && parsed.width > 50) {
        config.width = parsed.width;
      }
      if (typeof parsed.height === 'number' && parsed.height > 40) {
        config.height = parsed.height;
      }
      if (typeof parsed.visible === 'boolean') {
        config.visible = parsed.visible;
      }
      if (typeof parsed.lastWidth === 'number' && parsed.lastWidth > 50) {
        config.lastWidth = parsed.lastWidth;
      }
      if (typeof parsed.lastHeight === 'number' && parsed.lastHeight > 40) {
        config.lastHeight = parsed.lastHeight;
      }
    }
  } catch (err) {
    console.error('Failed to load localStorage config:', err);
  }
}

function saveStoredConfig() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save localStorage config:', err);
  }
}

function applyLayout() {
  const isRight = config.dock === 'right';
  const workspaceRect = workspaceEl.getBoundingClientRect();
  const availableW = workspaceRect.width || window.innerWidth;
  const availableH = workspaceRect.height || (window.innerHeight - 72);

  // 1. Orientation class
  if (isRight) {
    workspaceEl.classList.remove('dock-bottom');
    workspaceEl.classList.add('dock-right');
  } else {
    workspaceEl.classList.remove('dock-right');
    workspaceEl.classList.add('dock-bottom');
  }

  // 2. Sizes and visibility
  if (!config.visible) {
    outputPanelEl.classList.add('hidden');
    resizerEl.classList.add('hidden');
    editorPanelEl.style.flex = '1 1 100%';
    outputPanelEl.style.width = '';
    outputPanelEl.style.height = '';
  } else {
    outputPanelEl.classList.remove('hidden');
    resizerEl.classList.remove('hidden');
    editorPanelEl.style.flex = '1 1 0%';

    if (isRight) {
      outputPanelEl.style.height = '100%';
      const maxW = Math.max(120, availableW - 120);
      const minW = 100;
      let targetW = config.width || config.lastWidth;
      if (!targetW) {
        targetW = Math.round(availableW * 0.5);
      }
      targetW = Math.min(maxW, Math.max(minW, targetW));
      outputPanelEl.style.width = targetW + 'px';
      config.width = targetW;
      config.lastWidth = targetW;
    } else {
      outputPanelEl.style.width = '100%';
      const maxH = Math.max(80, availableH - 100);
      const minH = 50;
      let targetH = config.height || config.lastHeight;
      if (!targetH) {
        targetH = Math.max(160, Math.round(availableH * 0.35));
      }
      targetH = Math.min(maxH, Math.max(minH, targetH));
      outputPanelEl.style.height = targetH + 'px';
      config.height = targetH;
      config.lastHeight = targetH;
    }
  }

  // 3. Update buttons, labels, and icons
  if (dockBtn) {
    const dockLabel = document.getElementById('dock-btn-label') || dockBtn.querySelector('.btn-label');
    if (dockLabel) {
      dockLabel.textContent = isRight ? 'Dock Bottom' : 'Dock Right';
    }
    const dockIcon = document.getElementById('dock-icon-wrapper');
    if (dockIcon) {
      dockIcon.innerHTML = isRight ? ICON_DOCK_BOTTOM : ICON_DOCK_RIGHT;
    }
    dockBtn.title = isRight ? 'Dock terminal to bottom' : 'Dock terminal to right';
  }

  if (panelDockBtn && panelDockIconWrapper) {
    panelDockIconWrapper.innerHTML = isRight ? ICON_DOCK_BOTTOM : ICON_DOCK_RIGHT;
    panelDockBtn.title = isRight ? 'Dock terminal to bottom' : 'Dock terminal to right';
  }

  if (toggleTerminalBtn) {
    const labelText = config.visible ? 'Hide Terminal' : 'Show Terminal';
    const labelEl = document.getElementById('toggle-terminal-label') || toggleTerminalBtn.querySelector('.btn-label');
    if (labelEl) {
      labelEl.textContent = labelText;
    } else {
      toggleTerminalBtn.textContent = labelText;
    }

    const iconWrapper = document.getElementById('toggle-terminal-icon-wrapper');
    if (iconWrapper) {
      iconWrapper.innerHTML = config.visible ? ICON_TERMINAL_VISIBLE : ICON_TERMINAL_HIDDEN;
    }

    toggleTerminalBtn.title = config.visible ? 'Hide terminal' : 'Show terminal';
    if (config.visible) {
      toggleTerminalBtn.classList.remove('active');
    } else {
      toggleTerminalBtn.classList.add('active');
    }
  }

  if (editor) {
    editor.layout();
  }
}

function toggleDock() {
  config.dock = config.dock === 'right' ? 'bottom' : 'right';
  applyLayout();
  saveStoredConfig();
}

function toggleTerminal() {
  setTerminalVisible(!config.visible);
}

function setTerminalVisible(visible) {
  config.visible = visible;
  const workspaceRect = workspaceEl.getBoundingClientRect();
  const availableW = workspaceRect.width || window.innerWidth;
  const availableH = workspaceRect.height || (window.innerHeight - 72);

  if (visible) {
    if (config.dock === 'bottom') {
      config.height = config.lastHeight || Math.max(160, Math.round(availableH * 0.35));
    } else {
      config.width = config.lastWidth || Math.round(availableW * 0.5);
    }
  } else {
    // When minimizing/hiding, preserve the last good size
    if (config.dock === 'bottom' && config.height > 50) {
      config.lastHeight = config.height;
    } else if (config.dock === 'right' && config.width > 50) {
      config.lastWidth = config.width;
    }
  }

  applyLayout();
  saveStoredConfig();
}

// Draggable Splitter Implementation
let isDragging = false;
let startX = 0;
let startY = 0;
let startWidth = 0;
let startHeight = 0;

function startDrag(e) {
  if (e.button !== undefined && e.button !== 0) return;
  e.preventDefault();
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  const rect = outputPanelEl.getBoundingClientRect();
  startWidth = rect.width;
  startHeight = rect.height;

  document.body.classList.add('is-resizing');
  document.body.classList.add(config.dock === 'bottom' ? 'dock-bottom' : 'dock-right');
  resizerEl.classList.add('dragging');

  if (resizerEl.setPointerCapture && e.pointerId !== undefined) {
    try {
      resizerEl.setPointerCapture(e.pointerId);
    } catch (_) { }
  }
}

function onDrag(e) {
  if (!isDragging) return;

  const workspaceRect = workspaceEl.getBoundingClientRect();

  if (config.dock === 'right') {
    const rawWidth = workspaceRect.right - e.clientX;
    const minWidth = 100;
    const maxWidth = Math.max(120, workspaceRect.width - 120);

    // Minimize threshold: dragging within 45px of the right edge
    if (rawWidth < 45) {
      outputPanelEl.style.width = '0px';
    } else {
      const clampedWidth = Math.min(maxWidth, Math.max(minWidth, rawWidth));
      outputPanelEl.style.width = clampedWidth + 'px';
      config.width = clampedWidth;
      config.lastWidth = clampedWidth;
    }
  } else {
    // Dock is bottom
    const rawHeight = workspaceRect.bottom - e.clientY;
    const minHeight = 50;
    const maxHeight = Math.max(80, workspaceRect.height - 100);

    // Minimize threshold: dragging within 40px of the bottom edge
    if (rawHeight < 40) {
      outputPanelEl.style.height = '0px';
    } else {
      const clampedHeight = Math.min(maxHeight, Math.max(minHeight, rawHeight));
      outputPanelEl.style.height = clampedHeight + 'px';
      config.height = clampedHeight;
      config.lastHeight = clampedHeight;
    }
  }

  if (editor) {
    editor.layout();
  }
}

function endDrag(e) {
  if (!isDragging) return;
  isDragging = false;

  document.body.classList.remove('is-resizing', 'dock-bottom', 'dock-right');
  resizerEl.classList.remove('dragging');

  if (resizerEl.releasePointerCapture && e.pointerId !== undefined) {
    try {
      resizerEl.releasePointerCapture(e.pointerId);
    } catch (_) { }
  }

  const workspaceRect = workspaceEl.getBoundingClientRect();

  if (config.dock === 'right') {
    const rawWidth = workspaceRect.right - e.clientX;
    if (rawWidth < 45) {
      // User dragged to edge to minimize!
      if (startWidth >= 100) {
        config.lastWidth = startWidth;
      }
      setTerminalVisible(false);
      return;
    }
    const maxW = Math.max(120, workspaceRect.width - 120);
    config.width = Math.min(maxW, Math.max(100, rawWidth));
    config.lastWidth = config.width;
  } else {
    const rawHeight = workspaceRect.bottom - e.clientY;
    if (rawHeight < 40) {
      // User dragged to bottom to minimize!
      if (startHeight >= 60) {
        config.lastHeight = startHeight;
      }
      setTerminalVisible(false);
      return;
    }
    const maxH = Math.max(80, workspaceRect.height - 100);
    config.height = Math.min(maxH, Math.max(50, rawHeight));
    config.lastHeight = config.height;
  }

  saveStoredConfig();
  if (editor) {
    editor.layout();
  }
}

resizerEl.addEventListener('pointerdown', startDrag);
resizerEl.addEventListener('pointermove', onDrag);
resizerEl.addEventListener('pointerup', endDrag);
resizerEl.addEventListener('pointercancel', endDrag);
window.addEventListener('pointerup', (e) => { if (isDragging) endDrag(e); });

async function runCode() {
  if (!editor) return;

  // Auto-open terminal if hidden/minimized to the last docked size
  if (!config.visible) {
    setTerminalVisible(true);
  }

  outputEl.className = '';
  outputEl.textContent = 'Compiling and executing...';
  statusLeft.textContent = 'Compiling...';

  const start = performance.now();

  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: editor.getValue() }),
    });
    const data = await res.json();
    const duration = ((performance.now() - start) / 1000).toFixed(2);

    outputEl.className = data.success ? 'success' : 'error';
    outputEl.textContent = data.output || '(No output produced)';
    statusLeft.textContent = data.success ? `Success (${duration}s)` : `Failed (${duration}s)`;
  } catch (err) {
    outputEl.className = 'error';
    outputEl.textContent = `Server error: ${err.message}`;
    statusLeft.textContent = 'Server Error';
  }
}

runBtn.addEventListener('click', runCode);
if (dockBtn) dockBtn.addEventListener('click', toggleDock);
if (panelDockBtn) panelDockBtn.addEventListener('click', toggleDock);
if (toggleTerminalBtn) toggleTerminalBtn.addEventListener('click', toggleTerminal);
if (panelMinimizeBtn) panelMinimizeBtn.addEventListener('click', () => setTerminalVisible(false));

newBtn.addEventListener('click', () => {
  editor.setValue(DEFAULT_CODE);
  outputEl.className = '';
  outputEl.textContent = '// Ready.';
  statusLeft.textContent = 'Ready';
});

// Global shortcut for Cmd+Enter / Ctrl+Enter from anywhere
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    runCode();
  }
});

downloadBtn.addEventListener('click', () => {
  if (!editor) return;

  const code = editor.getValue();

  // 1. Create a Blob from the current editor text
  const blob = new Blob([code], { type: 'text/rust;charset=utf-8' });

  // 2. Generate a temporary object URL
  const url = URL.createObjectURL(blob);

  // 3. Create an invisible anchor element to trigger the download
  const link = document.createElement('a');
  link.href = url;

  // Set the default filename
  link.download = 'main.rs';

  // 4. Trigger download and cleanup
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});

// ResizeObserver on editor container to keep Monaco pixel-perfect
const resizeObserver = new ResizeObserver(() => {
  if (editor) {
    editor.layout();
  }
});
resizeObserver.observe(editorContainerEl);

window.addEventListener('resize', () => {
  if (config.visible) {
    const workspaceRect = workspaceEl.getBoundingClientRect();
    if (config.dock === 'right') {
      const maxW = Math.max(120, workspaceRect.width - 120);
      if (config.width > maxW) {
        config.width = maxW;
        outputPanelEl.style.width = maxW + 'px';
      }
    } else {
      const maxH = Math.max(80, workspaceRect.height - 100);
      if (config.height > maxH) {
        config.height = maxH;
        outputPanelEl.style.height = maxH + 'px';
      }
    }
  }
  if (editor) {
    editor.layout();
  }
});

// Initialize layout immediately on script execution
loadStoredConfig();
applyLayout();
