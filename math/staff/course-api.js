/**
 * course-api.js
 * Firestore CRUD for courses, lessons, and questions.
 * Depends on: Firebase SDK (loaded via CDN before this script).
 */

class CourseAPI {
    constructor() {
        this.db = firebase.firestore();
    }

    _ts() {
        return firebase.firestore.FieldValue.serverTimestamp();
    }

    _uid() {
        return window.authSystem ? window.authSystem.getCurrentUser()?.uid : null;
    }

    /* ======= COURSES ======= */

    async listCourses() {
        const snap = await this.db.collection('courses')
            .orderBy('updatedAt', 'desc').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async getCourse(courseId) {
        const doc = await this.db.collection('courses').doc(courseId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }

    async createCourse({ title, description = '', subject = 'math', gradeLevel = '' }) {
        const uid = this._uid();
        const ref = await this.db.collection('courses').add({
            title,
            description,
            subject,
            gradeLevel,
            status: 'draft',
            createdBy: uid,
            createdAt: this._ts(),
            updatedAt: this._ts(),
            publishedAt: null,
            lessonCount: 0
        });
        return ref.id;
    }

    async updateCourse(courseId, data) {
        await this.db.collection('courses').doc(courseId).update({
            ...data,
            updatedAt: this._ts()
        });
    }

    async deleteCourse(courseId) {
        // Delete questions → lessons → course (subcollections first)
        const lessons = await this.listLessons(courseId);
        for (const lesson of lessons) {
            await this.deleteLesson(courseId, lesson.id);
        }
        await this.db.collection('courses').doc(courseId).delete();
    }

    async touchCourse(courseId) {
        await this.db.collection('courses').doc(courseId).update({
            updatedAt: this._ts()
        });
    }

    /* ======= LESSONS ======= */

    async listLessons(courseId) {
        const snap = await this.db.collection('courses').doc(courseId)
            .collection('lessons').orderBy('order').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async getLesson(courseId, lessonId) {
        const doc = await this.db.collection('courses').doc(courseId)
            .collection('lessons').doc(lessonId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }

    async createLesson(courseId, { title, description = '', order = 0 }) {
        const ref = await this.db.collection('courses').doc(courseId)
            .collection('lessons').add({
                title,
                description,
                order,
                questionCount: 0,
                createdAt: this._ts(),
                updatedAt: this._ts()
            });

        // Bump course updatedAt and lessonCount
        await this.db.collection('courses').doc(courseId).update({
            updatedAt: this._ts(),
            lessonCount: firebase.firestore.FieldValue.increment(1)
        });

        return ref.id;
    }

    async updateLesson(courseId, lessonId, data) {
        await this.db.collection('courses').doc(courseId)
            .collection('lessons').doc(lessonId).update({
                ...data,
                updatedAt: this._ts()
            });
        await this.touchCourse(courseId);
    }

    async reorderLessons(courseId, orderedIds) {
        const batch = this.db.batch();
        orderedIds.forEach((id, idx) => {
            const ref = this.db.collection('courses').doc(courseId)
                .collection('lessons').doc(id);
            batch.update(ref, { order: idx });
        });
        await batch.commit();
        await this.touchCourse(courseId);
    }

    async deleteLesson(courseId, lessonId) {
        // Delete questions first
        const questions = await this.listQuestions(courseId, lessonId);
        for (const q of questions) {
            await this.deleteQuestion(courseId, lessonId, q.id);
        }
        await this.db.collection('courses').doc(courseId)
            .collection('lessons').doc(lessonId).delete();
        await this.db.collection('courses').doc(courseId).update({
            updatedAt: this._ts(),
            lessonCount: firebase.firestore.FieldValue.increment(-1)
        });
    }

    /* ======= QUESTIONS ======= */

    async listQuestions(courseId, lessonId) {
        const snap = await this.db.collection('courses').doc(courseId)
            .collection('lessons').doc(lessonId)
            .collection('questions').orderBy('order').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async getQuestion(courseId, lessonId, questionId) {
        const doc = await this.db.collection('courses').doc(courseId)
            .collection('lessons').doc(lessonId)
            .collection('questions').doc(questionId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }

    async createQuestion(courseId, lessonId, { title = 'Untitled Question', order = 0 }) {
        const ref = await this.db.collection('courses').doc(courseId)
            .collection('lessons').doc(lessonId)
            .collection('questions').add({
                title,
                order,
                variables: [],
                workflow: { nodes: [], edges: [] },
                template: {
                    questionType: 'multiple-choice',
                    textTemplate: '',
                    answerNodeId: null,
                    distractors: []
                },
                createdAt: this._ts(),
                updatedAt: this._ts()
            });

        await this.db.collection('courses').doc(courseId)
            .collection('lessons').doc(lessonId).update({
                updatedAt: this._ts(),
                questionCount: firebase.firestore.FieldValue.increment(1)
            });
        await this.touchCourse(courseId);

        return ref.id;
    }

    async saveQuestion(courseId, lessonId, questionId, data) {
        await this.db.collection('courses').doc(courseId)
            .collection('lessons').doc(lessonId)
            .collection('questions').doc(questionId).update({
                ...data,
                updatedAt: this._ts()
            });
        await this.touchCourse(courseId);
    }

    async reorderQuestions(courseId, lessonId, orderedIds) {
        const batch = this.db.batch();
        orderedIds.forEach((id, idx) => {
            const ref = this.db.collection('courses').doc(courseId)
                .collection('lessons').doc(lessonId)
                .collection('questions').doc(id);
            batch.update(ref, { order: idx });
        });
        await batch.commit();
        await this.touchCourse(courseId);
    }

    async deleteQuestion(courseId, lessonId, questionId) {
        await this.db.collection('courses').doc(courseId)
            .collection('lessons').doc(lessonId)
            .collection('questions').doc(questionId).delete();
        await this.db.collection('courses').doc(courseId)
            .collection('lessons').doc(lessonId).update({
                updatedAt: this._ts(),
                questionCount: firebase.firestore.FieldValue.increment(-1)
            });
        await this.touchCourse(courseId);
    }

    /* ======= ROLES ======= */

    async listStaffRoles() {
        const snap = await this.db.collection('staffRoles').get();
        return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    }
}

window.courseApi = new CourseAPI();
