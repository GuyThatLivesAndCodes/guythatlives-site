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
                    maxDifficulty: 10,
                    type: "text-input",
                    needsCalculator: (diff) => diff >= 5,
                    hasVisual: false,
                    generate: () => this.generateLinearEquation()
                }
            ],
            "quadratic-equations": [
                {
                    minDifficulty: 6,
                    maxDifficulty: 15,
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
                    maxDifficulty: 18,
                    type: "text-input",
                    needsCalculator: () => true,
                    hasVisual: true,
                    generate: () => this.generateGeometryAdvanced()
                }
            ],
            "word-problems": [
                {
                    minDifficulty: 7,
                    maxDifficulty: 20,
                    type: "text-input",
                    needsCalculator: () => true,
                    hasVisual: false,
                    generate: () => this.generateWordProblem()
                }
            ],
            "algebraic-expressions": [
                {
                    minDifficulty: 4,
                    maxDifficulty: 16,
                    type: "multiple-choice",
                    needsCalculator: (diff) => diff >= 6,
                    hasVisual: false,
                    generate: () => this.generateAlgebraicExpression()
                }
            ],
            "ratios-proportions": [
                {
                    minDifficulty: 3,
                    maxDifficulty: 12,
                    type: "text-input",
                    needsCalculator: (diff) => diff >= 5,
                    hasVisual: false,
                    generate: () => this.generateRatioProportion()
                }
            ],
            "statistics-probability": [
                {
                    minDifficulty: 5,
                    maxDifficulty: 16,
                    type: "multiple-choice",
                    needsCalculator: () => true,
                    hasVisual: false,
                    generate: () => this.generateStatsProbability()
                }
            ],
            "polynomials": [
                {
                    minDifficulty: 12,
                    maxDifficulty: 22,
                    type: "text-input",
                    needsCalculator: () => true,
                    hasVisual: false,
                    generate: () => this.generatePolynomialQuestion()
                }
            ],
            "exponential-logarithms": [
                {
                    minDifficulty: 18,
                    maxDifficulty: 26,
                    type: "multiple-choice",
                    needsCalculator: () => true,
                    hasVisual: false,
                    generate: () => this.generateExponentialLogQuestion()
                }
            ],
            "trigonometry": [
                {
                    minDifficulty: 20,
                    maxDifficulty: 28,
                    type: "text-input",
                    needsCalculator: () => true,
                    hasVisual: true,
                    generate: () => this.generateTrigonometryQuestion()
                }
            ],
            "functions": [
                {
                    minDifficulty: 16,
                    maxDifficulty: 25,
                    type: "multiple-choice",
                    needsCalculator: () => true,
                    hasVisual: true,
                    generate: () => this.generateFunctionQuestion()
                }
            ],
            "sequences-series": [
                {
                    minDifficulty: 14,
                    maxDifficulty: 24,
                    type: "text-input",
                    needsCalculator: () => true,
                    hasVisual: false,
                    generate: () => this.generateSequenceSeriesQuestion()
                }
            ],
            "systems-equations": [
                {
                    minDifficulty: 10,
                    maxDifficulty: 19,
                    type: "text-input",
                    needsCalculator: () => true,
                    hasVisual: false,
                    generate: () => this.generateSystemEquationsQuestion()
                }
            ],
            "radicals-exponents": [
                {
                    minDifficulty: 13,
                    maxDifficulty: 21,
                    type: "multiple-choice",
                    needsCalculator: (diff) => diff >= 16,
                    hasVisual: false,
                    generate: () => this.generateRadicalsExponentsQuestion()
                }
            ],
            "limits-derivatives": [
                {
                    minDifficulty: 25,
                    maxDifficulty: 30,
                    type: "multiple-choice",
                    needsCalculator: () => true,
                    hasVisual: true,
                    generate: () => this.generateLimitsDerivativesQuestion()
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

    generatePolynomialQuestion() {
        const templates = [
            () => {
                // Multiply binomials: (ax + b)(cx + d)
                const a = randomInt(1, 5);
                const b = randomInt(-10, 10, [0]);
                const c = randomInt(1, 5);
                const d = randomInt(-10, 10, [0]);

                const x2_coef = a * c;
                const x_coef = a * d + b * c;
                const const_term = b * d;

                const result = `${x2_coef}x² ${x_coef >= 0 ? '+' : ''} ${x_coef}x ${const_term >= 0 ? '+' : ''} ${const_term}`;

                return {
                    text: `Multiply and simplify:`,
                    latex: `(${a}x ${b >= 0 ? '+' : ''} ${b})(${c}x ${d >= 0 ? '+' : ''} ${d})`,
                    correctAnswer: result,
                    explanation: `Using FOIL: First (${a}x·${c}x=${x2_coef}x²), Outer (${a}x·${d}=${a*d}x), Inner (${b}·${c}x=${b*c}x), Last (${b}·${d}=${b*d})`,
                    wrongAnswers: [
                        { value: `${a*c}x² + ${b*d}`, reason: "forgot-middle-terms" },
                        { value: `${a*c}x² + ${a*d + b*c + 1}x + ${b*d}`, reason: "calculation-error" },
                        { value: `${a*c}x + ${b*d}`, reason: "wrong-exponent" }
                    ]
                };
            },
            () => {
                // Factor polynomial: ax² + bx + c
                const root1 = randomInt(-8, 8, [0]);
                const root2 = randomInt(-8, 8, [0]);
                const a = 1;
                const b = -(root1 + root2);
                const c = root1 * root2;

                const factored = `(x ${root1 >= 0 ? '-' : '+'} ${Math.abs(root1)})(x ${root2 >= 0 ? '-' : '+'} ${Math.abs(root2)})`;

                return {
                    text: `Factor the polynomial:`,
                    latex: `x^2 ${b >= 0 ? '+' : ''} ${b}x ${c >= 0 ? '+' : ''} ${c}`,
                    correctAnswer: factored,
                    explanation: `Find two numbers that multiply to ${c} and add to ${b}: ${root1} and ${root2}`,
                    wrongAnswers: [
                        { value: `(x + ${root1})(x + ${root2})`, reason: "sign-error" },
                        { value: `(x - ${root1 + 1})(x - ${root2})`, reason: "calculation-error" },
                        { value: "Cannot be factored", reason: "gave-up" }
                    ]
                };
            }
        ];

        return randomChoice(templates)();
    }

    generateSystemEquationsQuestion() {
        const templates = [
            () => {
                // System of 2 linear equations
                const x = randomInt(-5, 5);
                const y = randomInt(-5, 5);

                const a1 = randomInt(1, 5);
                const b1 = randomInt(1, 5);
                const c1 = a1 * x + b1 * y;

                const a2 = randomInt(1, 5);
                const b2 = randomInt(1, 5);
                const c2 = a2 * x + b2 * y;

                return {
                    text: `Solve the system of equations:`,
                    latex: `\\begin{cases} ${a1}x + ${b1}y = ${c1} \\\\ ${a2}x + ${b2}y = ${c2} \\end{cases}`,
                    correctAnswer: `x = ${x}, y = ${y}`,
                    explanation: `Solution: x = ${x}, y = ${y}`,
                    wrongAnswers: [
                        { value: `x = ${y}, y = ${x}`, reason: "swapped-variables" },
                        { value: `x = ${x + 1}, y = ${y}`, reason: "calculation-error" },
                        { value: `x = ${-x}, y = ${-y}`, reason: "sign-error" }
                    ]
                };
            }
        ];

        return randomChoice(templates)();
    }

    generateRadicalsExponentsQuestion() {
        const templates = [
            () => {
                // Simplify radical
                const perfect = randomChoice([4, 9, 16, 25]);
                const other = randomChoice([2, 3, 5, 6, 7]);
                const radicand = perfect * other;
                const simplified = `${Math.sqrt(perfect)}√${other}`;

                return {
                    text: `Simplify the radical:`,
                    latex: `\\sqrt{${radicand}}`,
                    correctAnswer: simplified,
                    explanation: `√${radicand} = √${perfect} · √${other} = ${Math.sqrt(perfect)}√${other}`,
                    wrongAnswers: [
                        { value: `√${radicand}`, reason: "not-simplified" },
                        { value: `${Math.sqrt(perfect) + 1}√${other}`, reason: "calculation-error" },
                        { value: Math.sqrt(radicand).toFixed(2), reason: "converted-to-decimal" }
                    ]
                };
            },
            () => {
                // Exponent rules: x^a * x^b = x^(a+b)
                const base = randomChoice(['x', 'y', 'a']);
                const exp1 = randomInt(2, 7);
                const exp2 = randomInt(2, 7);
                const result = exp1 + exp2;

                return {
                    text: `Simplify using exponent rules:`,
                    latex: `${base}^{${exp1}} \\cdot ${base}^{${exp2}}`,
                    correctAnswer: `${base}^${result}`,
                    explanation: `When multiplying same bases, add exponents: ${exp1} + ${exp2} = ${result}`,
                    wrongAnswers: [
                        { value: `${base}^${exp1 * exp2}`, reason: "multiplied-instead-of-adding" },
                        { value: `${base}^${exp1}${base}^${exp2}`, reason: "didnt-combine" },
                        { value: `${base}^${result - 1}`, reason: "calculation-error" }
                    ]
                };
            }
        ];

        return randomChoice(templates)();
    }

    generateSequenceSeriesQuestion() {
        const templates = [
            () => {
                // Arithmetic sequence
                const a1 = randomInt(2, 20);
                const d = randomInt(2, 10);
                const n = randomInt(5, 10);
                const an = a1 + (n - 1) * d;

                return {
                    text: `Find the ${n}th term of the arithmetic sequence:`,
                    latex: `${a1}, ${a1 + d}, ${a1 + 2*d}, ...`,
                    correctAnswer: an.toString(),
                    explanation: `Using formula a_n = a_1 + (n-1)d: ${a1} + (${n}-1)(${d}) = ${an}`,
                    wrongAnswers: [
                        { value: (a1 + n * d).toString(), reason: "used-n-instead-of-n-1" },
                        { value: (a1 + (n - 1) * d + d).toString(), reason: "off-by-one" },
                        { value: (an - d).toString(), reason: "calculation-error" }
                    ]
                };
            },
            () => {
                // Geometric sequence
                const a1 = randomInt(2, 10);
                const r = randomInt(2, 4);
                const n = randomInt(3, 5);
                const an = a1 * Math.pow(r, n - 1);

                return {
                    text: `Find the ${n}th term of the geometric sequence:`,
                    latex: `${a1}, ${a1 * r}, ${a1 * r * r}, ...`,
                    correctAnswer: an.toString(),
                    explanation: `Using formula a_n = a_1 · r^(n-1): ${a1} · ${r}^${n-1} = ${an}`,
                    wrongAnswers: [
                        { value: (a1 * Math.pow(r, n)).toString(), reason: "used-n-instead-of-n-1" },
                        { value: (a1 + n * r).toString(), reason: "added-instead-of-multiplied" },
                        { value: (an / r).toString(), reason: "off-by-one" }
                    ]
                };
            }
        ];

        return randomChoice(templates)();
    }

    generateFunctionQuestion() {
        const templates = [
            () => {
                // Function evaluation
                const a = randomInt(1, 5);
                const b = randomInt(-10, 10, [0]);
                const x = randomInt(-5, 5);
                const result = a * x + b;

                return {
                    text: `Evaluate f(${x}) if:`,
                    latex: `f(x) = ${a}x ${b >= 0 ? '+' : ''} ${b}`,
                    correctAnswer: result.toString(),
                    explanation: `f(${x}) = ${a}(${x}) ${b >= 0 ? '+' : ''} ${b} = ${result}`,
                    wrongAnswers: [
                        { value: (a * x).toString(), reason: "forgot-constant" },
                        { value: (result + b).toString(), reason: "calculation-error" },
                        { value: (a + x + b).toString(), reason: "added-instead-of-multiplied" }
                    ]
                };
            },
            () => {
                // Function composition: f(g(x))
                const a = randomInt(2, 5);
                const b = randomInt(1, 5);
                const c = randomInt(1, 5);
                const x = randomInt(1, 5);

                const gx = b * x + c;
                const fgx = a * gx;

                return {
                    text: `Find f(g(${x})) if f(x) = ${a}x and g(x) = ${b}x + ${c}`,
                    correctAnswer: fgx.toString(),
                    explanation: `First find g(${x}) = ${gx}, then f(${gx}) = ${a}(${gx}) = ${fgx}`,
                    wrongAnswers: [
                        { value: (a * b * x + c).toString(), reason: "wrong-composition" },
                        { value: gx.toString(), reason: "forgot-outer-function" },
                        { value: (fgx + a).toString(), reason: "calculation-error" }
                    ]
                };
            }
        ];

        return randomChoice(templates)();
    }

    generateExponentialLogQuestion() {
        const templates = [
            () => {
                // Exponential growth: y = a(b)^x
                const initial = randomInt(100, 500);
                const rate = randomChoice([1.05, 1.1, 1.15, 1.2, 2]);
                const time = randomInt(2, 5);
                const result = Math.round(initial * Math.pow(rate, time));

                return {
                    text: `A population starts at ${initial} and grows by ${((rate - 1) * 100).toFixed(0)}% each year. What is the population after ${time} years?`,
                    latex: `y = ${initial}(${rate})^{${time}}`,
                    correctAnswer: result.toString(),
                    explanation: `Using y = ${initial}(${rate})^${time} = ${result}`,
                    wrongAnswers: [
                        { value: (initial + initial * (rate - 1) * time).toFixed(0), reason: "used-linear-growth" },
                        { value: (result * rate).toFixed(0), reason: "off-by-one" },
                        { value: (initial * Math.pow(rate, time + 1)).toFixed(0), reason: "calculation-error" }
                    ]
                };
            },
            () => {
                // Basic logarithm
                const base = randomChoice([2, 3, 10]);
                const exponent = randomInt(2, 4);
                const value = Math.pow(base, exponent);

                return {
                    text: `Evaluate:`,
                    latex: `\\log_{${base}}(${value})`,
                    correctAnswer: exponent.toString(),
                    explanation: `${base}^${exponent} = ${value}, so log₍${base}₎(${value}) = ${exponent}`,
                    wrongAnswers: [
                        { value: value.toString(), reason: "confused-with-exponent" },
                        { value: (exponent + 1).toString(), reason: "off-by-one" },
                        { value: base.toString(), reason: "returned-base" }
                    ]
                };
            }
        ];

        return randomChoice(templates)();
    }

    generateTrigonometryQuestion() {
        const templates = [
            () => {
                // Unit circle values
                const angles = [
                    { deg: 0, rad: '0', sin: '0', cos: '1' },
                    { deg: 30, rad: 'π/6', sin: '1/2', cos: '√3/2' },
                    { deg: 45, rad: 'π/4', sin: '√2/2', cos: '√2/2' },
                    { deg: 60, rad: 'π/3', sin: '√3/2', cos: '1/2' },
                    { deg: 90, rad: 'π/2', sin: '1', cos: '0' }
                ];

                const angle = randomChoice(angles);
                const func = randomChoice(['sin', 'cos']);
                const answer = func === 'sin' ? angle.sin : angle.cos;

                return {
                    text: `Find the exact value:`,
                    latex: `\\${func}(${angle.rad})`,
                    correctAnswer: answer,
                    explanation: `From the unit circle, ${func}(${angle.deg}°) = ${answer}`,
                    wrongAnswers: [
                        { value: func === 'sin' ? angle.cos : angle.sin, reason: "confused-sin-cos" },
                        { value: Math[func](angle.deg * Math.PI / 180).toFixed(2), reason: "used-decimal" },
                        { value: angle.deg.toString(), reason: "returned-angle" }
                    ]
                };
            },
            () => {
                // Solve trig equation
                const angle = randomChoice([30, 45, 60]);
                const value = Math.sin(angle * Math.PI / 180);

                return {
                    text: `Find x in the range [0°, 90°] if:`,
                    latex: `\\sin(x) = ${value.toFixed(2)}`,
                    correctAnswer: `${angle}°`,
                    explanation: `sin(${angle}°) = ${value.toFixed(2)}`,
                    wrongAnswers: [
                        { value: `${90 - angle}°`, reason: "complementary-angle" },
                        { value: `${angle + 10}°`, reason: "calculation-error" },
                        { value: `${angle / 2}°`, reason: "half-angle" }
                    ]
                };
            }
        ];

        return randomChoice(templates)();
    }

    generateLimitsDerivativesQuestion() {
        const templates = [
            () => {
                // Basic limit
                const a = randomInt(2, 6);
                const b = randomInt(-10, 10);
                const c = randomInt(1, 5);
                const limit = a * c * c + b;

                return {
                    text: `Find the limit:`,
                    latex: `\\lim_{x \\to ${c}} (${a}x^2 ${b >= 0 ? '+' : ''} ${b})`,
                    correctAnswer: limit.toString(),
                    explanation: `Direct substitution: ${a}(${c})² ${b >= 0 ? '+' : ''} ${b} = ${limit}`,
                    needsCalculator: true,
                    wrongAnswers: [
                        { value: (a * c + b).toString(), reason: "forgot-to-square" },
                        { value: b.toString(), reason: "ignored-x-term" },
                        { value: (limit + 1).toString(), reason: "calculation-error" }
                    ]
                };
            },
            () => {
                // Power rule derivative
                const a = randomInt(2, 10);
                const n = randomInt(2, 5);
                const derivative_coef = a * n;
                const derivative_exp = n - 1;

                return {
                    text: `Find the derivative using the power rule:`,
                    latex: `f(x) = ${a}x^{${n}}`,
                    correctAnswer: `${derivative_coef}x^${derivative_exp}`,
                    explanation: `Using d/dx[x^n] = nx^(n-1): ${a}·${n}x^${derivative_exp} = ${derivative_coef}x^${derivative_exp}`,
                    wrongAnswers: [
                        { value: `${a}x^${n}`, reason: "didnt-differentiate" },
                        { value: `${a}x^${n-1}`, reason: "forgot-to-multiply-coefficient" },
                        { value: `${derivative_coef}x^${n}`, reason: "didnt-reduce-exponent" }
                    ],
                    visualData: {
                        type: 'graph',
                        function: (x) => a * Math.pow(x, n),
                        xRange: [-3, 3],
                        yRange: [-10, 50],
                        showTangent: true
                    }
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
