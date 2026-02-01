/**
 * Bug Reporter — shared module for all /unblocked/ pages.
 *
 * Patches console so the last 50 messages are captured in memory,
 * then provides a floating "Report Bug" button that opens a modal.
 * On submit it calls the submitBugReport Cloud Function with the
 * user's description + the captured console log.
 *
 * Usage: include this script after the Firebase SDK scripts.
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
            <label class="bug-report-label">Describe what went wrong</label>
            <textarea id="bug-report-textarea" class="bug-report-textarea" placeholder="e.g. The game freezes when I click the start button…" maxlength="2000"></textarea>
            <p class="bug-report-hint">We automatically include your last 50 console messages to help debug.</p>
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
    max-width: 480px;
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
}
.bug-report-page-label {
    font-size: 0.75rem;
    color: var(--text-muted, #94a3b8);
    margin: 0;
}
.bug-report-page-label span {
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

    function openModal() {
        const modal = document.getElementById('bug-report-modal');
        const pageLabel = document.getElementById('bug-report-page-name');
        const textarea = document.getElementById('bug-report-textarea');
        const status = document.getElementById('bug-report-status');

        pageLabel.textContent = window.location.pathname;
        textarea.value = '';
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
        const description = textarea.value.trim();

        if (!description) {
            status.textContent = 'Please describe what went wrong.';
            status.className = 'bug-report-status error';
            status.style.display = 'block';
            return;
        }

        submitBtn.disabled = true;
        status.style.display = 'none';

        try {
            // Write directly to Firestore — no Cloud Function needed.
            // Security rules allow anyone to create; only admins can read.
            const logs = capturedLogs.slice(-50).map(function (entry) {
                return {
                    level: entry.level || 'log',
                    message: (entry.message || '').substring(0, 500),
                    timestamp: entry.timestamp || null
                };
            });

            await firebase.firestore().collection('bugReports').add({
                page: window.location.pathname,
                description: description.substring(0, 2000),
                consoleLogs: logs,
                submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                resolved: false
            });

            status.textContent = 'Bug report submitted — thank you!';
            status.className = 'bug-report-status success';
            status.style.display = 'block';

            textarea.value = '';
            // Close after 2.5 s
            setTimeout(closeModal, 2500);
        } catch (err) {
            status.textContent = 'Failed to submit: ' + (err.message || 'unknown error');
            status.className = 'bug-report-status error';
            status.style.display = 'block';
            submitBtn.disabled = false;
        }
    }

    // Auto-init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
