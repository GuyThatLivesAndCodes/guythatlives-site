/**
 * ClaudeAPIHandler - Handles Claude API integration for test analysis
 * Generates personalized feedback based on student performance
 */

// TODO: Replace with actual API key
const CLAUDE_API_KEY = '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';

class ClaudeAPIHandler {
    constructor(apiKey = CLAUDE_API_KEY) {
        this.apiKey = apiKey;
        this.endpoint = 'https://api.anthropic.com/v1/messages';
        this.model = 'claude-sonnet-4-5-20250429';
    }

    /**
     * Get comprehensive analysis of test performance
     */
    async getAnalysis(testData) {
        const prompt = this.generateAnalysisPrompt(testData);

        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 4000,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API error ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            return data.content[0].text;

        } catch (error) {
            console.error('Claude API error:', error);
            throw error;
        }
    }

    /**
     * Generate comprehensive analysis prompt for Claude
     */
    generateAnalysisPrompt(testData) {
        const {
            questions,
            responses,
            questionTimes,
            summary,
            topicPerformance
        } = testData;

        // Format difficulty progression
        const diffProgression = responses.map(r => r.difficulty).join(', ');

        // Format topic performance
        const topicPerf = Object.keys(topicPerformance).map(topic => {
            const stats = topicPerformance[topic];
            const status = parseInt(stats.accuracy) >= 70 ? 'Strong' :
                          parseInt(stats.accuracy) >= 50 ? 'Developing' : 'Needs Work';
            return `- ${this.formatTopicName(topic)} (${stats.correct}/${stats.total} correct, ${stats.accuracy}%): ${status}`;
        }).join('\n');

        // Format incorrect answers only
        const incorrectQuestions = [];
        responses.forEach((response, index) => {
            if (!response.isCorrect) {
                const question = questions[index];
                incorrectQuestions.push(`
Question ${index + 1} (Difficulty ${response.difficulty}, ${this.formatTopicName(question.topic)}):
Q: ${question.text}${question.latex ? ' ' + question.latex : ''}
Student answer: ${response.userAnswer}
Correct answer: ${question.correctAnswer}
Time: ${response.timeTaken} seconds
                `.trim());
            }
        });

        const prompt = `Analyze this student's adaptive math test performance. The test started at difficulty level 5 and adapted based on their responses.

Test Summary:
- Questions answered: ${summary.questionsAnswered}/${summary.totalQuestions}
- Final estimated ability level: ${summary.finalAbility}/10
- Estimated RIT score: ${summary.ritScore}
- Overall accuracy: ${summary.accuracy}%
- Average time per question: ${summary.avgTimePerQuestion} seconds
- Difficulty progression: [${diffProgression}]

Performance by topic:
${topicPerf}

Question-by-question results (INCORRECT ANSWERS ONLY):
${incorrectQuestions.length > 0 ? incorrectQuestions.join('\n\n') : 'All answers were correct!'}

Please provide:
1. Overall performance summary with grade-level estimate (e.g., "performing at 8th grade level")
2. For each INCORRECT answer above, identify the most likely mathematical misconception or error pattern
3. Topic-based analysis: specific strengths (what they're doing well) and areas for growth
4. Specific, actionable recommendations for improvement (what to study next, which topics to practice)
5. Encouraging feedback acknowledging their effort and adaptive performance

Use an encouraging, educational tone suitable for middle/high school students. Be specific and constructive. Format your response with clear sections and bullet points for readability.`;

        return prompt;
    }

    /**
     * Calculate topic statistics from test data
     */
    calculateTopicStats(questions, responses) {
        const topicStats = {};

        questions.forEach((question, index) => {
            const topic = question.topic;
            const response = responses[index];

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
     * Format topic name for display
     */
    formatTopicName(topic) {
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

    /**
     * Calculate accuracy percentage
     */
    calculateAccuracy(responses) {
        const correct = responses.filter(r => r.isCorrect).length;
        return ((correct / responses.length) * 100).toFixed(1);
    }

    /**
     * Calculate average time
     */
    calculateAvgTime(times) {
        const sum = times.reduce((a, b) => a + b, 0);
        return (sum / times.length).toFixed(1);
    }

    /**
     * Check if API key is configured
     */
    isConfigured() {
        return this.apiKey && this.apiKey !== 'YOUR_CLAUDE_API_KEY_HERE';
    }

    /**
     * Get fallback analysis if API is not configured
     */
    getFallbackAnalysis(testData) {
        const { summary, topicPerformance } = testData;

        let gradeLevel = 'middle school';
        if (summary.ritScore >= 260) gradeLevel = 'high school (advanced)';
        else if (summary.ritScore >= 240) gradeLevel = '9th-10th grade';
        else if (summary.ritScore >= 220) gradeLevel = '7th-8th grade';
        else if (summary.ritScore >= 200) gradeLevel = '6th-7th grade';
        else gradeLevel = '5th-6th grade';

        return `
## Overall Performance

Great effort on completing this adaptive math test! Based on your performance, you're performing at approximately a **${gradeLevel}** level.

**RIT Score:** ${summary.ritScore}
**Overall Accuracy:** ${summary.accuracy}%
**Final Difficulty Level:** ${summary.finalDifficulty}/10

## Topic Performance

${Object.keys(topicPerformance).map(topic => {
    const stats = topicPerformance[topic];
    const emoji = parseInt(stats.accuracy) >= 70 ? '✅' : parseInt(stats.accuracy) >= 50 ? '⚠️' : '❌';
    return `${emoji} **${this.formatTopicName(topic)}**: ${stats.correct}/${stats.total} correct (${stats.accuracy}%)`;
}).join('\n')}

## Recommendations

${Object.keys(topicPerformance).map(topic => {
    const stats = topicPerformance[topic];
    if (parseInt(stats.accuracy) < 70) {
        return `- Review **${this.formatTopicName(topic)}** - practice more problems at your current level`;
    }
    return null;
}).filter(r => r !== null).join('\n') || '- Keep practicing to maintain your strong performance across all topics!'}

---

*Note: Claude API analysis is not configured. To get detailed, personalized feedback on each question, please configure your Claude API key in the settings.*
        `.trim();
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClaudeAPIHandler;
}
