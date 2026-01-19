/**
 * Results Page Script
 * Displays test results, charts, and AI analysis
 */

// Load and display results when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadResults();
});

/**
 * Load results from localStorage
 */
function loadResults() {
    const resultsData = localStorage.getItem('adaptive_test_results');

    if (!resultsData) {
        // No results found
        document.querySelector('.results-container').innerHTML = `
            <div style="text-align: center; padding: 4rem;">
                <h2>No Test Results Found</h2>
                <p style="margin: 1rem 0; color: var(--text-secondary);">
                    You haven't completed a test yet.
                </p>
                <a href="index.html" class="btn btn-primary">Take the Test</a>
            </div>
        `;
        return;
    }

    const results = JSON.parse(resultsData);

    // Display results
    displayScores(results.summary);
    displayTopicPerformance(results.topicPerformance);
    displayDifficultyChart(results.summary.difficultyProgression);
    displayAIAnalysis(results.claudeAnalysis);
}

/**
 * Display scores and stats
 */
function displayScores(summary) {
    // RIT Score
    document.getElementById('rit-score').textContent = summary.ritScore;

    // Grade Level Estimate
    const gradeLevel = estimateGradeLevel(summary.ritScore);
    document.getElementById('grade-level').textContent = `Estimated Level: ${gradeLevel}`;

    // Stats
    document.getElementById('accuracy').textContent = summary.accuracy + '%';
    document.getElementById('correct-count').textContent = `${summary.correctAnswers}/${summary.totalQuestions}`;
    document.getElementById('final-difficulty').textContent = summary.finalDifficulty + '/10';
    document.getElementById('avg-time').textContent = summary.avgTimePerQuestion;
}

/**
 * Estimate grade level from RIT score
 */
function estimateGradeLevel(ritScore) {
    if (ritScore >= 270) return 'High School (Advanced)';
    if (ritScore >= 260) return 'High School';
    if (ritScore >= 240) return '9th-10th Grade';
    if (ritScore >= 220) return '7th-8th Grade';
    if (ritScore >= 200) return '6th-7th Grade';
    if (ritScore >= 180) return '5th-6th Grade';
    return '4th-5th Grade';
}

/**
 * Display topic performance bars
 */
function displayTopicPerformance(topicPerformance) {
    const container = document.getElementById('topic-list');
    if (!container) return;

    container.innerHTML = '';

    Object.keys(topicPerformance).forEach(topic => {
        const stats = topicPerformance[topic];
        const accuracy = parseInt(stats.accuracy);

        const topicItem = document.createElement('div');
        topicItem.className = 'topic-item';

        topicItem.innerHTML = `
            <div class="topic-name">${formatTopicName(topic)}</div>
            <div class="topic-bar-container">
                <div class="topic-bar" style="width: ${accuracy}%"></div>
            </div>
            <div class="topic-score">${stats.correct}/${stats.total} (${accuracy}%)</div>
        `;

        container.appendChild(topicItem);
    });
}

/**
 * Display difficulty progression chart
 */
function displayDifficultyChart(difficultyProgression) {
    const canvas = document.getElementById('difficulty-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 300;

    // Clear canvas
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface');
    ctx.fillRect(0, 0, width, height);

    const padding = 40;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;

    const maxDifficulty = 10;
    const dataPoints = difficultyProgression.length;

    // Draw grid lines
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border');
    ctx.lineWidth = 1;

    // Horizontal grid lines (difficulty levels)
    for (let i = 0; i <= maxDifficulty; i++) {
        const y = padding + (graphHeight - (i / maxDifficulty) * graphHeight);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();

        // Labels
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted');
        ctx.font = '12px JetBrains Mono';
        ctx.textAlign = 'right';
        ctx.fillText(i.toString(), padding - 10, y + 4);
    }

    // Draw line
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
    ctx.lineWidth = 3;
    ctx.beginPath();

    difficultyProgression.forEach((difficulty, index) => {
        const x = padding + (index / (dataPoints - 1)) * graphWidth;
        const y = padding + (graphHeight - (difficulty / maxDifficulty) * graphHeight);

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    // Draw points
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
    difficultyProgression.forEach((difficulty, index) => {
        const x = padding + (index / (dataPoints - 1)) * graphWidth;
        const y = padding + (graphHeight - (difficulty / maxDifficulty) * graphHeight);

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
    });

    // Draw axes
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
    ctx.lineWidth = 2;

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
    ctx.font = '14px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText('Question Number', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Difficulty Level', 0, 0);
    ctx.restore();
}

/**
 * Display AI analysis
 */
function displayAIAnalysis(analysis) {
    const container = document.getElementById('claude-analysis');
    if (!container) return;

    if (!analysis) {
        container.innerHTML = '<p style="color: var(--text-muted);">No AI analysis available.</p>';
        return;
    }

    // Convert markdown-like formatting to HTML
    let formattedAnalysis = analysis
        .replace(/##\s+(.+)/g, '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.+)/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Wrap in paragraphs if not already
    if (!formattedAnalysis.startsWith('<h3>') && !formattedAnalysis.startsWith('<p>')) {
        formattedAnalysis = '<p>' + formattedAnalysis + '</p>';
    }

    container.innerHTML = formattedAnalysis;
}

/**
 * Format topic name for display
 */
function formatTopicName(topic) {
    const names = {
        'arithmetic': 'Arithmetic',
        'fractions': 'Fractions & Decimals',
        'linear-equations': 'Linear Equations',
        'quadratic-equations': 'Quadratic Equations',
        'geometry': 'Geometry',
        'word-problems': 'Word Problems',
        'algebraic-expressions': 'Algebraic Expressions',
        'ratios-proportions': 'Ratios & Proportions',
        'statistics-probability': 'Statistics & Probability'
    };
    return names[topic] || topic;
}
