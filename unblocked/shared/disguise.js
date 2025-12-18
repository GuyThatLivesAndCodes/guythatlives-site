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
            overflow: hidden;
        `;

        overlay.innerHTML = `
            <iframe
                src="https://docs.google.com/document/u/0/"
                style="width: 100%; height: 100%; border: none;"
                frameborder="0"
            ></iframe>
            <div style="
                position: absolute;
                bottom: 20px;
                right: 20px;
                padding: 10px 20px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                border-radius: 8px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                pointer-events: none;
            ">
                Press any key to return
            </div>
        `;

        document.body.appendChild(overlay);
    }

    /**
     * Setup panic mode keyboard listener
     */
    setupPanicListener() {
        document.addEventListener('keydown', (e) => {
            if (this.isPanicMode) {
                e.preventDefault();
                this.exitPanicMode();
            }
        });

        // Also allow clicking to exit
        document.addEventListener('click', (e) => {
            if (this.isPanicMode && e.target.closest('#panic-overlay')) {
                this.exitPanicMode();
            }
        });
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
