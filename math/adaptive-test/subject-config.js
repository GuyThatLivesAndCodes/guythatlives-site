/**
 * Subject Configuration
 * Defines all available subjects for adaptive testing
 */

const SUBJECT_CONFIG = {
    math: {
        id: 'math',
        name: 'Mathematics',
        icon: '📐',
        description: '5th Grade to Pre-Calculus',
        tokenCost: 1,
        available: true,
        questionCount: {
            min: 30,
            target: 40,
            max: 50
        },
        topics: [
            'arithmetic',
            'fractions',
            'linear-equations',
            'quadratic-equations',
            'geometry',
            'word-problems',
            'algebraic-expressions',
            'ratios-proportions',
            'statistics-probability',
            'polynomials',
            'systems-equations',
            'radicals-exponents',
            'sequences-series',
            'functions',
            'exponential-logarithms',
            'trigonometry',
            'limits-derivatives'
        ],
        gradeRange: '5th Grade - Pre-Calculus',
        difficultyLevels: {
            1: '5th Grade - Basic Arithmetic',
            5: '6th Grade - Fractions & Decimals',
            10: '7th Grade - Pre-Algebra',
            15: '8th Grade - Algebra 1',
            20: '9th-10th Grade - Geometry & Algebra 2',
            25: '11th Grade - Pre-Calculus',
            30: '12th Grade - Calculus Concepts'
        }
    },

    science: {
        id: 'science',
        name: 'Science',
        icon: '🔬',
        description: 'Biology, Chemistry, Physics',
        tokenCost: 1,
        available: false,
        questionCount: {
            min: 30,
            target: 40,
            max: 50
        },
        topics: [
            // To be added in Sprint 6
            'biology-cells',
            'biology-genetics',
            'biology-evolution',
            'chemistry-atoms',
            'chemistry-reactions',
            'chemistry-organic',
            'physics-motion',
            'physics-energy',
            'physics-waves',
            'earth-science'
        ],
        gradeRange: '6th Grade - High School',
        difficultyLevels: {
            1: '6th Grade - Basic Science',
            10: '7th-8th Grade - Life Science',
            15: '9th Grade - Physical Science',
            20: '10th Grade - Biology',
            25: '11th Grade - Chemistry',
            30: '12th Grade - Physics'
        }
    },

    english: {
        id: 'english',
        name: 'English',
        icon: '📚',
        description: 'Reading Comprehension & Grammar',
        tokenCost: 1,
        available: false,
        questionCount: {
            min: 30,
            target: 40,
            max: 50
        },
        topics: [
            // To be added in Sprint 6
            'reading-comprehension',
            'grammar-syntax',
            'vocabulary',
            'writing-mechanics',
            'literary-analysis',
            'rhetoric',
            'poetry-analysis'
        ],
        gradeRange: '5th Grade - High School',
        difficultyLevels: {
            1: '5th Grade - Basic Reading',
            10: '7th Grade - Comprehension',
            15: '8th Grade - Analysis',
            20: '9th-10th Grade - Literary Analysis',
            25: '11th Grade - Advanced Analysis',
            30: '12th Grade - Critical Analysis'
        }
    },

    master: {
        id: 'master',
        name: 'Master Test',
        icon: '🏆',
        description: 'All Subjects Combined',
        tokenCost: 5,
        available: false, // Will be enabled when all subjects are ready
        questionCount: {
            min: 60,
            target: 60,
            max: 60 // Fixed at 60 for Master Test
        },
        topics: [], // Will combine topics from all subjects
        gradeRange: '5th Grade - 12th Grade (All Subjects)',
        difficultyLevels: {
            1: 'Elementary Level - All Subjects',
            10: 'Middle School - All Subjects',
            20: 'High School - All Subjects',
            30: 'Advanced - All Subjects'
        },
        subjectMix: {
            math: 20, // 20 questions
            science: 20, // 20 questions
            english: 20 // 20 questions
        }
    }
};

/**
 * Get subject config by ID
 */
function getSubjectConfig(subjectId) {
    return SUBJECT_CONFIG[subjectId] || null;
}

/**
 * Get all available subjects
 */
function getAvailableSubjects() {
    return Object.values(SUBJECT_CONFIG).filter(subject => subject.available);
}

/**
 * Get all subjects (including unavailable)
 */
function getAllSubjects() {
    return Object.values(SUBJECT_CONFIG);
}

/**
 * Check if subject is available
 */
function isSubjectAvailable(subjectId) {
    const subject = SUBJECT_CONFIG[subjectId];
    return subject && subject.available;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUBJECT_CONFIG,
        getSubjectConfig,
        getAvailableSubjects,
        getAllSubjects,
        isSubjectAvailable
    };
}
