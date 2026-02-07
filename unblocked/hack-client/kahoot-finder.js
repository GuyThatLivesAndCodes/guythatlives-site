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
    statusEl.textContent = message;
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

    try {
        // Method 1: Try cloudflared endpoint (if you have it configured)
        const cloudflaredUrl = 'http://localhost:8080'; // Replace with your actual cloudflared URL
        let quizData = null;

        try {
            const cloudflaredResponse = await fetch(`${cloudflaredUrl}/api/kahoot/${gamePin}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (cloudflaredResponse.ok) {
                quizData = await cloudflaredResponse.json();
            }
        } catch (cloudflaredError) {
            console.log('Cloudflared endpoint not available, trying alternative method');
        }

        // Method 2: Try direct Kahoot API (this is a simplified approach)
        // Note: This may not work due to CORS and Kahoot's API protection
        if (!quizData) {
            try {
                // First, check if the game exists
                const checkResponse = await fetch(`https://kahoot.it/rest/kahoots/${gamePin}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (checkResponse.ok) {
                    quizData = await checkResponse.json();
                }
            } catch (apiError) {
                console.error('Direct API error:', apiError);
            }
        }

        // Method 3: Use a CORS proxy (educational purposes only)
        if (!quizData) {
            showStatus('Setting up alternative connection method...', 'info');

            // This is a placeholder - you would need to implement your own proxy
            // or use your cloudflared setup
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const targetUrl = `https://create.kahoot.it/rest/kahoots/${gamePin}`;

            try {
                const proxyResponse = await fetch(proxyUrl + encodeURIComponent(targetUrl));
                if (proxyResponse.ok) {
                    quizData = await proxyResponse.json();
                }
            } catch (proxyError) {
                console.error('Proxy error:', proxyError);
            }
        }

        if (quizData && quizData.questions) {
            displayResults(quizData);
            showStatus('Answers found successfully!', 'success');
        } else {
            // Display demo data for testing purposes
            showDemoResults(gamePin);
            showStatus('Connected to demo mode. Configure your cloudflared endpoint for live data.', 'info');
        }
    } catch (error) {
        console.error('Error finding answers:', error);
        showStatus(`Error: ${error.message}. Make sure your cloudflared endpoint is running.`, 'error');
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
