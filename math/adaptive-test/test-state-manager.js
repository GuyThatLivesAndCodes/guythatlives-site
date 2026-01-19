/**
 * TestStateManager - Manages multiple concurrent adaptive test states
 * Supports Math, Science, and English tests running simultaneously
 */

class TestStateManager {
    constructor() {
        this.activeTests = new Map(); // subject → test state
        this.userId = null;
    }

    /**
     * Initialize the manager with user ID
     */
    async initialize(userId) {
        this.userId = userId;
        await this.loadAllTests();
        console.log(`TestStateManager initialized for user ${userId}`);
        console.log(`Active tests: ${this.activeTests.size}`);
    }

    /**
     * Load all active tests from localStorage
     * @returns {Map} Map of subject → test state
     */
    async loadAllTests() {
        const subjects = ['math', 'science', 'english'];
        this.activeTests.clear();

        for (const subject of subjects) {
            const testState = await this.loadTest(subject);
            if (testState) {
                this.activeTests.set(subject, testState);
            }
        }

        console.log(`Loaded ${this.activeTests.size} active tests`);
        return this.activeTests;
    }

    /**
     * Load test state for a specific subject
     * @param {string} subject - 'math', 'science', or 'english'
     * @returns {Object|null} Test state or null if not found
     */
    async loadTest(subject) {
        const key = `adaptive_test_progress_${subject}`;
        const saved = localStorage.getItem(key);

        if (saved) {
            try {
                const testState = JSON.parse(saved);
                console.log(`Loaded ${subject} test: Question ${testState.currentQuestion + 1}`);
                return testState;
            } catch (error) {
                console.error(`Error parsing ${subject} test state:`, error);
                localStorage.removeItem(key);
                return null;
            }
        }

        return null;
    }

    /**
     * Save test state for a specific subject
     * @param {string} subject - 'math', 'science', or 'english'
     * @param {Object} testState - Complete test state object
     */
    async saveTest(subject, testState) {
        const key = `adaptive_test_progress_${subject}`;

        try {
            // Add metadata
            testState.subject = subject;
            testState.lastActivity = Date.now();

            // Save to localStorage
            localStorage.setItem(key, JSON.stringify(testState));

            // Update in-memory map
            this.activeTests.set(subject, testState);

            // Sync to Firebase if logged in
            await this.syncToFirebase(subject, testState);

            console.log(`Saved ${subject} test state`);
        } catch (error) {
            console.error(`Error saving ${subject} test state:`, error);
        }
    }

    /**
     * Delete test state for a specific subject
     * @param {string} subject - 'math', 'science', or 'english'
     */
    async deleteTest(subject) {
        const key = `adaptive_test_progress_${subject}`;

        // Remove from localStorage
        localStorage.removeItem(key);

        // Remove from in-memory map
        this.activeTests.delete(subject);

        // Delete from Firebase
        await this.deleteFromFirebase(subject);

        console.log(`Deleted ${subject} test state`);
    }

    /**
     * Sync test state to Firebase
     * @param {string} subject - Subject identifier
     * @param {Object} testState - Test state to sync
     */
    async syncToFirebase(subject, testState) {
        // Check if Firebase and auth are available
        if (typeof firebase === 'undefined' ||
            typeof authSystem === 'undefined' ||
            !authSystem.isLoggedIn) {
            console.log('Firebase sync skipped: Not logged in');
            return;
        }

        try {
            const userId = authSystem.user.uid;
            const db = firebase.firestore();

            await db.collection('users')
                .doc(userId)
                .collection('test-states')
                .doc(subject)
                .set({
                    subject: subject,
                    inProgress: true,
                    lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
                    startedAt: testState.startedAt || Date.now(),
                    currentQuestion: testState.currentQuestion,
                    totalQuestions: testState.totalQuestions,
                    difficulty: testState.difficulty,
                    estimatedAbility: testState.estimatedAbility,
                    questions: testState.questions,
                    responses: testState.responses,
                    config: testState.config
                });

            console.log(`Synced ${subject} test to Firebase`);
        } catch (error) {
            console.error(`Error syncing ${subject} to Firebase:`, error);
        }
    }

    /**
     * Delete test state from Firebase
     * @param {string} subject - Subject identifier
     */
    async deleteFromFirebase(subject) {
        // Check if Firebase and auth are available
        if (typeof firebase === 'undefined' ||
            typeof authSystem === 'undefined' ||
            !authSystem.isLoggedIn) {
            return;
        }

        try {
            const userId = authSystem.user.uid;
            const db = firebase.firestore();

            await db.collection('users')
                .doc(userId)
                .collection('test-states')
                .doc(subject)
                .delete();

            console.log(`Deleted ${subject} test from Firebase`);
        } catch (error) {
            console.error(`Error deleting ${subject} from Firebase:`, error);
        }
    }

    /**
     * Load test states from Firebase (for cross-device sync)
     */
    async loadFromFirebase() {
        if (typeof firebase === 'undefined' ||
            typeof authSystem === 'undefined' ||
            !authSystem.isLoggedIn) {
            return;
        }

        try {
            const userId = authSystem.user.uid;
            const db = firebase.firestore();

            const snapshot = await db.collection('users')
                .doc(userId)
                .collection('test-states')
                .where('inProgress', '==', true)
                .get();

            snapshot.forEach(doc => {
                const data = doc.data();
                const subject = doc.id;

                // Only restore if localStorage doesn't have newer data
                const localState = localStorage.getItem(`adaptive_test_progress_${subject}`);
                if (!localState) {
                    localStorage.setItem(`adaptive_test_progress_${subject}`, JSON.stringify(data));
                    this.activeTests.set(subject, data);
                    console.log(`Restored ${subject} test from Firebase`);
                }
            });
        } catch (error) {
            console.error('Error loading from Firebase:', error);
        }
    }

    /**
     * Get count of active tests
     * @returns {number} Number of tests in progress
     */
    getActiveTestCount() {
        return this.activeTests.size;
    }

    /**
     * Check if a subject has an active test
     * @param {string} subject - Subject to check
     * @returns {boolean} True if test exists
     */
    hasActiveTest(subject) {
        return this.activeTests.has(subject);
    }

    /**
     * Get all active test subjects
     * @returns {Array<string>} Array of subject IDs
     */
    getActiveSubjects() {
        return Array.from(this.activeTests.keys());
    }

    /**
     * Get test info for UI display
     * @param {string} subject - Subject to get info for
     * @returns {Object|null} Display info or null
     */
    getTestDisplayInfo(subject) {
        const testState = this.activeTests.get(subject);
        if (!testState) return null;

        const subjectConfig = SUBJECT_CONFIG[subject];
        const progress = testState.currentQuestion + 1;
        const target = subjectConfig.questionCount.target;
        const lastActivity = new Date(testState.lastActivity);
        const timeSince = this.formatTimeSince(lastActivity);

        return {
            subject: subject,
            subjectName: subjectConfig.name,
            icon: subjectConfig.icon,
            progress: progress,
            target: target,
            progressText: `Question ${progress} of ~${target}`,
            timeSince: timeSince,
            difficulty: testState.difficulty
        };
    }

    /**
     * Format time since last activity
     * @param {Date} date - Last activity date
     * @returns {string} Formatted time string
     */
    formatTimeSince(date) {
        const now = Date.now();
        const diff = now - date.getTime();

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    /**
     * Clear all test states (for testing/debugging)
     */
    clearAll() {
        const subjects = ['math', 'science', 'english'];
        subjects.forEach(subject => {
            localStorage.removeItem(`adaptive_test_progress_${subject}`);
        });
        this.activeTests.clear();
        console.log('Cleared all test states');
    }
}

// Create global instance (will be initialized after login)
let testStateManager = null;
