/**
 * TokenManager - Handles token economy for adaptive tests
 *
 * Features:
 * - 3 tokens on first login
 * - Max 10 tokens
 * - Daily refill at 12pm Eastern Time
 * - Firebase persistence
 */

class TokenManager {
    constructor() {
        this.userId = null;
        this.tokens = {
            current: 3,
            max: 10,
            lastRefill: null,
            lastLogin: null
        };
        this.REFILL_HOUR_ET = 12; // 12pm Eastern
        this.initialized = false;
    }

    /**
     * Initialize token system for a user
     */
    async initialize(userId) {
        if (!userId) {
            console.error('TokenManager: No user ID provided');
            return false;
        }

        this.userId = userId;

        try {
            // Load tokens from Firebase
            const tokenData = await this.loadFromFirebase();

            if (tokenData) {
                // Existing user
                this.tokens = tokenData;
                console.log('TokenManager: Loaded existing tokens', this.tokens.current);
            } else {
                // New user - grant initial tokens
                this.tokens = {
                    current: 3,
                    max: 10,
                    lastRefill: new Date(),
                    lastLogin: new Date()
                };
                await this.syncToFirebase();
                console.log('TokenManager: New user granted 3 tokens');
            }

            // Check if daily refill is due
            await this.checkDailyRefill();

            // Update last login
            this.tokens.lastLogin = new Date();
            await this.syncToFirebase();

            this.initialized = true;
            this.updateDisplay();

            return true;
        } catch (error) {
            console.error('TokenManager: Initialization failed', error);
            return false;
        }
    }

    /**
     * Load tokens from Firebase
     */
    async loadFromFirebase() {
        if (!this.userId) return null;

        try {
            const db = firebase.firestore();
            const doc = await db.collection('users').doc(this.userId).get();

            if (doc.exists) {
                const data = doc.data();
                if (data.tokens) {
                    // Convert Firestore timestamps to Date objects
                    return {
                        current: data.tokens.current || 3,
                        max: data.tokens.max || 10,
                        lastRefill: data.tokens.lastRefill?.toDate() || null,
                        lastLogin: data.tokens.lastLogin?.toDate() || null
                    };
                }
            }

            return null;
        } catch (error) {
            console.error('TokenManager: Failed to load from Firebase', error);
            return null;
        }
    }

    /**
     * Sync tokens to Firebase
     */
    async syncToFirebase() {
        if (!this.userId) return;

        try {
            const db = firebase.firestore();
            await db.collection('users').doc(this.userId).set({
                tokens: {
                    current: this.tokens.current,
                    max: this.tokens.max,
                    lastRefill: firebase.firestore.Timestamp.fromDate(
                        this.tokens.lastRefill || new Date()
                    ),
                    lastLogin: firebase.firestore.Timestamp.fromDate(
                        this.tokens.lastLogin || new Date()
                    )
                }
            }, { merge: true });

            console.log('TokenManager: Synced to Firebase', this.tokens.current);
        } catch (error) {
            console.error('TokenManager: Failed to sync to Firebase', error);
        }
    }

    /**
     * Check if daily refill is due and grant token if eligible
     */
    async checkDailyRefill() {
        if (!this.tokens.lastRefill) {
            // First time, set last refill to now
            this.tokens.lastRefill = new Date();
            return;
        }

        try {
            const now = new Date();
            const lastRefill = new Date(this.tokens.lastRefill);

            // Convert to Eastern Time
            const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
            const etLastRefill = new Date(lastRefill.toLocaleString('en-US', { timeZone: 'America/New_York' }));

            // Get today's 12pm ET
            const todayNoonET = new Date(etNow);
            todayNoonET.setHours(this.REFILL_HOUR_ET, 0, 0, 0);

            // Check if we've passed 12pm ET today and last refill was before today's 12pm
            if (etNow >= todayNoonET && etLastRefill < todayNoonET) {
                await this.grantToken(1, 'daily_refill');
                console.log('TokenManager: Daily refill granted');
            }
        } catch (error) {
            console.error('TokenManager: Daily refill check failed', error);
        }
    }

    /**
     * Grant tokens to user
     */
    async grantToken(amount, reason = 'manual') {
        if (this.tokens.current >= this.tokens.max) {
            console.log('TokenManager: Already at max tokens');
            return false;
        }

        const oldAmount = this.tokens.current;
        this.tokens.current = Math.min(this.tokens.current + amount, this.tokens.max);
        this.tokens.lastRefill = new Date();

        console.log(`TokenManager: Granted ${amount} token(s) for ${reason}. ${oldAmount} → ${this.tokens.current}`);

        await this.syncToFirebase();
        this.updateDisplay();

        return true;
    }

    /**
     * Spend tokens (e.g., to start a test)
     */
    async spendTokens(amount, reason = 'test_start') {
        if (!this.canAfford(amount)) {
            console.error(`TokenManager: Insufficient tokens. Need ${amount}, have ${this.tokens.current}`);
            return false;
        }

        const oldAmount = this.tokens.current;
        this.tokens.current -= amount;

        console.log(`TokenManager: Spent ${amount} token(s) for ${reason}. ${oldAmount} → ${this.tokens.current}`);

        await this.syncToFirebase();
        this.updateDisplay();

        return true;
    }

    /**
     * Check if user can afford a cost
     */
    canAfford(cost) {
        return this.tokens.current >= cost;
    }

    /**
     * Get current token balance
     */
    getBalance() {
        return this.tokens.current;
    }

    /**
     * Get max token capacity
     */
    getMax() {
        return this.tokens.max;
    }

    /**
     * Check if initialized
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Update token display in UI
     */
    updateDisplay() {
        const tokenDisplay = document.getElementById('token-display');
        const tokenCount = document.getElementById('token-count');

        if (tokenDisplay && tokenCount) {
            tokenCount.textContent = this.tokens.current;
            tokenDisplay.style.display = 'flex';
        }
    }

    /**
     * Show token info modal
     */
    showInfoModal() {
        const modal = document.getElementById('token-info-modal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    /**
     * Format time until next refill
     */
    getTimeUntilRefill() {
        const now = new Date();
        const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));

        const nextRefill = new Date(etNow);
        nextRefill.setHours(this.REFILL_HOUR_ET, 0, 0, 0);

        // If we're past noon today, next refill is tomorrow
        if (etNow >= nextRefill) {
            nextRefill.setDate(nextRefill.getDate() + 1);
        }

        const diff = nextRefill - etNow;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return { hours, minutes, nextRefill };
    }
}

// Global token manager instance
let tokenManager = null;

// Initialize on DOM load if not already done
if (typeof window !== 'undefined') {
    window.tokenManager = tokenManager;
}
