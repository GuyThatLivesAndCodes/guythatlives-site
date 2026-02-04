/**
 * G-Chat UI Controller
 * Handles UI state and interactions
 */

class UIController {
    constructor(app) {
        this.app = app;
    }

    showLoading(message = 'Loading...') {
        // TODO: Implement loading overlay
        console.log('Loading:', message);
    }

    hideLoading() {
        // TODO: Hide loading overlay
    }

    showError(message) {
        alert(message); // TODO: Replace with better error UI
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
        }
    }
}
