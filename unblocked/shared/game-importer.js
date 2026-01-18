/**
 * GameImporter - Handles bulk import of games from CDN/GitHub
 */
class GameImporter {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.cdnBaseUrl = 'https://cdn.guythatlives.net/games';
        this.githubApiUrl = 'https://api.github.com/repos/GuyThatLivesAndCodes/guythatlives-unblocked-games-dns/contents/games';
        this.canceled = false;
    }

    /**
     * Main import function - orchestrates the entire import process
     */
    async importGames(userId, progressCallback) {
        this.canceled = false;
        const results = {
            success: [],
            skipped: [],
            failed: []
        };

        try {
            // Step 1: Fetch folder list
            progressCallback({ stage: 'fetching', message: 'Fetching game list from CDN...' });
            const folders = await this.fetchGameFolders();

            if (this.canceled) throw new Error('Import canceled');

            progressCallback({
                stage: 'ready',
                message: `Found ${folders.length} games to import`,
                total: folders.length
            });

            // Step 2: Get existing games for duplicate detection
            const existingGames = await this.gameManager.getAllGamesAdmin(userId);
            const existingUrls = new Set(existingGames.map(g => g.gameUrl));
            const existingTitles = new Set(existingGames.map(g => g.title.toLowerCase()));

            // Step 3: Process each folder
            for (let i = 0; i < folders.length; i++) {
                if (this.canceled) throw new Error('Import canceled');

                const folder = folders[i];
                progressCallback({
                    stage: 'importing',
                    current: i + 1,
                    total: folders.length,
                    message: `Processing: ${folder.name}`
                });

                try {
                    const gameUrl = `${this.cdnBaseUrl}/${folder.name}/`;
                    const titleLower = folder.name.toLowerCase();

                    // Check for duplicates
                    if (existingUrls.has(gameUrl) || existingTitles.has(titleLower)) {
                        results.skipped.push({
                            name: folder.name,
                            reason: 'Duplicate (already exists)'
                        });
                        continue;
                    }

                    // Fetch folder contents
                    const contents = await this.fetchFolderContents(folder.name, folder.sha);

                    // Verify index.html exists
                    const hasIndex = contents.some(f => f.name === 'index.html');
                    if (!hasIndex) {
                        results.failed.push({
                            name: folder.name,
                            reason: 'Missing index.html'
                        });
                        continue;
                    }

                    // Find first image
                    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
                    const imageFile = contents.find(f =>
                        imageExtensions.some(ext => f.name.toLowerCase().endsWith(ext))
                    );

                    const thumbnailUrl = imageFile
                        ? `${this.cdnBaseUrl}/${folder.name}/${imageFile.name}`
                        : '';

                    // Create game data
                    const gameData = {
                        title: this.formatTitle(folder.name),
                        description: '',
                        gameUrl: gameUrl,
                        thumbnail: thumbnailUrl,
                        categories: [],
                        tags: [],
                        published: false,
                        featured: false
                    };

                    // Add to Firestore
                    await this.gameManager.addGame(gameData, userId);
                    results.success.push(folder.name);

                    // Add small delay to avoid rate limiting
                    await this.sleep(100);

                } catch (error) {
                    console.error(`Error importing ${folder.name}:`, error);
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
            console.error('Import error:', error);
            throw error;
        }
    }

    /**
     * Fetch list of game folders from GitHub API
     */
    async fetchGameFolders() {
        try {
            // Try GitHub API (more reliable for directory listing)
            const response = await fetch(this.githubApiUrl);

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const contents = await response.json();

            // Filter only directories
            return contents.filter(item => item.type === 'dir');

        } catch (error) {
            console.error('Error fetching folders:', error);
            throw new Error('Failed to fetch game list. Please try again later.');
        }
    }

    /**
     * Fetch contents of a specific folder
     */
    async fetchFolderContents(folderName, sha) {
        try {
            // Use GitHub API to get folder contents
            const url = `${this.githubApiUrl}/${folderName}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to fetch folder contents: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error(`Error fetching contents for ${folderName}:`, error);
            throw error;
        }
    }

    /**
     * Format folder name into readable title
     * Example: "snake-game" -> "Snake Game"
     */
    formatTitle(folderName) {
        return folderName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Cancel ongoing import
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
window.gameImporter = null;
