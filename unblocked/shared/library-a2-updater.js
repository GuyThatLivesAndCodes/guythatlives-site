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
                    const gameUrl = `${this.baseUrl}/${folder.name}/`;
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
                        results.added.push(folder.name);
                    }

                    // Small delay to avoid overwhelming Firestore
                    await this.sleep(100);

                } catch (error) {
                    console.error(`Error processing ${folder.name}:`, error);
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
        const discoveredGames = [];

        // Method 1: Try to fetch a directory listing page
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

        // Method 2: If directory listing doesn't work, we need to provide a comprehensive list
        // This list should be updated as new games are added to library-a2
        const knownGames = [
            '1-on-1-football',
            '1-on-1-hockey',
            '1-on-1-soccer',
            '1-on-1-tennis',
            '10-minutes-till-dawn',
            '100ng-tam-ca',
            '1v1-lol',
            '2048',
            '3d-car-simulator',
            'a-small-world-cup',
            'achievement-unlocked',
            'age-of-war',
            'among-us',
            'angry-birds',
            'basket-random',
            'basketball-stars',
            'bloons-tower-defense',
            'boxing-random',
            'breakout',
            'champion-island',
            'chrome-dino',
            'cookie-clicker',
            'crossy-road',
            'drift-hunters',
            'duck-life',
            'duck-life-4',
            'eggy-car',
            'fireboy-and-watergirl',
            'flappy-bird',
            'geometry-dash',
            'google-snake',
            'gun-mayhem-2',
            'happy-wheels',
            'head-soccer-2022',
            'hill-climb-racing',
            'idle-breakout',
            'jenni-sim',
            'just-fall',
            'level-devil',
            'madalin-stunt-cars-2',
            'minecraft',
            'monkey-mart',
            'moto-x3m',
            'ovo',
            'pac-man',
            'paper-io-2',
            'penalty-shooters-2',
            'pokémon-emerald',
            'retro-bowl',
            'rooftop-snipers',
            'run-3',
            'slope',
            'snake',
            'soccer-random',
            'stack',
            'stickman-hook',
            'subway-surfers',
            'super-mario-64',
            'tetris',
            'the-impossible-quiz',
            'tunnel-rush',
            'volley-random',
            'we-become-what-we-behold',
            'world-cup-penalty',
            'zombs-royale'
        ];

        // Verify which games actually exist by checking for index.html
        console.log('Verifying games from known list...');
        for (const gameName of knownGames) {
            try {
                const testUrl = `${this.baseUrl}/${gameName}/index.html`;
                const response = await fetch(testUrl, { method: 'HEAD' });
                if (response.ok) {
                    discoveredGames.push(gameName);
                }
            } catch (error) {
                // Game doesn't exist, skip
            }
        }

        if (discoveredGames.length === 0) {
            throw new Error('No games found in library-a2 folder. Make sure the games are accessible at ' + this.baseUrl);
        }

        console.log(`Found ${discoveredGames.length} games in library-a2:`, discoveredGames);
        return discoveredGames;
    }

    /**
     * Find thumbnail image for a game
     */
    async findThumbnail(gameName) {
        const imageExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
        const commonNames = ['icon', 'thumbnail', 'logo', 'cover', 'splash'];

        // Try common image names first
        for (const name of commonNames) {
            for (const ext of imageExtensions) {
                try {
                    const url = `${this.baseUrl}/${gameName}/${name}.${ext}`;
                    const response = await fetch(url, { method: 'HEAD' });
                    if (response.ok) {
                        return url;
                    }
                } catch (error) {
                    // Continue trying
                }
            }
        }

        // If no common name found, return empty string
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
