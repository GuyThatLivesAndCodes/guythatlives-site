/**
 * Game Manager - Handles all game data from Firestore
 * Provides methods for fetching games, tracking plays, and managing game metadata
 */

class GameManager {
    constructor() {
        this.db = null;
        this.gamesCache = null;
        this.categoriesCache = null;
        this.lastCacheUpdate = null;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

        this.initialized = false;
        this.initPromise = null;
    }

    /**
     * Initialize Firebase connection
     */
    async initialize() {
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                // Wait for Firebase to be ready
                if (typeof firebase === 'undefined') {
                    throw new Error('Firebase not loaded');
                }

                this.db = firebase.firestore();
                this.initialized = true;
                console.log('GameManager initialized');
            } catch (error) {
                console.error('Failed to initialize GameManager:', error);
                throw error;
            }
        })();

        return this.initPromise;
    }

    /**
     * Check if cache is valid
     */
    isCacheValid() {
        if (!this.gamesCache || !this.lastCacheUpdate) return false;
        return (Date.now() - this.lastCacheUpdate) < this.CACHE_DURATION;
    }

    /**
     * Get all games from Firestore
     */
    async getAllGames() {
        await this.initialize();

        // Return cached data if valid
        if (this.isCacheValid()) {
            return this.gamesCache;
        }

        try {
            const snapshot = await this.db.collection('games')
                .where('published', '==', true)
                .orderBy('addedDate', 'desc')
                .get();

            this.gamesCache = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.lastCacheUpdate = Date.now();
            return this.gamesCache;
        } catch (error) {
            console.error('Error fetching games:', error);
            return this.gamesCache || []; // Return cached data or empty array
        }
    }

    /**
     * Get a single game by ID
     */
    async getGame(gameId) {
        await this.initialize();

        try {
            const doc = await this.db.collection('games').doc(gameId).get();

            if (!doc.exists) {
                throw new Error('Game not found');
            }

            return {
                id: doc.id,
                ...doc.data()
            };
        } catch (error) {
            console.error('Error fetching game:', error);
            throw error;
        }
    }

    /**
     * Get featured games
     */
    async getFeaturedGames(limit = 6) {
        const games = await this.getAllGames();
        return games.filter(game => game.featured).slice(0, limit);
    }

    /**
     * Get most played games
     */
    async getMostPlayedGames(limit = 12) {
        const games = await this.getAllGames();
        return games
            .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
            .slice(0, limit);
    }

    /**
     * Get newly added games
     */
    async getNewGames(limit = 12) {
        const games = await this.getAllGames();
        return games.slice(0, limit); // Already sorted by addedDate desc
    }

    /**
     * Get games by category
     */
    async getGamesByCategory(category, limit = null) {
        const games = await this.getAllGames();
        const filtered = games.filter(game =>
            game.categories && game.categories.includes(category)
        );
        return limit ? filtered.slice(0, limit) : filtered;
    }

    /**
     * Get all categories
     */
    async getCategories() {
        await this.initialize();

        // Return cached data if valid
        if (this.categoriesCache && this.isCacheValid()) {
            return this.categoriesCache;
        }

        try {
            const doc = await this.db.collection('gameMetadata').doc('categories').get();

            if (!doc.exists) {
                this.categoriesCache = [];
                return [];
            }

            this.categoriesCache = doc.data().list || [];
            return this.categoriesCache;
        } catch (error) {
            console.error('Error fetching categories:', error);
            return this.categoriesCache || [];
        }
    }

    /**
     * Search games by title or tags
     */
    async searchGames(query) {
        const games = await this.getAllGames();
        const lowerQuery = query.toLowerCase();

        return games.filter(game => {
            const titleMatch = game.title.toLowerCase().includes(lowerQuery);
            const tagMatch = game.tags && game.tags.some(tag =>
                tag.toLowerCase().includes(lowerQuery)
            );
            const descMatch = game.description &&
                game.description.toLowerCase().includes(lowerQuery);

            return titleMatch || tagMatch || descMatch;
        });
    }

    /**
     * Increment play count for a game
     */
    async incrementPlayCount(gameId) {
        await this.initialize();

        try {
            const gameRef = this.db.collection('games').doc(gameId);
            await gameRef.update({
                playCount: firebase.firestore.FieldValue.increment(1),
                lastPlayed: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update cache if it exists
            if (this.gamesCache) {
                const game = this.gamesCache.find(g => g.id === gameId);
                if (game) {
                    game.playCount = (game.playCount || 0) + 1;
                }
            }
        } catch (error) {
            console.error('Error incrementing play count:', error);
            // Non-critical error, don't throw
        }
    }

    /**
     * Track user's game play
     */
    async trackUserPlay(gameId, userId) {
        if (!userId) return;

        await this.initialize();

        try {
            const userGameRef = this.db
                .collection('users')
                .doc(userId)
                .collection('gamesPlayed')
                .doc(gameId);

            await userGameRef.set({
                gameId: gameId,
                lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
                playCount: firebase.firestore.FieldValue.increment(1)
            }, { merge: true });
        } catch (error) {
            console.error('Error tracking user play:', error);
            // Non-critical error, don't throw
        }
    }

    /**
     * Get user's recently played games
     */
    async getUserRecentGames(userId, limit = 6) {
        if (!userId) return [];

        await this.initialize();

        try {
            const snapshot = await this.db
                .collection('users')
                .doc(userId)
                .collection('gamesPlayed')
                .orderBy('lastPlayed', 'desc')
                .limit(limit)
                .get();

            const gameIds = snapshot.docs.map(doc => doc.data().gameId);

            // Fetch full game data
            const games = [];
            for (const gameId of gameIds) {
                try {
                    const game = await this.getGame(gameId);
                    games.push(game);
                } catch (error) {
                    console.error(`Error fetching game ${gameId}:`, error);
                }
            }

            return games;
        } catch (error) {
            console.error('Error fetching user recent games:', error);
            return [];
        }
    }

    /**
     * Clear cache (useful for admin operations)
     */
    clearCache() {
        this.gamesCache = null;
        this.categoriesCache = null;
        this.lastCacheUpdate = null;
    }

    // ===== ADMIN METHODS (restricted to authorized users) =====

    /**
     * Add a new game (admin only)
     */
    async addGame(gameData, userId) {
        await this.initialize();

        if (!this.isAdmin(userId)) {
            throw new Error('Unauthorized: Admin access required');
        }

        try {
            const gameRef = await this.db.collection('games').add({
                ...gameData,
                addedDate: firebase.firestore.FieldValue.serverTimestamp(),
                published: gameData.published !== undefined ? gameData.published : true,
                playCount: 0,
                featured: gameData.featured || false,
                createdBy: userId
            });

            this.clearCache();
            return gameRef.id;
        } catch (error) {
            console.error('Error adding game:', error);
            throw error;
        }
    }

    /**
     * Update a game (admin only)
     */
    async updateGame(gameId, gameData, userId) {
        await this.initialize();

        if (!this.isAdmin(userId)) {
            throw new Error('Unauthorized: Admin access required');
        }

        try {
            const gameRef = this.db.collection('games').doc(gameId);
            await gameRef.update({
                ...gameData,
                updatedDate: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: userId
            });

            this.clearCache();
        } catch (error) {
            console.error('Error updating game:', error);
            throw error;
        }
    }

    /**
     * Delete a game (admin only)
     */
    async deleteGame(gameId, userId) {
        await this.initialize();

        if (!this.isAdmin(userId)) {
            throw new Error('Unauthorized: Admin access required');
        }

        try {
            await this.db.collection('games').doc(gameId).delete();
            this.clearCache();
        } catch (error) {
            console.error('Error deleting game:', error);
            throw error;
        }
    }

    /**
     * Update categories list (admin only)
     */
    async updateCategories(categories, userId) {
        await this.initialize();

        if (!this.isAdmin(userId)) {
            throw new Error('Unauthorized: Admin access required');
        }

        try {
            await this.db.collection('gameMetadata').doc('categories').set({
                list: categories,
                updatedDate: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: userId
            });

            this.clearCache();
        } catch (error) {
            console.error('Error updating categories:', error);
            throw error;
        }
    }

    /**
     * Get all games including unpublished (admin only)
     */
    async getAllGamesAdmin(userId) {
        await this.initialize();

        if (!this.isAdmin(userId)) {
            throw new Error('Unauthorized: Admin access required');
        }

        try {
            const snapshot = await this.db.collection('games')
                .orderBy('addedDate', 'desc')
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching all games:', error);
            throw error;
        }
    }

    /**
     * Check if user is admin
     */
    isAdmin(userId) {
        if (!userId) return false;

        // Check if user email is the authorized admin
        const user = firebase.auth().currentUser;
        return user && user.email === 'zorbyteofficial@gmail.com';
    }
}

// Create global instance
window.gameManager = new GameManager();

// Auto-initialize when Firebase is ready
if (typeof firebase !== 'undefined') {
    window.gameManager.initialize();
} else {
    window.addEventListener('load', () => {
        if (typeof firebase !== 'undefined') {
            window.gameManager.initialize();
        }
    });
}
