/**
 * QuestionBank - Procedural question generation system
 * Generates fresh questions on-the-fly based on topic and difficulty
 */

// Utility: Random integer with exclusions
function randomInt(min, max, exclude = []) {
    let val;
    let attempts = 0;
    do {
        val = Math.floor(Math.random() * (max - min + 1)) + min;
        attempts++;
    } while (exclude.includes(val) && attempts < 100);
    return val;
}

// Utility: Random choice from array
function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Utility: Shuffle array
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

class QuestionBank {
    constructor() {
        this.generators = this.initializeGenerators();
        this.topicCounts = {}; // Track topic usage for variety
    }

    /**
     * Generate a fresh question for given difficulty and topic
     */
    generateQuestion(difficulty, topic = null, lastTopic = null) {
        // If no topic specified, pick random topic appropriate for difficulty
        if (!topic) {
            const availableTopics = this.getTopicsForDifficulty(difficulty);
            // Filter out last topic to prevent repeats
            const filteredTopics = lastTopic
                ? availableTopics.filter(t => t !== lastTopic)
                : availableTopics;

            topic = randomChoice(filteredTopics.length > 0 ? filteredTopics : availableTopics);
        }

        // Get generator for this topic/difficulty
        const generator = this.getGenerator(topic, difficulty);

        // Generate fresh question with random values
        const questionData = generator.generate();

        // Add metadata
        return {
            id: `${topic}-${difficulty}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            topic: topic,
            difficulty: difficulty,
            type: generator.type,
            needsCalculator: generator.needsCalculator(difficulty),
            hasVisual: generator.hasVisual,
            ...questionData
        };
    }

    /**
     * Get topics available for a difficulty level
     */
    getTopicsForDifficulty(difficulty) {
        const topics = [];
        Object.keys(this.generators).forEach(topic => {
            const hasGenerator = this.generators[topic].some(gen =>
                difficulty >= gen.minDifficulty && difficulty <= gen.maxDifficulty
            );
            if (hasGenerator) {
                topics.push(topic);
            }
        });
        return topics;
    }

    /**
     * Get appropriate generator for topic/difficulty
     */
    getGenerator(topic, difficulty) {
        const generators = this.generators[topic];
        if (!generators) {
            throw new Error(`No generators found for topic: ${topic}`);
        }

        // Find generator that handles this difficulty level
        for (const gen of generators) {
            if (difficulty >= gen.minDifficulty && difficulty <= gen.maxDifficulty) {
                return gen;
            }
        }

        throw new Error(`No generator found for ${topic} at difficulty ${difficulty}`);
    }

    /**
     * Initialize question generators (not questions themselves!)
     */
    initializeGenerators() {
        return {
            "arithmetic": [
                {
                    minDifficulty: 1,
                    maxDifficulty: 3,
                    type: "multiple-choice",
                    needsCalculator: () => false,
                    hasVisual: false,
                    generate: () => this.generateArithmeticBasic()
                },
                {
                    minDifficulty: 4,
                    maxDifficulty: 6,
                    type: "text-input",
                    needsCalculator: (diff) => diff >= 5,
                    hasVisual: false,
                    generate: () => this.generateArithmeticIntermediate()
                }
            ],
            "fractions": [
                {
                    minDifficulty: 2,
                    maxDifficulty: 5,
                    type: "multiple-choice",
                    needsCalculator: () => false,
                    hasVisual: false,
                    generate: () => this.generateFractionsBasic()
                },
                {
                    minDifficulty: 5,
                    maxDifficulty: 7,
                    type: "text-input",
                    needsCalculator: (diff) => diff >= 6,
                    hasVisual: false,
                    generate: () => this.generateFractionsAdvanced()
                }
            ],
            "linear-equations": [
                {
                    minDifficulty: 3,
                    maxDifficulty: 7,
                    type: "text-input",
                    needsCalculator: (diff) => diff >= 5,
                    hasVisual: false,
                    generate: () => this.generateLinearEquation()
                }
            ],
            "quadratic-equations": [
                {
                    minDifficulty: 6,
                    maxDifficulty: 9,
                    type: "multiple-choice",
                    needsCalculator: () => true,
                    hasVisual: true,
                    generate: () => this.generateQuadraticQuestion()
                }
            ],
            "geometry": [
                {
                    minDifficulty: 2,
                    maxDifficulty: 5,
                    type: "multiple-choice",
                    needsCalculator: (diff) => diff >= 4,
                    hasVisual: true,
                    generate: () => this.generateGeometryBasic()
                },
                {
                    minDifficulty: 6,
                    maxDifficulty: 8,
                    type: "text-input",
                    needsCalculator: () => true,
                    hasVisual: true,
                    generate: () => this.generateGeometryAdvanced()
                }
            ],
            "word-problems": [
                {
                    minDifficulty: 7,
                    maxDifficulty: 10,
                    type: "text-input",
                    needsCalculator: () => true,
                    hasVisual: false,
                    generate: () => this.generateWordProblem()
                }
            ],
            "algebraic-expressions": [
                {
                    minDifficulty: 4,
                    maxDifficulty: 8,
                    type: "multiple-choice",
                    needsCalculator: (diff) => diff >= 6,
                    hasVisual: false,
                    generate: () => this.generateAlgebraicExpression()
                }
            ],
            "ratios-proportions": [
                {
                    minDifficulty: 3,
                    maxDifficulty: 6,
                    type: "text-input",
                    needsCalculator: (diff) => diff >= 5,
                    hasVisual: false,
                    generate: () => this.generateRatioProportion()
                }
            ],
            "statistics-probability": [
                {
                    minDifficulty: 5,
                    maxDifficulty: 9,
                    type: "multiple-choice",
                    needsCalculator: () => true,
                    hasVisual: false,
                    generate: () => this.generateStatsProbability()
                }
            ]
        };
    }

    // ====================
    // GENERATOR METHODS
    // ====================

    generateArithmeticBasic() {
        const operations = [
            { op: '+', symbol: '+', calc: (a, b) => a + b },
            { op: '-', symbol: '-', calc: (a, b) => a - b },
            { op: '*', symbol: '×', calc: (a, b) => a * b }
        ];

        const operation = randomChoice(operations);
        const a = randomInt(1, 20);
        const b = randomInt(1, 20);
        const answer = operation.calc(a, b);

        const wrongAnswers = [
            answer + randomInt(1, 5),
            answer - randomInt(1, 5),
            a * b  // Common mistake: multiply instead
        ].filter(w => w !== answer && w > 0);

        return {
            text: `What is ${a} ${operation.symbol} ${b}?`,
            correctAnswer: answer.toString(),
            explanation: `${a} ${operation.symbol} ${b} = ${answer}`,
            wrongAnswers: shuffle(wrongAnswers).slice(0, 3).map(w => ({
                value: w.toString(),
                reason: "calculation-error"
            }))
        };
    }

    generateArithmeticIntermediate() {
        const templates = [
            () => {
                // Multi-step: (a × b) + c
                const a = randomInt(5, 15);
                const b = randomInt(2, 10);
                const c = randomInt(5, 20);
                const answer = (a * b) + c;

                return {
                    text: `Calculate: (${a} × ${b}) + ${c}`,
                    latex: `(${a} \\times ${b}) + ${c}`,
                    correctAnswer: answer.toString(),
                    explanation: `First: ${a} × ${b} = ${a * b}, then ${a * b} + ${c} = ${answer}`
                };
            },
            () => {
                // Division with remainder
                const divisor = randomInt(3, 12);
                const quotient = randomInt(5, 20);
                const remainder = randomInt(1, divisor - 1);
                const dividend = (divisor * quotient) + remainder;

                return {
                    text: `What is ${dividend} ÷ ${divisor}? (Express as a decimal, rounded to 2 places)`,
                    correctAnswer: (dividend / divisor).toFixed(2),
                    explanation: `${dividend} ÷ ${divisor} = ${(dividend / divisor).toFixed(2)}`
                };
            }
        ];

        return randomChoice(templates)();
    }

    generateFractionsBasic() {
        const templates = [
            () => {
                // Simplify fraction
                const gcd = randomChoice([2, 3, 4, 5]);
                const num = randomInt(1, 10) * gcd;
                const den = randomInt(2, 10) * gcd;
                const simplified_num = num / gcd;
                const simplified_den = den / gcd;

                const wrongAnswers = [
                    `${num}/${den}`,  // Not simplified
                    `${simplified_num + 1}/${simplified_den}`,
                    `${simplified_num}/${simplified_den + 1}`
                ];

                return {
                    text: `Simplify the fraction:`,
                    latex: `\\frac{${num}}{${den}}`,
                    correctAnswer: simplified_den === 1 ? simplified_num.toString() : `${simplified_num}/${simplified_den}`,
                    explanation: `Divide both by ${gcd}: ${simplified_num}/${simplified_den}`,
                    wrongAnswers: wrongAnswers.map(w => ({ value: w, reason: "simplification-error" }))
                };
            },
            () => {
                // Add fractions (same denominator)
                const den = randomChoice([2, 3, 4, 5, 6, 8]);
                const num1 = randomInt(1, den - 1);
                const num2 = randomInt(1, den - num1);
                const answer_num = num1 + num2;

                return {
                    text: `Add the fractions:`,
                    latex: `\\frac{${num1}}{${den}} + \\frac{${num2}}{${den}}`,
                    correctAnswer: answer_num === den ? "1" : `${answer_num}/${den}`,
                    explanation: `${num1} + ${num2} = ${answer_num}, so ${answer_num}/${den}`,
                    wrongAnswers: [
                        { value: `${num1 + num2}/${den * 2}`, reason: "added-denominators" },
                        { value: `${num1 * num2}/${den}`, reason: "multiplied-numerators" },
                        { value: `${num1}/${num2}`, reason: "fraction-error" }
                    ]
                };
            }
        ];

        return randomChoice(templates)();
    }

    generateFractionsAdvanced() {
        // Multiply or divide fractions
        const num1 = randomInt(1, 12);
        const den1 = randomInt(2, 12, [num1]);
        const num2 = randomInt(1, 12);
        const den2 = randomInt(2, 12, [num2]);

        const operation = randomChoice(['multiply', 'divide']);

        if (operation === 'multiply') {
            const answer_num = num1 * num2;
            const answer_den = den1 * den2;
            const gcd = this.gcd(answer_num, answer_den);

            return {
                text: `Multiply and simplify:`,
                latex: `\\frac{${num1}}{${den1}} \\times \\frac{${num2}}{${den2}}`,
                correctAnswer: answer_den / gcd === 1 ? (answer_num / gcd).toString() : `${answer_num / gcd}/${answer_den / gcd}`,
                explanation: `Multiply: ${answer_num}/${answer_den}, simplify: ${answer_num / gcd}/${answer_den / gcd}`
            };
        } else {
            const answer_num = num1 * den2;
            const answer_den = den1 * num2;
            const gcd = this.gcd(answer_num, answer_den);

            return {
                text: `Divide and simplify:`,
                latex: `\\frac{${num1}}{${den1}} \\div \\frac{${num2}}{${den2}}`,
                correctAnswer: answer_den / gcd === 1 ? (answer_num / gcd).toString() : `${answer_num / gcd}/${answer_den / gcd}`,
                explanation: `Flip and multiply: ${answer_num}/${answer_den}, simplify: ${answer_num / gcd}/${answer_den / gcd}`
            };
        }
    }

    generateLinearEquation() {
        const a = randomInt(2, 10);
        const b = randomInt(-20, 20, [0]);
        const c = randomInt(10, 50);
        const x = (c - b) / a;

        return {
            text: "Solve for x:",
            latex: `${a}x ${b >= 0 ? '+' : ''} ${b} = ${c}`,
            correctAnswer: Number.isInteger(x) ? x.toString() : x.toFixed(2),
            explanation: `
                Step 1: Subtract ${b} from both sides: ${a}x = ${c - b}
                Step 2: Divide by ${a}: x = ${Number.isInteger(x) ? x : x.toFixed(2)}
            `
        };
    }

    generateQuadraticQuestion() {
        const a = randomInt(-5, 5, [0]);
        const b = randomInt(-10, 10);
        const c = randomInt(-20, 20);

        const disc = b * b - 4 * a * c;

        // Retry if no real solutions
        if (disc < 0) {
            return this.generateQuadraticQuestion();
        }

        const x1 = ((-b + Math.sqrt(disc)) / (2 * a));
        const x2 = ((-b - Math.sqrt(disc)) / (2 * a));

        const x1_str = Number.isInteger(x1) ? x1.toString() : x1.toFixed(2);
        const x2_str = Number.isInteger(x2) ? x2.toString() : x2.toFixed(2);

        const correctAnswer = x1 === x2
            ? `x = ${x1_str}`
            : `x = ${x1_str}, ${x2_str}`;

        const wrongAnswers = [
            { value: `x = ${(-parseFloat(x1_str)).toFixed(2)}`, reason: "sign-error" },
            { value: `x = ${(b / a).toFixed(2)}`, reason: "forgot-quadratic-formula" },
            { value: "No real solutions", reason: "discriminant-error" }
        ];

        return {
            text: "Find the solutions using the quadratic formula:",
            latex: `${a}x^2 ${b >= 0 ? '+' : ''} ${b}x ${c >= 0 ? '+' : ''} ${c} = 0`,
            correctAnswer: correctAnswer,
            explanation: `Using quadratic formula: x = ${correctAnswer}`,
            visualData: {
                type: 'graph',
                function: (x) => a * x * x + b * x + c,
                xRange: [-10, 10],
                yRange: [-30, 30],
                roots: [parseFloat(x1_str), parseFloat(x2_str)],
                vertex: {
                    x: -b / (2 * a),
                    y: a * Math.pow(-b / (2 * a), 2) + b * (-b / (2 * a)) + c
                },
                a, b, c
            },
            wrongAnswers: wrongAnswers
        };
    }

    generateGeometryBasic() {
        const shapes = ['triangle', 'rectangle', 'circle'];
        const shape = randomChoice(shapes);

        if (shape === 'triangle') {
            const base = randomInt(5, 20);
            const height = randomInt(5, 20);
            const area = (base * height) / 2;

            return {
                text: `Find the area of a triangle with base ${base} and height ${height}:`,
                correctAnswer: area.toString(),
                explanation: `Area = (base × height) ÷ 2 = (${base} × ${height}) ÷ 2 = ${area}`,
                visualData: {
                    type: 'geometry',
                    shape: 'triangle',
                    base: base,
                    height: height
                },
                wrongAnswers: [
                    { value: (base * height).toString(), reason: "forgot-to-divide-by-2" },
                    { value: (base + height).toString(), reason: "added-instead" },
                    { value: ((base * height) / 4).toString(), reason: "calculation-error" }
                ]
            };
        } else if (shape === 'rectangle') {
            const length = randomInt(5, 20);
            const width = randomInt(5, 20, [length]);
            const area = length * width;

            return {
                text: `Find the area of a rectangle with length ${length} and width ${width}:`,
                correctAnswer: area.toString(),
                explanation: `Area = length × width = ${length} × ${width} = ${area}`,
                visualData: {
                    type: 'geometry',
                    shape: 'rectangle',
                    length: length,
                    width: width
                },
                wrongAnswers: [
                    { value: ((length + width) * 2).toString(), reason: "calculated-perimeter" },
                    { value: (length + width).toString(), reason: "added-instead" },
                    { value: ((length * width) / 2).toString(), reason: "divided-by-2" }
                ]
            };
        } else {
            const radius = randomInt(3, 15);
            const area = Math.PI * radius * radius;

            return {
                text: `Find the area of a circle with radius ${radius}: (Use π ≈ 3.14, round to 2 decimal places)`,
                correctAnswer: area.toFixed(2),
                explanation: `Area = πr² = 3.14 × ${radius}² = ${area.toFixed(2)}`,
                visualData: {
                    type: 'geometry',
                    shape: 'circle',
                    radius: radius
                },
                wrongAnswers: [
                    { value: (2 * Math.PI * radius).toFixed(2), reason: "calculated-circumference" },
                    { value: (Math.PI * radius).toFixed(2), reason: "forgot-to-square" },
                    { value: (radius * radius).toFixed(2), reason: "forgot-pi" }
                ]
            };
        }
    }

    generateGeometryAdvanced() {
        // Pythagorean theorem
        const a = randomInt(3, 12);
        const b = randomInt(4, 12, [a]);
        const c = Math.sqrt(a * a + b * b);

        return {
            text: `A right triangle has legs of length ${a} and ${b}. Find the length of the hypotenuse (round to 2 decimal places):`,
            correctAnswer: c.toFixed(2),
            explanation: `Using Pythagorean theorem: c² = ${a}² + ${b}² = ${a * a} + ${b * b} = ${a * a + b * b}, so c = ${c.toFixed(2)}`,
            visualData: {
                type: 'geometry',
                shape: 'right-triangle',
                a: a,
                b: b,
                c: parseFloat(c.toFixed(2))
            }
        };
    }

    generateWordProblem() {
        const templates = [
            () => {
                // Distance/rate/time
                const rate1 = randomInt(40, 70);
                const rate2 = randomInt(30, 60);
                const distance = randomInt(100, 300);
                const time = distance / (rate1 + rate2);

                return {
                    text: `Two cars start ${distance} miles apart and drive toward each other. One travels at ${rate1} mph, the other at ${rate2} mph. How many hours until they meet? (Round to 2 decimal places)`,
                    correctAnswer: time.toFixed(2),
                    explanation: `Combined speed = ${rate1 + rate2} mph. Time = ${distance} ÷ ${rate1 + rate2} = ${time.toFixed(2)} hours`
                };
            },
            () => {
                // Percent problem
                const original = randomInt(50, 500);
                const percent = randomChoice([10, 15, 20, 25, 30]);
                const discount = (original * percent) / 100;
                const final = original - discount;

                return {
                    text: `A shirt originally costs $${original}. It's on sale for ${percent}% off. What is the sale price?`,
                    correctAnswer: final.toString(),
                    explanation: `Discount = $${original} × ${percent}% = $${discount}. Sale price = $${original} - $${discount} = $${final}`
                };
            }
        ];

        return randomChoice(templates)();
    }

    generateAlgebraicExpression() {
        const templates = [
            () => {
                // Simplify: ax + bx
                const a = randomInt(2, 10);
                const b = randomInt(2, 10);
                const sum = a + b;

                return {
                    text: `Simplify:`,
                    latex: `${a}x + ${b}x`,
                    correctAnswer: `${sum}x`,
                    explanation: `Combine like terms: ${a}x + ${b}x = ${sum}x`,
                    wrongAnswers: [
                        { value: `${a + b}x^2`, reason: "added-exponents" },
                        { value: `${a}x + ${b}`, reason: "dropped-x" },
                        { value: `${a * b}x`, reason: "multiplied-instead" }
                    ]
                };
            },
            () => {
                // Expand: a(x + b)
                const a = randomInt(2, 10);
                const b = randomInt(2, 10);

                return {
                    text: `Expand:`,
                    latex: `${a}(x + ${b})`,
                    correctAnswer: `${a}x + ${a * b}`,
                    explanation: `Distribute: ${a} × x + ${a} × ${b} = ${a}x + ${a * b}`,
                    wrongAnswers: [
                        { value: `${a}x + ${b}`, reason: "forgot-to-distribute" },
                        { value: `${a + b}x`, reason: "added-instead" },
                        { value: `${a}x + ${a + b}`, reason: "distribution-error" }
                    ]
                };
            }
        ];

        return randomChoice(templates)();
    }

    generateRatioProportion() {
        const a = randomInt(2, 10);
        const b = randomInt(2, 10, [a]);
        const c = randomInt(2, 15);
        const x = (b * c) / a;

        return {
            text: `Solve for x:`,
            latex: `\\frac{${a}}{${b}} = \\frac{${c}}{x}`,
            correctAnswer: Number.isInteger(x) ? x.toString() : x.toFixed(2),
            explanation: `Cross multiply: ${a} × x = ${b} × ${c}, so x = ${b * c} ÷ ${a} = ${Number.isInteger(x) ? x : x.toFixed(2)}`
        };
    }

    generateStatsProbability() {
        const templates = [
            () => {
                // Mean
                const numbers = Array.from({ length: 5 }, () => randomInt(1, 20));
                const sum = numbers.reduce((a, b) => a + b, 0);
                const mean = sum / numbers.length;

                return {
                    text: `Find the mean (average) of these numbers: ${numbers.join(', ')}`,
                    correctAnswer: Number.isInteger(mean) ? mean.toString() : mean.toFixed(2),
                    explanation: `Sum = ${sum}, Mean = ${sum} ÷ ${numbers.length} = ${mean.toFixed(2)}`,
                    wrongAnswers: [
                        { value: sum.toString(), reason: "forgot-to-divide" },
                        { value: Math.max(...numbers).toString(), reason: "found-max" },
                        { value: (sum / (numbers.length - 1)).toFixed(2), reason: "division-error" }
                    ]
                };
            },
            () => {
                // Probability
                const favorable = randomInt(1, 10);
                const total = randomInt(favorable + 1, 20);
                const probability = favorable / total;

                return {
                    text: `A bag contains ${total} marbles. ${favorable} are red. What is the probability of picking a red marble? (Express as a decimal rounded to 2 places)`,
                    correctAnswer: probability.toFixed(2),
                    explanation: `Probability = ${favorable}/${total} = ${probability.toFixed(2)}`,
                    wrongAnswers: [
                        { value: `${favorable}/${total}`, reason: "left-as-fraction" },
                        { value: ((total - favorable) / total).toFixed(2), reason: "calculated-complement" },
                        { value: (favorable / (total - favorable)).toFixed(2), reason: "calculation-error" }
                    ]
                };
            }
        ];

        return randomChoice(templates)();
    }

    // Utility: Greatest Common Divisor
    gcd(a, b) {
        return b === 0 ? a : this.gcd(b, a % b);
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuestionBank;
}
