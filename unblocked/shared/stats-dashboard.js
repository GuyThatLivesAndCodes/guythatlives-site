/**
 * Stats Dashboard - Live visitor statistics display
 * Shows real-time online users, 24h visitors, and popular games
 */

class StatsDashboard {
    constructor() {
        this.container = null;
        this.updateInterval = null;
        this.unsubscribe = null;
        this.UPDATE_INTERVAL = 10000; // Update every 10 seconds
        this.animationDuration = 1000; // 1 second for number animations
    }

    /**
     * Create and inject dashboard into page
     */
    async initialize(containerId = 'stats-dashboard') {
        // Check if container exists
        let container = document.getElementById(containerId);

        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        this.container = container;

        // Initialize presence tracker
        await window.presenceTracker.initialize();

        // Create dashboard HTML
        this.renderDashboard();

        // Set up collapse functionality
        this.setupCollapse();

        // Load initial stats
        await this.updateStats();

        // Set up real-time updates
        this.startRealTimeUpdates();

        console.log('Stats Dashboard initialized');
    }

    /**
     * Render dashboard HTML
     */
    renderDashboard() {
        this.container.innerHTML = `
            <div class="stats-dashboard stats-dashboard-compact">
                <div class="stats-header">
                    <h2 class="stats-title">
                        <span class="pulse-dot"></span>
                        Live Stats
                    </h2>
                    <button class="stats-collapse-btn" id="stats-collapse-btn" title="Collapse">
                        <span class="collapse-icon">▼</span>
                    </button>
                </div>

                <div class="stats-grid">
                    <div class="stat-box stat-primary">
                        <div class="stat-icon">👥</div>
                        <div class="stat-content">
                            <div class="stat-value" id="stat-online">0</div>
                            <div class="stat-label">Online Now</div>
                        </div>
                    </div>

                    <div class="stat-box stat-secondary">
                        <div class="stat-icon">📅</div>
                        <div class="stat-content">
                            <div class="stat-value" id="stat-24h">0</div>
                            <div class="stat-label">Last 24 Hours</div>
                        </div>
                    </div>

                    <div class="stat-box stat-accent">
                        <div class="stat-icon">🎮</div>
                        <div class="stat-content">
                            <div class="stat-value" id="stat-playing">0</div>
                            <div class="stat-label">Playing Now</div>
                        </div>
                    </div>
                </div>

                <div class="popular-games-section">
                    <h3 class="popular-games-title">🔥 Hot Right Now</h3>
                    <div class="popular-games-list" id="popular-games-list">
                        <div class="loading-spinner-small"></div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Set up collapse functionality
     */
    setupCollapse() {
        const collapseBtn = document.getElementById('stats-collapse-btn');
        if (!collapseBtn) return;

        // Always start collapsed by default
        this.collapse(true);

        collapseBtn.addEventListener('click', () => {
            this.toggleCollapse();
        });
    }

    /**
     * Toggle collapse state
     */
    toggleCollapse() {
        const dashboard = this.container.querySelector('.stats-dashboard');
        const isCollapsed = dashboard.classList.contains('stats-collapsed');

        if (isCollapsed) {
            this.expand();
        } else {
            this.collapse();
        }
    }

    /**
     * Collapse dashboard
     */
    collapse(skipStorage = false) {
        const dashboard = this.container.querySelector('.stats-dashboard');
        const icon = document.querySelector('.collapse-icon');

        dashboard.classList.add('stats-collapsed');
        if (icon) icon.textContent = '▲';

        if (!skipStorage) {
            localStorage.setItem('stats-dashboard-collapsed', 'true');
        }
    }

    /**
     * Expand dashboard
     */
    expand() {
        const dashboard = this.container.querySelector('.stats-dashboard');
        const icon = document.querySelector('.collapse-icon');

        dashboard.classList.remove('stats-collapsed');
        if (icon) icon.textContent = '▼';

        localStorage.setItem('stats-dashboard-collapsed', 'false');
    }

    /**
     * Update statistics
     */
    async updateStats() {
        try {
            const stats = await window.presenceTracker.getStats();

            // Animate stat values
            this.animateValue('stat-online', stats.onlineUsers);
            this.animateValue('stat-24h', stats.users24h);
            this.animateValue('stat-playing', stats.totalPlaying);

            // Update popular games
            await this.updatePopularGames(stats.popularGames);
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    /**
     * Animate number value change
     */
    animateValue(elementId, endValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = parseInt(element.textContent) || 0;
        const duration = 800; // ms
        const frameDuration = 1000 / 60; // 60 FPS
        const totalFrames = Math.round(duration / frameDuration);
        let frame = 0;

        const counter = setInterval(() => {
            frame++;
            const progress = frame / totalFrames;
            const currentValue = Math.round(startValue + (endValue - startValue) * this.easeOutQuad(progress));

            element.textContent = currentValue;

            if (frame === totalFrames) {
                clearInterval(counter);
                element.textContent = endValue;
            }
        }, frameDuration);
    }

    /**
     * Easing function for smooth animation
     */
    easeOutQuad(t) {
        return t * (2 - t);
    }

    /**
     * Update popular games list
     */
    async updatePopularGames(popularGames) {
        const listElement = document.getElementById('popular-games-list');
        if (!listElement) return;

        if (popularGames.length === 0) {
            listElement.innerHTML = `
                <div class="no-games-playing">
                    <span>No one is playing right now</span>
                    <span class="emoji">😴</span>
                </div>
            `;
            return;
        }

        // Fetch game details
        const gamesWithDetails = await Promise.all(
            popularGames.map(async (game) => {
                try {
                    const gameData = await window.gameManager.getGame(game.gameId);
                    return {
                        ...game,
                        title: gameData.title,
                        thumbnail: gameData.thumbnail
                    };
                } catch (error) {
                    console.error(`Error fetching game ${game.gameId}:`, error);
                    return {
                        ...game,
                        title: 'Unknown Game',
                        thumbnail: null
                    };
                }
            })
        );

        listElement.innerHTML = gamesWithDetails.map((game, index) => `
            <a href="/unblocked/game/?game=${game.gameId}" class="popular-game-item">
                <div class="popular-game-rank">${index + 1}</div>
                <div class="popular-game-thumbnail">
                    ${game.thumbnail
                        ? `<img src="${game.thumbnail}" alt="${game.title}">`
                        : '<div class="game-thumbnail-placeholder">🎮</div>'
                    }
                </div>
                <div class="popular-game-info">
                    <div class="popular-game-title">${game.title}</div>
                    <div class="popular-game-players">
                        <span class="player-dot"></span>
                        ${game.playerCount} ${game.playerCount === 1 ? 'player' : 'players'}
                    </div>
                </div>
            </a>
        `).join('');
    }

    /**
     * Start real-time updates
     */
    startRealTimeUpdates() {
        // Subscribe to real-time changes
        this.unsubscribe = window.presenceTracker.subscribeToStats((stats) => {
            // Update display with new stats
            this.animateValue('stat-online', stats.onlineUsers);
            this.animateValue('stat-24h', stats.users24h);
            this.animateValue('stat-playing', stats.totalPlaying);
            this.updatePopularGames(stats.popularGames);
        });

        // Also poll every 10 seconds as backup
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
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

// Create global instance
window.statsDashboard = new StatsDashboard();
