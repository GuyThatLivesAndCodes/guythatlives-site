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
        this.progressModal = null;
    }

    /**
     * Create progress modal
     */
    createProgressModal() {
        if (this.progressModal) return;

        const modal = document.createElement('div');
        modal.id = 'save-progress-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
            z-index: 10000;
            align-items: center;
            justify-content: center;
        `;

        modal.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                border-radius: 16px;
                padding: 2rem;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
                border: 1px solid #334155;
            ">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <div id="save-icon" style="font-size: 3rem; margin-bottom: 0.5rem;">💾</div>
                    <h2 id="save-title" style="color: #f1f5f9; font-size: 1.5rem; margin: 0 0 0.5rem 0;">Saving Game Data</h2>
                    <p id="save-subtitle" style="color: #94a3b8; font-size: 0.875rem; margin: 0;">Please wait while we sync your progress...</p>
                </div>

                <div id="save-progress-list" style="
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 8px;
                    padding: 1rem;
                    max-height: 300px;
                    overflow-y: auto;
                "></div>

                <div id="save-actions" style="
                    margin-top: 1.5rem;
                    text-align: center;
                    display: none;
                ">
                    <button id="save-close-btn" style="
                        padding: 0.75rem 2rem;
                        background: linear-gradient(135deg, #6366f1, #8b5cf6);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s;
                    ">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.progressModal = modal;

        // Close button handler
        const closeBtn = modal.querySelector('#save-close-btn');
        closeBtn.addEventListener('click', () => {
            this.hideProgressModal();
        });
    }

    /**
     * Show progress modal
     */
    showProgressModal(title, subtitle, icon = '💾') {
        this.createProgressModal();

        const modal = this.progressModal;
        const titleEl = modal.querySelector('#save-title');
        const subtitleEl = modal.querySelector('#save-subtitle');
        const iconEl = modal.querySelector('#save-icon');
        const actionsEl = modal.querySelector('#save-actions');
        const listEl = modal.querySelector('#save-progress-list');

        titleEl.textContent = title;
        subtitleEl.textContent = subtitle;
        iconEl.textContent = icon;
        listEl.innerHTML = '';
        actionsEl.style.display = 'none';

        modal.style.display = 'flex';
    }

    /**
     * Hide progress modal
     */
    hideProgressModal() {
        if (this.progressModal) {
            this.progressModal.style.display = 'none';
        }
    }

    /**
     * Add progress item
     */
    addProgressItem(text, status = 'loading') {
        const listEl = this.progressModal.querySelector('#save-progress-list');

        const item = document.createElement('div');
        item.className = 'progress-item';
        item.style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            margin-bottom: 0.5rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            transition: all 0.3s;
        `;

        const icon = document.createElement('div');
        icon.className = 'progress-icon';
        icon.style.cssText = `
            font-size: 1.25rem;
            min-width: 24px;
        `;

        const text_el = document.createElement('div');
        text_el.className = 'progress-text';
        text_el.style.cssText = `
            flex: 1;
            color: #cbd5e1;
            font-size: 0.875rem;
        `;
        text_el.textContent = text;

        if (status === 'loading') {
            icon.innerHTML = '<div style="width: 16px; height: 16px; border: 2px solid #6366f1; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>';
        } else if (status === 'success') {
            icon.textContent = '✅';
            item.style.background = 'rgba(16, 185, 129, 0.1)';
        } else if (status === 'error') {
            icon.textContent = '❌';
            item.style.background = 'rgba(239, 68, 68, 0.1)';
        }

        item.appendChild(icon);
        item.appendChild(text_el);
        listEl.appendChild(item);

        // Add spin animation
        if (status === 'loading' && !document.querySelector('style[data-spin]')) {
            const style = document.createElement('style');
            style.setAttribute('data-spin', 'true');
            style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }

        return item;
    }

    /**
     * Update progress item
     */
    updateProgressItem(item, status, newText = null) {
        const icon = item.querySelector('.progress-icon');
        const text = item.querySelector('.progress-text');

        if (newText) {
            text.textContent = newText;
        }

        if (status === 'success') {
            icon.textContent = '✅';
            item.style.background = 'rgba(16, 185, 129, 0.1)';
        } else if (status === 'error') {
            icon.textContent = '❌';
            item.style.background = 'rgba(239, 68, 68, 0.1)';
        }
    }

    /**
     * Show completion
     */
    showCompletion(success, message) {
        const iconEl = this.progressModal.querySelector('#save-icon');
        const titleEl = this.progressModal.querySelector('#save-title');
        const subtitleEl = this.progressModal.querySelector('#save-subtitle');
        const actionsEl = this.progressModal.querySelector('#save-actions');

        if (success) {
            iconEl.textContent = '✅';
            titleEl.textContent = 'Success!';
        } else {
            iconEl.textContent = '❌';
            titleEl.textContent = 'Error';
        }

        subtitleEl.textContent = message;
        actionsEl.style.display = 'block';
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
    async syncSaves(force = false, showProgress = false) {
        if (!this.currentUserId || !this.currentGameId) {
            return;
        }

        // Throttle syncs (unless forced)
        if (!force && Date.now() - this.lastSyncTime < 10000) {
            return;
        }

        let localStorageItem, indexedDBItem, uploadItem;
        let success = true;

        try {
            if (showProgress) {
                this.showProgressModal('Saving Game Data', 'Syncing your progress to the cloud...', '💾');
            }

            // Capture localStorage data
            if (showProgress) {
                localStorageItem = this.addProgressItem('Capturing localStorage data...', 'loading');
            }

            const localStorageData = this.captureLocalStorage();
            const localStorageSize = JSON.stringify(localStorageData).length;

            if (showProgress) {
                this.updateProgressItem(localStorageItem, 'success', `localStorage captured (${this.formatBytes(localStorageSize)})`);
                await this.sleep(300);
            }

            // Capture IndexedDB data
            if (showProgress) {
                indexedDBItem = this.addProgressItem('Capturing IndexedDB data...', 'loading');
            }

            const indexedDBData = await this.captureIndexedDB();
            const indexedDBSize = JSON.stringify(indexedDBData).length;

            if (showProgress) {
                this.updateProgressItem(indexedDBItem, 'success', `IndexedDB captured (${this.formatBytes(indexedDBSize)})`);
                await this.sleep(300);
            }

            // Save to Firebase
            if (showProgress) {
                uploadItem = this.addProgressItem('Uploading to Firebase...', 'loading');
            }

            const saveRef = this.db
                .collection('users')
                .doc(this.currentUserId)
                .collection('gameSaves')
                .doc(this.currentGameId);

            // Clean undefined values before saving (Firebase doesn't support undefined)
            const cleanedData = {
                gameId: this.currentGameId,
                localStorage: this.cleanUndefined(localStorageData),
                indexedDB: this.cleanUndefined(indexedDBData),
                lastSynced: firebase.firestore.FieldValue.serverTimestamp(),
                deviceInfo: this.getDeviceInfo()
            };

            await saveRef.set(cleanedData);

            if (showProgress) {
                this.updateProgressItem(uploadItem, 'success', 'Successfully uploaded to cloud');
                await this.sleep(500);
            }

            this.lastSyncTime = Date.now();
            console.log(`Game saves synced for ${this.currentGameId}`);

            if (showProgress) {
                this.showCompletion(true, 'Your game progress has been safely saved to the cloud!');
            }

        } catch (error) {
            console.error('Error syncing saves:', error);
            success = false;

            if (showProgress) {
                if (uploadItem) {
                    this.updateProgressItem(uploadItem, 'error', 'Failed to upload to cloud');
                }
                this.showCompletion(false, 'Failed to save game data. Please try again.');
            }
        }
    }

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Restore game saves from Firebase
     */
    async restoreSaves() {
        if (!this.currentUserId || !this.currentGameId) {
            return;
        }

        let checkItem, downloadItem, localStorageItem, indexedDBItem;
        let shouldReload = false;

        try {
            // Show loading modal
            this.showProgressModal('Loading Game Data', 'Checking for cloud saves...', '☁️');

            checkItem = this.addProgressItem('Checking for saved data...', 'loading');

            const saveRef = this.db
                .collection('users')
                .doc(this.currentUserId)
                .collection('gameSaves')
                .doc(this.currentGameId);

            const doc = await saveRef.get();

            if (!doc.exists) {
                this.updateProgressItem(checkItem, 'success', 'No cloud saves found - starting fresh');
                await this.sleep(1000);
                this.hideProgressModal();
                console.log('No saved data found - starting fresh');
                return;
            }

            this.updateProgressItem(checkItem, 'success', 'Cloud save found!');
            await this.sleep(300);

            const saveData = doc.data();

            // Check if we've already restored this version of the save
            const lastRestoredKey = `gameSave_lastRestored_${this.currentGameId}`;
            const lastRestoredTimestamp = localStorage.getItem(lastRestoredKey);

            // Get cloud save timestamp (convert Firestore Timestamp to milliseconds)
            const cloudTimestamp = saveData.lastSynced ?
                (saveData.lastSynced.toMillis ? saveData.lastSynced.toMillis() : saveData.lastSynced) :
                0;

            // If we've already restored this exact save, skip restoration
            if (lastRestoredTimestamp && parseInt(lastRestoredTimestamp) >= cloudTimestamp) {
                this.updateProgressItem(checkItem, 'success', 'Local data is already up-to-date');
                await this.sleep(1000);
                this.hideProgressModal();
                console.log('Local save is current - skipping restore');
                return;
            }

            // Download save data
            downloadItem = this.addProgressItem('Downloading save data...', 'loading');
            await this.sleep(500);

            const totalSize = JSON.stringify(saveData).length;
            this.updateProgressItem(downloadItem, 'success', `Downloaded ${this.formatBytes(totalSize)}`);
            await this.sleep(300);

            // Restore localStorage
            if (saveData.localStorage) {
                localStorageItem = this.addProgressItem('Restoring localStorage...', 'loading');
                this.restoreLocalStorage(saveData.localStorage);
                const lsCount = Object.keys(saveData.localStorage).length;
                this.updateProgressItem(localStorageItem, 'success', `Restored ${lsCount} localStorage items`);
                await this.sleep(300);
            }

            // Restore IndexedDB
            if (saveData.indexedDB && Object.keys(saveData.indexedDB).length > 0) {
                indexedDBItem = this.addProgressItem('Restoring IndexedDB...', 'loading');
                await this.restoreIndexedDB(saveData.indexedDB);
                const dbCount = Object.keys(saveData.indexedDB).length;
                this.updateProgressItem(indexedDBItem, 'success', `Restored ${dbCount} databases`);
                await this.sleep(300);
            }

            console.log(`Game saves restored for ${this.currentGameId}`);

            // Show completion with user-controlled reload options
            this.showCompletion(true, 'Game data restored! Choose how to apply changes:');

            // Replace the single button with two options
            const actionsEl = this.progressModal.querySelector('#save-actions');
            actionsEl.innerHTML = `
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <button id="reload-game-btn" style="
                        padding: 0.75rem 2rem;
                        background: linear-gradient(135deg, #6366f1, #8b5cf6);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s;
                    ">Reload Game Only</button>
                    <button id="reload-page-btn" style="
                        padding: 0.75rem 2rem;
                        background: linear-gradient(135deg, #64748b, #475569);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s;
                    ">Reload Entire Page</button>
                    <button id="skip-reload-btn" style="
                        padding: 0.75rem 2rem;
                        background: transparent;
                        color: #94a3b8;
                        border: 1px solid #475569;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s;
                    ">Skip (Use Later)</button>
                </div>
            `;

            // Reload game iframe button
            const reloadGameBtn = actionsEl.querySelector('#reload-game-btn');
            reloadGameBtn.addEventListener('click', () => {
                // Mark as restored ONLY when user chooses to reload
                localStorage.setItem(lastRestoredKey, cloudTimestamp.toString());
                this.hideProgressModal();
                this.reloadGameIframe();
            });

            // Reload entire page button
            const reloadPageBtn = actionsEl.querySelector('#reload-page-btn');
            reloadPageBtn.addEventListener('click', () => {
                // Mark as restored before reloading
                localStorage.setItem(lastRestoredKey, cloudTimestamp.toString());
                window.location.reload();
            });

            // Skip button
            const skipBtn = actionsEl.querySelector('#skip-reload-btn');
            skipBtn.addEventListener('click', () => {
                // Don't mark as restored - user can try again later
                this.hideProgressModal();
            });

        } catch (error) {
            console.error('Error restoring saves:', error);

            if (downloadItem) {
                this.updateProgressItem(downloadItem, 'error', 'Failed to download saves');
            }

            this.showCompletion(false, 'Failed to restore game data. Please try again.');
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

                // Only store defined values
                if (value !== null && value !== undefined) {
                    data[key] = value;
                }
            }
        } catch (error) {
            console.error('Error capturing localStorage:', error);
        }

        return data;
    }

    /**
     * Clean undefined values from object (Firebase doesn't support undefined)
     */
    cleanUndefined(obj) {
        if (obj === null || obj === undefined) {
            return null;
        }

        if (Array.isArray(obj)) {
            return obj
                .map(item => this.cleanUndefined(item))
                .filter(item => item !== undefined);
        }

        if (typeof obj === 'object') {
            const cleaned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const value = this.cleanUndefined(obj[key]);
                    if (value !== undefined) {
                        cleaned[key] = value;
                    }
                }
            }
            return cleaned;
        }

        return obj;
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
     * Reload the game iframe (instead of full page reload)
     */
    reloadGameIframe() {
        const gameFrame = document.getElementById('game-frame');
        if (gameFrame) {
            console.log('Reloading game iframe...');
            // Store the current src and reload it
            const currentSrc = gameFrame.src;
            gameFrame.src = 'about:blank';
            setTimeout(() => {
                gameFrame.src = currentSrc;
            }, 100);
        } else {
            console.warn('Game iframe not found, falling back to page reload');
            window.location.reload();
        }
    }

    /**
     * Manual sync trigger
     */
    async manualSync() {
        console.log('Manual sync triggered');
        await this.syncSaves(true, true); // Force sync with progress display
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
