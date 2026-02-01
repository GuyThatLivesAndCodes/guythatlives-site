/**
 * ModerationManager - Handles content filtering, bans, and reports
 * Uses localStorage for persistent bans that survive page reloads
 * Implements 3-strike warning system before banning
 */
class ModerationManager {
    constructor(db, sessionId) {
        this.db = db;
        this.sessionId = sessionId;

        // localStorage keys
        this.STORAGE_KEYS = {
            BAN_UNTIL: 'omechat_ban_until',
            BAN_REASON: 'omechat_ban_reason',
            STRIKE_COUNT: 'omechat_strike_count',
            LAST_STRIKE_TIME: 'omechat_last_strike_time'
        };

        // Number of warnings before ban
        this.MAX_STRIKES = 3;

        // Allowed characters (standard US keyboard)
        this.allowedCharsRegex = /^[a-zA-Z0-9\s.,!?'"()\-:;@#$%&*+=\[\]{}|\\/<>~`_^]+$/;

        // Comprehensive profanity list
        this.profanityList = [
            // Common profanity
            'fuck', 'fucking', 'fucked', 'fucker', 'fucks', 'fck', 'fuk', 'phuck', 'phuk',
            'shit', 'shitting', 'shitter', 'shitty', 'sh1t', 'sht',
            'ass', 'asses', 'asshole', 'assholes', 'a$$', 'a$$hole',
            'bitch', 'bitches', 'bitching', 'b1tch', 'biatch',
            'damn', 'dammit', 'damned', 'goddamn', 'goddammit',
            'dick', 'dicks', 'd1ck', 'dickhead',
            'cock', 'cocks', 'c0ck',
            'pussy', 'pussies', 'pu$$y',
            'cunt', 'cunts', 'c*nt',
            'bastard', 'bastards',
            'whore', 'whores', 'wh0re',
            'slut', 'sluts', 'sl*t',

            // Racial slurs
            'nigger', 'nigga', 'n1gger', 'n1gga', 'negro',
            'chink', 'ch1nk',
            'spic', 'sp1c',
            'kike', 'k1ke',
            'gook', 'g00k',
            'wetback',
            'beaner',
            'honkey', 'honky',
            'gringo',
            'jap', 'j4p',

            // Homophobic slurs
            'fag', 'faggot', 'faggots', 'f4g', 'f4ggot',
            'dyke', 'dykes',
            'tranny', 'trannies',

            // Other offensive terms
            'retard', 'retarded', 'retards', 'r3tard',
            'autist', 'autistic',
            'nazi', 'nazis', 'n4zi',

            // Sexual content
            'porn', 'porno', 'pornography', 'p0rn',
            'sex', 'sexy', 's3x',
            'nude', 'nudes', 'nudity',
            'naked',
            'horny', 'h0rny', 'h[]rny', 'h()rny', 'h{}rny', 'hrny',
            'masturbate', 'masturbation', 'masturbating', 'master of baiting', 'master bait',
            'master bate', 'masterfully bate', 'masterfully bait',
            'ejaculation', 'ejaculate', 'ejacul',
            'breast', 'brest',
            'jerkoff', 'jerk off',
            'blowjob', 'blow job', 'bj',
            'handjob', 'hand job', 'hj',
            'boob', 'boobs', 'boobies', 'b00bs',
            'tit', 'tits', 'titty', 'titties', 't1ts',
            'penis', 'pen1s',
            'vagina', 'vag1na',
            'cum', 'cumming', 'cumshot',
            'orgasm',
            'erection',
            'dildo', 'dildos',
            'vibrator',
            'diddy',

            // Violence and threats
            'kill', 'killing', 'killer',
            'murder', 'murdered', 'murderer',
            'rape', 'raped', 'raping', 'rapist',
            'suicide', 'suicidal',
            'terrorist', 'terrorism',
            'bomb', 'bomber', 'bombing',

            // Drugs
            'cocaine', 'coke',
            'heroin', 'heroine',
            'meth', 'methamphetamine',
            'weed', 'marijuana', 'cannabis',
            'lsd', 'acid',
            'ecstasy', 'mdma', 'molly',

            // Common leetspeak/bypass attempts
            'f u c k', 'f.u.c.k', 'f-u-c-k',
            's h i t', 's.h.i.t', 's-h-i-t',
            'a s s', 'a.s.s', 'a-s-s',
            'b i t c h', 'b.i.t.c.h', 'b-i-t-c-h'
        ];
    }

    /**
     * Get current strike count from localStorage
     * @returns {number}
     */
    getStrikeCount() {
        const count = localStorage.getItem(this.STORAGE_KEYS.STRIKE_COUNT);
        return count ? parseInt(count, 10) : 0;
    }

    /**
     * Increment strike count and return new count
     * @returns {number} New strike count
     */
    incrementStrikes() {
        const current = this.getStrikeCount();
        const newCount = current + 1;
        localStorage.setItem(this.STORAGE_KEYS.STRIKE_COUNT, newCount.toString());
        localStorage.setItem(this.STORAGE_KEYS.LAST_STRIKE_TIME, Date.now().toString());
        return newCount;
    }

    /**
     * Reset strike count (called after ban expires)
     */
    resetStrikes() {
        localStorage.removeItem(this.STORAGE_KEYS.STRIKE_COUNT);
        localStorage.removeItem(this.STORAGE_KEYS.LAST_STRIKE_TIME);
    }

    /**
     * Get remaining strikes before ban
     * @returns {number}
     */
    getRemainingStrikes() {
        return Math.max(0, this.MAX_STRIKES - this.getStrikeCount());
    }

    /**
     * Check if a message contains only allowed characters and no profanity
     * @param {string} text - The message to check
     * @returns {{allowed: boolean, reason?: string, word?: string, censored?: string}}
     */
    checkMessage(text) {
        if (!text || typeof text !== 'string') {
            return { allowed: true };
        }

        const trimmedText = text.trim();

        if (trimmedText.length === 0) {
            return { allowed: false, reason: 'empty' };
        }

        // Check for non-standard keyboard characters
        if (!this.allowedCharsRegex.test(trimmedText)) {
            return { allowed: false, reason: 'invalid_chars' };
        }

        // Check for profanity
        const lowerText = trimmedText.toLowerCase();

        // Remove common bypass characters and check again
        const cleanedText = lowerText
            .replace(/[0-9]/g, match => {
                const leetMap = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b' };
                return leetMap[match] || match;
            })
            .replace(/[@]/g, 'a')
            .replace(/[!]/g, 'i')
            .replace(/[$]/g, 's')
            .replace(/[.]/g, '')
            .replace(/[-]/g, '')
            .replace(/[_]/g, '')
            .replace(/\s+/g, '');

        // Check against profanity list
        for (const word of this.profanityList) {
            if (lowerText.includes(word)) {
                return {
                    allowed: false,
                    reason: 'profanity',
                    word: word,
                    censored: this.censorWord(word)
                };
            }

            const cleanedWord = word.replace(/[.\-_\s]/g, '');
            if (cleanedText.includes(cleanedWord)) {
                return {
                    allowed: false,
                    reason: 'profanity',
                    word: word,
                    censored: this.censorWord(word)
                };
            }
        }

        return { allowed: true };
    }

    /**
     * Censor a word (show first and last letter with asterisks)
     * @param {string} word
     * @returns {string}
     */
    censorWord(word) {
        if (word.length <= 2) {
            return '*'.repeat(word.length);
        }
        return word[0] + '*'.repeat(word.length - 2) + word[word.length - 1];
    }

    /**
     * Handle a profanity violation - increment strikes or apply ban
     * @returns {{banned: boolean, strikeCount: number, remaining: number, banUntil?: Date}}
     */
    handleProfanityViolation() {
        const newStrikeCount = this.incrementStrikes();
        const remaining = this.MAX_STRIKES - newStrikeCount;

        if (newStrikeCount >= this.MAX_STRIKES) {
            // Apply 5-minute ban
            const banResult = this.applyLocalBan('profanity', 5);
            return {
                banned: true,
                strikeCount: newStrikeCount,
                remaining: 0,
                banUntil: banResult.banUntil
            };
        }

        return {
            banned: false,
            strikeCount: newStrikeCount,
            remaining: remaining
        };
    }

    /**
     * Apply a ban stored in localStorage (persists across reloads)
     * @param {string} reason
     * @param {number} durationMinutes
     * @returns {{success: boolean, banUntil: Date}}
     */
    applyLocalBan(reason, durationMinutes) {
        const banUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

        localStorage.setItem(this.STORAGE_KEYS.BAN_UNTIL, banUntil.getTime().toString());
        localStorage.setItem(this.STORAGE_KEYS.BAN_REASON, reason);

        // Reset strikes after ban is applied
        this.resetStrikes();

        console.log(`Local ban applied: ${reason} for ${durationMinutes} minutes`);

        // Also sync to Firestore for server-side tracking
        this.syncBanToFirestore(reason, banUntil);

        return { success: true, banUntil };
    }

    /**
     * Sync ban to Firestore (for server-side tracking, optional)
     */
    async syncBanToFirestore(reason, banUntil) {
        try {
            await this.db.collection('omechat').doc('data')
                .collection('moderation').doc(this.sessionId).set({
                    banUntil: firebase.firestore.Timestamp.fromDate(banUntil),
                    banReason: reason,
                    lastBanTime: firebase.firestore.FieldValue.serverTimestamp(),
                    sessionId: this.sessionId
                }, { merge: true });
        } catch (error) {
            console.error('Error syncing ban to Firestore:', error);
        }
    }

    /**
     * Check if the device is currently banned (uses localStorage)
     * @returns {{banned: boolean, banUntil?: Date, reason?: string}}
     */
    checkLocalBanStatus() {
        const banUntilStr = localStorage.getItem(this.STORAGE_KEYS.BAN_UNTIL);
        const banReason = localStorage.getItem(this.STORAGE_KEYS.BAN_REASON);

        if (!banUntilStr) {
            return { banned: false };
        }

        const banUntil = new Date(parseInt(banUntilStr, 10));

        if (banUntil > new Date()) {
            return {
                banned: true,
                banUntil: banUntil,
                reason: banReason || 'unknown'
            };
        }

        // Ban expired - clear it
        this.clearLocalBan();
        return { banned: false };
    }

    /**
     * Clear the local ban (called when ban expires)
     */
    clearLocalBan() {
        localStorage.removeItem(this.STORAGE_KEYS.BAN_UNTIL);
        localStorage.removeItem(this.STORAGE_KEYS.BAN_REASON);
        // Also reset strikes when ban expires
        this.resetStrikes();
    }

    /**
     * Check ban status - checks both localStorage AND Firestore
     * @returns {Promise<{banned: boolean, banUntil?: Date, reason?: string}>}
     */
    async checkBanStatus() {
        // First check localStorage (primary - persists across reloads)
        const localBan = this.checkLocalBanStatus();
        if (localBan.banned) {
            return localBan;
        }

        // Then check Firestore (for bans from reports)
        try {
            const doc = await this.db.collection('omechat').doc('data')
                .collection('moderation').doc(this.sessionId).get();

            if (!doc.exists) {
                return { banned: false };
            }

            const data = doc.data();

            if (data.banUntil) {
                const banUntilDate = data.banUntil.toDate();

                if (banUntilDate > new Date()) {
                    // Sync Firestore ban to localStorage
                    localStorage.setItem(this.STORAGE_KEYS.BAN_UNTIL, banUntilDate.getTime().toString());
                    localStorage.setItem(this.STORAGE_KEYS.BAN_REASON, data.banReason || 'reports');

                    return {
                        banned: true,
                        banUntil: banUntilDate,
                        reason: data.banReason || 'unknown'
                    };
                }
            }

            return { banned: false };
        } catch (error) {
            console.error('Error checking Firestore ban status:', error);
            return { banned: false };
        }
    }

    /**
     * Apply a ban (legacy method - now uses localStorage)
     * @param {string} reason
     * @param {number} durationMinutes
     */
    async applyBan(reason, durationMinutes) {
        return this.applyLocalBan(reason, durationMinutes);
    }

    /**
     * Submit a report against another user
     * @param {string} targetSessionId
     * @param {string} reason
     */
    async submitReport(targetSessionId, reason) {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        try {
            const modRef = this.db.collection('omechat').doc('data')
                .collection('moderation').doc(targetSessionId);

            await this.db.runTransaction(async (transaction) => {
                const doc = await transaction.get(modRef);
                let data = doc.exists ? doc.data() : {
                    reports: [],
                    reportCount: 0,
                    sessionId: targetSessionId
                };

                const newReport = {
                    reporterId: this.sessionId,
                    reason: reason,
                    timestamp: new Date()
                };

                data.reports = data.reports || [];
                data.reports.push(newReport);

                const recentReports = data.reports.filter(r => {
                    const reportTime = r.timestamp.toDate ? r.timestamp.toDate() : r.timestamp;
                    return reportTime > thirtyMinutesAgo;
                });

                data.reportCount = recentReports.length;
                data.lastReportTime = firebase.firestore.FieldValue.serverTimestamp();

                if (recentReports.length >= 3 && !data.banUntil) {
                    data.banUntil = firebase.firestore.Timestamp.fromDate(
                        new Date(Date.now() + 15 * 60 * 1000)
                    );
                    data.banReason = 'reports';
                    data.reports = [];
                    data.reportCount = 0;
                    console.log(`User ${targetSessionId} banned due to reports`);
                }

                transaction.set(modRef, data);
            });

            return { success: true };
        } catch (error) {
            console.error('Error submitting report:', error);
            return { success: false, error };
        }
    }

    /**
     * Get the profanity list
     * @returns {string[]}
     */
    getProfanityList() {
        return [...this.profanityList];
    }

    /**
     * Add a word to the profanity list
     * @param {string} word
     */
    addProfanityWord(word) {
        if (!this.profanityList.includes(word.toLowerCase())) {
            this.profanityList.push(word.toLowerCase());
        }
    }

    /**
     * Check if a specific word is in the profanity list
     * @param {string} word
     * @returns {boolean}
     */
    isProfanity(word) {
        return this.profanityList.includes(word.toLowerCase());
    }
}

// Export for use in other modules
window.ModerationManager = ModerationManager;
