/**
 * Main Orchestration Script
 * Coordinates test flow, UI updates, and user interactions
 * Now supports multi-subject testing with token economy
 */

// Global instances
let testEngine = null;
let questionBank = null;
let questionRenderer = null;
let apiHandler = null;
let currentQuestion = null;
let timerInterval = null;
let questionStartTime = 0;
let currentSubject = null; // NEW: Track current subject (math/science/english)
// Calculator is initialized in simple-calculator.js
// TokenManager is initialized in firebase-auth.js (global: tokenManager)
// TestStateManager is initialized here (global: testStateManager - declared in test-state-manager.js)

// DOM Elements
const elements = {
    subjectSelectionModal: null,
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
    savedQuestion: null,
    tokenInfoModal: null,
    tokenInfoBtn: null,
    tokenModalClose: null
};

/**
 * Initialize the application
 */
function init() {
    // Get DOM elements
    elements.subjectSelectionModal = document.getElementById('subject-selection-modal');
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
    elements.tokenInfoModal = document.getElementById('token-info-modal');
    elements.tokenInfoBtn = document.getElementById('token-info-btn');
    elements.tokenModalClose = document.getElementById('token-modal-close');

    // Initialize instances
    questionRenderer = new QuestionRenderer('question-content', 'question-visual');
    apiHandler = new ClaudeAPIHandler();

    // Setup event listeners
    setupEventListeners();

    // Initialize auth display (if available)
    initAuthDisplay();

    // Show subject selection modal (first screen)
    showSubjectSelection();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Subject selection cards
    const subjectCards = document.querySelectorAll('.subject-card.available');
    subjectCards.forEach(card => {
        card.addEventListener('click', () => handleSubjectSelection(card.dataset.subject));
    });

    // Token info button
    if (elements.tokenInfoBtn) {
        elements.tokenInfoBtn.addEventListener('click', showTokenInfo);
    }

    // Token modal close button
    if (elements.tokenModalClose) {
        elements.tokenModalClose.addEventListener('click', hideTokenInfo);
    }

    // Welcome modal buttons (will be set up when subject is selected)
    document.getElementById('start-test-btn')?.addEventListener('click', startNewTest);
    document.getElementById('resume-test-btn')?.addEventListener('click', resumeTest);
    document.getElementById('new-test-btn')?.addEventListener('click', startNewTest);

    // Submit answer button
    elements.submitBtn?.addEventListener('click', submitAnswer);
}

/**
 * Show subject selection modal
 */
async function showSubjectSelection() {
    if (elements.subjectSelectionModal) {
        elements.subjectSelectionModal.classList.add('active');
    }

    // Load and display any active tests
    await checkForActiveTests();
}

/**
 * Check for and display active tests
 */
async function checkForActiveTests() {
    const activeTestsSection = document.getElementById('active-tests-section');
    const activeTestsList = document.getElementById('active-tests-list');

    if (!activeTestsSection || !activeTestsList) {
        console.log('Active tests UI elements not found');
        return;
    }

    // Initialize TestStateManager if needed
    if (!testStateManager) {
        testStateManager = new TestStateManager();
    }

    // Load all active tests
    const activeTests = await testStateManager.loadAllTests();

    // Hide section if no active tests
    if (activeTests.size === 0) {
        activeTestsSection.style.display = 'none';
        return;
    }

    // Show section and populate with active test cards
    activeTestsSection.style.display = 'block';
    activeTestsList.innerHTML = '';

    activeTests.forEach((testState, subject) => {
        const displayInfo = testStateManager.getTestDisplayInfo(subject);
        if (displayInfo) {
            const card = createActiveTestCard(displayInfo);
            activeTestsList.appendChild(card);
        }
    });
}

/**
 * Create active test card element
 */
function createActiveTestCard(info) {
    const card = document.createElement('div');
    card.className = 'active-test-card';
    card.dataset.subject = info.subject;

    card.innerHTML = `
        <div class="test-icon">${info.icon}</div>
        <div class="test-info">
            <h4>${info.subjectName}</h4>
            <p class="progress-text">${info.progressText}</p>
            <span class="test-time">${info.timeSince}</span>
        </div>
        <button class="btn btn-resume" data-subject="${info.subject}">Resume</button>
    `;

    // Add click handler for resume button
    const resumeBtn = card.querySelector('.btn-resume');
    resumeBtn.addEventListener('click', () => resumeActiveTest(info.subject));

    return card;
}

/**
 * Resume an active test
 */
function resumeActiveTest(subject) {
    currentSubject = subject;
    hideAllModals();
    elements.testContainer.style.display = 'block';

    // Initialize test engine with saved state
    const subjectConfig = SUBJECT_CONFIG[subject];
    testEngine = new AdaptiveTestEngine({
        totalQuestions: subjectConfig.questionCount.target,
        minQuestions: subjectConfig.questionCount.min,
        maxQuestions: subjectConfig.questionCount.max
    }, subject);

    // Restore progress
    if (testEngine.restoreProgress()) {
        console.log(`Resumed ${subject} test at question ${testEngine.currentQuestion + 1}`);
        questionBank = getQuestionBankForSubject(subject);
        loadNextQuestion();
    } else {
        console.error('Failed to restore test progress');
        alert('Could not resume test. Starting fresh.');
        startNewTest();
    }
}

/**
 * Handle subject card click
 */
async function handleSubjectSelection(subjectId) {
    currentSubject = subjectId;
    const subjectConfig = SUBJECT_CONFIG[subjectId];

    if (!subjectConfig || !subjectConfig.available) {
        alert('This subject is coming soon!');
        return;
    }

    // Check if TokenManager is initialized
    if (typeof tokenManager === 'undefined' || !tokenManager || !tokenManager.isInitialized()) {
        // User not logged in or TokenManager not ready
        alert('Please log in to take adaptive tests.');
        window.location.href = '../student-login/';
        return;
    }

    // Check if user has enough tokens
    if (!tokenManager.canAfford(subjectConfig.tokenCost)) {
        showInsufficientTokensModal(subjectConfig.tokenCost);
        return;
    }

    // Check for existing test for this subject
    const savedProgress = localStorage.getItem(`adaptive_test_progress_${subjectId}`);

    if (savedProgress) {
        // Show resume option
        const testState = JSON.parse(savedProgress);
        showResumeTestModal(subjectId, testState);
    } else {
        // Show welcome modal for new test
        showWelcomeModal(subjectId);
    }
}

/**
 * Show welcome modal for selected subject
 */
function showWelcomeModal(subjectId) {
    const subjectConfig = SUBJECT_CONFIG[subjectId];

    // Hide subject selection, show welcome modal
    elements.subjectSelectionModal.classList.remove('active');
    elements.welcomeModal.classList.add('active');

    // Update welcome modal content for this subject
    elements.welcomeModal.innerHTML = `
        <div class="modal-content welcome-content">
            <div class="welcome-header">
                <h1>${subjectConfig.icon} Adaptive ${subjectConfig.name} Test</h1>
                <p class="subtitle">Discover your ${subjectConfig.name.toLowerCase()} skill level with an intelligent assessment</p>
            </div>

            <div class="welcome-body">
                <div class="feature-grid">
                    <div class="feature">
                        <div class="feature-icon">🎯</div>
                        <h3>Adaptive Difficulty</h3>
                        <p>Questions adjust to your skill level in real-time</p>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">📈</div>
                        <h3>RIT Score</h3>
                        <p>Get a score similar to NWEA MAP testing (140-300)</p>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">🤖</div>
                        <h3>AI Feedback</h3>
                        <p>Personalized analysis powered by Claude AI</p>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">💾</div>
                        <h3>Auto-Save</h3>
                        <p>Progress saved automatically - resume anytime</p>
                    </div>
                </div>

                <div class="test-info">
                    <h3>What to Expect:</h3>
                    <ul>
                        <li><strong>~${subjectConfig.questionCount.target} questions</strong> across various ${subjectConfig.name.toLowerCase()} topics</li>
                        <li>Starts at <strong>medium difficulty</strong>, adjusts based on your answers</li>
                        <li>Mix of <strong>multiple choice, text input, and visual</strong> questions</li>
                        <li>Calculator provided when needed</li>
                        <li>Takes approximately <strong>15-30 minutes</strong></li>
                        <li>Costs <strong>${subjectConfig.tokenCost} token</strong> to start</li>
                    </ul>
                </div>

                <div class="welcome-actions">
                    <button id="start-test-btn" class="btn btn-large btn-primary">
                        Start Test (${subjectConfig.tokenCost} 🪙)
                    </button>
                    <button id="back-to-subjects-btn" class="btn btn-secondary">
                        ← Back to Subjects
                    </button>
                </div>
            </div>
        </div>
    `;

    // Re-attach event listeners
    document.getElementById('start-test-btn').addEventListener('click', startNewTest);
    document.getElementById('back-to-subjects-btn').addEventListener('click', () => {
        elements.welcomeModal.classList.remove('active');
        elements.subjectSelectionModal.classList.add('active');
    });
}

/**
 * Show resume test modal
 */
function showResumeTestModal(subjectId, testState) {
    const subjectConfig = SUBJECT_CONFIG[subjectId];
    const questionNum = testState.currentQuestion + 1;

    // Hide subject selection, show welcome modal with resume option
    elements.subjectSelectionModal.classList.remove('active');
    elements.welcomeModal.classList.add('active');

    elements.welcomeModal.innerHTML = `
        <div class="modal-content welcome-content">
            <div class="welcome-header">
                <h1>${subjectConfig.icon} Resume ${subjectConfig.name} Test</h1>
                <p class="subtitle">You have a test in progress</p>
            </div>

            <div class="welcome-body">
                <div class="saved-test-notice" style="display: flex;">
                    <div class="notice-icon">💾</div>
                    <div class="notice-content">
                        <strong>Test in Progress</strong>
                        <p>Question ${questionNum} of ~${subjectConfig.questionCount.target}</p>
                    </div>
                </div>

                <div class="welcome-actions">
                    <button id="resume-test-btn" class="btn btn-large btn-primary">
                        Resume Test
                    </button>
                    <button id="new-test-btn" class="btn btn-secondary">
                        Start Fresh (${subjectConfig.tokenCost} 🪙)
                    </button>
                    <button id="back-to-subjects-btn" class="btn btn-secondary">
                        ← Back to Subjects
                    </button>
                </div>
            </div>
        </div>
    `;

    // Re-attach event listeners
    document.getElementById('resume-test-btn').addEventListener('click', resumeTest);
    document.getElementById('new-test-btn').addEventListener('click', startNewTest);
    document.getElementById('back-to-subjects-btn').addEventListener('click', () => {
        elements.welcomeModal.classList.remove('active');
        elements.subjectSelectionModal.classList.add('active');
    });
}

/**
 * Show insufficient tokens modal
 */
function showInsufficientTokensModal(required) {
    const currentBalance = tokenManager.getBalance();
    const { hours, minutes } = tokenManager.getTimeUntilRefill();

    alert(`Insufficient Tokens\n\nYou need ${required} token(s) but only have ${currentBalance}.\n\nNext refill in ${hours}h ${minutes}m at 12pm ET.`);

    // Show token info modal for more details
    showTokenInfo();
}

/**
 * Show token info modal
 */
function showTokenInfo() {
    if (!elements.tokenInfoModal) return;

    // Update token info with current data
    if (tokenManager && tokenManager.isInitialized()) {
        const balance = tokenManager.getBalance();
        const max = tokenManager.getMax();
        const { hours, minutes } = tokenManager.getTimeUntilRefill();

        document.getElementById('token-balance-display').textContent = balance;
        document.getElementById('next-refill-time').textContent =
            `${hours}h ${minutes}m (12pm ET)`;
    }

    elements.tokenInfoModal.classList.add('active');
}

/**
 * Hide token info modal
 */
function hideTokenInfo() {
    if (elements.tokenInfoModal) {
        elements.tokenInfoModal.classList.remove('active');
    }
}

/**
 * Hide all modals
 */
function hideAllModals() {
    if (elements.subjectSelectionModal) {
        elements.subjectSelectionModal.classList.remove('active');
    }
    if (elements.welcomeModal) {
        elements.welcomeModal.classList.remove('active');
    }
    if (elements.tokenInfoModal) {
        elements.tokenInfoModal.classList.remove('active');
    }
}

/**
 * Start new test
 */
async function startNewTest() {
    if (!currentSubject) {
        console.error('No subject selected');
        return;
    }

    const subjectConfig = SUBJECT_CONFIG[currentSubject];

    // Spend tokens
    const success = await tokenManager.spendTokens(subjectConfig.tokenCost, `Start ${currentSubject} test`);
    if (!success) {
        alert('Failed to spend tokens. Please try again.');
        return;
    }

    // Clear any saved progress for this subject
    localStorage.removeItem(`adaptive_test_progress_${currentSubject}`);

    // Initialize test engine with subject configuration
    testEngine = new AdaptiveTestEngine({
        totalQuestions: subjectConfig.questionCount.target,
        minQuestions: subjectConfig.questionCount.min,
        maxQuestions: subjectConfig.questionCount.max
    }, currentSubject);

    // Initialize question bank for this subject
    questionBank = getQuestionBankForSubject(currentSubject);

    // Hide welcome modal, show test
    elements.welcomeModal.classList.remove('active');
    elements.testContainer.style.display = 'block';

    // Start test
    testEngine.start();
    elements.totalQ.textContent = '~' + subjectConfig.questionCount.target;

    // Load first question
    loadNextQuestion();
}

/**
 * Resume existing test
 */
function resumeTest() {
    if (!currentSubject) {
        console.error('No subject selected');
        return;
    }

    const subjectConfig = SUBJECT_CONFIG[currentSubject];

    // Initialize test engine and restore progress
    testEngine = new AdaptiveTestEngine({
        totalQuestions: subjectConfig.questionCount.target,
        minQuestions: subjectConfig.questionCount.min,
        maxQuestions: subjectConfig.questionCount.max
    }, currentSubject);

    if (!testEngine.restoreProgress()) {
        alert('Failed to restore test progress.');
        return;
    }

    // Initialize question bank for this subject
    questionBank = getQuestionBankForSubject(currentSubject);

    // Hide welcome modal, show test
    elements.welcomeModal.classList.remove('active');
    elements.testContainer.style.display = 'block';

    elements.totalQ.textContent = '~' + subjectConfig.questionCount.target;

    // Load current question
    loadNextQuestion();
}

/**
 * Get question bank for subject
 */
function getQuestionBankForSubject(subject) {
    switch(subject) {
        case 'math':
            return new QuestionBank();
        case 'science':
            // TODO: Implement in Sprint 6
            console.warn('Science question bank not yet implemented');
            return new QuestionBank(); // Fallback to math for now
        case 'english':
            // TODO: Implement in Sprint 6
            console.warn('English question bank not yet implemented');
            return new QuestionBank(); // Fallback to math for now
        default:
            return new QuestionBank();
    }
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
            subject: currentSubject, // NEW: Include subject
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

        // Clear test progress for this subject
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
                subject: results.subject, // NEW: Store subject
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
        'statistics-probability': 'Statistics & Probability',
        'polynomials': 'Polynomials',
        'systems-equations': 'Systems of Equations',
        'radicals-exponents': 'Radicals & Exponents',
        'sequences-series': 'Sequences & Series',
        'functions': 'Functions',
        'exponential-logarithms': 'Exponential & Logarithms',
        'trigonometry': 'Trigonometry',
        'limits-derivatives': 'Limits & Derivatives'
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

/**
 * Callback when user authenticates (called from firebase-auth.js)
 */
window.onUserAuthenticated = async function(user) {
    console.log('User authenticated in adaptive test:', user.email);
    // TokenManager is already initialized in firebase-auth.js

    // Initialize TestStateManager
    if (!testStateManager) {
        testStateManager = new TestStateManager();
    }
    await testStateManager.initialize(user.uid);

    // Load from Firebase to sync across devices
    await testStateManager.loadFromFirebase();

    // Refresh the subject selection view if needed
    if (elements.subjectSelectionModal && elements.subjectSelectionModal.classList.contains('active')) {
        await checkForActiveTests();
        console.log('User logged in, token and test state systems ready');
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
