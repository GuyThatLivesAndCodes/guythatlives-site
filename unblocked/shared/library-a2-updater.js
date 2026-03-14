/**
 * LibraryA2Updater - Auto-uploader/updater for Library A2 games
 * Scans /unblocked/library-a2/ and ensures all games are:
 * - Added to Firebase if they don't exist
 * - Published (public = true)
 * - Have the "Singleplayer" category
 */
class LibraryA2Updater {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.libraryPath = '/unblocked/library-a2';
        this.baseUrl = window.location.origin + this.libraryPath;
        this.canceled = false;
    }

    /**
     * Main update function - scans library-a2 and updates Firebase
     */
    async updateAllGames(userId, progressCallback) {
        this.canceled = false;
        const results = {
            added: [],
            updated: [],
            failed: []
        };

        try {
            // Step 1: Scan the library-a2 folder for game directories
            progressCallback({ stage: 'scanning', message: 'Scanning library-a2 folder...' });
            const folders = await this.scanLibraryA2Folder();

            if (this.canceled) throw new Error('Update canceled');

            console.log(`Found ${folders.length} games in library-a2. Starting update process...`);

            progressCallback({
                stage: 'ready',
                message: `Found ${folders.length} games in library-a2`,
                total: folders.length
            });

            // Step 2: Get all existing games from Firebase
            const existingGames = await this.gameManager.getAllGamesAdmin(userId);

            // Create a map of games by URL for quick lookup
            const gamesByUrl = new Map();
            existingGames.forEach(game => {
                gamesByUrl.set(game.gameUrl, game);
            });

            // Step 3: Process each folder
            for (let i = 0; i < folders.length; i++) {
                if (this.canceled) throw new Error('Update canceled');

                const folder = folders[i];
                progressCallback({
                    stage: 'processing',
                    current: i + 1,
                    total: folders.length,
                    message: `Processing: ${folder.name}`
                });

                try {
                    const gameUrl = `${this.baseUrl}/${folder.name}/embed.html`;
                    const existingGame = gamesByUrl.get(gameUrl);

                    if (existingGame) {
                        // Game exists - check if it needs updating
                        const needsUpdate = !existingGame.published ||
                                          !existingGame.categories?.includes('Singleplayer');

                        if (needsUpdate) {
                            // Update the game
                            const updates = {
                                published: true,
                                categories: this.ensureSingleplayerCategory(existingGame.categories || [])
                            };

                            await this.gameManager.updateGame(existingGame.id, updates, userId);
                            console.log(`[${i + 1}/${folders.length}] Updated: ${folder.name}`);
                            results.updated.push({
                                name: folder.name,
                                action: 'Set to published and added Singleplayer category'
                            });
                        } else {
                            // Already correct, skip
                            results.updated.push({
                                name: folder.name,
                                action: 'Already up-to-date'
                            });
                        }
                    } else {
                        // Game doesn't exist - add it
                        const thumbnailUrl = await this.findThumbnail(folder.name);

                        const gameData = {
                            title: this.formatTitle(folder.name),
                            description: `Play ${this.formatTitle(folder.name)} - an exciting singleplayer game from Library A2`,
                            gameUrl: gameUrl,
                            thumbnail: thumbnailUrl,
                            categories: ['Singleplayer'],
                            tags: ['library-a2'],
                            published: true,
                            featured: false
                        };

                        await this.gameManager.addGame(gameData, userId);
                        console.log(`[${i + 1}/${folders.length}] Added: ${folder.name}`);
                        results.added.push(folder.name);
                    }

                    // Small delay to avoid overwhelming Firestore
                    // Add delay to avoid rate limiting
                    // For large batches, use a longer delay every 50 games
                    if (i > 0 && i % 50 === 0) {
                        console.log(`Progress checkpoint: ${i} games processed. Taking a short break...`);
                        await this.sleep(2000); // 2 second pause every 50 games
                    } else {
                        await this.sleep(150); // 150ms between each game
                    }

                } catch (error) {
                    console.error(`[${i + 1}/${folders.length}] Error processing ${folder.name}:`, error);
                    results.failed.push({
                        name: folder.name,
                        reason: error.message
                    });
                }
            }

            progressCallback({
                stage: 'complete',
                results: results
            });

            return results;

        } catch (error) {
            console.error('Library A2 update error:', error);
            throw error;
        }
    }

    /**
     * Scan library-a2 folder by checking for subdirectories
     * We'll try to fetch from the actual file system structure
     */
    async scanLibraryA2Folder() {
        try {
            // We'll use a list-based approach since we can't directly list directories
            // This will try to fetch index.html from each potential game folder
            const knownGames = await this.discoverGames();

            return knownGames.map(name => ({
                name: name,
                type: 'dir'
            }));

        } catch (error) {
            console.error('Error scanning library-a2:', error);
            throw new Error('Failed to scan library-a2 folder. Make sure the games are accessible.');
        }
    }

    /**
     * Discover games by checking common patterns and existing file structure
     * This will attempt to dynamically find game folders
     */
    async discoverGames() {
        let discoveredGames = [];

        // Method 1: Try to fetch the pre-generated games list JSON file
        try {
            const gamesListUrl = window.location.origin + '/unblocked/library-a2-games.json';
            console.log('Fetching games list from:', gamesListUrl);

            const response = await fetch(gamesListUrl);

            if (response.ok) {
                const gamesList = await response.json();

                if (Array.isArray(gamesList) && gamesList.length > 0) {
                    console.log(`Loaded ${gamesList.length} games from library-a2-games.json`);
                    return gamesList;
                }
            }
        } catch (error) {
            console.log('Could not load library-a2-games.json:', error.message);
        }

        // Method 2: Try to fetch a directory listing page
        // Many servers return a directory index for folders
        try {
            const response = await fetch(this.baseUrl + '/');

            if (!response.ok) {
                throw new Error('Directory not accessible');
            }

            const html = await response.text();

            // Parse HTML for directory links
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const links = doc.querySelectorAll('a');

            links.forEach(link => {
                const href = link.getAttribute('href');
                // Look for directory links (ending with /)
                // Exclude parent directory (..), current directory (.), and absolute paths
                if (href && href.endsWith('/') && !href.startsWith('/') && !href.startsWith('..') && href !== './') {
                    const gameName = href.replace(/\/$/, '');
                    // Only add if it looks like a game folder name (contains letters/numbers/hyphens)
                    if (gameName && /^[a-zA-Z0-9-]+$/.test(gameName) && !discoveredGames.includes(gameName)) {
                        discoveredGames.push(gameName);
                    }
                }
            });

            if (discoveredGames.length > 0) {
                console.log('Discovered games via directory listing:', discoveredGames);
                return discoveredGames;
            }
        } catch (error) {
            console.log('Directory listing method failed:', error.message);
        }

        // Method 3: Fallback error message
        throw new Error(
            'Could not discover games in library-a2 folder. ' +
            'Make sure library-a2-games.json exists at /unblocked/library-a2-games.json or that directory listing is enabled. ' +
            'You can regenerate the games list by running: ls -1 library-a2 > library-a2-games.json (then convert to JSON format)'
        );
    }

    /**
     * Find thumbnail image for a game
     */
    async findThumbnail(gameName) {
        // Most common patterns first for speed
        const commonPatterns = [
            'icon.png',
            'thumbnail.png',
            'logo.png',
            'cover.png',
            'icon.jpg',
            'thumbnail.jpg'
        ];

        // Quick check for most common patterns
        for (const filename of commonPatterns) {
            try {
                const url = `${this.baseUrl}/${gameName}/${filename}`;
                const response = await fetch(url, { method: 'HEAD' });
                if (response.ok) {
                    return url;
                }
            } catch (error) {
                // Continue trying
            }
        }

        // If no thumbnail found, return a placeholder or empty string
        // For 2000+ games, we don't want to spend too much time on each one
        return '';
    }

    /**
     * Ensure "Singleplayer" is in the categories array
     */
    ensureSingleplayerCategory(categories) {
        if (!Array.isArray(categories)) {
            categories = [];
        }

        if (!categories.includes('Singleplayer')) {
            categories.push('Singleplayer');
        }

        return categories;
    }

    /**
     * Format folder name into readable title
     * Example: "1-on-1-football" -> "1 On 1 Football"
     */
    formatTitle(folderName) {
        return folderName
            .split('-')
            .map(word => {
                // Don't capitalize single digits or numbers
                if (/^\d+$/.test(word)) {
                    return word;
                }
                return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .join(' ');
    }

    /**
     * Cancel ongoing update
     */
    cancel() {
        this.canceled = true;
    }

    /**
     * Utility: sleep/delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Create global instance (will be initialized when needed)
window.libraryA2Updater = null;
