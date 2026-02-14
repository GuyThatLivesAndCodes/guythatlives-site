/**
 * Feedback Manager - Handles user feedback for updates
 * Shows a rating prompt 5% of the time when the main area loads
 * Saves feedback to Firebase Firestore
 */

class FeedbackManager {
    constructor() {
        this.db = null;
        this.initialized = false;
        this.SHOW_PROBABILITY = 0.05; // 5% chance
        this.STORAGE_KEY = 'lastFeedbackPrompt';
        this.MIN_DAYS_BETWEEN_PROMPTS = 7; // Don't show more than once per week
    }

    /**
     * Initialize Firebase connection
     */
    async initialize() {
        if (this.initialized) return;

        try {
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase not loaded');
            }

            this.db = firebase.firestore();
            this.initialized = true;
            console.log('FeedbackManager initialized');
        } catch (error) {
            console.error('Failed to initialize FeedbackManager:', error);
            throw error;
        }
    }

    /**
     * Check if we should show the feedback prompt
     */
    shouldShowPrompt() {
        // Check if user was prompted recently
        const lastPrompt = localStorage.getItem(this.STORAGE_KEY);
        if (lastPrompt) {
            const daysSinceLastPrompt = (Date.now() - parseInt(lastPrompt)) / (1000 * 60 * 60 * 24);
            if (daysSinceLastPrompt < this.MIN_DAYS_BETWEEN_PROMPTS) {
                return false;
            }
        }

        // Random 5% chance
        return Math.random() < this.SHOW_PROBABILITY;
    }

    /**
     * Show the feedback prompt modal
     */
    showFeedbackPrompt() {
        // Create modal HTML
        const modal = document.createElement('div');
        modal.className = 'feedback-modal';
        modal.innerHTML = `
            <div class="feedback-modal-content">
                <button class="feedback-modal-close">&times;</button>
                <h2 class="feedback-modal-title">How do you like the new update?</h2>
                <p class="feedback-modal-subtitle">Your feedback helps us improve!</p>

                <div class="feedback-rating">
                    <button class="feedback-rating-btn" data-rating="1">1</button>
                    <button class="feedback-rating-btn" data-rating="2">2</button>
                    <button class="feedback-rating-btn" data-rating="3">3</button>
                    <button class="feedback-rating-btn" data-rating="4">4</button>
                    <button class="feedback-rating-btn" data-rating="5">5</button>
                </div>

                <div class="feedback-labels">
                    <span class="feedback-label-left">Not good</span>
                    <span class="feedback-label-right">Excellent</span>
                </div>

                <div class="feedback-success" style="display: none;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    <span>Thanks for your feedback!</span>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .feedback-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: feedbackFadeIn 0.3s ease;
            }

            @keyframes feedbackFadeIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }

            .feedback-modal-content {
                background: var(--bg-card, #1e1e2e);
                border-radius: 1rem;
                padding: 2rem;
                max-width: 500px;
                width: 90%;
                position: relative;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                animation: feedbackSlideUp 0.3s ease;
            }

            @keyframes feedbackSlideUp {
                from {
                    transform: translateY(20px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            .feedback-modal-close {
                position: absolute;
                top: 1rem;
                right: 1rem;
                background: transparent;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: var(--text-muted, #999);
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 0.5rem;
                transition: all 0.2s ease;
            }

            .feedback-modal-close:hover {
                background: rgba(255, 255, 255, 0.1);
                color: var(--text-primary, #fff);
            }

            .feedback-modal-title {
                font-size: 1.5rem;
                font-weight: 700;
                margin-bottom: 0.5rem;
                color: var(--text-primary, #fff);
            }

            .feedback-modal-subtitle {
                color: var(--text-muted, #999);
                margin-bottom: 2rem;
            }

            .feedback-rating {
                display: flex;
                gap: 1rem;
                justify-content: center;
                margin-bottom: 0.5rem;
            }

            .feedback-rating-btn {
                width: 60px;
                height: 60px;
                border-radius: 0.75rem;
                border: 2px solid var(--border-color, #333);
                background: var(--bg-secondary, #2a2a3e);
                color: var(--text-primary, #fff);
                font-size: 1.5rem;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .feedback-rating-btn:hover {
                transform: translateY(-4px);
                border-color: var(--primary-color, #6366f1);
                background: var(--primary-color, #6366f1);
                box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
            }

            .feedback-rating-btn.selected {
                border-color: var(--primary-color, #6366f1);
                background: var(--primary-color, #6366f1);
                transform: scale(1.1);
            }

            .feedback-labels {
                display: flex;
                justify-content: space-between;
                margin-bottom: 2rem;
                font-size: 0.875rem;
                color: var(--text-muted, #999);
            }

            .feedback-success {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                padding: 1rem;
                background: rgba(34, 197, 94, 0.1);
                border: 1px solid rgba(34, 197, 94, 0.3);
                border-radius: 0.5rem;
                color: #22c55e;
                font-weight: 600;
                animation: feedbackSuccess 0.5s ease;
            }

            @keyframes feedbackSuccess {
                from {
                    transform: scale(0.8);
                    opacity: 0;
                }
                to {
                    transform: scale(1);
                    opacity: 1;
                }
            }

            .feedback-success svg {
                width: 24px;
                height: 24px;
            }

            @media (max-width: 768px) {
                .feedback-rating-btn {
                    width: 50px;
                    height: 50px;
                    font-size: 1.25rem;
                }

                .feedback-rating {
                    gap: 0.5rem;
                }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(modal);

        // Set up event listeners
        const closeBtn = modal.querySelector('.feedback-modal-close');
        const ratingBtns = modal.querySelectorAll('.feedback-rating-btn');
        const successMsg = modal.querySelector('.feedback-success');

        const closeModal = () => {
            modal.style.animation = 'feedbackFadeIn 0.3s ease reverse';
            setTimeout(() => {
                modal.remove();
                style.remove();
            }, 300);
        };

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        ratingBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const rating = parseInt(e.target.dataset.rating);

                // Visual feedback
                ratingBtns.forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');

                // Save feedback
                await this.saveFeedback(rating);

                // Show success message
                successMsg.style.display = 'flex';

                // Close after delay
                setTimeout(closeModal, 2000);
            });
        });

        // Mark that we showed the prompt
        localStorage.setItem(this.STORAGE_KEY, Date.now().toString());
    }

    /**
     * Save feedback to Firebase
     */
    async saveFeedback(rating) {
        await this.initialize();

        try {
            const userId = firebase.auth().currentUser?.uid || null;

            await this.db.collection('feedback').add({
                rating: rating,
                userId: userId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                userAgent: navigator.userAgent,
                url: window.location.href
            });

            console.log('Feedback saved successfully:', rating);
        } catch (error) {
            console.error('Error saving feedback:', error);
        }
    }

    /**
     * Create and inject the feedback FAB button
     */
    createFeedbackButton() {
        const fab = document.createElement('button');
        fab.id = 'feedback-fab';
        fab.className = 'feedback-fab';
        fab.setAttribute('aria-label', 'Give update feedback');
        fab.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Give Feedback`;

        // Add styles for the button
        const style = document.createElement('style');
        style.textContent = `
            .feedback-fab {
                position: fixed;
                bottom: 1.5rem;
                left: 1.5rem;
                z-index: 9000;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                background: var(--bg-secondary, #1e293b);
                border: 1px solid var(--border-color, #334155);
                border-radius: 999px;
                padding: 0.6rem 1rem 0.6rem 0.7rem;
                color: var(--text-secondary, #cbd5e1);
                font-size: 0.8rem;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 4px 14px rgba(0,0,0,0.35);
                transition: all 0.2s ease;
                user-select: none;
                margin-bottom: 3.5rem; /* Space above bug report button */
            }
            .feedback-fab:hover {
                background: var(--bg-tertiary, #334155);
                color: var(--text-primary, #f1f5f9);
                transform: translateY(-1px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.45);
            }
            .feedback-fab svg {
                width: 15px;
                height: 15px;
                color: var(--primary-color, #6366f1);
            }
        `;
        document.head.appendChild(style);

        // Add click handler
        fab.addEventListener('click', () => {
            this.showFeedbackPrompt();
        });

        document.body.appendChild(fab);
    }

    /**
     * Initialize the feedback system on page load
     */
    async initOnPageLoad() {
        try {
            await this.initialize();

            // Always create the feedback button
            this.createFeedbackButton();

            // Only show automatic prompt 5% of the time
            if (this.shouldShowPrompt()) {
                // Delay showing prompt slightly to not interfere with page load
                setTimeout(() => {
                    this.showFeedbackPrompt();
                }, 2000); // Show after 2 seconds
            }
        } catch (error) {
            console.error('Error initializing feedback on page load:', error);
        }
    }
}

// Create global instance
window.feedbackManager = new FeedbackManager();
