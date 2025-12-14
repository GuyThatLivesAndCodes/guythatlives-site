// Progress tracking and scoring system for GuyThatLives Network Math Platform

class ProgressTracker {
    constructor() {
        this.isLoggedIn = false;
        this.currentUser = null;
        this.localProgress = this.loadLocalProgress();
        this.scoreHistory = [];
        this.currentScore = 0;
        this.targetScore = 100;
        this.streak = 0;
        this.startTime = Date.now();
        this.questionCount = 0;
        this.correctAnswers = 0;
        this.incorrectAnswers = 0;

        // Activity tracking
        this.lastActivityTime = Date.now();
        this.totalActiveTime = 0;
        this.isPaused = false;
        this.activityCheckInterval = null;
        this.INACTIVITY_THRESHOLD = 3 * 60 * 1000; // 3 minutes in milliseconds

        // Check auth status after a short delay to ensure authSystem is initialized
        setTimeout(() => this.checkAuthStatus(), 100);

        // Start activity monitoring
        this.startActivityTracking();
    }

    // Start tracking user activity for time tracking
    startActivityTracking() {
        // Track mouse movement, clicks, keyboard input
        const activityEvents = ['mousemove', 'click', 'keypress', 'scroll', 'touchstart'];

        activityEvents.forEach(event => {
            document.addEventListener(event, () => this.recordActivity(), { passive: true });
        });

        // Check for inactivity every 10 seconds
        this.activityCheckInterval = setInterval(() => this.checkInactivity(), 10000);
    }

    // Record user activity
    recordActivity() {
        const now = Date.now();

        // If was paused, resume timing
        if (this.isPaused) {
            this.isPaused = false;
            this.startTime = now - this.totalActiveTime;
        }

        this.lastActivityTime = now;
    }

    // Check if user has been inactive
    checkInactivity() {
        const inactiveTime = Date.now() - this.lastActivityTime;

        if (inactiveTime > this.INACTIVITY_THRESHOLD && !this.isPaused) {
            // Pause timing
            this.isPaused = true;
            this.totalActiveTime = Date.now() - this.startTime;
        }
    }

    // Get actual active time spent (excluding paused time)
    getActiveTimeSpent() {
        if (this.isPaused) {
            return this.totalActiveTime;
        }
        return Date.now() - this.startTime;
    }

    // Check if user is logged in via authSystem
    checkAuthStatus() {
        if (window.authSystem && window.authSystem.isUserLoggedIn()) {
            this.isLoggedIn = true;
            this.currentUser = window.authSystem.getCurrentUser();
            this.loadLocalProgress(); // Reload progress with user context
        } else {
            this.showGuestModeWarning();
        }
    }

    // Handle user login
    onUserLogin(user) {
        this.isLoggedIn = true;
        this.currentUser = user;

        // Hide guest warning
        this.hideGuestModeWarning();

        // Note: We no longer automatically load or save progress on login
        // User must manually trigger "Save Progress from Browser" from settings
    }

    // Handle user logout
    onUserLogout() {
        this.isLoggedIn = false;
        this.currentUser = null;

        // Reload guest progress
        this.localProgress = this.loadLocalProgress();

        // Show guest warning
        this.showGuestModeWarning();
    }

    // Manually save browser progress to Firebase (called from settings)
    async saveBrowserProgressToFirebase() {
        if (!window.authSystem || !window.authSystem.isLoggedIn) {
            throw new Error('You must be logged in to save progress to Firebase');
        }

        try {
            const userDoc = window.authSystem.db.collection('users').doc(window.authSystem.user.uid);

            // Get all progress from localStorage
            const browserProgress = this.loadLocalProgress();

            if (Object.keys(browserProgress.lessons).length === 0) {
                throw new Error('No progress found in browser to save');
            }

            // Save all lessons to Firebase
            const batch = window.authSystem.db.batch();

            for (const [lessonKey, lessonData] of Object.entries(browserProgress.lessons)) {
                const lessonDoc = userDoc.collection('lessons').doc(lessonKey);
                batch.set(lessonDoc, {
                    ...lessonData,
                    savedFromBrowser: true,
                    savedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            await batch.commit();

            return {
                success: true,
                lessonsCount: Object.keys(browserProgress.lessons).length
            };
        } catch (error) {
            console.error('Error saving browser progress to Firebase:', error);
            throw error;
        }
    }

    // Load progress from Firebase to browser (optional method for future use)
    async loadProgressFromFirebase() {
        if (!window.authSystem || !window.authSystem.isLoggedIn) {
            throw new Error('You must be logged in to load progress from Firebase');
        }

        try {
            const userDoc = window.authSystem.db.collection('users').doc(window.authSystem.user.uid);
            const lessonsSnapshot = await userDoc.collection('lessons').get();

            if (lessonsSnapshot.empty) {
                throw new Error('No saved progress found in Firebase');
            }

            const firebaseProgress = {
                lessons: {},
                courses: {},
                user: {
                    totalScore: 0,
                    lessonsCompleted: 0,
                    timeSpent: 0,
                    createdDate: Date.now()
                },
                lastUpdated: Date.now()
            };

            lessonsSnapshot.forEach(doc => {
                firebaseProgress.lessons[doc.id] = doc.data();
            });

            // Save to localStorage
            const storageKey = this.getUserProgressKey();
            localStorage.setItem(storageKey, JSON.stringify(firebaseProgress));

            // Reload local progress
            this.localProgress = this.loadLocalProgress();

            return {
                success: true,
                lessonsCount: Object.keys(firebaseProgress.lessons).length
            };
        } catch (error) {
            console.error('Error loading progress from Firebase:', error);
            throw error;
        }
    }

    // Get the storage key for current user
    getUserProgressKey() {
        if (this.isLoggedIn && this.currentUser) {
            return `guythatlives_math_progress_${this.currentUser.email}`;
        }
        return 'guythatlives_math_progress';
    }

    // Show warning for guest mode
    showGuestModeWarning() {
        // Check if warning already exists
        if (document.querySelector('.guest-mode-warning')) return;

        const scorePanel = document.querySelector('.score-panel');
        if (scorePanel) {
            const warning = document.createElement('div');
            warning.className = 'guest-mode-warning';
            warning.innerHTML = '/* Player is detected as Guest and is not signed in. */'
        }
    }

    // Hide guest mode warning
    hideGuestModeWarning() {
        const warning = document.querySelector('.guest-mode-warning');
        if (warning) {
            warning.remove();
        }
    }

    // Initialize progress tracking for a lesson
    initializeLesson(courseId, lessonId) {
        this.currentCourse = courseId;
        this.currentLesson = lessonId;
        this.currentScore = this.getLessonProgress(courseId, lessonId).score || 0;
        this.streak = 0;
        this.startTime = Date.now();
        this.lastActivityTime = Date.now();
        this.totalActiveTime = 0;
        this.isPaused = false;
        this.questionCount = 0;
        this.correctAnswers = 0;
        this.incorrectAnswers = 0;
        this.scoreHistory = [];

        // Auto-save progress every 30 seconds
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        this.autoSaveInterval = setInterval(() => {
            if (this.questionCount > 0) {
                this.saveCurrentProgress();
            }
        }, 30000); // 30 seconds

        // Update UI
        this.updateScoreDisplay();
    }

    // Save current progress (called periodically and after each question)
    saveCurrentProgress() {
        const key = `${this.currentCourse}_${this.currentLesson}`;

        // Update or create lesson data
        const existingData = this.localProgress.lessons[key] || {};
        const lessonData = {
            ...existingData,
            score: this.currentScore,
            attempts: existingData.attempts || 0,
            bestScore: Math.max(this.currentScore, existingData.bestScore || 0),
            timeSpent: this.getActiveTimeSpent(),
            accuracy: this.questionCount > 0 ? (this.correctAnswers / this.questionCount) : 0,
            questionsAnswered: this.questionCount,
            lastAttempt: Date.now(),
            completed: this.currentScore >= 100
        };

        this.localProgress.lessons[key] = lessonData;
        this.saveProgress();

        // Sync to Firebase only if user is signed in
        if (this.isLoggedIn) {
            this.syncToFirebase();
        }
    }

    // Calculate score change based on correctness and timing
    calculateScoreChange(isCorrect, timeSpent, attempts = 1) {
        let scoreChange = 0;

        if (isCorrect) {
            // Base points for correct answer
            let basePoints = 10;
            
            // Time bonus (faster = more points, max 5 bonus points)
            let timeBonus = 0;
            if (timeSpent < 10000) { // Under 10 seconds
                timeBonus = 5;
            } else if (timeSpent < 20000) { // Under 20 seconds
                timeBonus = 3;
            } else if (timeSpent < 30000) { // Under 30 seconds
                timeBonus = 1;
            }
            
            // Streak bonus (consecutive correct answers)
            let streakBonus = Math.min(this.streak, 5); // Max 5 bonus points
            
            // First attempt bonus
            let attemptBonus = attempts === 1 ? 3 : 0;
            
            scoreChange = basePoints + timeBonus + streakBonus + attemptBonus;
            this.streak++;
            this.correctAnswers++;
            
        } else {
            // Penalty for incorrect answer
            let basePenalty = -8;
            
            // Additional penalty for multiple wrong attempts
            let attemptPenalty = -(attempts - 1) * 2;
            
            // Reduced penalty if score is low (don't discourage beginners)
            if (this.currentScore < 20) {
                basePenalty = Math.max(basePenalty, -5);
            }
            
            scoreChange = basePenalty + attemptPenalty;
            this.streak = 0; // Reset streak
            this.incorrectAnswers++;
        }

        // Apply score change
        this.currentScore = Math.max(0, Math.min(100, this.currentScore + scoreChange));
        
        // Record this change
        this.scoreHistory.push({
            questionNumber: this.questionCount + 1,
            isCorrect,
            timeSpent,
            attempts,
            scoreChange,
            newScore: this.currentScore,
            timestamp: Date.now()
        });

        this.questionCount++;
        this.updateScoreDisplay();

        // Save progress after each question at ANY level
        this.saveCurrentProgress();

        return {
            scoreChange,
            newScore: this.currentScore,
            streak: this.streak
        };
    }

    // Get lesson progress
    getLessonProgress(courseId, lessonId) {
        const key = `${courseId}_${lessonId}`;
        return this.localProgress.lessons[key] || {
            score: 0,
            completed: false,
            attempts: 0,
            bestScore: 0,
            timeSpent: 0
        };
    }

    // Save lesson completion
    completeLessonAttempt() {
        const key = `${this.currentCourse}_${this.currentLesson}`;
        const totalTime = this.getActiveTimeSpent();

        const lessonData = {
            score: this.currentScore,
            completed: this.currentScore >= 100,
            attempts: (this.localProgress.lessons[key]?.attempts || 0) + 1,
            bestScore: Math.max(this.currentScore, this.localProgress.lessons[key]?.bestScore || 0),
            timeSpent: totalTime,
            accuracy: this.correctAnswers / this.questionCount,
            questionsAnswered: this.questionCount,
            lastAttempt: Date.now(),
            scoreHistory: this.scoreHistory
        };

        this.localProgress.lessons[key] = lessonData;
        this.localProgress.lastUpdated = Date.now();

        this.saveProgress();
        return lessonData;
    }

    // Load progress from localStorage
    loadLocalProgress() {
        try {
            const storageKey = this.getUserProgressKey();
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading progress:', error);
        }

        return {
            lessons: {},
            courses: {},
            user: {
                totalScore: 0,
                lessonsCompleted: 0,
                timeSpent: 0,
                createdDate: Date.now()
            },
            lastUpdated: Date.now()
        };
    }

    // Save progress to localStorage
    saveProgress() {
        try {
            // Update user stats
            this.updateUserStats();

            const storageKey = this.getUserProgressKey();
            localStorage.setItem(storageKey, JSON.stringify(this.localProgress));

            // Note: We no longer automatically sync to cloud
            // Progress is only synced when user manually saves from settings
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    }

    // Firebase sync methods - only syncs current lesson progress during active session
    async syncToFirebase() {
        if (!window.authSystem || !window.authSystem.isLoggedIn) return;
        if (!this.currentLesson || !this.currentCourse) return;

        try {
            const userDoc = window.authSystem.db.collection('users').doc(window.authSystem.user.uid);
            const lessonId = `${this.currentCourse}_${this.currentLesson}`;

            // Save current lesson progress to Firebase
            const progressData = {
                score: this.currentScore,
                streak: this.streak,
                questionCount: this.questionCount,
                correctAnswers: this.correctAnswers,
                incorrectAnswers: this.incorrectAnswers,
                timeSpent: this.getActiveTimeSpent(),
                lastAttempt: firebase.firestore.FieldValue.serverTimestamp(),
                completed: this.currentScore >= 100,
                accuracy: this.questionCount > 0 ? (this.correctAnswers / this.questionCount) : 0
            };

            await userDoc.collection('lessons').doc(lessonId).set(progressData, { merge: true });

        } catch (error) {
            console.error('Firebase sync error:', error);
        }
    }

    // Legacy method for compatibility - now returns active time
    getTimeSpent() {
        return this.getActiveTimeSpent();
    }

    // Update overall user statistics
    updateUserStats() {
        const lessons = Object.values(this.localProgress.lessons);
        
        this.localProgress.user.lessonsCompleted = lessons.filter(l => l.completed).length;
        this.localProgress.user.totalScore = lessons.reduce((sum, l) => sum + l.bestScore, 0);
        this.localProgress.user.timeSpent = lessons.reduce((sum, l) => sum + l.timeSpent, 0);
    }

    // Get course progress summary
    getCourseProgress(courseId) {
        const lessons = Object.entries(this.localProgress.lessons)
            .filter(([key]) => key.startsWith(courseId))
            .map(([key, data]) => ({ lessonId: key.split('_')[1], ...data }));
            
        const completed = lessons.filter(l => l.completed).length;
        const total = lessons.length;
        const averageScore = lessons.length ? 
            lessons.reduce((sum, l) => sum + l.bestScore, 0) / lessons.length : 0;
            
        return {
            completed,
            total,
            averageScore: Math.round(averageScore),
            lessons
        };
    }

    // Update score display in UI
    updateScoreDisplay() {
        const scoreElement = document.getElementById('currentScore');
        const progressBar = document.getElementById('progressBar');
        const streakElement = document.getElementById('currentStreak');
        
        if (scoreElement) {
            scoreElement.textContent = this.currentScore;
        }
        
        if (progressBar) {
            progressBar.style.width = `${this.currentScore}%`;
        }
        
        if (streakElement) {
            streakElement.textContent = this.streak;
        }

        // Add visual effects for score changes
        if (scoreElement && this.scoreHistory.length > 0) {
            const lastChange = this.scoreHistory[this.scoreHistory.length - 1];
            if (lastChange.scoreChange > 0) {
                this.showScoreAnimation(scoreElement, lastChange.scoreChange, 'positive');
            } else if (lastChange.scoreChange < 0) {
                this.showScoreAnimation(scoreElement, lastChange.scoreChange, 'negative');
            }
        }
    }

    // Animate score changes
    showScoreAnimation(element, change, type) {
        const animation = document.createElement('div');
        animation.className = `score-change score-change-${type}`;
        animation.textContent = change > 0 ? `+${change}` : change;
        animation.style.cssText = `
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            font-size: 1rem;
            color: ${type === 'positive' ? '#50fa7b' : '#ff5555'};
            z-index: 1000;
            animation: scoreFloat 2s ease-out forwards;
            pointer-events: none;
        `;
        
        // Add animation keyframes if not exists
        if (!document.querySelector('style[data-score-animation]')) {
            const style = document.createElement('style');
            style.setAttribute('data-score-animation', 'true');
            style.textContent = `
                @keyframes scoreFloat {
                    0% { transform: translateX(-50%) translateY(0px); opacity: 1; }
                    100% { transform: translateX(-50%) translateY(-50px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        element.style.position = 'relative';
        element.appendChild(animation);
        
        setTimeout(() => {
            if (animation.parentNode) {
                animation.parentNode.removeChild(animation);
            }
        }, 2000);
    }

    // Get achievement status
    getAchievements() {
        const lessons = Object.values(this.localProgress.lessons);
        const achievements = [];

        // First lesson completed
        if (lessons.some(l => l.completed)) {
            achievements.push({
                id: 'first_lesson',
                title: 'First Steps',
                description: 'Completed your first lesson!',
                icon: '🎯'
            });
        }

        // Perfect score
        if (lessons.some(l => l.score === 100)) {
            achievements.push({
                id: 'perfect_score',
                title: 'Perfectionist',
                description: 'Achieved a perfect score of 100!',
                icon: '🏆'
            });
        }

        // Speed demon (completed lesson in under 5 minutes)
        if (lessons.some(l => l.completed && l.timeSpent < 300000)) {
            achievements.push({
                id: 'speed_demon',
                title: 'Speed Demon',
                description: 'Completed a lesson in under 5 minutes!',
                icon: '⚡'
            });
        }

        // Course master (completed all lessons in a course)
        const courseProgress = this.getCourseProgress('algebra_linear_equations');
        if (courseProgress.completed === 5) { // All 5 lessons
            achievements.push({
                id: 'linear_master',
                title: 'Linear Equations Master',
                description: 'Completed all linear equation lessons!',
                icon: '📐'
            });
        }

        return achievements;
    }
}

// Export for use in lesson pages
window.ProgressTracker = ProgressTracker;
