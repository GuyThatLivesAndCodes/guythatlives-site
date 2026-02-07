/**
 * Enhanced Bug Reporter — shared module for all /unblocked/ pages.
 *
 * Features:
 * - Captures last 50 console messages
 * - Extracts game metadata (ID, title, URL) from query params and gameManager
 * - Optional screenshot capture with html2canvas
 * - Automatic environment context (User-Agent, resolution, iframe source)
 * - Submits to Firestore with comprehensive diagnostic data
 *
 * Usage: include this script after the Firebase SDK scripts and game-manager.js
 * It self-initializes on DOMContentLoaded.
 */
(function () {
    // ── Console log capture ──────────────────────────────────
    const MAX_LOGS = 50;
    const capturedLogs = [];

    function patchConsole() {
        const levels = ['log', 'warn', 'error', 'info', 'debug'];
        levels.forEach((level) => {
            const original = console[level].bind(console);
            console[level] = function (...args) {
                capturedLogs.push({
                    level: level,
                    message: args.map((a) => {
                        if (typeof a === 'object') {
                            try { return JSON.stringify(a); } catch (_) { return String(a); }
                        }
                        return String(a);
                    }).join(' '),
                    timestamp: new Date().toISOString()
                });
                // Keep only the last MAX_LOGS entries
                if (capturedLogs.length > MAX_LOGS) {
                    capturedLogs.shift();
                }
                original.apply(console, args);
            };
        });
    }

    // ── Game Metadata Extraction ─────────────────────────────
    function getGameId() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('game');
        } catch (e) {
            console.warn('Failed to extract game ID:', e);
            return null;
        }
    }

    async function getGameMetadata() {
        const gameId = getGameId();
        if (!gameId) {
            return { gameId: null, gameTitle: null, gameUrl: null };
        }

        try {
            // Check if gameManager is available (game page context)
            if (window.gameManager && typeof window.gameManager.getGame === 'function') {
                const gameData = await window.gameManager.getGame(gameId);
                return {
                    gameId: gameId,
                    gameTitle: gameData.title || null,
                    gameUrl: gameData.gameUrl || null
                };
            }
        } catch (e) {
            console.warn('Failed to fetch game metadata:', e);
        }

        // Fallback: just return the gameId
        return { gameId: gameId, gameTitle: null, gameUrl: null };
    }

    // ── Environment Context Capture ──────────────────────────
    function getEnvironmentContext() {
        const gameFrame = document.getElementById('game-frame');
        let iframeSource = null;

        if (gameFrame) {
            if (gameFrame.srcdoc) {
                iframeSource = '[srcdoc] ' + gameFrame.srcdoc.substring(0, 100) + '...';
            } else if (gameFrame.src) {
                iframeSource = gameFrame.src;
            }
        }

        return {
            userAgent: navigator.userAgent || 'Unknown',
            screenResolution: `${screen.width}x${screen.height}`,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`,
            iframeSource: iframeSource,
            timestamp: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
            platform: navigator.platform || 'Unknown',
            language: navigator.language || 'Unknown'
        };
    }

    // ── Screenshot Capture ───────────────────────────────────
    let html2canvasLoaded = false;

    async function loadHtml2Canvas() {
        if (html2canvasLoaded) return;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
            script.onload = () => {
                html2canvasLoaded = true;
                console.log('html2canvas loaded');
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load html2canvas'));
            document.head.appendChild(script);
        });
    }

    async function captureScreenshot() {
        try {
            await loadHtml2Canvas();

            if (typeof html2canvas === 'undefined') {
                throw new Error('html2canvas not available');
            }

            // Capture the game frame wrapper (includes the game iframe)
            const gameWrapper = document.querySelector('.game-frame-wrapper') || document.body;

            const canvas = await html2canvas(gameWrapper, {
                allowTaint: true,
                useCORS: false,
                logging: false,
                scale: 0.5, // Reduce scale for smaller file size
                width: Math.min(gameWrapper.scrollWidth, 1280),
                height: Math.min(gameWrapper.scrollHeight, 720)
            });

            // Convert to compressed base64
            // Start with quality 0.4 and increase max size to 250KB
            let quality = 0.4;
            let base64 = canvas.toDataURL('image/jpeg', quality);

            // If still too large, reduce quality further
            while (base64.length > 250000 && quality > 0.1) {
                quality -= 0.1;
                base64 = canvas.toDataURL('image/jpeg', quality);
            }

            console.log(`Screenshot captured: ${Math.round(base64.length / 1024)}KB at quality ${quality.toFixed(1)}`);
            return base64;
        } catch (err) {
            console.error('Screenshot capture failed:', err);
            return null;
        }
    }

    // ── Modal HTML ───────────────────────────────────────────
    function getModalHTML() {
        return `
<div id="bug-report-modal" class="bug-report-modal-overlay">
    <div class="bug-report-modal-content">
        <div class="bug-report-modal-header">
            <h3>Report a Bug</h3>
            <button id="bug-report-close-btn" class="bug-report-close-btn" aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        <div class="bug-report-modal-body">
            <p class="bug-report-page-label">Page: <span id="bug-report-page-name"></span></p>
            <p class="bug-report-game-label" id="bug-report-game-info" style="display:none;">
                Game: <span id="bug-report-game-name"></span>
            </p>
            <label class="bug-report-label">Describe what went wrong</label>
            <textarea id="bug-report-textarea" class="bug-report-textarea" placeholder="e.g. The game freezes when I click the start button…" maxlength="2000"></textarea>

            <label class="bug-report-checkbox-label">
                <input type="checkbox" id="bug-report-screenshot-checkbox" class="bug-report-checkbox">
                <span>Capture screenshot (helps us debug faster)</span>
            </label>

            <p class="bug-report-hint">We automatically include your last 50 console messages, environment details, and game information to help debug.</p>
        </div>
        <div class="bug-report-modal-footer">
            <button id="bug-report-cancel-btn" class="bug-report-btn bug-report-btn-secondary">Cancel</button>
            <button id="bug-report-submit-btn" class="bug-report-btn bug-report-btn-primary">Submit Report</button>
        </div>
        <div id="bug-report-status" class="bug-report-status" style="display:none;"></div>
    </div>
</div>`;
    }

    // ── Styles (injected into <head>) ────────────────────────
    function getStyles() {
        return `
/* Bug Reporter Styles */
.bug-report-fab {
    position: fixed;
    bottom: 1.5rem;
    left: 1.5rem;
    z-index: 9000;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--bg-secondary, #1e293b);
    border: 1px solid var(--border-color, #334155);
    border-radius: 999px;
    padding: 0.6rem 1rem 0.6rem 0.7rem;
    color: var(--text-secondary, #cbd5e1);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(0,0,0,0.35);
    transition: all 0.2s ease;
    user-select: none;
}
.bug-report-fab:hover {
    background: var(--bg-tertiary, #334155);
    color: var(--text-primary, #f1f5f9);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.45);
}
.bug-report-fab svg {
    width: 15px;
    height: 15px;
    color: var(--danger-color, #ef4444);
}

.bug-report-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(3px);
    z-index: 9500;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
}
.bug-report-modal-overlay.visible {
    opacity: 1;
    pointer-events: auto;
}

.bug-report-modal-content {
    background: var(--bg-secondary, #1e293b);
    border: 1px solid var(--border-color, #334155);
    border-radius: 0.75rem;
    width: 100%;
    max-width: 520px;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6);
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    overflow: hidden;
}

.bug-report-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem 0.75rem;
}
.bug-report-modal-header h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary, #f1f5f9);
    margin: 0;
}
.bug-report-close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted, #94a3b8);
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: color 0.15s;
}
.bug-report-close-btn:hover { color: var(--text-primary, #f1f5f9); }
.bug-report-close-btn svg { width: 18px; height: 18px; }

.bug-report-modal-body {
    padding: 0 1.5rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    overflow-y: auto;
}
.bug-report-page-label,
.bug-report-game-label {
    font-size: 0.75rem;
    color: var(--text-muted, #94a3b8);
    margin: 0;
}
.bug-report-page-label span,
.bug-report-game-label span {
    color: var(--primary-light, #818cf8);
    font-weight: 500;
}
.bug-report-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-secondary, #cbd5e1);
}
.bug-report-textarea {
    width: 100%;
    min-height: 110px;
    max-height: 220px;
    resize: vertical;
    background: var(--bg-tertiary, #334155);
    border: 1px solid var(--border-color, #334155);
    border-radius: 0.5rem;
    color: var(--text-primary, #f1f5f9);
    font-size: 0.875rem;
    font-family: inherit;
    padding: 0.7rem 0.85rem;
    outline: none;
    transition: border-color 0.2s;
}
.bug-report-textarea:focus {
    border-color: var(--primary-color, #6366f1);
}
.bug-report-textarea::placeholder {
    color: var(--text-muted, #94a3b8);
}

.bug-report-checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.82rem;
    color: var(--text-secondary, #cbd5e1);
    cursor: pointer;
    user-select: none;
}
.bug-report-checkbox {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: var(--primary-color, #6366f1);
}

.bug-report-hint {
    font-size: 0.72rem;
    color: var(--text-muted, #94a3b8);
    margin: 0;
}

.bug-report-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    padding: 0.85rem 1.5rem 1.25rem;
    border-top: 1px solid var(--border-color, #334155);
}
.bug-report-btn {
    padding: 0.5rem 1.1rem;
    border-radius: 0.375rem;
    border: none;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, opacity 0.15s;
}
.bug-report-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
.bug-report-btn-secondary {
    background: var(--bg-tertiary, #334155);
    color: var(--text-secondary, #cbd5e1);
}
.bug-report-btn-secondary:hover { background: #475569; }
.bug-report-btn-primary {
    background: var(--primary-color, #6366f1);
    color: white;
}
.bug-report-btn-primary:hover { background: var(--primary-light, #818cf8); }

.bug-report-status {
    padding: 0.75rem 1.5rem;
    font-size: 0.8rem;
    text-align: center;
    border-radius: 0 0 0.75rem 0.75rem;
}
.bug-report-status.success {
    background: rgba(16, 185, 129, 0.1);
    color: var(--success-color, #10b981);
}
.bug-report-status.error {
    background: rgba(239, 68, 68, 0.1);
    color: var(--danger-color, #ef4444);
}`;
    }

    // ── Core logic ───────────────────────────────────────────
    function init() {
        patchConsole();

        // Inject styles
        const style = document.createElement('style');
        style.textContent = getStyles();
        document.head.appendChild(style);

        // Inject FAB button
        const fab = document.createElement('button');
        fab.id = 'bug-report-fab';
        fab.className = 'bug-report-fab';
        fab.setAttribute('aria-label', 'Report a bug');
        fab.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Report Bug`;
        document.body.appendChild(fab);

        // Inject modal (hidden)
        const modalWrapper = document.createElement('div');
        modalWrapper.innerHTML = getModalHTML();
        document.body.appendChild(modalWrapper.firstElementChild);

        // Wire events
        fab.addEventListener('click', openModal);
        document.getElementById('bug-report-close-btn').addEventListener('click', closeModal);
        document.getElementById('bug-report-cancel-btn').addEventListener('click', closeModal);
        document.getElementById('bug-report-submit-btn').addEventListener('click', submitReport);

        // Close on backdrop click
        document.getElementById('bug-report-modal').addEventListener('click', function (e) {
            if (e.target === e.currentTarget) closeModal();
        });
    }

    async function openModal() {
        const modal = document.getElementById('bug-report-modal');
        const pageLabel = document.getElementById('bug-report-page-name');
        const gameInfo = document.getElementById('bug-report-game-info');
        const gameName = document.getElementById('bug-report-game-name');
        const textarea = document.getElementById('bug-report-textarea');
        const status = document.getElementById('bug-report-status');
        const screenshotCheckbox = document.getElementById('bug-report-screenshot-checkbox');

        pageLabel.textContent = window.location.pathname;

        // Load game metadata if available
        const gameMetadata = await getGameMetadata();
        if (gameMetadata.gameId) {
            gameName.textContent = gameMetadata.gameTitle || gameMetadata.gameId;
            gameInfo.style.display = 'block';
        } else {
            gameInfo.style.display = 'none';
        }

        textarea.value = '';
        screenshotCheckbox.checked = false;
        status.style.display = 'none';
        status.className = 'bug-report-status';
        document.getElementById('bug-report-submit-btn').disabled = false;

        modal.classList.add('visible');
        setTimeout(() => textarea.focus(), 150);
    }

    function closeModal() {
        document.getElementById('bug-report-modal').classList.remove('visible');
    }

    async function submitReport() {
        const textarea = document.getElementById('bug-report-textarea');
        const submitBtn = document.getElementById('bug-report-submit-btn');
        const status = document.getElementById('bug-report-status');
        const screenshotCheckbox = document.getElementById('bug-report-screenshot-checkbox');
        const description = textarea.value.trim();

        if (!description) {
            status.textContent = 'Please describe what went wrong.';
            status.className = 'bug-report-status error';
            status.style.display = 'block';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        status.style.display = 'none';

        try {
            // Gather all diagnostic data
            const gameMetadata = await getGameMetadata();
            const environmentContext = getEnvironmentContext();

            // Capture screenshot if requested
            let screenshot = null;
            if (screenshotCheckbox.checked) {
                status.textContent = 'Capturing screenshot...';
                status.className = 'bug-report-status';
                status.style.display = 'block';
                screenshot = await captureScreenshot();
            }

            // Prepare console logs
            const logs = capturedLogs.slice(-50).map(function (entry) {
                return {
                    level: entry.level || 'log',
                    message: (entry.message || '').substring(0, 500),
                    timestamp: entry.timestamp || null
                };
            });

            // Submit to Firestore
            const reportData = {
                // Basic info
                page: window.location.pathname,
                description: description.substring(0, 2000),
                submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                resolved: false,

                // Game metadata
                gameId: gameMetadata.gameId,
                gameTitle: gameMetadata.gameTitle,
                gameUrl: gameMetadata.gameUrl,

                // Environment context
                environment: {
                    userAgent: environmentContext.userAgent,
                    screenResolution: environmentContext.screenResolution,
                    viewportSize: environmentContext.viewportSize,
                    iframeSource: environmentContext.iframeSource,
                    timestamp: environmentContext.timestamp,
                    timezone: environmentContext.timezone,
                    platform: environmentContext.platform,
                    language: environmentContext.language
                },

                // Console logs
                consoleLogs: logs,

                // Screenshot (if captured)
                screenshot: screenshot
            };

            await firebase.firestore().collection('bugReports').add(reportData);

            status.textContent = 'Bug report submitted — thank you!';
            status.className = 'bug-report-status success';
            status.style.display = 'block';

            textarea.value = '';
            submitBtn.textContent = 'Submit Report';

            // Close after 2.5 s
            setTimeout(closeModal, 2500);
        } catch (err) {
            console.error('Bug report submission error:', err);
            status.textContent = 'Failed to submit: ' + (err.message || 'unknown error');
            status.className = 'bug-report-status error';
            status.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Report';
        }
    }

    // Auto-init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
