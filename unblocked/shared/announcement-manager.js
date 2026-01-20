/**
 * AnnouncementManager - Manages site-wide announcements
 * Handles Firestore operations for announcements and events
 */

class AnnouncementManager {
    constructor() {
        this.db = null;
        this.announcementId = 'active';
        this.initialized = false;
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
            console.log('AnnouncementManager initialized');
        } catch (error) {
            console.error('Failed to initialize AnnouncementManager:', error);
            throw error;
        }
    }

    /**
     * Get active announcement
     * @returns {Object|null} Announcement data or null
     */
    async getActiveAnnouncement() {
        await this.initialize();

        try {
            const doc = await this.db.collection('announcements')
                .doc(this.announcementId)
                .get();

            if (doc.exists) {
                const data = doc.data();
                if (data.isActive) {
                    return { id: doc.id, ...data };
                }
            }
            return null;
        } catch (error) {
            console.error('Error getting announcement:', error);
            return null;
        }
    }

    /**
     * Save announcement (admin only)
     * @param {Object} announcementData - Announcement data
     * @param {string} userId - Admin user ID
     */
    async saveAnnouncement(announcementData, userId) {
        await this.initialize();

        if (!this.isAdmin(userId)) {
            throw new Error('Unauthorized: Admin access required');
        }

        try {
            const saveData = {
                ...announcementData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: userId
            };

            if (!announcementData.id) {
                saveData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                saveData.createdBy = userId;
            }

            await this.db.collection('announcements')
                .doc(this.announcementId)
                .set(saveData, { merge: true });

            return { success: true };
        } catch (error) {
            console.error('Error saving announcement:', error);
            throw error;
        }
    }

    /**
     * Delete announcement (admin only)
     * @param {string} userId - Admin user ID
     */
    async deleteAnnouncement(userId) {
        await this.initialize();

        if (!this.isAdmin(userId)) {
            throw new Error('Unauthorized: Admin access required');
        }

        try {
            await this.db.collection('announcements')
                .doc(this.announcementId)
                .delete();

            return { success: true };
        } catch (error) {
            console.error('Error deleting announcement:', error);
            throw error;
        }
    }

    /**
     * Execute events for an announcement
     * @param {string} announcementId - Announcement ID
     */
    async executeEvents(announcementId) {
        await this.initialize();

        try {
            const doc = await this.db.collection('announcements')
                .doc(announcementId)
                .get();

            if (!doc.exists) return;

            const announcement = doc.data();
            const events = announcement.events || [];

            for (let i = 0; i < events.length; i++) {
                const event = events[i];

                if (!event.executed) {
                    await this.executeEvent(event);
                    await this.markEventExecuted(announcementId, i);
                }
            }
        } catch (error) {
            console.error('Error executing events:', error);
        }
    }

    /**
     * Execute a single event
     * @param {Object} event - Event object
     */
    async executeEvent(event) {
        await this.initialize();

        const gameRef = this.db.collection('games').doc(event.gameId);

        try {
            switch (event.type) {
                case 'publish_game':
                    await gameRef.update({ published: true });
                    console.log(`Published game: ${event.gameName}`);
                    break;

                case 'feature_game':
                    await gameRef.update({ featured: true });
                    console.log(`Featured game: ${event.gameName}`);
                    break;

                case 'unfeature_game':
                    await gameRef.update({ featured: false });
                    console.log(`Unfeatured game: ${event.gameName}`);
                    break;

                default:
                    console.warn(`Unknown event type: ${event.type}`);
            }
        } catch (error) {
            console.error(`Error executing event for ${event.gameName}:`, error);
        }
    }

    /**
     * Mark an event as executed
     * @param {string} announcementId - Announcement ID
     * @param {number} eventIndex - Index of event in events array
     */
    async markEventExecuted(announcementId, eventIndex) {
        await this.initialize();

        try {
            const doc = await this.db.collection('announcements')
                .doc(announcementId)
                .get();

            const announcement = doc.data();
            announcement.events[eventIndex].executed = true;
            announcement.events[eventIndex].executedAt = firebase.firestore.Timestamp.now();

            await this.db.collection('announcements')
                .doc(announcementId)
                .update({ events: announcement.events });
        } catch (error) {
            console.error('Error marking event executed:', error);
        }
    }

    /**
     * Check if user is admin
     * @param {string} userId - User ID to check
     * @returns {boolean} True if user is admin
     */
    isAdmin(userId) {
        if (!userId) return false;

        // Check if gamesAuth is available
        if (typeof window.gamesAuth !== 'undefined' && window.gamesAuth.isAdmin) {
            return window.gamesAuth.isAdmin();
        }

        // Fallback: Check Firebase auth directly
        const user = firebase.auth().currentUser;
        return user && user.email === 'zorbyteofficial@gmail.com';
    }
}

// Create global instance
window.announcementManager = new AnnouncementManager();

// Auto-initialize when Firebase is ready
if (typeof firebase !== 'undefined') {
    window.announcementManager.initialize();
} else {
    window.addEventListener('load', () => {
        if (typeof firebase !== 'undefined') {
            window.announcementManager.initialize();
        }
    });
}
