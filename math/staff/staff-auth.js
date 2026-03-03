/**
 * staff-auth.js
 * Guards all staff pages. Must be loaded AFTER firebase-auth.js.
 * Blocks page render with a full-screen overlay until auth is verified.
 */

class StaffAuth {
    constructor() {
        this._authChecked = false;
        this.role = null;
        this.user = null;
        this._showOverlay();
    }

    _showOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'staffAuthOverlay';
        overlay.innerHTML = `
            <div class="staff-auth-loading">
                <div class="staff-auth-spinner"></div>
                <div class="staff-auth-text">// verifying access...</div>
            </div>
        `;
        overlay.style.cssText = `
            position: fixed; inset: 0;
            background: #0a0e27;
            display: flex; align-items: center; justify-content: center;
            z-index: 99999;
            font-family: 'JetBrains Mono', monospace;
        `;
        overlay.querySelector('.staff-auth-spinner').style.cssText = `
            width: 32px; height: 32px;
            border: 2px solid rgba(100,255,218,0.2);
            border-top-color: #64ffda;
            border-radius: 50%;
            animation: staffAuthSpin 0.8s linear infinite;
            margin-bottom: 1rem;
        `;
        overlay.querySelector('.staff-auth-text').style.cssText = `
            color: #64ffda;
            font-size: 0.85rem;
            opacity: 0.7;
        `;
        const style = document.createElement('style');
        style.textContent = `@keyframes staffAuthSpin { to { transform: rotate(360deg); } }`;
        document.head.appendChild(style);
        document.body.appendChild(overlay);
    }

    _removeOverlay() {
        document.getElementById('staffAuthOverlay')?.remove();
    }

    _showAccessDenied() {
        const overlay = document.getElementById('staffAuthOverlay');
        if (!overlay) return;
        overlay.querySelector('.staff-auth-loading').innerHTML = `
            <div style="color:#ff5555;font-family:'JetBrains Mono',monospace;text-align:center;">
                <div style="font-size:2rem;margin-bottom:1rem;">⚠</div>
                <div style="font-size:0.9rem;">Access denied. Redirecting...</div>
            </div>
        `;
        setTimeout(() => { window.location.href = '/math/'; }, 1500);
    }

    async checkAccess() {
        await this._waitForAuthSystem();

        const user = window.authSystem ? window.authSystem.getCurrentUser() : null;

        if (!user) {
            this._showAccessDenied();
            return false;
        }

        this.user = user;

        // Hardcoded owner emails always get owner role
        const OWNER_EMAILS = [
            'zorbyteofficial@gmail.com',
            'briston.miller@weatherfordisd.net'
        ];

        if (OWNER_EMAILS.includes(user.email)) {
            this.role = 'owner';
            this._authChecked = true;
            this._removeOverlay();
            this._applyRoleToPage();
            return true;
        }

        // Check staffRoles collection
        try {
            const db = firebase.firestore();
            const roleDoc = await db.collection('staffRoles').doc(user.uid).get();

            if (!roleDoc.exists) {
                this._showAccessDenied();
                return false;
            }

            this.role = roleDoc.data().role;
            this._authChecked = true;
            this._removeOverlay();
            this._applyRoleToPage();
            return true;
        } catch (err) {
            console.error('Staff auth check failed:', err);
            this._showAccessDenied();
            return false;
        }
    }

    _waitForAuthSystem() {
        return new Promise((resolve) => {
            const MAX_WAIT = 8000;
            const start = Date.now();
            const check = () => {
                const sys = window.authSystem;
                if (sys && sys._authChecked) {
                    resolve();
                } else if (Date.now() - start > MAX_WAIT) {
                    // Timeout — treat as not logged in
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    _applyRoleToPage() {
        // Add role class to body for CSS targeting
        document.body.classList.add(`staff-role-${this.role}`);

        // Update any role display elements
        document.querySelectorAll('[data-staff-role]').forEach(el => {
            el.textContent = this.role.charAt(0).toUpperCase() + this.role.slice(1);
        });

        // Hide owner-only elements for non-owners
        if (!this.isOwner()) {
            document.querySelectorAll('[data-require-owner]').forEach(el => el.remove());
        }
        // Hide editor+ elements for viewers
        if (!this.canEdit()) {
            document.querySelectorAll('[data-require-edit]').forEach(el => {
                el.disabled = true;
                el.style.opacity = '0.4';
                el.style.pointerEvents = 'none';
                el.title = 'You need editor permissions to do this.';
            });
        }
    }

    isOwner()  { return this.role === 'owner'; }
    isAdmin()  { return ['owner', 'admin'].includes(this.role); }
    canEdit()  { return ['owner', 'admin', 'editor'].includes(this.role); }
    canView()  { return this.role !== null; }

    getRoleBadgeHTML() {
        const colors = {
            owner:  '#e08cfa',
            admin:  '#64ffda',
            editor: '#f1fa8c',
            viewer: '#b4b7c9'
        };
        const color = colors[this.role] || '#b4b7c9';
        return `<span class="staff-role-badge" style="color:${color};border-color:${color}20;background:${color}15">${this.role}</span>`;
    }
}

// Instantiate immediately so overlay shows as fast as possible
window.staffAuth = new StaffAuth();
