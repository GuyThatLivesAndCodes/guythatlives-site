/**
 * G-Chat UI Controller
 * Handles UI state and interactions
 */

class UIController {
    constructor(app) {
        this.app = app;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // User settings
        document.getElementById('user-settings-btn')?.addEventListener('click', () => {
            this.showUserSettings();
        });

        document.getElementById('cancel-settings-btn')?.addEventListener('click', () => {
            this.hideModal('user-settings-modal');
        });

        document.getElementById('user-settings-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveUserSettings();
        });

        // Server settings
        document.getElementById('server-menu-btn')?.addEventListener('click', () => {
            this.showServerSettings();
        });

        document.getElementById('cancel-server-settings-btn')?.addEventListener('click', () => {
            this.hideModal('server-settings-modal');
        });

        document.getElementById('server-settings-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.app.serverManager.saveServerSettings();
        });

        document.getElementById('delete-server-btn')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this server? This cannot be undone.')) {
                this.app.serverManager.deleteServer();
            }
        });

        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    showUserSettings() {
        const profile = this.app.currentUser.profile || {};
        document.getElementById('settings-display-name').value = this.app.currentUser.displayName || this.app.currentUser.username;
        document.getElementById('settings-bio').value = profile.bio || '';
        document.getElementById('settings-status').value = profile.status || 'online';

        this.showModal('user-settings-modal');
    }

    async saveUserSettings() {
        try {
            const displayName = document.getElementById('settings-display-name').value.trim();
            const bio = document.getElementById('settings-bio').value.trim();
            const status = document.getElementById('settings-status').value;
            const avatarFile = document.getElementById('settings-avatar').files[0];

            let avatarUrl = this.app.currentUser.profile?.avatarUrl || '';

            // Upload avatar if changed
            if (avatarFile) {
                if (avatarFile.size > 5 * 1024 * 1024) {
                    alert('Avatar must be less than 5MB');
                    return;
                }

                const storageRef = this.app.storage.ref(`gchat/avatars/${this.app.currentUser.userId}/${Date.now()}`);
                await storageRef.put(avatarFile);
                avatarUrl = await storageRef.getDownloadURL();
            }

            // Update profile in Firestore
            await this.app.db.collection('gchat')
                .doc('profiles')
                .collection('users')
                .doc(this.app.currentUser.userId)
                .update({
                    displayName,
                    bio,
                    status,
                    avatarUrl
                });

            // Update local state
            this.app.currentUser.displayName = displayName;
            this.app.currentUser.profile = {
                ...this.app.currentUser.profile,
                displayName,
                bio,
                status,
                avatarUrl
            };

            // Update UI
            await this.app.loadUserProfile();

            this.hideModal('user-settings-modal');
            this.showSuccess('Profile updated successfully!');

        } catch (error) {
            console.error('Error saving settings:', error);
            this.showError('Failed to save settings');
        }
    }

    showServerSettings() {
        if (!this.app.currentServer) {
            alert('Please select a server first');
            return;
        }

        document.getElementById('edit-server-name').value = this.app.currentServer.name;
        document.getElementById('edit-server-description').value = this.app.currentServer.description || '';

        this.showModal('server-settings-modal');
    }

    showLoading(message = 'Loading...') {
        // TODO: Implement loading overlay
        console.log('Loading:', message);
    }

    hideLoading() {
        // TODO: Hide loading overlay
    }

    showError(message) {
        // TODO: Replace with better toast notification
        alert('Error: ' + message);
    }

    showSuccess(message) {
        // TODO: Implement success toast
        console.log('Success:', message);
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            // Reset form if it exists
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
        }
    }
}
