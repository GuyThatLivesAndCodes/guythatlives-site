/**
 * Announcement Editor Module
 * Handles announcement creation, editing, and event management
 */

let currentEvents = [];
let allGames = [];

// Load announcement when tab is clicked
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('tab') && e.target.dataset.tab === 'announcement') {
        await loadAnnouncement();
        if (allGames.length === 0) {
            allGames = await window.gameManager.getAllGames();
        }
    }
});

// Load announcement from Firestore
async function loadAnnouncement() {
    const statusEl = document.getElementById('announcement-status');
    const formEl = document.getElementById('announcement-form');

    try {
        statusEl.innerHTML = '<p>Loading announcement...</p>';
        const announcement = await window.announcementManager.getActiveAnnouncement();

        if (announcement) {
            // Populate form
            document.getElementById('announcement-active').checked = announcement.isActive || false;
            document.getElementById('announcement-title').value = announcement.title || '';
            document.getElementById('announcement-description').value = announcement.description || '';
            document.getElementById('announcement-header-image').value = announcement.headerImage || '';
            document.getElementById('announcement-after-title').value = announcement.afterTitle || '';
            document.getElementById('announcement-after-description').value = announcement.afterDescription || '';

            // Convert Firestore timestamp to datetime-local format
            if (announcement.scheduledDate) {
                const date = announcement.scheduledDate.toDate();
                const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                document.getElementById('announcement-scheduled-date').value = localDate.toISOString().slice(0, 16);
            }

            // Load events
            currentEvents = announcement.events || [];
            renderEvents();

            // Show image preview if exists
            if (announcement.headerImage) {
                showImagePreview(announcement.headerImage);
            }

            statusEl.innerHTML = '<p style="color: var(--success-color);">✓ Announcement loaded</p>';
        } else {
            statusEl.innerHTML = '<p style="color: var(--text-muted);">No active announcement. Create a new one below.</p>';
            formEl.reset();
            currentEvents = [];
            renderEvents();
        }
    } catch (error) {
        console.error('Error loading announcement:', error);
        statusEl.innerHTML = '<p style="color: var(--danger-color);">Error loading announcement: ' + error.message + '</p>';
    }
}

// Render events list
function renderEvents() {
    const eventsList = document.getElementById('events-list');

    if (currentEvents.length === 0) {
        eventsList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">No events added yet. Click "+ Add Event" to create one.</p>';
        return;
    }

    const eventsHtml = currentEvents.map((event, index) => {
        const eventIcon = event.type === 'publish_game' ? '📤' : event.type === 'feature_game' ? '⭐' : '🔽';
        const eventName = event.type === 'publish_game' ? 'Publish Game' : event.type === 'feature_game' ? 'Feature Game' : 'Unfeature Game';
        const opacity = event.executed ? 'opacity: 0.6;' : '';
        const executed = event.executed ? '<div style="color: var(--success-color); font-size: 0.875rem; margin-top: 0.25rem;">✓ Executed</div>' : '';
        const disabled = event.executed ? 'disabled' : '';

        return `
            <div class="event-card" style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--border-radius); margin-bottom: 0.75rem; ${opacity}">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">
                            ${eventIcon} ${eventName}
                        </div>
                        <div style="color: var(--text-secondary); font-size: 0.875rem;">
                            Game: ${event.gameName || event.gameId}
                        </div>
                        ${executed}
                    </div>
                    <button type="button" class="btn btn-danger" style="padding: 0.25rem 0.75rem; font-size: 0.875rem;" onclick="removeEvent(${index})" ${disabled}>
                        Remove
                    </button>
                </div>
            </div>
        `;
    }).join('');

    eventsList.innerHTML = eventsHtml;
}

// Add event
document.getElementById('add-event-btn')?.addEventListener('click', () => {
    showAddEventDialog();
});

// Show add event dialog
function showAddEventDialog() {
    const eventType = prompt('Event Type:\n1. publish_game\n2. feature_game\n3. unfeature_game\n\nEnter 1, 2, or 3:');

    if (!eventType) return;

    let type;
    switch (eventType.trim()) {
        case '1':
            type = 'publish_game';
            break;
        case '2':
            type = 'feature_game';
            break;
        case '3':
            type = 'unfeature_game';
            break;
        default:
            alert('Invalid event type');
            return;
    }

    // Show game selector
    const gameTitles = allGames.slice(0, 10).map(g => g.title).join(', ');
    const gameId = prompt('Enter Game ID (or game title to search):\n\nAvailable games: ' + gameTitles + '...');

    if (!gameId) return;

    // Find game by ID or title
    let game = allGames.find(g => g.id === gameId || g.title.toLowerCase().includes(gameId.toLowerCase()));

    if (!game) {
        alert('Game not found. Please enter a valid game ID or title.');
        return;
    }

    // Add event
    currentEvents.push({
        type: type,
        gameId: game.id,
        gameName: game.title,
        executed: false
    });

    renderEvents();
}

// Remove event
window.removeEvent = function(index) {
    if (confirm('Remove this event?')) {
        currentEvents.splice(index, 1);
        renderEvents();
    }
};

// Image preview
document.getElementById('announcement-header-image')?.addEventListener('input', (e) => {
    const url = e.target.value;
    if (url) {
        showImagePreview(url);
    } else {
        hideImagePreview();
    }
});

function showImagePreview(url) {
    const previewDiv = document.getElementById('announcement-image-preview');
    const img = document.getElementById('announcement-preview-img');

    img.src = url;
    img.onerror = () => {
        hideImagePreview();
    };
    previewDiv.style.display = 'block';
}

function hideImagePreview() {
    document.getElementById('announcement-image-preview').style.display = 'none';
}

// Save announcement
document.getElementById('announcement-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const successEl = document.getElementById('announcement-success');
    const errorEl = document.getElementById('announcement-error');
    const saveBtn = document.getElementById('save-announcement-btn');

    successEl.textContent = '';
    errorEl.textContent = '';
    errorEl.classList.remove('active');
    successEl.classList.remove('active');

    try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const formData = {
            id: 'active',
            isActive: document.getElementById('announcement-active').checked,
            title: document.getElementById('announcement-title').value,
            description: document.getElementById('announcement-description').value,
            headerImage: document.getElementById('announcement-header-image').value || null,
            scheduledDate: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('announcement-scheduled-date').value)),
            afterTitle: document.getElementById('announcement-after-title').value || null,
            afterDescription: document.getElementById('announcement-after-description').value || null,
            events: currentEvents
        };

        const user = firebase.auth().currentUser;
        await window.announcementManager.saveAnnouncement(formData, user.uid);

        successEl.textContent = '✓ Announcement saved successfully!';
        successEl.classList.add('active');

        setTimeout(() => {
            successEl.classList.remove('active');
        }, 3000);

    } catch (error) {
        console.error('Error saving announcement:', error);
        errorEl.textContent = 'Error: ' + error.message;
        errorEl.classList.add('active');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Announcement';
    }
});

// Delete announcement
document.getElementById('delete-announcement-btn')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to delete this announcement? This cannot be undone.')) {
        return;
    }

    const successEl = document.getElementById('announcement-success');
    const errorEl = document.getElementById('announcement-error');
    const deleteBtn = document.getElementById('delete-announcement-btn');

    successEl.textContent = '';
    errorEl.textContent = '';
    errorEl.classList.remove('active');
    successEl.classList.remove('active');

    try {
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Deleting...';

        const user = firebase.auth().currentUser;
        await window.announcementManager.deleteAnnouncement(user.uid);

        // Clear form
        document.getElementById('announcement-form').reset();
        currentEvents = [];
        renderEvents();
        hideImagePreview();

        successEl.textContent = '✓ Announcement deleted successfully!';
        successEl.classList.add('active');

        setTimeout(() => {
            successEl.classList.remove('active');
        }, 3000);

    } catch (error) {
        console.error('Error deleting announcement:', error);
        errorEl.textContent = 'Error: ' + error.message;
        errorEl.classList.add('active');
    } finally {
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete Announcement';
    }
});
