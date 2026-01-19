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
    constructor(config = {}, subject = 'math') {
        this.subject = subject;
        this.subjectConfig = SUBJECT_CONFIG[subject];
        this.config = { ...TEST_CONFIG, ...config };

        // Use subject-specific question count if not overridden
        if (!config.totalQuestions && this.subjectConfig) {
            this.config.totalQuestions = this.subjectConfig.questionCount.target;
            this.config.minQuestions = this.subjectConfig.questionCount.min;
            this.config.maxQuestions = this.subjectConfig.questionCount.max;
        }

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

        // Convergence tracking for dynamic question count
        this.abilityHistory = [];
        this.convergenceWindowSize = 5; // Look at last 5 ability estimates
        this.convergenceThreshold = 0.05; // Standard error threshold
        this.minQuestionsBeforeCheck = this.config.minQuestions || 30; // Minimum questions before checking convergence
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

        // Check if test should end (dynamic based on convergence)
        if (this.shouldEndTest()) {
            this.testComplete = true;
            // Set actual total questions to current count (for dynamic tests)
            this.totalQuestions = this.currentQuestion;
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

        // Track ability history for convergence detection
        this.abilityHistory.push(this.estimatedAbility);
    }

    /**
     * Calculate confidence in current ability estimate
     * Returns convergence status and standard error
     */
    calculateConfidence() {
        // Need minimum window of estimates
        if (this.abilityHistory.length < this.convergenceWindowSize) {
            return {
                converged: false,
                standardError: 1.0,
                mean: this.estimatedAbility
            };
        }

        // Get last N ability estimates
        const window = this.abilityHistory.slice(-this.convergenceWindowSize);

        // Calculate mean
        const mean = window.reduce((sum, val) => sum + val, 0) / window.length;

        // Calculate variance
        const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;

        // Calculate standard error
        const standardError = Math.sqrt(variance) / Math.sqrt(window.length);

        // Check if converged (standard error below threshold)
        const converged = standardError < this.convergenceThreshold;

        return {
            converged,
            standardError,
            mean
        };
    }

    /**
     * Determine if test should end based on convergence or max questions
     */
    shouldEndTest() {
        const { converged } = this.calculateConfidence();

        // Must ask minimum questions first
        if (this.currentQuestion < this.minQuestionsBeforeCheck) {
            return false;
        }

        // End if converged OR reached max questions
        if (converged || this.currentQuestion >= (this.config.maxQuestions || this.totalQuestions)) {
            return true;
        }

        return false;
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
     * Save progress to localStorage (subject-specific key)
     */
    saveProgress() {
        const saveData = {
            subject: this.subject,
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
            config: this.config,
            abilityHistory: this.abilityHistory,
            consecutiveCorrect: this.consecutiveCorrect,
            consecutiveIncorrect: this.consecutiveIncorrect
        };

        const key = `adaptive_test_progress_${this.subject}`;
        localStorage.setItem(key, JSON.stringify(saveData));

        // Use TestStateManager if available
        if (typeof testStateManager !== 'undefined' && testStateManager) {
            testStateManager.saveTest(this.subject, saveData);
        }
    }

    /**
     * Restore progress from localStorage (subject-specific key)
     */
    restoreProgress() {
        const key = `adaptive_test_progress_${this.subject}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                Object.assign(this, data);
                // Restore convergence tracking data if present
                if (data.abilityHistory) {
                    this.abilityHistory = data.abilityHistory;
                }
                if (data.consecutiveCorrect !== undefined) {
                    this.consecutiveCorrect = data.consecutiveCorrect;
                }
                if (data.consecutiveIncorrect !== undefined) {
                    this.consecutiveIncorrect = data.consecutiveIncorrect;
                }
                return true;
            } catch (e) {
                console.error('Error restoring progress:', e);
                return false;
            }
        }
        return false;
    }

    /**
     * Clear saved progress (subject-specific key)
     */
    clearProgress() {
        const key = `adaptive_test_progress_${this.subject}`;
        localStorage.removeItem(key);

        // Use TestStateManager if available
        if (typeof testStateManager !== 'undefined' && testStateManager) {
            testStateManager.deleteTest(this.subject);
        }
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
     * Get progress percentage (uses maxQuestions for dynamic tests)
     */
    getProgressPercentage() {
        const maxQ = this.config.maxQuestions || this.totalQuestions;
        return Math.round((this.currentQuestion / maxQ) * 100);
    }

    /**
     * Get convergence info for debugging
     */
    getConvergenceInfo() {
        return {
            abilityHistory: this.abilityHistory,
            confidence: this.calculateConfidence(),
            shouldEnd: this.shouldEndTest(),
            questionsRemaining: Math.max(0, this.minQuestionsBeforeCheck - this.currentQuestion)
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdaptiveTestEngine;
}
