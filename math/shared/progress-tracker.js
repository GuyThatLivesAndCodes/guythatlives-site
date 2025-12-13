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

        // Check auth status after a short delay to ensure authSystem is initialized
        setTimeout(() => this.checkAuthStatus(), 100);
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

        // Migrate guest progress to user account
        this.migrateGuestProgress();

        // Reload progress
        this.localProgress = this.loadLocalProgress();

        // Hide guest warning
        this.hideGuestModeWarning();

        // TODO: Sync to cloud
        this.syncToCloud();
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

    // Migrate guest progress to user account
    migrateGuestProgress() {
        if (!this.currentUser) return;

        const guestProgress = localStorage.getItem('guythatlives_math_progress');
        if (guestProgress) {
            try {
                const guestData = JSON.parse(guestProgress);
                const userProgressKey = this.getUserProgressKey();
                const existingUserProgress = localStorage.getItem(userProgressKey);

                // Only migrate if user has no existing progress
                if (!existingUserProgress && Object.keys(guestData.lessons).length > 0) {
                    localStorage.setItem(userProgressKey, guestProgress);
                    console.log('Guest progress migrated to user account');
                }
            } catch (error) {
                console.error('Error migrating guest progress:', error);
            }
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
            warning.innerHTML = `
                <span>Guest Mode</span>
                <button onclick="authSystem.showLoginModal()" style="
                    background: transparent;
                    border: 1px solid var(--warning);
                    color: var(--warning);
                    padding: 0.3rem 0.8rem;
                    border-radius: 4px;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.75rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin-left: auto;
                " onmouseover="this.style.background='rgba(241,250,140,0.1)'" onmouseout="this.style.background='transparent'">
                    Login to Save
                </button>
            `;
            warning.style.cssText = `
                font-size: 0.75rem;
                padding: 0.5rem 0.8rem;
                margin-top: 0.8rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            `;
            scorePanel.appendChild(warning);
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
        this.questionCount = 0;
        this.correctAnswers = 0;
        this.incorrectAnswers = 0;
        this.scoreHistory = [];
        
        // Update UI
        this.updateScoreDisplay();
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
        this.saveProgress();

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
        const totalTime = Date.now() - this.startTime;
        
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

            if (this.isLoggedIn) {
                // TODO: Sync to cloud database
                this.syncToCloud();
            }
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    }

    // Sync progress to cloud (placeholder for future implementation)
    async syncToCloud() {
        // TODO: Implement cloud sync with backend API
        // This would:
        // 1. Send progress data to backend
        // 2. Receive confirmation
        // 3. Update last sync timestamp
        // 4. Handle conflicts (merge strategies)

        if (!this.isLoggedIn || !this.currentUser) {
            console.log('User not logged in, skipping cloud sync');
            return;
        }

        console.log('Cloud sync ready for implementation');
        // Future implementation:
        // await fetch('/api/progress/sync', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //         userId: this.currentUser.email,
        //         progress: this.localProgress
        //     })
        // });
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
