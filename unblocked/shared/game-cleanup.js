/**
 * GameCleanup - Removes duplicate games based on name or URL
 * Keeps the newest version and deletes older copies
 */
class GameCleanup {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.canceled = false;
    }

    /**
     * Main cleanup function - finds and removes duplicate games
     */
    async cleanupDuplicates(userId, progressCallback) {
        this.canceled = false;
        const results = {
            deleted: [],
            kept: [],
            duplicateGroups: 0
        };

        try {
            // Step 1: Fetch all games
            progressCallback({ stage: 'scanning', message: 'Fetching all games from database...' });
            const allGames = await this.gameManager.getAllGamesAdmin(userId);

            if (this.canceled) throw new Error('Cleanup canceled');

            progressCallback({
                stage: 'ready',
                message: `Found ${allGames.length} total games. Scanning for duplicates...`,
                total: allGames.length
            });

            // Step 2: Group games by title (case-insensitive) and URL
            const gamesByTitle = new Map();
            const gamesByUrl = new Map();

            for (const game of allGames) {
                const titleKey = game.title.toLowerCase().trim();
                const urlKey = game.gameUrl.toLowerCase().trim();

                // Group by title
                if (!gamesByTitle.has(titleKey)) {
                    gamesByTitle.set(titleKey, []);
                }
                gamesByTitle.get(titleKey).push(game);

                // Group by URL
                if (!gamesByUrl.has(urlKey)) {
                    gamesByUrl.set(urlKey, []);
                }
                gamesByUrl.get(urlKey).push(game);
            }

            // Step 3: Find duplicates (groups with more than one game)
            const duplicateGroups = [];

            // Check title duplicates
            for (const [title, games] of gamesByTitle.entries()) {
                if (games.length > 1) {
                    duplicateGroups.push({
                        type: 'title',
                        key: title,
                        games: games
                    });
                }
            }

            // Check URL duplicates (skip if already found as title duplicate)
            for (const [url, games] of gamesByUrl.entries()) {
                if (games.length > 1) {
                    // Check if this group is already in duplicateGroups by title
                    const alreadyFound = duplicateGroups.some(group =>
                        group.games.some(g1 => games.some(g2 => g1.id === g2.id))
                    );

                    if (!alreadyFound) {
                        duplicateGroups.push({
                            type: 'url',
                            key: url,
                            games: games
                        });
                    }
                }
            }

            results.duplicateGroups = duplicateGroups.length;

            if (duplicateGroups.length === 0) {
                progressCallback({
                    stage: 'complete',
                    results: {
                        ...results,
                        deleted: [],
                        kept: allGames
                    }
                });
                return results;
            }

            console.log(`Found ${duplicateGroups.length} duplicate groups`);

            // Step 4: Process each duplicate group
            let processedCount = 0;
            const totalToProcess = duplicateGroups.reduce((sum, group) => sum + group.games.length, 0);

            for (const group of duplicateGroups) {
                if (this.canceled) throw new Error('Cleanup canceled');

                console.log(`Processing duplicate group (${group.type}): ${group.key}`);
                console.log(`  Found ${group.games.length} copies`);

                // Sort by addedDate (newest first)
                const sortedGames = group.games.sort((a, b) => {
                    const dateA = a.addedDate ? (a.addedDate.toDate ? a.addedDate.toDate() : new Date(a.addedDate)) : new Date(0);
                    const dateB = b.addedDate ? (b.addedDate.toDate ? b.addedDate.toDate() : new Date(b.addedDate)) : new Date(0);
                    return dateB - dateA; // Newest first
                });

                // Keep the first one (newest), delete the rest
                const gameToKeep = sortedGames[0];
                const gamesToDelete = sortedGames.slice(1);

                console.log(`  Keeping: ${gameToKeep.title} (${gameToKeep.id}) - Added: ${this.formatDate(gameToKeep.addedDate)}`);
                results.kept.push(gameToKeep);

                for (const gameToDelete of gamesToDelete) {
                    processedCount++;

                    progressCallback({
                        stage: 'processing',
                        current: processedCount,
                        total: totalToProcess,
                        message: `Deleting duplicate: ${gameToDelete.title}`
                    });

                    try {
                        console.log(`  Deleting: ${gameToDelete.title} (${gameToDelete.id}) - Added: ${this.formatDate(gameToDelete.addedDate)}`);
                        await this.gameManager.deleteGame(gameToDelete.id, userId);

                        results.deleted.push({
                            title: gameToDelete.title,
                            id: gameToDelete.id,
                            reason: `Duplicate of "${gameToKeep.title}" (kept newer version)`
                        });

                        // Small delay to avoid rate limiting
                        await this.sleep(100);

                    } catch (error) {
                        console.error(`Error deleting ${gameToDelete.title}:`, error);
                        // Continue with other deletions even if one fails
                    }
                }
            }

            progressCallback({
                stage: 'complete',
                results: results
            });

            return results;

        } catch (error) {
            console.error('Cleanup error:', error);
            throw error;
        }
    }

    /**
     * Format date for logging
     */
    formatDate(timestamp) {
        if (!timestamp) return 'Unknown';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString();
    }

    /**
     * Cancel ongoing cleanup
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
window.gameCleanup = null;
