/**
 * AnnouncementDisplay - Handles announcement UI rendering and countdown
 * Manages real-time countdown and event triggering
 */

class AnnouncementDisplay {
    constructor() {
        this.announcement = null;
        this.countdownInterval = null;
        this.eventsExecuted = false;
        this.container = null;
    }

    /**
     * Initialize announcement display
     */
    async init() {
        this.container = document.getElementById('announcement-container');
        if (!this.container) {
            console.warn('Announcement container not found');
            return;
        }

        // Load and display announcement
        await this.loadAndDisplay();

        // Refresh every 60 seconds to pick up changes
        setInterval(() => this.loadAndDisplay(), 60000);
    }

    /**
     * Load announcement and display it
     */
    async loadAndDisplay() {
        this.announcement = await window.announcementManager.getActiveAnnouncement();

        if (this.announcement) {
            this.render();
            this.startCountdown();
        } else {
            this.hide();
        }
    }

    /**
     * Render announcement HTML
     */
    render() {
        if (!this.announcement || !this.container) return;

        const isBeforeScheduled = this.announcement.scheduledDate.toMillis() > Date.now();
        const title = isBeforeScheduled ? this.announcement.title : (this.announcement.afterTitle || this.announcement.title);
        const description = isBeforeScheduled ? this.announcement.description : (this.announcement.afterDescription || this.announcement.description);

        this.container.innerHTML = `
            <div class="announcement-card ${isBeforeScheduled ? 'upcoming' : 'live'}">
                <div class="announcement-header">
                    <h2 class="announcement-title">${title}</h2>
                    <div class="announcement-countdown" id="announcement-countdown">
                        ${isBeforeScheduled ? 'Loading countdown...' : '✓ Live Now!'}
                    </div>
                </div>
                ${this.announcement.headerImage ? `
                    <div class="announcement-image">
                        <img src="${this.announcement.headerImage}" alt="${title}">
                    </div>
                ` : ''}
                <div class="announcement-body">
                    <div class="announcement-description">${this.formatDescription(description)}</div>
                </div>
            </div>
        `;

        this.container.style.display = 'block';
    }

    /**
     * Start countdown timer
     */
    startCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        this.countdownInterval = setInterval(() => {
            this.updateCountdown();
        }, 1000);

        this.updateCountdown();
    }

    /**
     * Update countdown display
     */
    updateCountdown() {
        const countdownEl = document.getElementById('announcement-countdown');
        if (!countdownEl || !this.announcement) return;

        const now = Date.now();
        const scheduled = this.announcement.scheduledDate.toMillis();
        const diff = scheduled - now;

        if (diff <= 0) {
            // Announcement time has passed
            countdownEl.innerHTML = '✓ Live Now!';
            countdownEl.className = 'announcement-countdown live';

            // Execute events if not already done
            if (!this.eventsExecuted) {
                this.executeEvents();
            }

            // Update to "after" content
            if (this.announcement.afterTitle || this.announcement.afterDescription) {
                this.render();
            }

            // Stop countdown
            if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            }
        } else {
            // Update countdown display
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            let countdownText = '🕐 Starts in: ';
            if (days > 0) countdownText += `${days}d `;
            countdownText += `${hours}h ${minutes}m ${seconds}s`;

            countdownEl.textContent = countdownText;
            countdownEl.className = 'announcement-countdown upcoming';
        }
    }

    /**
     * Execute announcement events
     */
    async executeEvents() {
        if (this.eventsExecuted) return;

        this.eventsExecuted = true;
        console.log('Executing announcement events...');

        await window.announcementManager.executeEvents(this.announcement.id);

        // Reload announcement to get updated event status
        await this.loadAndDisplay();
    }

    /**
     * Format description text (basic markdown support)
     * @param {string} text - Description text
     * @returns {string} Formatted HTML
     */
    formatDescription(text) {
        if (!text) return '';

        // Basic markdown support
        return text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    /**
     * Hide announcement
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }
}

// Create global instance
window.announcementDisplay = new AnnouncementDisplay();
