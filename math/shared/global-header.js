// Global header component that shows login state on all pages

class GlobalHeader {
    constructor() {
        this.inject();
    }

    inject() {
        // Find header or create one
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
            loginBtn.innerHTML = '<span>🔐</span> Sign in with Google';
            loginBtn.onclick = () => {
                if (window.authSystem) {
                    window.authSystem.signInWithGoogle();
                }
            };

            header.appendChild(loginBtn);
        }
    }
}

// Auto-initialize
new GlobalHeader();
