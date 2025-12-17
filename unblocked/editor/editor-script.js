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
