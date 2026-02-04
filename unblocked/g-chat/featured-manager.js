/**
 * G-Chat Featured Manager
 * Handles featured server requests
 */

class FeaturedManager {
    constructor(app) {
        this.app = app;
    }

    async requestFeatured(serverId, message) {
        try {
            await this.app.db.collection('gchat')
                .doc('featured-requests')
                .collection('pending')
                .add({
                    serverId,
                    requesterId: this.app.currentUser.userId,
                    message,
                    status: 'pending',
                    reviewedBy: null,
                    reviewedAt: null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            this.app.uiController.showSuccess('Featured request submitted!');

        } catch (error) {
            console.error('Error requesting featured:', error);
            this.app.uiController.showError('Failed to submit request');
        }
    }
}
