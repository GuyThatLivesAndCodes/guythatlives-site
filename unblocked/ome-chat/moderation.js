/**
 * ModerationManager - Handles content filtering, bans, and reports
 * Provides keyboard filtering, profanity detection, and report-based banning
 */
class ModerationManager {
    constructor(db, sessionId) {
        this.db = db;
        this.sessionId = sessionId;

        // Allowed characters (standard US keyboard)
        // Includes: letters, numbers, common punctuation, and whitespace
        this.allowedCharsRegex = /^[a-zA-Z0-9\s.,!?'"()\-:;@#$%&*+=\[\]{}|\\/<>~`_^]+$/;

        // Comprehensive profanity list
        // This list includes common profanity, slurs, and variations
        // Words are stored lowercase for case-insensitive matching
        this.profanityList = [
            // Common profanity
            'fuck', 'fucking', 'fucked', 'fucker', 'fucks', 'fck', 'fuk', 'phuck', 'phuk',
            'shit', 'shitting', 'shitter', 'shitty', 'sh1t', 'sht',
            'ass', 'asses', 'asshole', 'assholes', 'a$$', 'a$$hole',
            'bitch', 'bitches', 'bitching', 'b1tch', 'biatch',
            'damn', 'dammit', 'damned', 'goddamn', 'goddammit',
            'hell', 'hells',
            'crap', 'crappy',
            'piss', 'pissed', 'pissing',
            'dick', 'dicks', 'd1ck', 'dickhead',
            'cock', 'cocks', 'c0ck',
            'pussy', 'pussies', 'pu$$y',
            'cunt', 'cunts', 'c*nt',
            'bastard', 'bastards',
            'whore', 'whores', 'wh0re',
            'slut', 'sluts', 'sl*t',

            // Racial slurs (abbreviated/censored in code but detected)
            'nigger', 'nigga', 'n1gger', 'n1gga', 'negro',
            'chink', 'ch1nk',
            'spic', 'sp1c',
            'kike', 'k1ke',
            'gook', 'g00k',
            'wetback',
            'beaner',
            'cracker',
            'honkey', 'honky',
            'gringo',
            'jap', 'j4p',

            // Homophobic slurs
            'fag', 'faggot', 'faggots', 'f4g', 'f4ggot',
            'dyke', 'dykes',
            'homo', 'homos',
            'queer', 'queers',
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
            'horny', 'h0rny',
            'masturbate', 'masturbation', 'masturbating',
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
            'crack',

            // Common leetspeak/bypass attempts
            'f u c k', 'f.u.c.k', 'f-u-c-k',
            's h i t', 's.h.i.t', 's-h-i-t',
            'a s s', 'a.s.s', 'a-s-s',
            'b i t c h', 'b.i.t.c.h', 'b-i-t-c-h'
        ];

        // Create regex patterns for word boundary matching
        this.profanityPatterns = this.profanityList.map(word => {
            // Escape special regex characters
            const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Allow for common letter substitutions
            return new RegExp(escaped, 'i');
        });
    }

    /**
     * Check if a message contains only allowed characters and no profanity
     * @param {string} text - The message to check
     * @returns {{allowed: boolean, reason?: string}}
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
                // Convert leetspeak numbers to letters
                const leetMap = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b' };
                return leetMap[match] || match;
            })
            .replace(/[@]/g, 'a')
            .replace(/[!]/g, 'i')
            .replace(/[$]/g, 's')
            .replace(/[.]/g, '')
            .replace(/[-]/g, '')
            .replace(/[_]/g, '')
            .replace(/\s+/g, ''); // Remove spaces for bypass detection

        // Check against profanity list
        for (const word of this.profanityList) {
            // Check exact word
            if (lowerText.includes(word)) {
                return { allowed: false, reason: 'profanity', word: word };
            }

            // Check cleaned text (for bypass attempts)
            const cleanedWord = word.replace(/[.\-_\s]/g, '');
            if (cleanedText.includes(cleanedWord)) {
                return { allowed: false, reason: 'profanity', word: word };
            }
        }

        return { allowed: true };
    }

    /**
     * Check if the current session is banned
     * @returns {Promise<{banned: boolean, banUntil?: Date, reason?: string}>}
     */
    async checkBanStatus() {
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
                    return {
                        banned: true,
                        banUntil: banUntilDate,
                        reason: data.banReason || 'unknown'
                    };
                }
            }

            return { banned: false };
        } catch (error) {
            console.error('Error checking ban status:', error);
            return { banned: false };
        }
    }

    /**
     * Apply a temporary ban to the current session
     * @param {string} reason - The reason for the ban ('profanity' or 'reports')
     * @param {number} durationMinutes - How long the ban should last
     */
    async applyBan(reason, durationMinutes) {
        const banUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

        try {
            await this.db.collection('omechat').doc('data')
                .collection('moderation').doc(this.sessionId).set({
                    banUntil: firebase.firestore.Timestamp.fromDate(banUntil),
                    banReason: reason,
                    lastBanTime: firebase.firestore.FieldValue.serverTimestamp(),
                    sessionId: this.sessionId
                }, { merge: true });

            console.log(`Ban applied: ${reason} for ${durationMinutes} minutes`);
            return { success: true, banUntil };
        } catch (error) {
            console.error('Error applying ban:', error);
            return { success: false, error };
        }
    }

    /**
     * Submit a report against another user
     * @param {string} targetSessionId - The session ID of the user being reported
     * @param {string} reason - The reason for the report
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

                // Create new report
                const newReport = {
                    reporterId: this.sessionId,
                    reason: reason,
                    timestamp: new Date()
                };

                // Add to reports array
                data.reports = data.reports || [];
                data.reports.push(newReport);

                // Count recent reports (within 30 minutes)
                const recentReports = data.reports.filter(r => {
                    const reportTime = r.timestamp.toDate ? r.timestamp.toDate() : r.timestamp;
                    return reportTime > thirtyMinutesAgo;
                });

                // Update report count
                data.reportCount = recentReports.length;
                data.lastReportTime = firebase.firestore.FieldValue.serverTimestamp();

                // Check if user should be banned (3 reports in 30 minutes)
                if (recentReports.length >= 3 && !data.banUntil) {
                    // Apply 15-minute ban
                    data.banUntil = firebase.firestore.Timestamp.fromDate(
                        new Date(Date.now() + 15 * 60 * 1000)
                    );
                    data.banReason = 'reports';

                    // Reset report count after ban
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
     * Get the profanity list (for debugging/admin purposes)
     * @returns {string[]}
     */
    getProfanityList() {
        return [...this.profanityList];
    }

    /**
     * Add a word to the profanity list (runtime only)
     * @param {string} word - Word to add
     */
    addProfanityWord(word) {
        if (!this.profanityList.includes(word.toLowerCase())) {
            this.profanityList.push(word.toLowerCase());
        }
    }

    /**
     * Check if a specific word is in the profanity list
     * @param {string} word - Word to check
     * @returns {boolean}
     */
    isProfanity(word) {
        return this.profanityList.includes(word.toLowerCase());
    }
}

// Export for use in other modules
window.ModerationManager = ModerationManager;
