/**
 * Game Saves Sync System
 * Automatically syncs game save data (localStorage, IndexedDB) to Firebase
 * Enables cross-device game progress
 */

class GameSavesSystem {
    constructor() {
        this.db = null;
        this.currentGameId = null;
        this.currentUserId = null;
        this.syncInterval = null;
        this.autoSyncEnabled = true;
        this.SYNC_INTERVAL_MS = 30000; // Sync every 30 seconds
        this.lastSyncTime = 0;
        this.initialized = false;
    }

    /**
     * Initialize the save sync system
     */
    async initialize(gameId) {
        if (this.initialized && this.currentGameId === gameId) return;

        this.currentGameId = gameId;

        try {
            // Wait for Firebase
            if (typeof firebase === 'undefined') {
                console.warn('Firebase not loaded - save sync disabled');
                return;
            }

            this.db = firebase.firestore();

            // Wait for auth state
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    this.currentUserId = user.uid;
                    console.log(`Game saves sync enabled for ${gameId}`);

                    // Restore saves first
                    await this.restoreSaves();

                    // Start auto-sync
                    this.startAutoSync();
                } else {
                    this.currentUserId = null;
                    this.stopAutoSync();
                }
            });

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize game saves sync:', error);
        }
    }

    /**
     * Start automatic sync
     */
    startAutoSync() {
        if (!this.autoSyncEnabled || this.syncInterval) return;

        // Sync immediately
        this.syncSaves();

        // Then sync periodically
        this.syncInterval = setInterval(() => {
            this.syncSaves();
        }, this.SYNC_INTERVAL_MS);

        // Also sync before page unload
        window.addEventListener('beforeunload', () => {
            this.syncSaves(true); // Force immediate sync
        });

        console.log('Auto-sync started');
    }

    /**
     * Stop automatic sync
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    /**
     * Sync current game saves to Firebase
     */
    async syncSaves(force = false) {
        if (!this.currentUserId || !this.currentGameId) {
            return;
        }

        // Throttle syncs (unless forced)
        if (!force && Date.now() - this.lastSyncTime < 10000) {
            return;
        }

        try {
            // Capture localStorage data
            const localStorageData = this.captureLocalStorage();

            // Capture IndexedDB data (if needed)
            const indexedDBData = await this.captureIndexedDB();

            // Save to Firebase
            const saveRef = this.db
                .collection('users')
                .doc(this.currentUserId)
                .collection('gameSaves')
                .doc(this.currentGameId);

            await saveRef.set({
                gameId: this.currentGameId,
                localStorage: localStorageData,
                indexedDB: indexedDBData,
                lastSynced: firebase.firestore.FieldValue.serverTimestamp(),
                deviceInfo: this.getDeviceInfo()
            });

            this.lastSyncTime = Date.now();
            console.log(`Game saves synced for ${this.currentGameId}`);
        } catch (error) {
            console.error('Error syncing saves:', error);
        }
    }

    /**
     * Restore game saves from Firebase
     */
    async restoreSaves() {
        if (!this.currentUserId || !this.currentGameId) {
            return;
        }

        try {
            const saveRef = this.db
                .collection('users')
                .doc(this.currentUserId)
                .collection('gameSaves')
                .doc(this.currentGameId);

            const doc = await saveRef.get();

            if (!doc.exists) {
                console.log('No saved data found - starting fresh');
                return;
            }

            const saveData = doc.data();

            // Restore localStorage
            if (saveData.localStorage) {
                this.restoreLocalStorage(saveData.localStorage);
            }

            // Restore IndexedDB
            if (saveData.indexedDB) {
                await this.restoreIndexedDB(saveData.indexedDB);
            }

            console.log(`Game saves restored for ${this.currentGameId}`);

            // Reload the page to apply restored data
            const shouldReload = confirm(
                'Game save data found from another device! Reload the game to apply?'
            );

            if (shouldReload) {
                window.location.reload();
            }
        } catch (error) {
            console.error('Error restoring saves:', error);
        }
    }

    /**
     * Capture localStorage data
     */
    captureLocalStorage() {
        const data = {};

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);

                // Store all localStorage data
                data[key] = value;
            }
        } catch (error) {
            console.error('Error capturing localStorage:', error);
        }

        return data;
    }

    /**
     * Restore localStorage data
     */
    restoreLocalStorage(data) {
        try {
            Object.keys(data).forEach(key => {
                localStorage.setItem(key, data[key]);
            });
        } catch (error) {
            console.error('Error restoring localStorage:', error);
        }
    }

    /**
     * Capture IndexedDB data
     */
    async captureIndexedDB() {
        const data = {};

        try {
            // Get all IndexedDB databases
            const databases = await indexedDB.databases();

            for (const dbInfo of databases) {
                const dbName = dbInfo.name;

                // Open database
                const db = await this.openIndexedDB(dbName);

                if (!db) continue;

                const dbData = {};

                // Get all object stores
                const storeNames = Array.from(db.objectStoreNames);

                for (const storeName of storeNames) {
                    try {
                        const storeData = await this.readObjectStore(db, storeName);
                        dbData[storeName] = storeData;
                    } catch (error) {
                        console.warn(`Failed to read store ${storeName}:`, error);
                    }
                }

                data[dbName] = dbData;
                db.close();
            }
        } catch (error) {
            console.error('Error capturing IndexedDB:', error);
        }

        return data;
    }

    /**
     * Restore IndexedDB data
     */
    async restoreIndexedDB(data) {
        try {
            for (const dbName in data) {
                const dbData = data[dbName];

                // Open or create database
                const db = await this.openIndexedDB(dbName, true);

                if (!db) continue;

                // Restore each object store
                for (const storeName in dbData) {
                    try {
                        await this.writeObjectStore(db, storeName, dbData[storeName]);
                    } catch (error) {
                        console.warn(`Failed to write store ${storeName}:`, error);
                    }
                }

                db.close();
            }
        } catch (error) {
            console.error('Error restoring IndexedDB:', error);
        }
    }

    /**
     * Open IndexedDB database
     */
    openIndexedDB(dbName, create = false) {
        return new Promise((resolve, reject) => {
            try {
                const request = indexedDB.open(dbName);

                request.onsuccess = (event) => {
                    resolve(event.target.result);
                };

                request.onerror = (event) => {
                    console.error(`Error opening IndexedDB ${dbName}:`, event);
                    resolve(null);
                };

                request.onupgradeneeded = (event) => {
                    if (!create) {
                        event.target.transaction.abort();
                        resolve(null);
                    }
                };
            } catch (error) {
                resolve(null);
            }
        });
    }

    /**
     * Read all data from an object store
     */
    readObjectStore(db, storeName) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([storeName], 'readonly');
                const objectStore = transaction.objectStore(storeName);
                const request = objectStore.getAll();

                request.onsuccess = () => {
                    resolve(request.result);
                };

                request.onerror = () => {
                    reject(request.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Write data to an object store
     */
    writeObjectStore(db, storeName, data) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([storeName], 'readwrite');
                const objectStore = transaction.objectStore(storeName);

                // Clear existing data
                objectStore.clear();

                // Add new data
                data.forEach(item => {
                    objectStore.add(item);
                });

                transaction.oncomplete = () => {
                    resolve();
                };

                transaction.onerror = () => {
                    reject(transaction.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get device info for tracking
     */
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            timestamp: Date.now()
        };
    }

    /**
     * Manual sync trigger
     */
    async manualSync() {
        console.log('Manual sync triggered');
        await this.syncSaves(true);
        alert('Game saves synced to cloud!');
    }

    /**
     * Check if user has saved data
     */
    async hasSavedData() {
        if (!this.currentUserId || !this.currentGameId) {
            return false;
        }

        try {
            const saveRef = this.db
                .collection('users')
                .doc(this.currentUserId)
                .collection('gameSaves')
                .doc(this.currentGameId);

            const doc = await saveRef.get();
            return doc.exists;
        } catch (error) {
            console.error('Error checking for saved data:', error);
            return false;
        }
    }
}

// Create global instance
window.gameSavesSystem = new GameSavesSystem();

// Auto-initialize when on game player page
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on a game page
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('game');

    if (gameId && window.location.pathname.includes('/game/')) {
        // Wait a bit for the game to load
        setTimeout(() => {
            window.gameSavesSystem.initialize(gameId);
        }, 3000);
    }
});
