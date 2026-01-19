/**
 * QuestionRenderer - Renders questions in different formats
 * Handles multiple choice, text input, drag-and-drop, and visual components
 */

class QuestionRenderer {
    constructor(questionContainerId, visualContainerId) {
        this.questionContainer = document.getElementById(questionContainerId);
        this.visualContainer = document.getElementById(visualContainerId);
        this.currentQuestion = null;
        this.onAnswerSelected = null; // Callback when answer is selected
    }

    /**
     * Render a question based on its type
     */
    renderQuestion(question, onAnswerSelected) {
        this.currentQuestion = question;
        this.onAnswerSelected = onAnswerSelected;

        // Clear previous content
        this.questionContainer.innerHTML = '';
        if (this.visualContainer) {
            this.visualContainer.innerHTML = '';
            this.visualContainer.style.display = 'none';
        }

        // Render question text
        const questionText = document.createElement('div');
        questionText.className = 'question-text';
        questionText.innerHTML = question.text;

        // Render LaTeX if present
        if (question.latex) {
            const latexDiv = document.createElement('div');
            latexDiv.className = 'question-latex';
            this.questionContainer.appendChild(questionText);
            this.questionContainer.appendChild(latexDiv);

            // Render with KaTeX
            if (typeof katex !== 'undefined') {
                try {
                    katex.render(question.latex, latexDiv, {
                        displayMode: true,
                        throwOnError: false
                    });
                } catch (e) {
                    latexDiv.textContent = question.latex;
                }
            } else {
                latexDiv.textContent = question.latex;
            }
        } else {
            this.questionContainer.appendChild(questionText);
        }

        // Render visual if present
        if (question.hasVisual && question.visualData) {
            this.renderVisual(question.visualData);
        }

        // Render answer input based on question type
        const answerArea = document.createElement('div');
        answerArea.id = 'answer-area';
        answerArea.className = 'answer-area';

        switch (question.type) {
            case 'multiple-choice':
                this.renderMultipleChoice(answerArea, question);
                break;
            case 'text-input':
                this.renderTextInput(answerArea, question);
                break;
            case 'drag-drop':
                this.renderDragDrop(answerArea, question);
                break;
        }

        this.questionContainer.appendChild(answerArea);
    }

    /**
     * Render multiple choice question
     */
    renderMultipleChoice(container, question) {
        const choices = shuffle([
            { value: question.correctAnswer, isCorrect: true },
            ...question.wrongAnswers.map(w => ({ value: w.value, isCorrect: false }))
        ]);

        choices.forEach((choice, index) => {
            const choiceDiv = document.createElement('div');
            choiceDiv.className = 'answer-choice';
            choiceDiv.dataset.value = choice.value;
            choiceDiv.dataset.correct = choice.isCorrect;

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'answer';
            radio.id = `choice-${index}`;
            radio.value = choice.value;

            const label = document.createElement('label');
            label.htmlFor = `choice-${index}`;
            label.textContent = choice.value;

            choiceDiv.appendChild(radio);
            choiceDiv.appendChild(label);

            // Click handler for the entire div
            choiceDiv.addEventListener('click', (e) => {
                // Remove previous selection
                container.querySelectorAll('.answer-choice').forEach(c => {
                    c.classList.remove('selected');
                    c.querySelector('input').checked = false;
                });

                // Select this choice
                choiceDiv.classList.add('selected');
                radio.checked = true;

                // Notify selection
                if (this.onAnswerSelected) {
                    this.onAnswerSelected(choice.value, choice.isCorrect);
                }
            });

            container.appendChild(choiceDiv);
        });
    }

    /**
     * Render text input question
     */
    renderTextInput(container, question) {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'text-input-group';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'answer-input';
        input.id = 'answer-input';
        input.placeholder = 'Enter your answer...';
        input.autocomplete = 'off';

        // Submit on Enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.checkTextInput(input.value, question);
            }
        });

        // Auto-notify on input change
        input.addEventListener('input', () => {
            const userAnswer = input.value.trim();
            if (userAnswer) {
                const isCorrect = this.compareAnswers(userAnswer, question.correctAnswer);
                // Store but don't submit yet - wait for submit button
                input.dataset.answer = userAnswer;
                input.dataset.correct = isCorrect;
            }
        });

        inputGroup.appendChild(input);
        container.appendChild(inputGroup);

        // Focus the input
        setTimeout(() => input.focus(), 100);
    }

    /**
     * Render drag-and-drop question
     */
    renderDragDrop(container, question) {
        const instructions = document.createElement('p');
        instructions.className = 'drag-instructions';
        instructions.textContent = 'Drag the correct answer to the box below:';
        container.appendChild(instructions);

        // Create draggable answers
        const answersDiv = document.createElement('div');
        answersDiv.className = 'drag-answers';

        const choices = shuffle([
            { value: question.correctAnswer, isCorrect: true },
            ...question.wrongAnswers.map(w => ({ value: w.value, isCorrect: false }))
        ]);

        choices.forEach((choice, index) => {
            const answerBox = document.createElement('div');
            answerBox.className = 'drag-answer';
            answerBox.draggable = true;
            answerBox.textContent = choice.value;
            answerBox.dataset.value = choice.value;
            answerBox.dataset.correct = choice.isCorrect;

            answerBox.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', choice.value);
                e.dataTransfer.setData('correct', choice.isCorrect);
                answerBox.classList.add('dragging');
            });

            answerBox.addEventListener('dragend', () => {
                answerBox.classList.remove('dragging');
            });

            answersDiv.appendChild(answerBox);
        });

        container.appendChild(answersDiv);

        // Create drop zone
        const dropZone = document.createElement('div');
        dropZone.className = 'drop-zone';
        dropZone.id = 'drop-zone';
        dropZone.textContent = 'Drop answer here';

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');

            const value = e.dataTransfer.getData('text/plain');
            const isCorrect = e.dataTransfer.getData('correct') === 'true';

            dropZone.textContent = value;
            dropZone.dataset.value = value;
            dropZone.classList.add('filled');

            // Notify selection
            if (this.onAnswerSelected) {
                this.onAnswerSelected(value, isCorrect);
            }
        });

        container.appendChild(dropZone);
    }

    /**
     * Check text input answer
     */
    checkTextInput(userAnswer, question) {
        const isCorrect = this.compareAnswers(userAnswer, question.correctAnswer);

        if (this.onAnswerSelected) {
            this.onAnswerSelected(userAnswer, isCorrect);
        }
    }

    /**
     * Compare user answer with correct answer (flexible matching)
     */
    compareAnswers(userAnswer, correctAnswer) {
        const normalize = (str) => str.toString().trim().toLowerCase().replace(/\s+/g, '');

        const userNorm = normalize(userAnswer);
        const correctNorm = normalize(correctAnswer);

        // Exact match
        if (userNorm === correctNorm) return true;

        // Numeric comparison (handle decimals)
        const userNum = parseFloat(userAnswer);
        const correctNum = parseFloat(correctAnswer);

        if (!isNaN(userNum) && !isNaN(correctNum)) {
            // Allow small tolerance for floating point
            return Math.abs(userNum - correctNum) < 0.01;
        }

        // Fraction comparison: convert to decimal
        if (userAnswer.includes('/')) {
            const [num, den] = userAnswer.split('/').map(Number);
            if (!isNaN(num) && !isNaN(den) && den !== 0) {
                const userDecimal = num / den;
                const correctDecimal = parseFloat(correctAnswer);
                if (!isNaN(correctDecimal)) {
                    return Math.abs(userDecimal - correctDecimal) < 0.01;
                }
            }
        }

        return false;
    }

    /**
     * Render visual component on Canvas
     */
    renderVisual(visualData) {
        if (!this.visualContainer) return;

        this.visualContainer.style.display = 'block';

        const canvas = document.createElement('canvas');
        canvas.id = 'visual-canvas';
        canvas.width = 500;
        canvas.height = 400;
        this.visualContainer.appendChild(canvas);

        const ctx = canvas.getContext('2d');

        switch (visualData.type) {
            case 'graph':
                this.drawGraph(ctx, visualData, canvas.width, canvas.height);
                break;
            case 'geometry':
                this.drawGeometry(ctx, visualData, canvas.width, canvas.height);
                break;
            case 'number-line':
                this.drawNumberLine(ctx, visualData, canvas.width, canvas.height);
                break;
        }
    }

    /**
     * Draw coordinate graph
     */
    drawGraph(ctx, data, width, height) {
        const padding = 50;
        const graphWidth = width - 2 * padding;
        const graphHeight = height - 2 * padding;

        // Clear canvas
        ctx.fillStyle = '#e3eaf2';
        ctx.fillRect(0, 0, width, height);

        // Draw axes
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;

        // X-axis
        ctx.beginPath();
        ctx.moveTo(padding, height / 2);
        ctx.lineTo(width - padding, height / 2);
        ctx.stroke();

        // Y-axis
        ctx.beginPath();
        ctx.moveTo(width / 2, padding);
        ctx.lineTo(width / 2, height - padding);
        ctx.stroke();

        // Draw grid
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;

        const xRange = data.xRange || [-10, 10];
        const yRange = data.yRange || [-20, 20];

        // Vertical grid lines
        for (let x = xRange[0]; x <= xRange[1]; x++) {
            const px = padding + ((x - xRange[0]) / (xRange[1] - xRange[0])) * graphWidth;
            ctx.beginPath();
            ctx.moveTo(px, padding);
            ctx.lineTo(px, height - padding);
            ctx.stroke();
        }

        // Horizontal grid lines
        for (let y = yRange[0]; y <= yRange[1]; y++) {
            const py = height - padding - ((y - yRange[0]) / (yRange[1] - yRange[0])) * graphHeight;
            ctx.beginPath();
            ctx.moveTo(padding, py);
            ctx.lineTo(width - padding, py);
            ctx.stroke();
        }

        // Plot function
        if (data.function) {
            ctx.strokeStyle = '#64ffda';
            ctx.lineWidth = 3;
            ctx.beginPath();

            let firstPoint = true;
            for (let x = xRange[0]; x <= xRange[1]; x += 0.1) {
                const y = data.function(x);
                if (y >= yRange[0] && y <= yRange[1]) {
                    const px = padding + ((x - xRange[0]) / (xRange[1] - xRange[0])) * graphWidth;
                    const py = height - padding - ((y - yRange[0]) / (yRange[1] - yRange[0])) * graphHeight;

                    if (firstPoint) {
                        ctx.moveTo(px, py);
                        firstPoint = false;
                    } else {
                        ctx.lineTo(px, py);
                    }
                }
            }
            ctx.stroke();
        }

        // Mark roots if present
        if (data.roots) {
            ctx.fillStyle = '#ff5555';
            data.roots.forEach(root => {
                if (root >= xRange[0] && root <= xRange[1]) {
                    const px = padding + ((root - xRange[0]) / (xRange[1] - xRange[0])) * graphWidth;
                    const py = height / 2;
                    ctx.beginPath();
                    ctx.arc(px, py, 5, 0, 2 * Math.PI);
                    ctx.fill();
                }
            });
        }

        // Mark vertex if present
        if (data.vertex) {
            ctx.fillStyle = '#f1fa8c';
            const vx = data.vertex.x;
            const vy = data.vertex.y;
            if (vx >= xRange[0] && vx <= xRange[1] && vy >= yRange[0] && vy <= yRange[1]) {
                const px = padding + ((vx - xRange[0]) / (xRange[1] - xRange[0])) * graphWidth;
                const py = height - padding - ((vy - yRange[0]) / (yRange[1] - yRange[0])) * graphHeight;
                ctx.beginPath();
                ctx.arc(px, py, 6, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }

    /**
     * Draw geometric shapes
     */
    drawGeometry(ctx, data, width, height) {
        // Clear canvas
        ctx.fillStyle = '#e3eaf2';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = '#64ffda';
        ctx.fillStyle = 'rgba(100, 255, 218, 0.2)';
        ctx.lineWidth = 3;

        const centerX = width / 2;
        const centerY = height / 2;

        switch (data.shape) {
            case 'triangle':
                // Draw triangle
                const baseWidth = data.base * 15;
                const triHeight = data.height * 15;

                ctx.beginPath();
                ctx.moveTo(centerX - baseWidth / 2, centerY + triHeight / 2);
                ctx.lineTo(centerX + baseWidth / 2, centerY + triHeight / 2);
                ctx.lineTo(centerX, centerY - triHeight / 2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Labels
                ctx.fillStyle = '#333';
                ctx.font = '16px Arial';
                ctx.fillText(`base = ${data.base}`, centerX - 30, centerY + triHeight / 2 + 25);
                ctx.fillText(`height = ${data.height}`, centerX + baseWidth / 2 + 10, centerY);
                break;

            case 'rectangle':
                const rectWidth = data.length * 15;
                const rectHeight = data.width * 15;

                ctx.beginPath();
                ctx.rect(centerX - rectWidth / 2, centerY - rectHeight / 2, rectWidth, rectHeight);
                ctx.fill();
                ctx.stroke();

                // Labels
                ctx.fillStyle = '#333';
                ctx.font = '16px Arial';
                ctx.fillText(`length = ${data.length}`, centerX - 30, centerY + rectHeight / 2 + 25);
                ctx.fillText(`width = ${data.width}`, centerX - rectWidth / 2 - 70, centerY);
                break;

            case 'circle':
                const radius = data.radius * 12;

                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();

                // Radius line
                ctx.strokeStyle = '#ff5555';
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(centerX + radius, centerY);
                ctx.stroke();

                // Label
                ctx.fillStyle = '#333';
                ctx.font = '16px Arial';
                ctx.fillText(`r = ${data.radius}`, centerX + radius / 2 - 15, centerY - 10);
                break;

            case 'right-triangle':
                const a = data.a * 15;
                const b = data.b * 15;

                ctx.beginPath();
                ctx.moveTo(centerX - a / 2, centerY + b / 2);
                ctx.lineTo(centerX + a / 2, centerY + b / 2);
                ctx.lineTo(centerX + a / 2, centerY - b / 2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Labels
                ctx.fillStyle = '#333';
                ctx.font = '16px Arial';
                ctx.fillText(`a = ${data.a}`, centerX, centerY + b / 2 + 25);
                ctx.fillText(`b = ${data.b}`, centerX + a / 2 + 10, centerY);
                ctx.fillText(`c = ?`, centerX - a / 4, centerY - 10);
                break;
        }
    }

    /**
     * Draw number line
     */
    drawNumberLine(ctx, data, width, height) {
        // Implementation for number line visualization
        // (Can be added if needed for specific questions)
    }

    /**
     * Get current answer (for submit button)
     */
    getCurrentAnswer() {
        if (!this.currentQuestion) return null;

        switch (this.currentQuestion.type) {
            case 'multiple-choice':
                const selected = this.questionContainer.querySelector('.answer-choice.selected input');
                return selected ? selected.value : null;

            case 'text-input':
                const input = document.getElementById('answer-input');
                return input ? input.value.trim() : null;

            case 'drag-drop':
                const dropZone = document.getElementById('drop-zone');
                return dropZone ? dropZone.dataset.value : null;
        }

        return null;
    }

    /**
     * Check if an answer has been provided
     */
    hasAnswer() {
        return this.getCurrentAnswer() !== null && this.getCurrentAnswer() !== '';
    }
}

// Utility function (same as in question-bank.js)
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuestionRenderer;
}
