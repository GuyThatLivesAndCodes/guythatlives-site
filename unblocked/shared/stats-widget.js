/**
 * Stats Widget - Compact live stats display for header/corner
 * Shows quick stats without taking up much space
 */

class StatsWidget {
    constructor() {
        this.widget = null;
        this.updateInterval = null;
        this.UPDATE_INTERVAL = 15000; // Update every 15 seconds
        this.isMinimized = false;
    }

    /**
     * Create and inject widget into page
     */
    async initialize(position = 'bottom-right', draggable = false) {
        // Initialize presence tracker
        if (!window.presenceTracker.initialized) {
            await window.presenceTracker.initialize();
        }

        // Store draggable preference
        this.draggable = draggable;

        // Create widget HTML
        this.createWidget(position);

        // Load initial stats
        await this.updateStats();

        // Set up auto-updates
        this.startUpdates();

        // Load saved state
        const savedState = localStorage.getItem('stats-widget-minimized');
        if (savedState === 'true') {
            this.minimize();
        }

        console.log('Stats Widget initialized');
    }

    /**
     * Create widget HTML
     */
    createWidget(position) {
        this.widget = document.createElement('div');
        this.widget.className = `stats-widget stats-widget-${position}`;
        this.widget.innerHTML = `
            <div class="stats-widget-header">
                <span class="pulse-dot-small"></span>
                <span class="stats-widget-title">Live</span>
                <button class="stats-widget-toggle" title="Toggle stats">
                    <span class="toggle-icon">▼</span>
                </button>
            </div>
            <div class="stats-widget-content">
                <div class="stats-widget-row">
                    <span class="stats-widget-label">Online:</span>
                    <span class="stats-widget-value" id="widget-online">0</span>
                </div>
                <div class="stats-widget-row">
                    <span class="stats-widget-label">Today:</span>
                    <span class="stats-widget-value" id="widget-24h">0</span>
                </div>
                <div class="stats-widget-row">
                    <span class="stats-widget-label">Playing:</span>
                    <span class="stats-widget-value" id="widget-playing">0</span>
                </div>
            </div>
        `;

        document.body.appendChild(this.widget);

        // Add toggle listener
        const toggleBtn = this.widget.querySelector('.stats-widget-toggle');
        toggleBtn.addEventListener('click', () => this.toggleMinimize());

        // Make widget draggable only if enabled
        if (this.draggable) {
            this.makeDraggable();
        }
    }

    /**
     * Make widget draggable
     */
    makeDraggable() {
        const header = this.widget.querySelector('.stats-widget-header');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        header.style.cursor = 'grab';

        header.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        function dragStart(e) {
            if (e.target.classList.contains('stats-widget-toggle') ||
                e.target.classList.contains('toggle-icon')) {
                return;
            }

            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === header || e.target.parentElement === header) {
                isDragging = true;
            }
        }

        const self = this;
        function drag(e) {
            if (isDragging) {
                e.preventDefault();

                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                self.widget.style.transform = `translate(${currentX}px, ${currentY}px)`;
                self.widget.style.bottom = 'auto';
                self.widget.style.right = 'auto';
                self.widget.style.top = 'auto';
                self.widget.style.left = 'auto';
            }
        }

        function dragEnd() {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        }
    }

    /**
     * Update stats
     */
    async updateStats() {
        try {
            const stats = await window.presenceTracker.getStats();

            this.updateValue('widget-online', stats.onlineUsers);
            this.updateValue('widget-24h', stats.users24h);
            this.updateValue('widget-playing', stats.totalPlaying);
        } catch (error) {
            console.error('Error updating widget stats:', error);
        }
    }

    /**
     * Update a single value with animation
     */
    updateValue(elementId, newValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const oldValue = parseInt(element.textContent) || 0;

        if (oldValue !== newValue) {
            element.classList.add('stats-widget-value-update');
            element.textContent = newValue;

            setTimeout(() => {
                element.classList.remove('stats-widget-value-update');
            }, 500);
        }
    }

    /**
     * Toggle minimize/maximize
     */
    toggleMinimize() {
        if (this.isMinimized) {
            this.maximize();
        } else {
            this.minimize();
        }
    }

    /**
     * Minimize widget
     */
    minimize() {
        this.isMinimized = true;
        this.widget.classList.add('stats-widget-minimized');
        this.widget.querySelector('.toggle-icon').textContent = '▲';
        localStorage.setItem('stats-widget-minimized', 'true');
    }

    /**
     * Maximize widget
     */
    maximize() {
        this.isMinimized = false;
        this.widget.classList.remove('stats-widget-minimized');
        this.widget.querySelector('.toggle-icon').textContent = '▼';
        localStorage.setItem('stats-widget-minimized', 'false');
    }

    /**
     * Start auto-updates
     */
    startUpdates() {
        this.updateInterval = setInterval(() => {
            this.updateStats();
        }, this.UPDATE_INTERVAL);
    }

    /**
     * Stop updates and cleanup
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.widget) {
            this.widget.remove();
        }
    }
}

// Create global instance
window.statsWidget = new StatsWidget();
