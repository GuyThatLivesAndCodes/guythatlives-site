/**
 * Disguise System - Camouflage for school use
 * Changes page appearance to look like Google Docs
 */

class DisguiseSystem {
    constructor() {
        this.isDisguised = false;
        this.isPanicMode = false;
        this.originalTitle = document.title;
        this.originalFavicon = this.getCurrentFavicon();

        // Google Docs disguise settings
        this.disguiseTitle = 'Google Docs';
        this.disguiseFavicon = 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico';

        // Load saved state
        this.loadState();

        // Apply disguise if it was active
        if (this.isDisguised) {
            this.applyDisguise();
        }

        // Setup panic mode listener
        this.setupPanicListener();
    }

    /**
     * Get current favicon URL
     */
    getCurrentFavicon() {
        const link = document.querySelector("link[rel*='icon']");
        return link ? link.href : '';
    }

    /**
     * Load saved state from localStorage
     */
    loadState() {
        const saved = localStorage.getItem('disguiseState');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                this.isDisguised = state.isDisguised || false;
            } catch (error) {
                console.error('Error loading disguise state:', error);
            }
        }
    }

    /**
     * Save state to localStorage
     */
    saveState() {
        const state = {
            isDisguised: this.isDisguised
        };
        localStorage.setItem('disguiseState', JSON.stringify(state));
    }

    /**
     * Toggle disguise mode
     */
    toggleDisguise() {
        if (this.isDisguised) {
            this.removeDisguise();
        } else {
            this.applyDisguise();
        }
    }

    /**
     * Apply disguise (change title and favicon)
     */
    applyDisguise() {
        this.isDisguised = true;

        // Change title
        document.title = this.disguiseTitle;

        // Change favicon
        this.setFavicon(this.disguiseFavicon);

        // Update button text
        this.updateDisguiseButtons();

        // Save state
        this.saveState();
    }

    /**
     * Remove disguise (restore original)
     */
    removeDisguise() {
        this.isDisguised = false;

        // Restore title
        document.title = this.originalTitle;

        // Restore favicon
        this.setFavicon(this.originalFavicon);

        // Update button text
        this.updateDisguiseButtons();

        // Save state
        this.saveState();
    }

    /**
     * Set favicon
     */
    setFavicon(url) {
        // Remove existing favicon
        const existingLinks = document.querySelectorAll("link[rel*='icon']");
        existingLinks.forEach(link => link.remove());

        // Add new favicon
        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/x-icon';
        link.href = url;
        document.head.appendChild(link);

        // Also add apple-touch-icon
        const appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        appleLink.href = url;
        document.head.appendChild(appleLink);
    }

    /**
     * Update disguise button text
     */
    updateDisguiseButtons() {
        document.querySelectorAll('.disguise-toggle-btn').forEach(btn => {
            if (this.isDisguised) {
                btn.textContent = '👁️ Show Real Page';
                btn.classList.add('active');
            } else {
                btn.textContent = '🕶️ Disguise Page';
                btn.classList.remove('active');
            }
        });
    }

    /**
     * Enter panic mode
     */
    enterPanicMode() {
        this.isPanicMode = true;

        // Apply disguise first
        if (!this.isDisguised) {
            this.applyDisguise();
        }

        // Create panic overlay
        this.createPanicOverlay();

        // Show panic overlay
        const overlay = document.getElementById('panic-overlay');
        if (overlay) {
            overlay.style.display = 'block';
        }
    }

    /**
     * Exit panic mode
     */
    exitPanicMode() {
        this.isPanicMode = false;

        // Hide panic overlay
        const overlay = document.getElementById('panic-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * Create panic overlay with fake Google Docs
     */
    createPanicOverlay() {
        // Check if overlay already exists
        if (document.getElementById('panic-overlay')) {
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'panic-overlay';
        overlay.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            z-index: 999999;
            overflow: auto;
            font-family: 'Google Sans', Arial, sans-serif;
        `;

        overlay.innerHTML = `
            <!-- Fake Google Docs UI -->
            <div style="width: 100%; height: 100%; background: #f9fbfd;">
                <!-- Header -->
                <div style="background: white; border-bottom: 1px solid #e0e0e0; padding: 8px 16px; display: flex; align-items: center; gap: 16px;">
                    <img src="https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico" style="width: 40px; height: 40px;">
                    <div style="flex: 1;">
                        <div style="font-size: 18px; color: #202124;">Untitled document</div>
                        <div style="font-size: 12px; color: #5f6368; margin-top: 2px;">
                            <span>File</span>
                            <span style="margin: 0 8px;">Edit</span>
                            <span style="margin: 0 8px;">View</span>
                            <span style="margin: 0 8px;">Insert</span>
                            <span style="margin: 0 8px;">Format</span>
                            <span style="margin: 0 8px;">Tools</span>
                            <span style="margin: 0 8px;">Extensions</span>
                            <span style="margin: 0 8px;">Help</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: #1a73e8; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                            U
                        </div>
                    </div>
                </div>

                <!-- Toolbar -->
                <div style="background: #f9fbfd; border-bottom: 1px solid #e0e0e0; padding: 8px 16px; display: flex; gap: 4px;">
                    <button style="padding: 6px 12px; border: none; background: transparent; cursor: pointer; border-radius: 4px; color: #444;">
                        ↶ Undo
                    </button>
                    <button style="padding: 6px 12px; border: none; background: transparent; cursor: pointer; border-radius: 4px; color: #444;">
                        ↷ Redo
                    </button>
                    <div style="width: 1px; background: #e0e0e0; margin: 0 8px;"></div>
                    <button style="padding: 6px 12px; border: none; background: transparent; cursor: pointer; border-radius: 4px; color: #444;">
                        🖨️ Print
                    </button>
                    <button style="padding: 6px 12px; border: none; background: transparent; cursor: pointer; border-radius: 4px; color: #444;">
                        📋 Formatting
                    </button>
                </div>

                <!-- Document Area -->
                <div style="max-width: 816px; margin: 40px auto; background: white; min-height: calc(100vh - 200px); padding: 96px 72px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                    <div style="color: #202124; font-size: 11pt; line-height: 1.6; font-family: Arial, sans-serif;">
                        <p style="margin: 0 0 12px 0;">

                        </p>
                        <p style="margin: 0 0 12px 0; color: #ccc;">
                            <span style="animation: blink 1s infinite;">|</span>
                        </p>
                    </div>
                </div>

                <!-- Exit Hint -->
                <div style="
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    padding: 12px 20px;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    border-radius: 8px;
                    font-family: Arial, sans-serif;
                    font-size: 13px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    z-index: 10;
                ">
                    💡 Click anywhere or press any key to return
                </div>
            </div>

            <style>
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }
            </style>
        `;

        document.body.appendChild(overlay);
    }

    /**
     * Setup panic mode keyboard listener
     */
    setupPanicListener() {
        // Keyboard listener - press any key to exit
        document.addEventListener('keydown', (e) => {
            if (this.isPanicMode) {
                e.preventDefault();
                e.stopPropagation();
                this.exitPanicMode();
            }
        }, true); // Use capture phase to ensure we catch it

        // Click listener - click anywhere to exit
        document.addEventListener('click', (e) => {
            if (this.isPanicMode) {
                e.preventDefault();
                e.stopPropagation();
                this.exitPanicMode();
            }
        }, true); // Use capture phase to ensure we catch it

        // Also listen for mousedown as backup
        document.addEventListener('mousedown', (e) => {
            if (this.isPanicMode) {
                e.preventDefault();
                e.stopPropagation();
                this.exitPanicMode();
            }
        }, true);

        // Touch support for mobile
        document.addEventListener('touchstart', (e) => {
            if (this.isPanicMode) {
                e.preventDefault();
                e.stopPropagation();
                this.exitPanicMode();
            }
        }, true);
    }

    /**
     * Get current state
     */
    getState() {
        return {
            isDisguised: this.isDisguised,
            isPanicMode: this.isPanicMode
        };
    }
}

// Create global instance
window.disguiseSystem = new DisguiseSystem();

// Auto-setup buttons when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Setup disguise toggle buttons
    document.querySelectorAll('.disguise-toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.disguiseSystem.toggleDisguise();
        });
    });

    // Setup panic buttons
    document.querySelectorAll('.panic-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.disguiseSystem.enterPanicMode();
        });
    });

    // Update button states
    window.disguiseSystem.updateDisguiseButtons();
});
