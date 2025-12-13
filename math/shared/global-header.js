// Global header component that shows login state on all pages

class GlobalHeader {
    constructor() {
        this.init();
    }

    init() {
        // Wait for auth system to be ready
        this.waitForAuthSystem();
    }

    waitForAuthSystem() {
        if (window.authSystem) {
            this.inject();
            this.startMonitoring();
        } else {
            setTimeout(() => this.waitForAuthSystem(), 100);
        }
    }

    inject() {
        // Find header
        let header = document.querySelector('header');

        if (!header) {
            console.warn('No header found, skipping global header injection');
            return;
        }

        // Add login button if it doesn't exist
        if (!document.getElementById('loginBtn')) {
            const loginBtn = document.createElement('button');
            loginBtn.id = 'loginBtn';
            loginBtn.className = 'login-btn';

            // Add inline styles for consistency
            loginBtn.style.cssText = `
                padding: 0.7rem 1.5rem;
                background: transparent;
                border: 2px solid var(--accent, #64ffda);
                color: var(--accent, #64ffda);
                border-radius: 8px;
                font-family: 'JetBrains Mono', monospace;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.9rem;
            `;

            // Add hover styles
            if (!document.getElementById('loginBtnHoverStyle')) {
                const style = document.createElement('style');
                style.id = 'loginBtnHoverStyle';
                style.textContent = `
                    .login-btn:hover {
                        background: var(--accent, #64ffda) !important;
                        color: var(--primary, #0a0e27) !important;
                        transform: translateY(-2px);
                    }
                `;
                document.head.appendChild(style);
            }

            header.appendChild(loginBtn);
        }

        // Initial update
        this.updateLoginButton();
    }

    updateLoginButton() {
        const loginBtn = document.getElementById('loginBtn');
        if (!loginBtn) return;

        if (window.authSystem && window.authSystem.isUserLoggedIn()) {
            const user = window.authSystem.getCurrentUser();
            const displayName = user.displayName || user.email.split('@')[0];
            const firstName = displayName.split(' ')[0];

            if (user.photoURL) {
                loginBtn.innerHTML = `
                    <img src="${user.photoURL}" alt="Profile"
                         style="width: 28px; height: 28px; border-radius: 50%;">
                    <span>${firstName}</span>
                `;
            } else {
                loginBtn.innerHTML = `<span>👤</span> <span>${firstName}</span>`;
            }
            loginBtn.onclick = () => window.authSystem.showUserMenu();
        } else {
            loginBtn.innerHTML = `<span>🔐</span> Sign In`;
            loginBtn.onclick = () => window.authSystem.signInWithGoogle();
        }
    }

    startMonitoring() {
        // Check auth state every second
        setInterval(() => this.updateLoginButton(), 1000);
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new GlobalHeader();
    });
} else {
    new GlobalHeader();
}
