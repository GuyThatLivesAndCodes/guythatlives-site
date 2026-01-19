/**
 * AdaptiveTestEngine - Core adaptive testing logic
 * Manages question selection, difficulty adjustment, and progress tracking
 */

const TEST_CONFIG = {
    totalQuestions: 25,        // Default number of questions
    startDifficulty: 15,       // Start at level 15 (middle of 1-30 range)
    minDifficulty: 1,          // 5th grade level
    maxDifficulty: 30,         // Pre-calculus level
    visualQuestionPercent: 35, // 35% have visual components
    difficultyBuffer: 2        // ±2 levels for question variety
};

class AdaptiveTestEngine {
    constructor(config = {}) {
        this.config = { ...TEST_CONFIG, ...config };
        this.totalQuestions = this.config.totalQuestions;
        this.currentQuestion = 0;
        this.currentDifficulty = this.config.startDifficulty;
        this.estimatedAbility = this.config.startDifficulty;
        this.questions = [];        // Questions asked
        this.responses = [];        // Student answers
        this.questionTimes = [];    // Time per question (seconds)
        this.startTime = null;
        this.questionStartTime = null;
        this.lastTopic = null;      // For topic variety
        this.consecutiveCorrect = 0; // Track consecutive correct answers
        this.consecutiveIncorrect = 0; // Track consecutive incorrect answers
        this.testComplete = false;
    }

    /**
     * Start the test
     */
    start() {
        this.startTime = Date.now();
        this.questionStartTime = Date.now();
        this.saveProgress();
    }

    /**
     * Select next question based on adaptive algorithm
     */
    selectNextQuestion(questionBank) {
        // Add variety by selecting from a range around current difficulty (±2 levels)
        const buffer = this.config.difficultyBuffer;
        const minDiff = Math.max(this.config.minDifficulty, this.currentDifficulty - buffer);
        const maxDiff = Math.min(this.config.maxDifficulty, this.currentDifficulty + buffer);
        const questionDifficulty = Math.floor(Math.random() * (maxDiff - minDiff + 1)) + minDiff;

        // Don't allow consecutive same topics
        const question = questionBank.generateQuestion(
            questionDifficulty,
            null,  // Let QuestionBank pick random topic
            this.lastTopic
        );

        this.lastTopic = question.topic;
        this.questions.push(question);
        this.questionStartTime = Date.now();

        return question;
    }

    /**
     * Process answer and adjust difficulty
     */
    processAnswer(questionId, userAnswer, isCorrect) {
        // Record time taken
        const timeTaken = Math.floor((Date.now() - this.questionStartTime) / 1000);
        this.questionTimes.push(timeTaken);

        // Record response
        this.responses.push({
            questionId: questionId,
            userAnswer: userAnswer,
            isCorrect: isCorrect,
            timeTaken: timeTaken,
            difficulty: this.currentDifficulty
        });

        // Exponential difficulty adjustment based on consecutive correct/incorrect
        if (isCorrect) {
            this.consecutiveCorrect++;
            this.consecutiveIncorrect = 0;

            // Increase difficulty exponentially: 1 correct = +1, 2 correct = +2, etc.
            const difficultyIncrease = this.consecutiveCorrect;
            this.currentDifficulty = Math.min(
                this.currentDifficulty + difficultyIncrease,
                this.config.maxDifficulty
            );
        } else {
            this.consecutiveIncorrect++;
            this.consecutiveCorrect = 0;

            // Decrease difficulty exponentially: 1 incorrect = -1, 2 incorrect = -2, etc.
            const difficultyDecrease = this.consecutiveIncorrect;
            this.currentDifficulty = Math.max(
                this.currentDifficulty - difficultyDecrease,
                this.config.minDifficulty
            );
        }

        // Update estimated ability (running weighted average)
        this.updateEstimatedAbility();

        // Increment question counter
        this.currentQuestion++;

        // Check if test is complete
        if (this.currentQuestion >= this.totalQuestions) {
            this.testComplete = true;
        }

        // Save progress
        this.saveProgress();
    }

    /**
     * Update estimated ability using exponential moving average
     */
    updateEstimatedAbility() {
        // Weight recent performance more heavily
        const alpha = 0.3; // Smoothing factor
        const recentCorrect = this.responses.slice(-5).filter(r => r.isCorrect).length;
        const recentTotal = Math.min(this.responses.length, 5);
        const recentPerformance = recentCorrect / recentTotal;

        // Estimated ability is weighted between current difficulty and recent performance
        this.estimatedAbility = alpha * this.currentDifficulty +
                               (1 - alpha) * (this.estimatedAbility + (recentPerformance - 0.5) * 2);

        // Clamp to valid range
        this.estimatedAbility = Math.max(
            this.config.minDifficulty,
            Math.min(this.config.maxDifficulty, this.estimatedAbility)
        );
    }

    /**
     * Calculate final RIT-like score (140-300 scale)
     * Similar to NWEA MAP testing
     */
    calculateRITScore() {
        // Base score from estimated ability level (60% weight)
        const abilityScore = this.estimatedAbility * 10; // 10-100 scale

        // Accuracy component (25% weight)
        const correctCount = this.responses.filter(r => r.isCorrect).length;
        const accuracy = correctCount / this.responses.length;
        const accuracyScore = accuracy * 100;

        // Difficulty progression trend (15% weight)
        // Reward students who finish at higher difficulty
        const finalDifficulty = this.currentDifficulty;
        const progressionScore = (finalDifficulty / this.config.maxDifficulty) * 100;

        // Weighted combination
        const rawScore = (abilityScore * 0.6) + (accuracyScore * 0.25) + (progressionScore * 0.15);

        // Scale to RIT range (140-300)
        // Map raw score (0-100) to RIT (140-300)
        const ritScore = Math.round(140 + (rawScore / 100) * 160);

        return Math.min(300, Math.max(140, ritScore));
    }

    /**
     * Get test summary data
     */
    getTestSummary() {
        const correctCount = this.responses.filter(r => r.isCorrect).length;
        const accuracy = (correctCount / this.responses.length) * 100;
        const avgTime = this.questionTimes.reduce((sum, t) => sum + t, 0) / this.questionTimes.length;
        const totalTime = Math.floor((Date.now() - this.startTime) / 1000);

        return {
            totalQuestions: this.totalQuestions,
            questionsAnswered: this.responses.length,
            correctAnswers: correctCount,
            accuracy: accuracy.toFixed(1),
            finalAbility: this.estimatedAbility.toFixed(1),
            ritScore: this.calculateRITScore(),
            avgTimePerQuestion: avgTime.toFixed(1),
            totalTimeSeconds: totalTime,
            difficultyProgression: this.responses.map(r => r.difficulty),
            startDifficulty: this.config.startDifficulty,
            finalDifficulty: this.currentDifficulty
        };
    }

    /**
     * Get topic-based performance statistics
     */
    getTopicPerformance() {
        const topicStats = {};

        this.questions.forEach((question, index) => {
            const topic = question.topic;
            const response = this.responses[index];

            if (!topicStats[topic]) {
                topicStats[topic] = {
                    total: 0,
                    correct: 0,
                    totalTime: 0
                };
            }

            topicStats[topic].total++;
            if (response && response.isCorrect) {
                topicStats[topic].correct++;
            }
            if (response) {
                topicStats[topic].totalTime += response.timeTaken;
            }
        });

        // Calculate percentages
        Object.keys(topicStats).forEach(topic => {
            const stats = topicStats[topic];
            stats.accuracy = ((stats.correct / stats.total) * 100).toFixed(0);
            stats.avgTime = (stats.totalTime / stats.total).toFixed(1);
        });

        return topicStats;
    }

    /**
     * Save progress to localStorage
     */
    saveProgress() {
        const saveData = {
            currentQuestion: this.currentQuestion,
            currentDifficulty: this.currentDifficulty,
            estimatedAbility: this.estimatedAbility,
            questions: this.questions,
            responses: this.responses,
            questionTimes: this.questionTimes,
            startTime: this.startTime,
            questionStartTime: this.questionStartTime,
            lastTopic: this.lastTopic,
            testComplete: this.testComplete,
            config: this.config
        };

        localStorage.setItem('adaptive_test_progress', JSON.stringify(saveData));
    }

    /**
     * Restore progress from localStorage
     */
    restoreProgress() {
        const saved = localStorage.getItem('adaptive_test_progress');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                Object.assign(this, data);
                return true;
            } catch (e) {
                console.error('Error restoring progress:', e);
                return false;
            }
        }
        return false;
    }

    /**
     * Clear saved progress
     */
    clearProgress() {
        localStorage.removeItem('adaptive_test_progress');
    }

    /**
     * Get current question number (1-indexed for display)
     */
    getCurrentQuestionNumber() {
        return this.currentQuestion + 1;
    }

    /**
     * Check if test is complete
     */
    isComplete() {
        return this.testComplete;
    }

    /**
     * Get progress percentage
     */
    getProgressPercentage() {
        return Math.round((this.currentQuestion / this.totalQuestions) * 100);
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdaptiveTestEngine;
}
