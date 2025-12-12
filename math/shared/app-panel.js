// Modular App Panel System for GuyThatLives Network Math Platform

class AppPanel {
    constructor(position = { x: 2, y: 50 }) {
        this.position = position;
        this.isExpanded = false;
        this.activeApp = null;
        this.apps = {};
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.element = null;
        
        this.init();
    }

    init() {
        this.createElement();
        this.setupEventListeners();
        this.loadAvailableApps();
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'app-panel';
        this.element.style.left = `${this.position.x}rem`;
        this.element.style.top = `${this.position.y}%`;
        
        this.element.innerHTML = `
            <div class="drag-handle"></div>
            <div class="app-panel-header">
                <h3 class="panel-title">// apps</h3>
            </div>
            <div class="app-grid" id="appGrid">
                <!-- App icons will be populated here -->
            </div>
            <div class="app-display" id="appDisplay">
                <!-- Active app content will appear here -->
            </div>
        `;

        document.body.appendChild(this.element);
    }

    setupEventListeners() {
        // Panel expansion toggle
        this.element.addEventListener('click', (e) => {
            if (e.target.classList.contains('app-icon') || e.target.closest('.app-icon')) {
                return; // Let app icon handle this
            }
            if (!this.isExpanded && !this.isDragging) {
                this.expand();
            }
        });

        // Drag functionality
        const dragHandle = this.element.querySelector('.drag-handle');
        
        dragHandle.addEventListener('mousedown', (e) => {
            this.startDrag(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.drag(e);
            }
        });

        document.addEventListener('mouseup', () => {
            this.stopDrag();
        });

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target) && this.isExpanded) {
                this.collapse();
            }
        });

        // Prevent panel from closing when interacting with apps
        this.element.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    startDrag(e) {
        this.isDragging = true;
        const rect = this.element.getBoundingClientRect();
        
        // Calculate offset from top-left corner (not center)
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
        
        this.element.style.transition = 'none';
        this.element.style.transform = 'none'; // Remove transform while dragging
        document.body.style.cursor = 'move';
        e.preventDefault();
    }

    drag(e) {
        if (!this.isDragging) return;
        
        // Calculate new position based on corner, not center
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        
        // Constrain to viewport with padding to prevent completely off-screen
        const padding = 50; // Minimum visible area
        const maxX = window.innerWidth - padding;
        const maxY = window.innerHeight - padding;
        const minX = -(this.element.offsetWidth - padding);
        const minY = 0;
        
        const constrainedX = Math.max(minX, Math.min(x, maxX));
        const constrainedY = Math.max(minY, Math.min(y, maxY));
        
        this.element.style.left = constrainedX + 'px';
        this.element.style.top = constrainedY + 'px';
    }

    stopDrag() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.element.style.transition = '';
        document.body.style.cursor = '';
        
        // Convert back to relative units and restore transform
        const rect = this.element.getBoundingClientRect();
        this.position.x = (rect.left / window.innerWidth) * 100;
        this.position.y = (rect.top / window.innerHeight) * 100;
        
        // Only update positioning, don't change transform
        this.element.style.left = `${this.position.x}%`;
        this.element.style.top = `${this.position.y}%`;
    }

    expand() {
        this.isExpanded = true;
        this.element.classList.add('expanded');
    }

    collapse() {
        this.isExpanded = false;
        this.activeApp = null;
        this.element.classList.remove('expanded');
        
        // Reset all app icons and content
        document.querySelectorAll('.app-icon').forEach(icon => {
            icon.classList.remove('active');
        });
        document.querySelectorAll('.app-content').forEach(content => {
            content.classList.remove('active');
        });
    }

    registerApp(appConfig) {
        this.apps[appConfig.id] = appConfig;
        this.renderAppGrid();
        this.renderAppContent();
    }

    renderAppGrid() {
        const appGrid = document.getElementById('appGrid');
        appGrid.innerHTML = Object.values(this.apps).map(app => `
            <div class="app-icon" data-app="${app.id}" title="${app.name}">
                ${app.icon}
            </div>
        `).join('');

        // Add click listeners to app icons
        appGrid.querySelectorAll('.app-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const appId = icon.dataset.app;
                this.openApp(appId);
            });
        });
    }

    renderAppContent() {
        const appDisplay = document.getElementById('appDisplay');
        appDisplay.innerHTML = Object.values(this.apps).map(app => `
            <div class="app-content" id="app-${app.id}">
                <div class="app-header">
                    <h4 class="app-title">${app.name}</h4>
                    <button class="app-close" onclick="appPanel.closeApp()">×</button>
                </div>
                <div class="app-body">
                    ${app.content}
                </div>
            </div>
        `).join('');
    }

    openApp(appId) {
        if (!this.isExpanded) {
            this.expand();
        }

        // Reset previous active states
        document.querySelectorAll('.app-icon').forEach(icon => {
            icon.classList.remove('active');
        });
        document.querySelectorAll('.app-content').forEach(content => {
            content.classList.remove('active');
        });

        // Set new active states
        const appIcon = document.querySelector(`[data-app="${appId}"]`);
        const appContent = document.getElementById(`app-${appId}`);
        
        if (appIcon && appContent) {
            appIcon.classList.add('active');
            appContent.classList.add('active');
            this.activeApp = appId;

            // Initialize app if it has an init function
            const app = this.apps[appId];
            if (app.onOpen && typeof app.onOpen === 'function') {
                app.onOpen();
            }
        }
    }

    closeApp() {
        this.collapse();
    }

    loadAvailableApps() {
        // This would typically load from the lesson's app requirements
        // For now, we'll register default apps
        this.registerDefaultApps();
    }

    registerDefaultApps() {
        // Calculator App
        this.registerApp({
            id: 'calculator',
            name: 'Calculator',
            icon: '🧮',
            content: `
                <div class="calculator-app">
                    <input type="text" class="calc-display" id="calcDisplay" placeholder="0">
                    <div class="calc-grid">
                        <button class="calc-btn clear" onclick="calculator.clear()">C</button>
                        <button class="calc-btn clear" onclick="calculator.clearEntry()">CE</button>
                        <button class="calc-btn operator" onclick="calculator.append('/')">/</button>
                        <button class="calc-btn operator" onclick="calculator.append('*')">×</button>
                        
                        <button class="calc-btn" onclick="calculator.append('7')">7</button>
                        <button class="calc-btn" onclick="calculator.append('8')">8</button>
                        <button class="calc-btn" onclick="calculator.append('9')">9</button>
                        <button class="calc-btn operator" onclick="calculator.append('-')">-</button>
                        
                        <button class="calc-btn" onclick="calculator.append('4')">4</button>
                        <button class="calc-btn" onclick="calculator.append('5')">5</button>
                        <button class="calc-btn" onclick="calculator.append('6')">6</button>
                        <button class="calc-btn operator" onclick="calculator.append('+')">+</button>
                        
                        <button class="calc-btn" onclick="calculator.append('1')">1</button>
                        <button class="calc-btn" onclick="calculator.append('2')">2</button>
                        <button class="calc-btn" onclick="calculator.append('3')">3</button>
                        <button class="calc-btn equals" onclick="calculator.calculate()" style="grid-row: span 2;">=</button>
                        
                        <button class="calc-btn" onclick="calculator.append('0')" style="grid-column: span 2;">0</button>
                        <button class="calc-btn" onclick="calculator.append('.')">.</button>
                    </div>
                </div>
            `,
            onOpen: () => {
                // Initialize calculator when opened
                if (typeof calculator !== 'undefined') {
                    calculator.reset();
                    // Small delay to ensure DOM is ready
                    setTimeout(() => {
                        calculator.initInputListeners();
                    }, 100);
                }
            }
        });

        // Notes App
        this.registerApp({
            id: 'notes',
            name: 'Notes',
            icon: '📝',
            content: `
                <div class="notes-app">
                    <textarea class="notes-textarea" id="notesText" placeholder="Take notes during your lesson..."></textarea>
                    <div class="notes-meta">
                        Auto-saves locally
                    </div>
                </div>
            `,
            onOpen: () => {
                // Load saved notes
                const notesText = document.getElementById('notesText');
                const saved = localStorage.getItem('math_notes');
                if (saved) {
                    notesText.value = saved;
                }
                
                // Auto-save notes
                notesText.addEventListener('input', (e) => {
                    localStorage.setItem('math_notes', e.target.value);
                });
            }
        });

        // Timer App
        this.registerApp({
            id: 'timer',
            name: 'Timer',
            icon: '⏱️',
            content: `
                <div class="timer-app">
                    <div class="timer-display" id="timerDisplay">00:00</div>
                    <div class="timer-controls">
                        <button class="timer-btn" id="timerStart" onclick="timer.start()">Start</button>
                        <button class="timer-btn" id="timerPause" onclick="timer.pause()">Pause</button>
                        <button class="timer-btn" id="timerReset" onclick="timer.reset()">Reset</button>
                    </div>
                </div>
            `,
            onOpen: () => {
                // Initialize timer when opened
                if (typeof timer !== 'undefined') {
                    timer.init();
                }
            }
        });
    }
}

// Calculator functionality
const calculator = {
    current: '',
    
    append(value) {
        const display = document.getElementById('calcDisplay');
        if (!display) return;
        
        if (['+', '-', '*', '/'].includes(value)) {
            if (['+', '-', '*', '/'].includes(this.current.slice(-1))) {
                this.current = this.current.slice(0, -1) + value;
            } else {
                this.current += value;
            }
        } else {
            this.current += value;
        }
        display.value = this.current.replace(/\*/g, '×');
        this.syncFromInput();
    },
    
    clear() {
        const display = document.getElementById('calcDisplay');
        if (!display) return;
        
        this.current = '';
        display.value = '';
    },
    
    clearEntry() {
        const display = document.getElementById('calcDisplay');
        if (!display) return;
        
        this.current = this.current.slice(0, -1);
        display.value = this.current.replace(/\*/g, '×');
    },
    
    calculate() {
        const display = document.getElementById('calcDisplay');
        if (!display) return;
        
        try {
            // Sync from input first in case user typed manually
            this.syncFromInput();
            
            const calculation = this.current.replace(/×/g, '*');
            const result = eval(calculation);
            if (isNaN(result) || !isFinite(result)) {
                display.value = 'Error';
                this.current = '';
            } else {
                display.value = result;
                this.current = result.toString();
            }
        } catch (error) {
            display.value = 'Error';
            this.current = '';
        }
    },
    
    // Sync calculator state with manual input
    syncFromInput() {
        const display = document.getElementById('calcDisplay');
        if (!display) return;
        
        const inputValue = display.value.replace(/×/g, '*');
        // Only update if it's a valid expression
        if (/^[0-9+\-*/.() ]*$/.test(inputValue)) {
            this.current = inputValue;
        }
    },
    
    reset() {
        this.clear();
    },
    
    // Initialize input listeners
    initInputListeners() {
        const display = document.getElementById('calcDisplay');
        if (!display) return;
        
        // Allow manual typing
        display.addEventListener('input', () => {
            this.syncFromInput();
        });
        
        // Handle keyboard shortcuts
        display.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.calculate();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.clear();
            }
        });
    }
};

// Timer functionality
const timer = {
    startTime: null,
    elapsed: 0,
    isRunning: false,
    interval: null,
    
    init() {
        this.updateDisplay();
    },
    
    start() {
        if (!this.isRunning) {
            this.startTime = Date.now() - this.elapsed;
            this.isRunning = true;
            this.interval = setInterval(() => this.updateDisplay(), 100);
            
            document.getElementById('timerStart').textContent = 'Running';
            document.getElementById('timerStart').classList.add('active');
        }
    },
    
    pause() {
        if (this.isRunning) {
            this.isRunning = false;
            clearInterval(this.interval);
            document.getElementById('timerStart').textContent = 'Start';
            document.getElementById('timerStart').classList.remove('active');
        }
    },
    
    reset() {
        this.isRunning = false;
        this.elapsed = 0;
        this.startTime = null;
        if (this.interval) {
            clearInterval(this.interval);
        }
        document.getElementById('timerStart').textContent = 'Start';
        document.getElementById('timerStart').classList.remove('active');
        this.updateDisplay();
    },
    
    updateDisplay() {
        if (this.isRunning) {
            this.elapsed = Date.now() - this.startTime;
        }
        
        const minutes = Math.floor(this.elapsed / 60000);
        const seconds = Math.floor((this.elapsed % 60000) / 1000);
        
        const display = document.getElementById('timerDisplay');
        if (display) {
            display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }
};

// Global app panel instance
let appPanel;

// Initialize app panel when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we're on a lesson page
    if (document.querySelector('.problem-section') || window.location.pathname.includes('lesson')) {
        appPanel = new AppPanel();
    }
});

// Export for global access
window.AppPanel = AppPanel;
window.appPanel = appPanel;
