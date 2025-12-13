// ⚠️ DEVELOPMENT ONLY - NOT PRODUCTION READY
// - Passwords stored in plain text in localStorage
// - No server-side validation
// - No email verification
// - No password recovery
// - No rate limiting or brute force protection
// TODO: Integrate with backend authentication service (Firebase, Auth0, or custom backend)

// Authentication system for GuyThatLives Network Math Platform
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.loginModal = null;
        this.signupModal = null;
        this.userMenuDropdown = null;
        this.init();
    }

    init() {
        // Inject modal HTML into document
        this.injectModalHTML();

        // Check if user is logged in from localStorage
        const savedUser = localStorage.getItem('guythatlives_user');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.isLoggedIn = true;
                this.updateUIForLoggedInUser();
            } catch (error) {
                console.error('Error loading saved user:', error);
                localStorage.removeItem('guythatlives_user');
            }
        }

        // Setup event listeners
        this.setupEventListeners();

        // Close modals on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    // Inject modal HTML into the document
    injectModalHTML() {
        const modalHTML = `
            <!-- Login Modal -->
            <div id="loginModal" class="auth-modal">
                <div class="auth-modal-content">
                    <button class="auth-modal-close" onclick="authSystem.closeAllModals()">&times;</button>

                    <div class="auth-modal-header">
                        <div class="auth-modal-icon">🔐</div>
                        <h2 class="auth-modal-title">Welcome Back</h2>
                        <p class="auth-modal-subtitle">Login to save your progress</p>
                    </div>

                    <form id="loginForm" class="auth-form">
                        <div id="loginError" class="auth-error" style="display: none;"></div>

                        <div class="auth-form-group">
                            <label for="loginEmail" class="auth-label">Email</label>
                            <input
                                type="email"
                                id="loginEmail"
                                class="auth-input"
                                placeholder="your@email.com"
                                required
                                autocomplete="email"
                            >
                        </div>

                        <div class="auth-form-group">
                            <label for="loginPassword" class="auth-label">Password</label>
                            <input
                                type="password"
                                id="loginPassword"
                                class="auth-input"
                                placeholder="••••••••"
                                required
                                autocomplete="current-password"
                            >
                        </div>

                        <button type="submit" class="auth-btn auth-btn-primary">
                            <span>🚀</span> Login
                        </button>

                        <div class="auth-form-footer">
                            <a href="#" class="auth-link" onclick="authSystem.showForgotPassword(); return false;">
                                Forgot password?
                            </a>
                            <span class="auth-divider">•</span>
                            <a href="#" class="auth-link" onclick="authSystem.switchToSignup(); return false;">
                                Create account
                            </a>
                        </div>

                        <div class="auth-guest-option">
                            <button type="button" class="auth-btn-guest" onclick="authSystem.closeAllModals()">
                                Continue as Guest
                            </button>
                            <p class="auth-guest-note">Progress won't be saved</p>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Signup Modal -->
            <div id="signupModal" class="auth-modal">
                <div class="auth-modal-content">
                    <button class="auth-modal-close" onclick="authSystem.closeAllModals()">&times;</button>

                    <div class="auth-modal-header">
                        <div class="auth-modal-icon">✨</div>
                        <h2 class="auth-modal-title">Create Account</h2>
                        <p class="auth-modal-subtitle">Start your learning journey</p>
                    </div>

                    <form id="signupForm" class="auth-form">
                        <div id="signupError" class="auth-error" style="display: none;"></div>

                        <div class="auth-form-group">
                            <label for="signupEmail" class="auth-label">Email</label>
                            <input
                                type="email"
                                id="signupEmail"
                                class="auth-input"
                                placeholder="your@email.com"
                                required
                                autocomplete="email"
                            >
                        </div>

                        <div class="auth-form-group">
                            <label for="signupUsername" class="auth-label">Username</label>
                            <input
                                type="text"
                                id="signupUsername"
                                class="auth-input"
                                placeholder="Choose a username"
                                required
                                autocomplete="username"
                                minlength="3"
                                maxlength="20"
                            >
                        </div>

                        <div class="auth-form-group">
                            <label for="signupPassword" class="auth-label">Password</label>
                            <input
                                type="password"
                                id="signupPassword"
                                class="auth-input"
                                placeholder="••••••••"
                                required
                                autocomplete="new-password"
                                minlength="6"
                            >
                            <small class="auth-hint">At least 6 characters</small>
                        </div>

                        <div class="auth-form-group">
                            <label for="signupPasswordConfirm" class="auth-label">Confirm Password</label>
                            <input
                                type="password"
                                id="signupPasswordConfirm"
                                class="auth-input"
                                placeholder="••••••••"
                                required
                                autocomplete="new-password"
                            >
                        </div>

                        <button type="submit" class="auth-btn auth-btn-primary">
                            <span>🎯</span> Create Account
                        </button>

                        <div class="auth-form-footer">
                            <span>Already have an account?</span>
                            <a href="#" class="auth-link" onclick="authSystem.switchToLogin(); return false;">
                                Login here
                            </a>
                        </div>
                    </form>
                </div>
            </div>

            <!-- User Menu Dropdown -->
            <div id="userMenuDropdown" class="user-menu-dropdown" style="display: none;">
                <div class="user-menu-header">
                    <div class="user-menu-avatar">👤</div>
                    <div class="user-menu-info">
                        <div class="user-menu-username" id="userMenuUsername"></div>
                        <div class="user-menu-email" id="userMenuEmail"></div>
                    </div>
                </div>
                <div class="user-menu-divider"></div>
                <a href="/math/profile/" class="user-menu-item">
                    <span>📊</span> My Profile
                </a>
                <a href="#" class="user-menu-item" onclick="authSystem.showSettings(); return false;">
                    <span>⚙️</span> Settings
                </a>
                <div class="user-menu-divider"></div>
                <a href="#" class="user-menu-item user-menu-logout" onclick="authSystem.logout(); return false;">
                    <span>🚪</span> Logout
                </a>
            </div>
        `;

        // Inject at end of body
        const div = document.createElement('div');
        div.innerHTML = modalHTML;
        document.body.appendChild(div);

        // Get references
        this.loginModal = document.getElementById('loginModal');
        this.signupModal = document.getElementById('signupModal');
        this.userMenuDropdown = document.getElementById('userMenuDropdown');
    }

    // Setup event listeners
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Signup form
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignup();
            });
        }

        // Close modals when clicking outside
        this.loginModal?.addEventListener('click', (e) => {
            if (e.target === this.loginModal) {
                this.closeAllModals();
            }
        });

        this.signupModal?.addEventListener('click', (e) => {
            if (e.target === this.signupModal) {
                this.closeAllModals();
            }
        });

        // Close user menu when clicking outside
        document.addEventListener('click', (e) => {
            const loginBtn = document.getElementById('loginBtn');
            const dropdown = this.userMenuDropdown;
            if (dropdown && !loginBtn?.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    // Show login modal
    showLoginModal() {
        this.closeAllModals();
        this.loginModal.style.display = 'flex';
        document.getElementById('loginEmail')?.focus();

        // Add show class for animation
        setTimeout(() => {
            this.loginModal.classList.add('show');
        }, 10);
    }

    // Show signup modal
    showSignupModal() {
        this.closeAllModals();
        this.signupModal.style.display = 'flex';
        document.getElementById('signupEmail')?.focus();

        // Add show class for animation
        setTimeout(() => {
            this.signupModal.classList.add('show');
        }, 10);
    }

    // Switch from login to signup
    switchToSignup() {
        this.loginModal.classList.remove('show');
        setTimeout(() => {
            this.loginModal.style.display = 'none';
            this.showSignupModal();
        }, 300);
    }

    // Switch from signup to login
    switchToLogin() {
        this.signupModal.classList.remove('show');
        setTimeout(() => {
            this.signupModal.style.display = 'none';
            this.showLoginModal();
        }, 300);
    }

    // Close all modals
    closeAllModals() {
        this.loginModal?.classList.remove('show');
        this.signupModal?.classList.remove('show');

        setTimeout(() => {
            if (this.loginModal) this.loginModal.style.display = 'none';
            if (this.signupModal) this.signupModal.style.display = 'none';
        }, 300);

        // Clear form errors
        this.clearErrors();
    }

    // Clear form errors
    clearErrors() {
        const loginError = document.getElementById('loginError');
        const signupError = document.getElementById('signupError');
        if (loginError) loginError.style.display = 'none';
        if (signupError) signupError.style.display = 'none';
    }

    // Show error message
    showError(formType, message) {
        const errorElement = document.getElementById(`${formType}Error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    // Handle login form submission
    async handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        this.clearErrors();

        const result = await this.login(email, password);

        if (result.success) {
            this.closeAllModals();
            this.showSuccessNotification('Welcome back!');

            // Reload progress if progress tracker exists
            if (window.progressTracker) {
                window.progressTracker.onUserLogin(this.currentUser);
            }
        } else {
            this.showError('login', result.error);
        }
    }

    // Handle signup form submission
    async handleSignup() {
        const email = document.getElementById('signupEmail').value.trim();
        const username = document.getElementById('signupUsername').value.trim();
        const password = document.getElementById('signupPassword').value;
        const passwordConfirm = document.getElementById('signupPasswordConfirm').value;

        this.clearErrors();

        // Validate passwords match
        if (password !== passwordConfirm) {
            this.showError('signup', 'Passwords do not match');
            return;
        }

        // Validate username
        if (username.length < 3) {
            this.showError('signup', 'Username must be at least 3 characters');
            return;
        }

        // Validate password strength
        if (password.length < 6) {
            this.showError('signup', 'Password must be at least 6 characters');
            return;
        }

        const result = await this.signup(email, username, password);

        if (result.success) {
            this.closeAllModals();
            this.showSuccessNotification('Account created successfully!');

            // Initialize progress for new user
            if (window.progressTracker) {
                window.progressTracker.onUserLogin(this.currentUser);
            }
        } else {
            this.showError('signup', result.error);
        }
    }

    // Login with email/password (stored locally for now)
    async login(email, password) {
        // TODO: Replace with backend API call
        const users = JSON.parse(localStorage.getItem('guythatlives_users') || '{}');

        if (users[email] && users[email].password === password) {
            this.currentUser = {
                email: email,
                username: users[email].username,
                createdAt: users[email].createdAt
            };
            this.isLoggedIn = true;
            localStorage.setItem('guythatlives_user', JSON.stringify(this.currentUser));
            this.updateUIForLoggedInUser();
            return { success: true };
        }

        return { success: false, error: 'Invalid email or password' };
    }

    // Signup new user
    async signup(email, username, password) {
        // TODO: Replace with backend API call
        const users = JSON.parse(localStorage.getItem('guythatlives_users') || '{}');

        if (users[email]) {
            return { success: false, error: 'Email already exists' };
        }

        // Check if username is taken
        const usernameExists = Object.values(users).some(u => u.username === username);
        if (usernameExists) {
            return { success: false, error: 'Username already taken' };
        }

        users[email] = {
            username: username,
            password: password, // ⚠️ NEVER store passwords in plain text in production!
            createdAt: Date.now()
        };

        localStorage.setItem('guythatlives_users', JSON.stringify(users));

        // Auto-login after signup
        return await this.login(email, password);
    }

    // Logout
    logout() {
        this.currentUser = null;
        this.isLoggedIn = false;
        localStorage.removeItem('guythatlives_user');
        this.updateUIForLoggedOutUser();
        this.userMenuDropdown.style.display = 'none';
        this.showSuccessNotification('Logged out successfully');

        // Notify progress tracker
        if (window.progressTracker) {
            window.progressTracker.onUserLogout();
        }
    }

    // Update UI based on login state
    updateUIForLoggedInUser() {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.innerHTML = `<span>👤</span> ${this.currentUser.username}`;
            loginBtn.onclick = (e) => {
                e.stopPropagation();
                this.toggleUserMenu();
            };
            loginBtn.classList.add('logged-in');
        }

        // Update user menu dropdown
        const usernameEl = document.getElementById('userMenuUsername');
        const emailEl = document.getElementById('userMenuEmail');
        if (usernameEl) usernameEl.textContent = this.currentUser.username;
        if (emailEl) emailEl.textContent = this.currentUser.email;
    }

    updateUIForLoggedOutUser() {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.innerHTML = `<span>🔐</span> Login`;
            loginBtn.onclick = () => this.showLoginModal();
            loginBtn.classList.remove('logged-in');
        }
    }

    // Toggle user menu dropdown
    toggleUserMenu() {
        if (!this.userMenuDropdown) return;

        const isVisible = this.userMenuDropdown.style.display === 'block';
        this.userMenuDropdown.style.display = isVisible ? 'none' : 'block';

        // Position dropdown below login button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn && !isVisible) {
            const rect = loginBtn.getBoundingClientRect();
            this.userMenuDropdown.style.top = (rect.bottom + 10) + 'px';
            this.userMenuDropdown.style.right = (window.innerWidth - rect.right) + 'px';
        }
    }

    // Show forgot password (placeholder)
    showForgotPassword() {
        alert('Password recovery is not available in development mode.\n\nIn production, this would send a password reset email.');
        // TODO: Implement password recovery with backend
    }

    // Show settings (placeholder)
    showSettings() {
        this.userMenuDropdown.style.display = 'none';
        alert('Settings page coming soon!');
        // TODO: Create settings page
    }

    // Show success notification
    showSuccessNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'auth-notification auth-notification-success';
        notification.innerHTML = `
            <span>✓</span> ${message}
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if logged in
    isUserLoggedIn() {
        return this.isLoggedIn;
    }
}

// Global auth instance - initialize on load
window.authSystem = new AuthSystem();
