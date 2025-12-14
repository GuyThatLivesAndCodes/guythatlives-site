// Advertisement System for GuyThatLives Network
// Manages ad display based on user preferences

class AdSystem {
    constructor() {
        this.preferences = {
            sidebar: false,
            bottom: false,
            popup: false
        };
        this.init();
    }

    async init() {
        // Wait for auth system to be ready
        await this.waitForAuth();

        // Load user preferences
        await this.loadPreferences();

        // Inject ads based on preferences
        this.injectAds();
    }

    waitForAuth() {
        return new Promise((resolve) => {
            const checkAuth = () => {
                if (window.authSystem && window.authSystem.auth) {
                    resolve();
                } else {
                    setTimeout(checkAuth, 100);
                }
            };
            checkAuth();
        });
    }

    async loadPreferences() {
        if (!window.authSystem || !window.authSystem.isUserLoggedIn()) {
            // Guest users - no ads
            this.preferences = {
                sidebar: false,
                bottom: false,
                popup: false
            };
            return;
        }

        try {
            const user = window.authSystem.getCurrentUser();
            const userDoc = await window.authSystem.db.collection('users').doc(user.uid).get();

            if (userDoc.exists) {
                const data = userDoc.data();
                this.preferences = data.adPreferences || {
                    sidebar: false,
                    bottom: false,
                    popup: false
                };
            }
        } catch (error) {
            console.error('Error loading ad preferences:', error);
        }
    }

    injectAds() {
        // Remove existing ads
        document.querySelectorAll('.ad-container').forEach(el => el.remove());

        // Inject sidebar ad
        if (this.preferences.sidebar) {
            this.injectSidebarAd();
        }

        // Inject bottom ad
        if (this.preferences.bottom) {
            this.injectBottomAd();
        }

        // Inject popup ad (with delay)
        if (this.preferences.popup) {
            this.schedulePopupAd();
        }
    }

    injectSidebarAd() {
        const sidebar = document.createElement('div');
        sidebar.className = 'ad-container ad-sidebar';
        sidebar.innerHTML = `
            <div class="ad-label">Advertisement</div>
            <div class="ad-content">
                <div class="ad-placeholder">
                    <div class="ad-demo">
                        <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">📢</div>
                        <div style="font-size: 0.8rem; color: var(--text-dim);">Sidebar Ad Space</div>
                        <div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 0.3rem;">300x600</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(sidebar);
    }

    injectBottomAd() {
        const bottom = document.createElement('div');
        bottom.className = 'ad-container ad-bottom';
        bottom.innerHTML = `
            <div class="ad-label">Advertisement</div>
            <div class="ad-content">
                <div class="ad-placeholder ad-placeholder-horizontal">
                    <div class="ad-demo">
                        <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">📢</div>
                        <div style="font-size: 0.8rem; color: var(--text-dim);">Bottom Banner Ad Space</div>
                        <div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 0.3rem;">728x90</div>
                    </div>
                </div>
            </div>
            <button class="ad-close" onclick="adSystem.closeBottomAd()">×</button>
        `;
        document.body.appendChild(bottom);
    }

    schedulePopupAd() {
        // Show popup after 30 seconds, then every 2 minutes
        setTimeout(() => {
            this.showPopupAd();
            setInterval(() => this.showPopupAd(), 120000); // Every 2 minutes
        }, 30000); // First popup after 30 seconds
    }

    showPopupAd() {
        // Don't show if popup already exists
        if (document.querySelector('.ad-popup')) return;

        const popup = document.createElement('div');
        popup.className = 'ad-container ad-popup';
        popup.innerHTML = `
            <div class="ad-popup-overlay" onclick="adSystem.closePopupAd()"></div>
            <div class="ad-popup-content">
                <div class="ad-label">Advertisement</div>
                <div class="ad-content">
                    <div class="ad-placeholder ad-placeholder-popup">
                        <div class="ad-demo">
                            <div style="font-size: 2rem; margin-bottom: 0.5rem;">📢</div>
                            <div style="font-size: 1rem; color: var(--text-dim); margin-bottom: 0.5rem;">Pop-up Ad Space</div>
                            <div style="font-size: 0.8rem; color: var(--text-dim);">300x250</div>
                        </div>
                    </div>
                </div>
                <button class="ad-close ad-close-popup" onclick="adSystem.closePopupAd()">×</button>
                <div style="font-size: 0.7rem; color: var(--text-dim); text-align: center; margin-top: 0.8rem;">
                    Close this ad to continue • Ad will reappear in 2 minutes
                </div>
            </div>
        `;
        document.body.appendChild(popup);

        // Animate in
        setTimeout(() => popup.classList.add('show'), 10);
    }

    closeBottomAd() {
        const ad = document.querySelector('.ad-bottom');
        if (ad) ad.remove();
    }

    closePopupAd() {
        const ad = document.querySelector('.ad-popup');
        if (ad) {
            ad.classList.remove('show');
            setTimeout(() => ad.remove(), 300);
        }
    }

    // Update preferences and reload ads
    async updatePreferences(prefs) {
        this.preferences = prefs;
        this.injectAds();
    }
}

// Global instance - initialize after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.adSystem = new AdSystem();
    });
} else {
    window.adSystem = new AdSystem();
}
