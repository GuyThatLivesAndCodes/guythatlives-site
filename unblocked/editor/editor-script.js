/**
 * Game Editor Admin Script
 */

let currentEditingGameId = null;
let currentTags = [];
let allCategories = [];

// Check admin access and initialize
document.addEventListener('DOMContentLoaded', () => {
    // Listen for auth state changes
    window.gamesAuth.onAuthStateChanged(async (user) => {
        if (user) {
            // Update user avatar
            const avatarText = document.getElementById('user-avatar-text');
            if (avatarText) {
                avatarText.textContent = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
            }

            // Check if user is admin
            if (window.gamesAuth.isAdmin()) {
                showEditorContent();
                await initializeEditor();
            } else {
                showAccessDenied();
            }
        } else {
            showAccessDenied();
        }
    });

    setupEventListeners();
});

// Show editor content
function showEditorContent() {
    document.getElementById('access-denied').classList.remove('visible');
    document.getElementById('editor-content').classList.add('visible');
}

// Show access denied
function showAccessDenied() {
    document.getElementById('access-denied').classList.add('visible');
    document.getElementById('editor-content').classList.remove('visible');
}

// Initialize editor
async function initializeEditor() {
    try {
        // Load categories first
        allCategories = await window.gameManager.getCategories();
        renderCategoriesCheckboxes();

        // Load all games
        await loadAllGames();

        // Update stats
        await updateStats();
    } catch (error) {
        console.error('Error initializing editor:', error);
        showFormError('Failed to initialize editor: ' + error.message);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });

    // Add game button
    document.getElementById('add-game-btn')?.addEventListener('click', () => {
        resetGameForm();
        switchTab('add-game');
    });

    // Cancel edit button
    document.getElementById('cancel-edit-btn')?.addEventListener('click', () => {
        resetGameForm();
        switchTab('all-games');
    });

    // Game form submission
    document.getElementById('game-form')?.addEventListener('submit', handleGameFormSubmit);

    // Tag input
    const tagInput = document.getElementById('tag-input');
    if (tagInput) {
        tagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const tag = tagInput.value.trim();
                if (tag && !currentTags.includes(tag)) {
                    currentTags.push(tag);
                    renderTags();
                    tagInput.value = '';
                }
            }
        });
    }

    // Manage categories button
    document.getElementById('manage-categories-btn')?.addEventListener('click', () => {
        showCategoriesModal();
    });

    // Save categories button
    document.getElementById('save-categories-btn')?.addEventListener('click', handleSaveCategories);

    // Close categories modal
    document.querySelector('#categories-modal .modal-close')?.addEventListener('click', () => {
        document.getElementById('categories-modal').style.display = 'none';
    });

    // Close modal on backdrop click
    document.getElementById('categories-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'categories-modal') {
            document.getElementById('categories-modal').style.display = 'none';
        }
    });

    // Import games button
    document.getElementById('import-games-btn')?.addEventListener('click', () => {
        showImportModal();
    });

    // Import modal close button
    document.querySelector('#import-modal .modal-close')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to close? Import may still be in progress.')) {
            if (window.gameImporter) {
                window.gameImporter.cancel();
            }
            document.getElementById('import-modal').style.display = 'none';
        }
    });

    // Start import button
    document.getElementById('start-import-btn')?.addEventListener('click', () => {
        handleStartImport();
    });

    // Cancel import button
    document.getElementById('cancel-import-btn')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to cancel the import?')) {
            if (window.gameImporter) {
                window.gameImporter.cancel();
            }
        }
    });

    // Close import button
    document.getElementById('close-import-btn')?.addEventListener('click', () => {
        document.getElementById('import-modal').style.display = 'none';
        resetImportModal();
    });

    // Close import modal on backdrop click
    document.getElementById('import-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'import-modal') {
            if (confirm('Are you sure you want to close? Import may still be in progress.')) {
                if (window.gameImporter) {
                    window.gameImporter.cancel();
                }
                document.getElementById('import-modal').style.display = 'none';
            }
        }
    });
}

// Switch tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        if (content.id === tabName) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// Load all games
async function loadAllGames() {
    try {
        const user = window.gamesAuth.getCurrentUser();
        const games = await window.gameManager.getAllGamesAdmin(user.uid);

        const tbody = document.getElementById('games-table-body');

        if (games.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                        No games found. Click "Add New Game" to create one.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = games.map(game => {
            const addedDate = game.addedDate ? formatDate(game.addedDate) : 'N/A';
            const status = game.published ? '<span style="color: var(--success-color);">Published</span>' : '<span style="color: var(--text-muted);">Draft</span>';
            const categories = game.categories ? game.categories.join(', ') : 'None';

            return `
                <tr>
                    <td>
                        <strong>${game.title}</strong>
                        ${game.featured ? '<span style="color: var(--accent-color); margin-left: 0.5rem;">★</span>' : ''}
                    </td>
                    <td>${categories}</td>
                    <td>${status}</td>
                    <td>${game.playCount || 0}</td>
                    <td>${addedDate}</td>
                    <td>
                        <div class="table-actions">
                            <button class="btn btn-sm btn-secondary" onclick="editGame('${game.id}')">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteGame('${game.id}', '${game.title}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading games:', error);
        const tbody = document.getElementById('games-table-body');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 3rem; color: var(--danger-color);">
                    Error loading games: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Format Firestore timestamp to readable date
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
}

// Edit game
async function editGame(gameId) {
    try {
        const game = await window.gameManager.getGame(gameId);

        currentEditingGameId = gameId;
        currentTags = game.tags || [];

        // Populate form
        document.getElementById('game-id').value = gameId;
        document.getElementById('game-title-input').value = game.title || '';
        document.getElementById('game-description-input').value = game.description || '';
        document.getElementById('game-url-input').value = game.gameUrl || '';
        document.getElementById('game-thumbnail-input').value = game.thumbnail || '';
        document.getElementById('game-published-input').checked = game.published || false;
        document.getElementById('game-featured-input').checked = game.featured || false;

        // Set categories
        document.querySelectorAll('#categories-checkboxes input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = game.categories && game.categories.includes(checkbox.value);
        });

        // Render tags
        renderTags();

        // Switch to edit tab
        switchTab('add-game');

        // Update button text
        document.getElementById('save-game-btn').textContent = 'Update Game';
    } catch (error) {
        console.error('Error loading game:', error);
        alert('Error loading game: ' + error.message);
    }
}

// Make editGame global
window.editGame = editGame;

// Delete game
async function deleteGame(gameId, gameTitle) {
    if (!confirm(`Are you sure you want to delete "${gameTitle}"? This cannot be undone.`)) {
        return;
    }

    try {
        const user = window.gamesAuth.getCurrentUser();
        await window.gameManager.deleteGame(gameId, user.uid);

        alert('Game deleted successfully!');
        await loadAllGames();
        await updateStats();
    } catch (error) {
        console.error('Error deleting game:', error);
        alert('Error deleting game: ' + error.message);
    }
}

// Make deleteGame global
window.deleteGame = deleteGame;

// Handle game form submission
async function handleGameFormSubmit(e) {
    e.preventDefault();

    const formError = document.getElementById('form-error');
    const formSuccess = document.getElementById('form-success');
    formError.style.display = 'none';
    formSuccess.style.display = 'none';

    try {
        const user = window.gamesAuth.getCurrentUser();

        // Collect form data
        const gameData = {
            title: document.getElementById('game-title-input').value.trim(),
            description: document.getElementById('game-description-input').value.trim(),
            gameUrl: document.getElementById('game-url-input').value.trim(),
            thumbnail: document.getElementById('game-thumbnail-input').value.trim(),
            published: document.getElementById('game-published-input').checked,
            featured: document.getElementById('game-featured-input').checked,
            tags: currentTags,
            categories: []
        };

        // Get selected categories
        document.querySelectorAll('#categories-checkboxes input[type="checkbox"]:checked').forEach(checkbox => {
            gameData.categories.push(checkbox.value);
        });

        // Validate
        if (!gameData.title) {
            throw new Error('Game title is required');
        }

        if (!gameData.gameUrl) {
            throw new Error('Game URL is required');
        }

        // Save or update
        const submitBtn = document.getElementById('save-game-btn');
        submitBtn.disabled = true;

        if (currentEditingGameId) {
            // Update existing game
            await window.gameManager.updateGame(currentEditingGameId, gameData, user.uid);
            formSuccess.textContent = 'Game updated successfully!';
        } else {
            // Add new game
            await window.gameManager.addGame(gameData, user.uid);
            formSuccess.textContent = 'Game added successfully!';
        }

        formSuccess.style.display = 'block';

        // Reload games list
        await loadAllGames();
        await updateStats();

        // Reset form after 2 seconds
        setTimeout(() => {
            resetGameForm();
            switchTab('all-games');
        }, 2000);

    } catch (error) {
        console.error('Error saving game:', error);
        formError.textContent = error.message;
        formError.style.display = 'block';
    } finally {
        const submitBtn = document.getElementById('save-game-btn');
        submitBtn.disabled = false;
    }
}

// Reset game form
function resetGameForm() {
    currentEditingGameId = null;
    currentTags = [];

    document.getElementById('game-form').reset();
    document.getElementById('game-id').value = '';
    renderTags();

    document.getElementById('save-game-btn').textContent = 'Save Game';
    document.getElementById('form-error').style.display = 'none';
    document.getElementById('form-success').style.display = 'none';
}

// Render tags
function renderTags() {
    const wrapper = document.getElementById('tags-wrapper');
    const tagInput = document.getElementById('tag-input');

    // Clear existing tags (except input)
    wrapper.querySelectorAll('.tag-item').forEach(el => el.remove());

    // Add tag items
    currentTags.forEach((tag, index) => {
        const tagEl = document.createElement('div');
        tagEl.className = 'tag-item';
        tagEl.innerHTML = `
            ${tag}
            <button type="button" class="tag-remove" data-index="${index}">&times;</button>
        `;
        wrapper.insertBefore(tagEl, tagInput);

        // Add remove listener
        tagEl.querySelector('.tag-remove').addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            currentTags.splice(idx, 1);
            renderTags();
        });
    });
}

// Render categories checkboxes
function renderCategoriesCheckboxes() {
    const container = document.getElementById('categories-checkboxes');

    if (allCategories.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted);">No categories found. Add some in "Manage Categories".</div>';
        return;
    }

    container.innerHTML = allCategories.map(category => `
        <div class="checkbox-group">
            <input type="checkbox" id="cat-${category}" value="${category}">
            <label for="cat-${category}" style="margin: 0;">${category}</label>
        </div>
    `).join('');
}

// Show categories modal
function showCategoriesModal() {
    const modal = document.getElementById('categories-modal');
    const textarea = document.getElementById('categories-textarea');

    textarea.value = allCategories.join('\n');
    modal.style.display = 'flex';
}

// Handle save categories
async function handleSaveCategories() {
    const successEl = document.getElementById('categories-success');
    const errorEl = document.getElementById('categories-error');
    successEl.style.display = 'none';
    errorEl.style.display = 'none';

    try {
        const textarea = document.getElementById('categories-textarea');
        const categories = textarea.value
            .split('\n')
            .map(c => c.trim())
            .filter(c => c.length > 0);

        if (categories.length === 0) {
            throw new Error('Please enter at least one category');
        }

        const user = window.gamesAuth.getCurrentUser();
        const saveBtn = document.getElementById('save-categories-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        await window.gameManager.updateCategories(categories, user.uid);

        allCategories = categories;
        renderCategoriesCheckboxes();

        successEl.textContent = 'Categories saved successfully!';
        successEl.style.display = 'block';

        setTimeout(() => {
            document.getElementById('categories-modal').style.display = 'none';
        }, 2000);

    } catch (error) {
        console.error('Error saving categories:', error);
        errorEl.textContent = error.message;
        errorEl.style.display = 'block';
    } finally {
        const saveBtn = document.getElementById('save-categories-btn');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Categories';
    }
}

// Update stats
async function updateStats() {
    try {
        const user = window.gamesAuth.getCurrentUser();
        const games = await window.gameManager.getAllGamesAdmin(user.uid);

        const totalGames = games.length;
        const publishedGames = games.filter(g => g.published).length;
        const featuredGames = games.filter(g => g.featured).length;
        const totalPlays = games.reduce((sum, g) => sum + (g.playCount || 0), 0);

        document.getElementById('admin-total-games').textContent = totalGames;
        document.getElementById('admin-published-games').textContent = publishedGames;
        document.getElementById('admin-featured-games').textContent = featuredGames;
        document.getElementById('admin-total-plays').textContent = totalPlays.toLocaleString();
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Show form error
function showFormError(message) {
    const errorEl = document.getElementById('form-error');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

// Import Games Functions

/**
 * Show import modal
 */
function showImportModal() {
    const modal = document.getElementById('import-modal');
    resetImportModal();
    modal.style.display = 'flex';
}

/**
 * Reset import modal to initial state
 */
function resetImportModal() {
    document.getElementById('import-status').style.display = 'block';
    document.getElementById('import-results').style.display = 'none';
    document.getElementById('import-message').textContent = 'Preparing to import games...';
    document.getElementById('import-progress-fill').style.width = '0%';
    document.getElementById('import-current').textContent = '0';
    document.getElementById('import-total').textContent = '0';
    document.getElementById('import-error').style.display = 'none';

    document.getElementById('start-import-btn').style.display = 'inline-block';
    document.getElementById('cancel-import-btn').style.display = 'none';
    document.getElementById('close-import-btn').style.display = 'none';
}

/**
 * Handle start import
 */
async function handleStartImport() {
    const startBtn = document.getElementById('start-import-btn');
    const cancelBtn = document.getElementById('cancel-import-btn');
    const errorEl = document.getElementById('import-error');

    startBtn.style.display = 'none';
    cancelBtn.style.display = 'inline-block';
    errorEl.style.display = 'none';

    try {
        const user = window.gamesAuth.getCurrentUser();

        // Initialize importer
        if (!window.gameImporter) {
            window.gameImporter = new GameImporter(window.gameManager);
        }

        // Start import with progress callback
        await window.gameImporter.importGames(user.uid, (progress) => {
            updateImportProgress(progress);
        });

    } catch (error) {
        console.error('Import failed:', error);
        errorEl.textContent = 'Import failed: ' + error.message;
        errorEl.style.display = 'block';

        startBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'none';
    }
}

/**
 * Update import progress UI
 */
function updateImportProgress(progress) {
    const messageEl = document.getElementById('import-message');
    const progressFill = document.getElementById('import-progress-fill');
    const currentEl = document.getElementById('import-current');
    const totalEl = document.getElementById('import-total');
    const statusDiv = document.getElementById('import-status');
    const resultsDiv = document.getElementById('import-results');
    const cancelBtn = document.getElementById('cancel-import-btn');
    const closeBtn = document.getElementById('close-import-btn');

    switch (progress.stage) {
        case 'fetching':
            messageEl.textContent = progress.message;
            break;

        case 'ready':
            messageEl.textContent = progress.message;
            totalEl.textContent = progress.total;
            break;

        case 'importing':
            messageEl.textContent = progress.message;
            currentEl.textContent = progress.current;
            totalEl.textContent = progress.total;
            const percent = (progress.current / progress.total) * 100;
            progressFill.style.width = percent + '%';
            break;

        case 'complete':
            statusDiv.style.display = 'none';
            resultsDiv.style.display = 'block';
            cancelBtn.style.display = 'none';
            closeBtn.style.display = 'inline-block';

            // Update result stats
            document.getElementById('import-success-count').textContent = progress.results.success.length;
            document.getElementById('import-skip-count').textContent = progress.results.skipped.length;
            document.getElementById('import-fail-count').textContent = progress.results.failed.length;

            // Show errors if any
            if (progress.results.failed.length > 0) {
                const errorList = document.getElementById('import-error-list');
                errorList.innerHTML = progress.results.failed.map(fail =>
                    `<li>${fail.name}: ${fail.reason}</li>`
                ).join('');
                document.getElementById('import-errors').style.display = 'block';
            }

            // Reload games list
            loadAllGames();
            updateStats();
            break;
    }
}


// ====================================
// Bug Reports
// ====================================

let currentBugReportFilter = 'open';

/**
 * Load bug reports from Firestore and render the table.
 * Called when the Bug Reports tab is activated.
 */
async function loadBugReports() {
    const tbody = document.getElementById('bug-reports-table-body');
    tbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                <div class="loading-spinner" style="margin: 0 auto 0.75rem;"></div>
                Loading…
            </td>
        </tr>`;

    try {
        const db = firebase.firestore();
        let query = db.collection('bugReports').orderBy('submittedAt', 'desc').limit(100);

        if (currentBugReportFilter === 'open') {
            query = query.where('resolved', '==', false);
        } else if (currentBugReportFilter === 'resolved') {
            query = query.where('resolved', '==', true);
        }

        const snapshot = await query.get();
        const reports = [];
        snapshot.forEach((doc) => {
            reports.push({ id: doc.id, ...doc.data() });
        });

        document.getElementById('bug-report-count').textContent = `${reports.length} report${reports.length !== 1 ? 's' : ''}`;

        if (reports.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                        No ${currentBugReportFilter === 'all' ? '' : currentBugReportFilter + ' '}reports found.
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = reports.map((report) => {
            const date = report.submittedAt
                ? report.submittedAt.toDate().toLocaleString()
                : 'Unknown';
            const logCount = Array.isArray(report.consoleLogs) ? report.consoleLogs.length : 0;
            const resolvedClass = report.resolved ? 'color: var(--success-color);' : 'color: var(--warning-color);';
            const resolvedLabel = report.resolved ? 'Resolved' : 'Open';
            const actionLabel = report.resolved ? 'Reopen' : 'Resolve';

            // Truncate description for table display
            const descPreview = (report.description || '').substring(0, 80) +
                ((report.description || '').length > 80 ? '…' : '');

            return `
                <tr>
                    <td style="color: var(--primary-light); font-size: 0.82rem; word-break: break-all;">${report.page || '—'}</td>
                    <td>
                        <span style="font-size: 0.875rem;" title="${report.description || ''}">${descPreview}</span>
                        <span style="${resolvedClass} font-size: 0.72rem; margin-left: 0.5rem;">${resolvedLabel}</span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="toggleBugReportLogs('${report.id}')" style="font-size: 0.75rem;">
                            ${logCount} log${logCount !== 1 ? 's' : ''}
                        </button>
                    </td>
                    <td style="font-size: 0.8rem; color: var(--text-muted); white-space: nowrap;">${date}</td>
                    <td>
                        <div class="table-actions">
                            <button class="btn btn-sm btn-secondary" onclick="toggleBugReportResolved('${report.id}', ${!report.resolved})">${actionLabel}</button>
                        </div>
                    </td>
                </tr>
                <tr id="bug-report-logs-${report.id}" style="display: none;">
                    <td colspan="5">
                        <div style="padding: 0.75rem 1rem; background: var(--bg-tertiary); border-radius: var(--border-radius-sm); max-height: 240px; overflow-y: auto;">
                            <p style="font-size: 0.72rem; color: var(--text-muted); margin: 0 0 0.5rem; font-weight: 600;">FULL DESCRIPTION</p>
                            <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0 0 0.75rem; white-space: pre-wrap;">${report.description || '(empty)'}</p>
                            <p style="font-size: 0.72rem; color: var(--text-muted); margin: 0 0 0.5rem; font-weight: 600;">CONSOLE LOGS (last ${logCount})</p>
                            ${logCount > 0
                                ? `<pre style="font-size: 0.72rem; color: var(--text-secondary); margin: 0; white-space: pre-wrap; line-height: 1.5;">${
                                    (report.consoleLogs || []).map((entry) => {
                                        const levelColors = { error: '#ef4444', warn: '#f59e0b', info: '#60a5fa', debug: '#94a3b8', log: '#cbd5e1' };
                                        const color = levelColors[entry.level] || '#cbd5e1';
                                        return `<span style="color:${color};">[${(entry.level || 'log').toUpperCase()}]</span> ${entry.timestamp || ''} ${entry.message || ''}`;
                                    }).join('\n')
                                }</pre>`
                                : '<p style="font-size: 0.78rem; color: var(--text-muted); margin: 0;">(no logs captured)</p>'
                            }
                        </div>
                    </td>
                </tr>`;
        }).join('');

    } catch (error) {
        console.error('Error loading bug reports:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: var(--danger-color);">
                    Error loading reports: ${error.message}
                </td>
            </tr>`;
    }
}

/**
 * Toggle visibility of the expanded log panel for a report.
 */
window.toggleBugReportLogs = function (reportId) {
    const row = document.getElementById('bug-report-logs-' + reportId);
    if (row) {
        row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
    }
};

/**
 * Mark a bug report as resolved or re-open it.
 */
window.toggleBugReportResolved = async function (reportId, resolved) {
    try {
        const db = firebase.firestore();
        await db.collection('bugReports').doc(reportId).update({ resolved: resolved });
        // Reload
        await loadBugReports();
    } catch (error) {
        console.error('Error updating bug report:', error);
        alert('Failed to update report: ' + error.message);
    }
};

// Hook: when the bug-reports tab is activated, load reports.
// Patch into the existing switchTab function.
const _originalSwitchTab = switchTab;
switchTab = function (tabName) {
    _originalSwitchTab(tabName);
    if (tabName === 'bug-reports') {
        loadBugReports();
    }
};

// Wire the filter dropdown
document.addEventListener('DOMContentLoaded', () => {
    const filterSelect = document.getElementById('bug-report-filter');
    if (filterSelect) {
        filterSelect.addEventListener('change', () => {
            currentBugReportFilter = filterSelect.value;
            loadBugReports();
        });
    }
});

// ====================================
// Announcement Management
// ====================================
