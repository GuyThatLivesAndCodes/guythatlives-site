/**
 * Main Orchestration Script
 * Coordinates test flow, UI updates, and user interactions
 */

// Global instances
let testEngine = null;
let questionBank = null;
let questionRenderer = null;
let apiHandler = null;
let currentQuestion = null;
let timerInterval = null;
let questionStartTime = 0;
// Calculator is initialized in simple-calculator.js

// DOM Elements
const elements = {
    welcomeModal: null,
    testContainer: null,
    submitBtn: null,
    progressFill: null,
    currentQ: null,
    totalQ: null,
    diffLevel: null,
    diffNumber: null,
    topicTag: null,
    timer: null,
    loadingOverlay: null,
    loadingMessage: null,
    savedTestNotice: null,
    savedQuestion: null
};

/**
 * Initialize the application
 */
function init() {
    // Get DOM elements
    elements.welcomeModal = document.getElementById('welcome-modal');
    elements.testContainer = document.getElementById('test-container');
    elements.submitBtn = document.getElementById('submit-btn');
    elements.progressFill = document.getElementById('progress-fill');
    elements.currentQ = document.getElementById('current-q');
    elements.totalQ = document.getElementById('total-q');
    elements.diffLevel = document.getElementById('diff-level');
    elements.diffNumber = document.getElementById('diff-number');
    elements.topicTag = document.getElementById('topic-tag');
    elements.timer = document.getElementById('timer');
    elements.loadingOverlay = document.getElementById('loading-overlay');
    elements.loadingMessage = document.getElementById('loading-message');
    elements.savedTestNotice = document.getElementById('saved-test-notice');
    elements.savedQuestion = document.getElementById('saved-question');

    // Initialize instances
    testEngine = new AdaptiveTestEngine({ totalQuestions: 25 });
    questionBank = new QuestionBank();
    questionRenderer = new QuestionRenderer('question-content', 'question-visual');
    apiHandler = new ClaudeAPIHandler();

    // Check for saved progress
    if (testEngine.restoreProgress()) {
        showSavedTestNotice();
    }

    // Setup event listeners
    setupEventListeners();

    // Initialize auth display (if available)
    initAuthDisplay();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    document.getElementById('start-test-btn')?.addEventListener('click', startNewTest);
    document.getElementById('resume-test-btn')?.addEventListener('click', resumeTest);
    document.getElementById('new-test-btn')?.addEventListener('click', startNewTest);
    elements.submitBtn?.addEventListener('click', submitAnswer);
}

/**
 * Show saved test notice
 */
function showSavedTestNotice() {
    if (elements.savedTestNotice) {
        elements.savedTestNotice.style.display = 'flex';
        elements.savedQuestion.textContent = testEngine.getCurrentQuestionNumber();
        document.getElementById('start-test-btn').style.display = 'none';
    }
}

/**
 * Start new test
 */
function startNewTest() {
    // Clear any saved progress
    testEngine.clearProgress();
    testEngine = new AdaptiveTestEngine({ totalQuestions: 25 });

    // Hide welcome modal, show test
    elements.welcomeModal.classList.remove('active');
    elements.testContainer.style.display = 'block';

    // Start test
    testEngine.start();
    elements.totalQ.textContent = testEngine.totalQuestions;

    // Load first question
    loadNextQuestion();
}

/**
 * Resume existing test
 */
function resumeTest() {
    // Hide welcome modal, show test
    elements.welcomeModal.classList.remove('active');
    elements.testContainer.style.display = 'block';

    elements.totalQ.textContent = testEngine.totalQuestions;

    // Load current question
    loadNextQuestion();
}

/**
 * Load next question
 */
function loadNextQuestion() {
    // Check if test is complete
    if (testEngine.isComplete()) {
        finishTest();
        return;
    }

    // Update progress
    updateProgress();

    // Generate new question
    currentQuestion = testEngine.selectNextQuestion(questionBank);

    // Update topic tag
    elements.topicTag.textContent = formatTopicName(currentQuestion.topic);

    // Render question
    questionRenderer.renderQuestion(currentQuestion, onAnswerSelected);

    // Start timer
    questionStartTime = Date.now();
    startQuestionTimer();

    // Show/hide calculator based on question needs
    toggleCalculator(currentQuestion.needsCalculator);

    // Disable submit button initially
    elements.submitBtn.disabled = true;
}

/**
 * Handle answer selection
 */
function onAnswerSelected(userAnswer, isCorrect) {
    // Store answer for submission
    elements.submitBtn.dataset.answer = userAnswer;
    elements.submitBtn.dataset.correct = isCorrect;

    // Enable submit button
    elements.submitBtn.disabled = false;
}

/**
 * Submit answer
 */
function submitAnswer() {
    const userAnswer = elements.submitBtn.dataset.answer;
    const isCorrect = elements.submitBtn.dataset.correct === 'true';

    if (!userAnswer) {
        // Try to get answer from renderer
        const answer = questionRenderer.getCurrentAnswer();
        if (!answer) return;

        const correctAnswer = currentQuestion.correctAnswer;
        const isAnswerCorrect = questionRenderer.compareAnswers(answer, correctAnswer);

        testEngine.processAnswer(currentQuestion.id, answer, isAnswerCorrect);
    } else {
        testEngine.processAnswer(currentQuestion.id, userAnswer, isCorrect);
    }

    // Stop timer
    stopQuestionTimer();

    // Load next question
    setTimeout(() => {
        loadNextQuestion();
    }, 300);
}

/**
 * Update progress indicators
 */
function updateProgress() {
    const questionNum = testEngine.getCurrentQuestionNumber();
    elements.currentQ.textContent = questionNum;

    const percentage = testEngine.getProgressPercentage();
    elements.progressFill.style.width = percentage + '%';

    // Update difficulty indicator
    updateDifficultyIndicator(testEngine.currentDifficulty);
}

/**
 * Update difficulty indicator
 * Now supports 30 levels (1-30) displayed as 10 dots
 */
function updateDifficultyIndicator(difficulty) {
    // Map 30 levels to 10 dots (each dot represents 3 levels)
    const normalizedDifficulty = Math.ceil(difficulty / 3);
    const filled = '●'.repeat(Math.max(0, Math.min(10, normalizedDifficulty)));
    const empty = '○'.repeat(Math.max(0, 10 - normalizedDifficulty));
    elements.diffLevel.textContent = filled + empty;
    elements.diffNumber.textContent = difficulty;
}

/**
 * Start question timer
 */
function startQuestionTimer() {
    let seconds = 0;

    timerInterval = setInterval(() => {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        elements.timer.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
}

/**
 * Stop question timer
 */
function stopQuestionTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

/**
 * Toggle calculator visibility
 */
function toggleCalculator(show) {
    if (typeof simpleCalculator === 'undefined' || !simpleCalculator) {
        // Calculator not yet initialized, wait a bit
        setTimeout(() => toggleCalculator(show), 100);
        return;
    }

    if (show) {
        simpleCalculator.show();
    } else {
        simpleCalculator.hide();
    }
}

/**
 * Finish test and show results
 */
async function finishTest() {
    // Stop any running timers
    stopQuestionTimer();

    // Show loading overlay
    showLoading('Generating your personalized analysis...');

    try {
        // Get test summary
        const summary = testEngine.getTestSummary();
        const topicPerformance = testEngine.getTopicPerformance();

        // Prepare data for Claude API
        const testData = {
            questions: testEngine.questions,
            responses: testEngine.responses,
            questionTimes: testEngine.questionTimes,
            summary: summary,
            topicPerformance: topicPerformance
        };

        // Get AI analysis
        let claudeAnalysis = '';
        if (apiHandler.isConfigured()) {
            try {
                claudeAnalysis = await apiHandler.getAnalysis(testData);
            } catch (error) {
                console.error('Claude API error:', error);
                claudeAnalysis = apiHandler.getFallbackAnalysis(testData);
            }
        } else {
            claudeAnalysis = apiHandler.getFallbackAnalysis(testData);
        }

        // Save results to localStorage
        const results = {
            ...testData,
            claudeAnalysis: claudeAnalysis,
            timestamp: Date.now()
        };

        localStorage.setItem('adaptive_test_results', JSON.stringify(results));

        // Save to Firebase if logged in
        await saveToFirebase(results);

        // Clear test progress
        testEngine.clearProgress();

        // Redirect to results page
        window.location.href = 'results.html';

    } catch (error) {
        console.error('Error finishing test:', error);
        hideLoading();
        alert('There was an error processing your results. Please try again.');
    }
}

/**
 * Save results to Firebase (if logged in)
 */
async function saveToFirebase(results) {
    // Check if Firebase is available and user is logged in
    if (typeof firebase === 'undefined' || !firebase.auth) return;

    try {
        const user = firebase.auth().currentUser;
        if (!user) return;

        const testId = Date.now().toString();
        await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('adaptive-tests')
            .doc(testId)
            .set({
                ...results.summary,
                topicPerformance: results.topicPerformance,
                claudeAnalysis: results.claudeAnalysis,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                questionsCount: results.questions.length
            });

        console.log('Results saved to Firebase');
    } catch (error) {
        console.error('Error saving to Firebase:', error);
    }
}

/**
 * Show loading overlay
 */
function showLoading(message = 'Loading...') {
    if (elements.loadingOverlay) {
        elements.loadingMessage.textContent = message;
        elements.loadingOverlay.style.display = 'flex';
    }
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.style.display = 'none';
    }
}

/**
 * Format topic name for display
 */
function formatTopicName(topic) {
    const names = {
        'arithmetic': 'Arithmetic',
        'fractions': 'Fractions',
        'linear-equations': 'Linear Equations',
        'quadratic-equations': 'Quadratic Equations',
        'geometry': 'Geometry',
        'word-problems': 'Word Problems',
        'algebraic-expressions': 'Algebra',
        'ratios-proportions': 'Ratios & Proportions',
        'statistics-probability': 'Statistics & Probability'
    };
    return names[topic] || topic;
}

/**
 * Initialize auth display
 */
function initAuthDisplay() {
    const authStatus = document.getElementById('auth-status');
    if (!authStatus) return;

    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                authStatus.innerHTML = `
                    <span style="color: var(--accent); font-family: 'JetBrains Mono', monospace; font-size: 0.9rem;">
                        ${user.email}
                    </span>
                `;
            } else {
                authStatus.innerHTML = `
                    <a href="../student-login/" style="color: var(--accent); text-decoration: none; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem;">
                        Login
                    </a>
                `;
            }
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
