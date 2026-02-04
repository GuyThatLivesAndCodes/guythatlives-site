/**
 * G-Chat Admin Dashboard
 * Handles admin review of featured server requests
 */

class AdminDashboard {
    constructor(app) {
        this.app = app;
        this.pendingRequests = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('admin-panel-btn')?.addEventListener('click', () => {
            this.showDashboard();
        });
    }

    async showDashboard() {
        // TODO: Implement admin dashboard UI
        console.log('Admin dashboard');
        await this.loadPendingRequests();
    }

    async loadPendingRequests() {
        try {
            const snapshot = await this.app.db.collection('gchat')
                .doc('featured-requests')
                .collection('pending')
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .get();

            this.pendingRequests = [];
            snapshot.forEach(doc => {
                this.pendingRequests.push({ id: doc.id, ...doc.data() });
            });

            console.log('Pending requests:', this.pendingRequests.length);

        } catch (error) {
            console.error('Error loading requests:', error);
        }
    }

    async approveRequest(requestId, featuredType, expirationDate = null) {
        try {
            const request = this.pendingRequests.find(r => r.id === requestId);
            if (!request) return;

            // Update server
            await this.app.db.collection('gchat')
                .doc('servers')
                .collection('list')
                .doc(request.serverId)
                .update({
                    featured: true,
                    featuredType,
                    featuredExpiration: expirationDate ? firebase.firestore.Timestamp.fromDate(expirationDate) : null
                });

            // Update request
            await this.app.db.collection('gchat')
                .doc('featured-requests')
                .collection('pending')
                .doc(requestId)
                .update({
                    status: 'approved',
                    reviewedBy: this.app.currentUser.userId,
                    reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            await this.loadPendingRequests();

        } catch (error) {
            console.error('Error approving request:', error);
        }
    }

    async rejectRequest(requestId) {
        try {
            await this.app.db.collection('gchat')
                .doc('featured-requests')
                .collection('pending')
                .doc(requestId)
                .update({
                    status: 'rejected',
                    reviewedBy: this.app.currentUser.userId,
                    reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            await this.loadPendingRequests();

        } catch (error) {
            console.error('Error rejecting request:', error);
        }
    }
}
