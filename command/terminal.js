// Terminal State
class Terminal {
    constructor() {
        this.output = document.getElementById('terminal-output');
        this.input = document.getElementById('terminal-input');
        this.windowsContainer = document.getElementById('windows-container');
        this.windows = new Map();
        this.windowCounter = 0;
        this.commandHistory = [];
        this.historyIndex = -1;
        this.activeWindow = null;

        this.init();
    }

    init() {
        // Input handling
        this.input.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Auto-focus input when clicking anywhere on terminal
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.window')) {
                this.input.focus();
            }
        });

        // Initialize interact.js for windows
        this.initWindowInteractions();
    }

    handleKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const command = this.input.value.trim();
            if (command) {
                this.executeCommand(command);
                this.commandHistory.push(command);
                this.historyIndex = this.commandHistory.length;
            }
            this.input.value = '';
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.input.value = this.commandHistory[this.historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                this.input.value = this.commandHistory[this.historyIndex];
            } else {
                this.historyIndex = this.commandHistory.length;
                this.input.value = '';
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            this.handleTabCompletion();
        }
    }

    handleTabCompletion() {
        const commands = ['open', 'inspect', 'help', 'clear', 'list', 'close', 'focus'];
        const input = this.input.value.toLowerCase();

        if (!input) return;

        const matches = commands.filter(cmd => cmd.startsWith(input));
        if (matches.length === 1) {
            this.input.value = matches[0] + ' ';
        } else if (matches.length > 1) {
            this.printLine(`Available: ${matches.join(', ')}`, 'terminal-text');
        }
    }

    executeCommand(command) {
        // Echo command
        this.printLine(`user@guythatlives:~$ ${command}`, 'terminal-prompt');

        const [cmd, ...args] = command.split(' ');
        const arg = args.join(' ').trim();

        switch (cmd.toLowerCase()) {
            case 'help':
                this.showHelp();
                break;
            case 'clear':
                this.clearTerminal();
                break;
            case 'open':
                if (arg) {
                    this.openWindow(arg);
                } else {
                    this.printLine('Usage: open <url>', 'terminal-error');
                    this.printLine('Example: open https://example.com', 'terminal-text');
                }
                break;
            case 'inspect':
                if (arg) {
                    this.inspectWindow(arg);
                } else {
                    this.printLine('Usage: inspect <window-id>', 'terminal-error');
                    this.printLine('Use "list" to see available windows', 'terminal-text');
                }
                break;
            case 'list':
                this.listWindows();
                break;
            case 'close':
                if (arg) {
                    this.closeWindow(arg);
                } else {
                    this.printLine('Usage: close <window-id>', 'terminal-error');
                }
                break;
            case 'focus':
                if (arg) {
                    this.focusWindow(arg);
                } else {
                    this.printLine('Usage: focus <window-id>', 'terminal-error');
                }
                break;
            case 'about':
                this.showAbout();
                break;
            default:
                this.printLine(`Command not found: ${cmd}`, 'terminal-error');
                this.printLine('Type "help" for available commands', 'terminal-text');
        }

        // Scroll to bottom
        this.output.scrollTop = this.output.scrollHeight;
    }

    printLine(text, className = 'terminal-text') {
        const line = document.createElement('div');
        line.className = 'terminal-line';

        const span = document.createElement('span');
        span.className = className;
        span.innerHTML = text;

        line.appendChild(span);
        this.output.appendChild(line);
    }

    showHelp() {
        this.printLine('═══════════════════════════════════════════════════', 'terminal-success');
        this.printLine('  AVAILABLE COMMANDS', 'terminal-success');
        this.printLine('═══════════════════════════════════════════════════', 'terminal-success');
        this.printLine('');
        this.printLine('  <span class="highlight">open &lt;url&gt;</span>        - Open URL in a draggable window', 'terminal-text');
        this.printLine('                      Example: open https://example.com', 'terminal-text');
        this.printLine('');
        this.printLine('  <span class="highlight">inspect &lt;id&gt;</span>      - Toggle console for window', 'terminal-text');
        this.printLine('                      Example: inspect win-1', 'terminal-text');
        this.printLine('');
        this.printLine('  <span class="highlight">list</span>              - Show all open windows', 'terminal-text');
        this.printLine('');
        this.printLine('  <span class="highlight">close &lt;id&gt;</span>       - Close a specific window', 'terminal-text');
        this.printLine('                      Example: close win-1', 'terminal-text');
        this.printLine('');
        this.printLine('  <span class="highlight">focus &lt;id&gt;</span>       - Focus/bring window to front', 'terminal-text');
        this.printLine('');
        this.printLine('  <span class="highlight">clear</span>             - Clear terminal output', 'terminal-text');
        this.printLine('');
        this.printLine('  <span class="highlight">help</span>              - Show this help message', 'terminal-text');
        this.printLine('');
        this.printLine('  <span class="highlight">about</span>             - About this terminal', 'terminal-text');
        this.printLine('');
        this.printLine('═══════════════════════════════════════════════════', 'terminal-success');
        this.printLine('  TIP: Use arrow keys to navigate command history', 'terminal-warning');
        this.printLine('       Press TAB for command auto-completion', 'terminal-warning');
        this.printLine('═══════════════════════════════════════════════════', 'terminal-success');
    }

    showAbout() {
        this.printLine('', 'terminal-text');
        this.printLine('╔════════════════════════════════════════════════╗', 'terminal-success');
        this.printLine('║   Terminal Interface v1.0.0                    ║', 'terminal-success');
        this.printLine('║   GuyThatLives Network                         ║', 'terminal-success');
        this.printLine('╚════════════════════════════════════════════════╝', 'terminal-success');
        this.printLine('', 'terminal-text');
        this.printLine('A web-based terminal emulator with window management', 'terminal-text');
        this.printLine('capabilities. Built with vanilla JavaScript and interact.js', 'terminal-text');
        this.printLine('', 'terminal-text');
        this.printLine('Features:', 'terminal-success');
        this.printLine('  • Draggable & resizable windows', 'terminal-text');
        this.printLine('  • Simulated console/inspector', 'terminal-text');
        this.printLine('  • Command history (↑/↓)', 'terminal-text');
        this.printLine('  • Tab completion', 'terminal-text');
        this.printLine('', 'terminal-text');
    }

    clearTerminal() {
        this.output.innerHTML = '';
        this.printLine('Terminal cleared', 'terminal-success');
    }

    openWindow(url) {
        // Validate and normalize URL
        let normalizedUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            normalizedUrl = 'https://' + url;
        }

        try {
            new URL(normalizedUrl);
        } catch (e) {
            this.printLine(`Invalid URL: ${url}`, 'terminal-error');
            return;
        }

        const windowId = `win-${++this.windowCounter}`;
        this.printLine(`Opening window ${windowId}: ${normalizedUrl}`, 'terminal-success');

        const windowEl = this.createWindow(windowId, normalizedUrl);
        this.windowsContainer.appendChild(windowEl);
        this.windows.set(windowId, {
            element: windowEl,
            url: normalizedUrl,
            consoleActive: false
        });

        // Position window with slight offset
        const offset = (this.windowCounter - 1) * 30;
        windowEl.style.left = `${100 + offset}px`;
        windowEl.style.top = `${100 + offset}px`;
    }

    createWindow(windowId, url) {
        const window = document.createElement('div');
        window.className = 'window active';
        window.dataset.windowId = windowId;

        window.innerHTML = `
            <div class="window-header">
                <div class="window-title">
                    <span>🌐</span>
                    <span>${windowId}</span>
                    <span style="color: var(--terminal-dim); font-size: 10px;">• ${this.truncateUrl(url)}</span>
                </div>
                <div class="window-controls">
                    <div class="window-button inspect" data-action="inspect" title="Toggle Console"></div>
                    <div class="window-button close" data-action="close" title="Close"></div>
                </div>
            </div>
            <div class="window-content">
                <div class="window-main">
                    <div class="window-loading">
                        <div class="loading-spinner"></div>
                        <div>Loading...</div>
                    </div>
                    <iframe class="window-iframe" src="${url}" style="display: none;"></iframe>
                </div>
                <div class="window-console">
                    <div class="console-header">
                        <span>CONSOLE</span>
                        <button class="console-clear" data-action="clear-console">Clear</button>
                    </div>
                    <div class="console-output" data-console-output></div>
                </div>
            </div>
            <div class="window-resize"></div>
        `;

        // Window controls
        window.querySelector('[data-action="close"]').addEventListener('click', () => {
            this.closeWindow(windowId);
        });

        window.querySelector('[data-action="inspect"]').addEventListener('click', () => {
            this.inspectWindow(windowId);
        });

        window.querySelector('[data-action="clear-console"]').addEventListener('click', () => {
            this.clearConsole(windowId);
        });

        // Iframe load handling
        const iframe = window.querySelector('.window-iframe');
        const loading = window.querySelector('.window-loading');

        iframe.addEventListener('load', () => {
            loading.style.display = 'none';
            iframe.style.display = 'block';
            this.logToConsole(windowId, 'info', 'Page loaded successfully');

            // Try to capture console logs from iframe (will fail for cross-origin)
            try {
                const iframeWindow = iframe.contentWindow;
                const originalConsole = iframeWindow.console;

                ['log', 'error', 'warn', 'info'].forEach(method => {
                    iframeWindow.console[method] = (...args) => {
                        originalConsole[method](...args);
                        this.logToConsole(windowId, method, args.join(' '));
                    };
                });
            } catch (e) {
                this.logToConsole(windowId, 'warn', 'Cannot access iframe console (CORS restriction)');
            }
        });

        iframe.addEventListener('error', () => {
            loading.style.display = 'none';
            this.logToConsole(windowId, 'error', 'Failed to load page');
        });

        // Window activation
        window.addEventListener('mousedown', () => {
            this.focusWindow(windowId);
        });

        return window;
    }

    truncateUrl(url, maxLength = 40) {
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength - 3) + '...';
    }

    inspectWindow(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData) {
            this.printLine(`Window not found: ${windowId}`, 'terminal-error');
            return;
        }

        const console = windowData.element.querySelector('.window-console');
        windowData.consoleActive = !windowData.consoleActive;

        if (windowData.consoleActive) {
            console.classList.add('active');
            this.printLine(`Console enabled for ${windowId}`, 'terminal-success');
            this.logToConsole(windowId, 'info', 'Console opened');
        } else {
            console.classList.remove('active');
            this.printLine(`Console disabled for ${windowId}`, 'terminal-success');
        }
    }

    logToConsole(windowId, type, message) {
        const windowData = this.windows.get(windowId);
        if (!windowData) return;

        const consoleOutput = windowData.element.querySelector('[data-console-output]');
        const line = document.createElement('div');
        line.className = 'console-line';

        const timestamp = new Date().toLocaleTimeString();
        line.innerHTML = `
            <span class="console-timestamp">[${timestamp}]</span>
            <span class="console-${type}">${message}</span>
        `;

        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    clearConsole(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData) return;

        const consoleOutput = windowData.element.querySelector('[data-console-output]');
        consoleOutput.innerHTML = '';
        this.logToConsole(windowId, 'info', 'Console cleared');
    }

    listWindows() {
        if (this.windows.size === 0) {
            this.printLine('No windows open', 'terminal-warning');
            return;
        }

        this.printLine('═══════════════════════════════════════════════════', 'terminal-success');
        this.printLine('  OPEN WINDOWS', 'terminal-success');
        this.printLine('═══════════════════════════════════════════════════', 'terminal-success');

        this.windows.forEach((data, id) => {
            const status = data.consoleActive ? '[CONSOLE]' : '';
            this.printLine(`  ${id} - ${data.url} ${status}`, 'terminal-text');
        });

        this.printLine('═══════════════════════════════════════════════════', 'terminal-success');
    }

    closeWindow(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData) {
            this.printLine(`Window not found: ${windowId}`, 'terminal-error');
            return;
        }

        windowData.element.remove();
        this.windows.delete(windowId);
        this.printLine(`Closed window ${windowId}`, 'terminal-success');
    }

    focusWindow(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData) {
            this.printLine(`Window not found: ${windowId}`, 'terminal-error');
            return;
        }

        // Remove active class from all windows
        this.windows.forEach((data) => {
            data.element.classList.remove('active');
        });

        // Add active class to target window
        windowData.element.classList.add('active');
        this.activeWindow = windowId;
    }

    initWindowInteractions() {
        // Make windows draggable
        interact('.window')
            .draggable({
                allowFrom: '.window-header',
                listeners: {
                    move(event) {
                        const target = event.target;
                        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                        target.style.transform = `translate(${x}px, ${y}px)`;
                        target.setAttribute('data-x', x);
                        target.setAttribute('data-y', y);
                    }
                },
                modifiers: [
                    interact.modifiers.restrictRect({
                        restriction: 'parent',
                        endOnly: true
                    })
                ]
            })
            .resizable({
                edges: { left: false, right: true, bottom: true, top: false },
                listeners: {
                    move(event) {
                        const target = event.target;
                        let x = parseFloat(target.getAttribute('data-x')) || 0;
                        let y = parseFloat(target.getAttribute('data-y')) || 0;

                        target.style.width = `${event.rect.width}px`;
                        target.style.height = `${event.rect.height}px`;

                        x += event.deltaRect.left;
                        y += event.deltaRect.top;

                        target.style.transform = `translate(${x}px, ${y}px)`;
                        target.setAttribute('data-x', x);
                        target.setAttribute('data-y', y);
                    }
                },
                modifiers: [
                    interact.modifiers.restrictSize({
                        min: { width: 400, height: 300 }
                    })
                ]
            });
    }
}

// Initialize terminal when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const terminal = new Terminal();
    window.terminal = terminal; // Make available for debugging
});
