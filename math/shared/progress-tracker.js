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
            const stored = localStorage.getItem('guythatlives_math_progress');
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
            
            if (this.isLoggedIn) {
                // TODO: Sync to cloud database
                this.syncToCloud();
            }
            
            localStorage.setItem('guythatlives_math_progress', JSON.stringify(this.localProgress));
        } catch (error) {
            console.error('Error saving progress:', error);
        }
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

    // TODO: Login system
    async login(username, password) {
        // This would integrate with a backend authentication system
        // For now, just a placeholder
        console.log('Login system coming soon!');
    }

    // TODO: Cloud sync
    async syncToCloud() {
        // This would sync progress to a cloud database
        // For now, just a placeholder
        if (this.isLoggedIn) {
            console.log('Cloud sync coming soon!');
        }
    }
}

// Export for use in lesson pages
window.ProgressTracker = ProgressTracker;
