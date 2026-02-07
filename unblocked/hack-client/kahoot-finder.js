// Kahoot Answer Finder Script

let tosAccepted = false;

function openKahootTool() {
    const modal = document.getElementById('kahoot-modal');
    modal.classList.add('active');

    // Reset TOS acceptance for each session
    tosAccepted = false;
    document.getElementById('tos-warning').style.display = 'block';
    document.getElementById('tool-interface').style.display = 'none';
}

function closeKahootModal() {
    const modal = document.getElementById('kahoot-modal');
    modal.classList.remove('active');

    // Clear results
    document.getElementById('results-container').style.display = 'none';
    document.getElementById('game-pin').value = '';
    document.getElementById('status-message').style.display = 'none';
    document.getElementById('status-message').className = 'status-message';
}

function acceptTOS() {
    tosAccepted = true;
    document.getElementById('tos-warning').style.display = 'none';
    document.getElementById('tool-interface').style.display = 'block';
}

function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status-message');
    // Use innerHTML to support HTML formatting in messages
    statusEl.innerHTML = message;
    statusEl.className = `status-message ${type}`;
    statusEl.style.display = 'block';
}

function hideStatus() {
    document.getElementById('status-message').style.display = 'none';
}

async function findAnswers() {
    if (!tosAccepted) {
        showStatus('Please accept the TOS first', 'error');
        return;
    }

    const gamePin = document.getElementById('game-pin').value.trim();

    if (!gamePin) {
        showStatus('Please enter a game PIN', 'error');
        return;
    }

    if (!/^\d{4,8}$/.test(gamePin)) {
        showStatus('Invalid game PIN format. Please enter 4-8 digits.', 'error');
        return;
    }

    // Hide previous results
    document.getElementById('results-container').style.display = 'none';
    showStatus('Searching for answers...', 'info');

    let quizData = null;
    const attemptedMethods = [];

    // Method 1: Try cloudflared endpoint (if you have it configured)
    const cloudflaredUrl = 'http://localhost:8080'; // Replace with your actual cloudflared URL

    try {
        showStatus('Attempting cloudflared proxy...', 'info');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const cloudflaredResponse = await fetch(`${cloudflaredUrl}/api/kahoot/${gamePin}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (cloudflaredResponse.ok) {
            const data = await cloudflaredResponse.json();
            if (data && data.questions) {
                quizData = data;
                attemptedMethods.push('✓ Cloudflared proxy');
            }
        }
    } catch (cloudflaredError) {
        attemptedMethods.push('✗ Cloudflared proxy (not running)');
        console.log('Cloudflared endpoint not available:', cloudflaredError.message);
    }

    // Method 2: Try CORS proxy with proper error handling
    if (!quizData) {
        try {
            showStatus('Trying alternative proxy method...', 'info');

            // Try with allorigins.win which returns JSON with contents field
            const proxyUrl = 'https://api.allorigins.win/get?url=';
            const targetUrl = `https://create.kahoot.it/rest/kahoots/${gamePin}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const proxyResponse = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (proxyResponse.ok) {
                const proxyData = await proxyResponse.json();
                if (proxyData.contents) {
                    try {
                        const parsedData = JSON.parse(proxyData.contents);
                        if (parsedData && parsedData.questions) {
                            quizData = parsedData;
                            attemptedMethods.push('✓ CORS proxy');
                        }
                    } catch (parseError) {
                        console.log('Failed to parse proxy response:', parseError);
                        attemptedMethods.push('✗ CORS proxy (invalid response)');
                    }
                } else {
                    attemptedMethods.push('✗ CORS proxy (no data)');
                }
            } else {
                attemptedMethods.push('✗ CORS proxy (request failed)');
            }
        } catch (proxyError) {
            attemptedMethods.push('✗ CORS proxy (timeout/error)');
            console.log('CORS proxy error:', proxyError.message);
        }
    }

    // Display results or fall back to demo mode
    if (quizData && quizData.questions) {
        displayResults(quizData);
        showStatus('✓ Answers found successfully!', 'success');
        console.log('Methods attempted:', attemptedMethods.join(', '));
    } else {
        // Display demo data with helpful message
        showDemoResults(gamePin);
        showStatus(
            `<strong>⚠️ Demo Mode Active</strong><br>` +
            `Real Kahoot data is unavailable because the proxy server is not configured. ` +
            `To get actual quiz answers, you need to set up the cloudflared proxy server.<br><br>` +
            `<strong>Quick Setup:</strong> Run <code>npm install && npm start</code> in the hack-client folder, ` +
            `then run <code>cloudflared tunnel --url http://localhost:8080</code><br>` +
            `See <a href="SETUP.md" target="_blank" style="color: #667eea; text-decoration: underline;">SETUP.md</a> for full instructions.`,
            'info'
        );
        console.log('All methods failed. Attempted:', attemptedMethods);
    }
}

function displayResults(quizData) {
    const resultsContainer = document.getElementById('results-container');
    const quizInfo = document.getElementById('quiz-info');
    const questionsList = document.getElementById('questions-list');

    // Display quiz info
    quizInfo.innerHTML = `
        <div class="quiz-info-item">
            <span class="quiz-info-label">Quiz Title:</span>
            <span class="quiz-info-value">${quizData.title || 'Unknown'}</span>
        </div>
        <div class="quiz-info-item">
            <span class="quiz-info-label">Number of Questions:</span>
            <span class="quiz-info-value">${quizData.questions?.length || 0}</span>
        </div>
        <div class="quiz-info-item">
            <span class="quiz-info-label">Creator:</span>
            <span class="quiz-info-value">${quizData.creator_username || 'Unknown'}</span>
        </div>
    `;

    // Display questions
    questionsList.innerHTML = '';
    quizData.questions.forEach((question, index) => {
        const questionCard = createQuestionCard(question, index + 1);
        questionsList.appendChild(questionCard);
    });

    resultsContainer.style.display = 'block';
}

function createQuestionCard(question, number) {
    const card = document.createElement('div');
    card.className = 'question-card';

    const questionText = question.question || question.text || 'Unknown question';
    const choices = question.choices || [];

    let answersHtml = '<div class="answers-list">';
    choices.forEach((choice, index) => {
        const isCorrect = choice.correct || false;
        const answerClass = isCorrect ? 'answer-option correct' : 'answer-option';
        const answerText = choice.answer || choice.text || `Option ${index + 1}`;
        answersHtml += `<div class="${answerClass}">${answerText}</div>`;
    });
    answersHtml += '</div>';

    card.innerHTML = `
        <div class="question-number">Question ${number}</div>
        <div class="question-text">${questionText}</div>
        ${answersHtml}
    `;

    return card;
}

function showDemoResults(gamePin) {
    // Demo data for when the actual API is not available
    const demoData = {
        title: `Demo Quiz (PIN: ${gamePin})`,
        creator_username: 'Demo User',
        questions: [
            {
                question: 'What is 2 + 2?',
                choices: [
                    { answer: '3', correct: false },
                    { answer: '4', correct: true },
                    { answer: '5', correct: false },
                    { answer: '6', correct: false }
                ]
            },
            {
                question: 'What color is the sky?',
                choices: [
                    { answer: 'Red', correct: false },
                    { answer: 'Blue', correct: true },
                    { answer: 'Green', correct: false },
                    { answer: 'Yellow', correct: false }
                ]
            },
            {
                question: 'How many days are in a week?',
                choices: [
                    { answer: '5', correct: false },
                    { answer: '6', correct: false },
                    { answer: '7', correct: true },
                    { answer: '8', correct: false }
                ]
            }
        ]
    };

    displayResults(demoData);
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('kahoot-modal');
    if (e.target === modal) {
        closeKahootModal();
    }
});

// Allow Enter key to submit
document.addEventListener('DOMContentLoaded', () => {
    const gamePinInput = document.getElementById('game-pin');
    if (gamePinInput) {
        gamePinInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                findAnswers();
            }
        });
    }
});
