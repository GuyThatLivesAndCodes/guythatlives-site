/**
 * question-builder.js — Variable system + template + preview logic
 *
 * Manages the left-panel variable list and right-panel template/preview.
 * Coordinates with BlueprintEngine for live value previews.
 *
 * Exposes: window.QuestionBuilder
 */

class QuestionBuilder {
    constructor(blueprintEngine) {
        this.bp = blueprintEngine;
        this.variables = [];     // [{ name, type, ...config }]
        this._onChangeCallbacks = [];

        // Wire up blueprint changes to re-run previews
        this.bp.onChanged = () => {
            this._refreshBlueprintPreview();
            this._emitChange();
        };
    }

    /* ─────────────────────────────────────────────
       VARIABLE MANAGEMENT
    ───────────────────────────────────────────── */

    addVariable(def) {
        // def: { name, type: 'constant'|'int'|'float'|'stringpool', ...config }
        if (!def.name || !def.name.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
            throw new Error('Variable name must start with a letter and contain only letters, numbers, and underscores.');
        }
        if (this.variables.find(v => v.name === def.name)) {
            throw new Error(`Variable "${def.name}" already exists.`);
        }

        this.variables.push({ ...def });

        // Create a Variable node in the blueprint
        const sample = this._sampleOne(def);
        const x = 60 + (this.variables.length - 1) * 0;
        const y = 60 + (this.variables.length - 1) * 120;
        const nodeId = this.bp.addNode('variable', x, y, {
            varName: def.name,
            varType: def.type,
            ...def,
            previewValue: sample
        });
        // Store node id back on the variable def
        this.variables[this.variables.length - 1]._nodeId = nodeId;

        this._refreshBlueprintPreview();
        this._emitChange();
        return nodeId;
    }

    updateVariable(name, newDef) {
        const idx = this.variables.findIndex(v => v.name === name);
        if (idx === -1) throw new Error(`Variable "${name}" not found.`);

        const old = this.variables[idx];
        // If renaming, reject duplicates
        if (newDef.name && newDef.name !== name) {
            if (this.variables.find(v => v.name === newDef.name)) {
                throw new Error(`Variable "${newDef.name}" already exists.`);
            }
        }

        this.variables[idx] = { ...old, ...newDef };

        // Update the blueprint node config
        if (old._nodeId) {
            const sample = this._sampleOne(this.variables[idx]);
            this.bp.updateNodeConfig(old._nodeId, {
                varName: this.variables[idx].name,
                varType: this.variables[idx].type,
                ...this.variables[idx],
                previewValue: sample
            });
        }

        this._refreshBlueprintPreview();
        this._emitChange();
    }

    removeVariable(name) {
        const idx = this.variables.findIndex(v => v.name === name);
        if (idx === -1) return;
        const nodeId = this.variables[idx]._nodeId;
        this.variables.splice(idx, 1);
        if (nodeId) this.bp.removeNode(nodeId);
        this._emitChange();
    }

    getVariable(name) {
        return this.variables.find(v => v.name === name);
    }

    /* ─────────────────────────────────────────────
       SAMPLING
    ───────────────────────────────────────────── */

    _sampleOne(def) {
        switch (def.type) {
            case 'constant':
                return Number.isFinite(parseFloat(def.value)) ? parseFloat(def.value) : def.value;
            case 'int': {
                const min = parseInt(def.min ?? 1, 10);
                const max = parseInt(def.max ?? 10, 10);
                return Math.floor(Math.random() * (max - min + 1)) + min;
            }
            case 'float': {
                const min = parseFloat(def.min ?? 0);
                const max = parseFloat(def.max ?? 1);
                const d   = parseInt(def.decimals ?? 2, 10);
                return parseFloat((Math.random() * (max - min) + min).toFixed(d));
            }
            case 'stringpool': {
                const pool = Array.isArray(def.pool) ? def.pool : (def.pool || '').split('\n').map(s => s.trim()).filter(Boolean);
                if (!pool.length) return '';
                return pool[Math.floor(Math.random() * pool.length)];
            }
            default:
                return 0;
        }
    }

    sampleAll() {
        const result = {};
        this.variables.forEach(v => { result[v.name] = this._sampleOne(v); });
        return result;
    }

    _refreshBlueprintPreview() {
        const sample = this.sampleAll();
        this.bp.setSampleValues(sample);
    }

    /* ─────────────────────────────────────────────
       TEMPLATE RENDERING
    ───────────────────────────────────────────── */

    /**
     * Renders a template string like "What is {a} + {b}?"
     * with the given variable and node value maps.
     */
    renderTemplate(template, varValues, nodeValues = {}) {
        return template.replace(/\{([^}]+)\}/g, (_, key) => {
            if (varValues.hasOwnProperty(key)) {
                const v = varValues[key];
                return typeof v === 'number' ? (Number.isInteger(v) ? v : parseFloat(v.toFixed(6)).toString()) : v;
            }
            if (nodeValues.hasOwnProperty(key)) {
                const v = nodeValues[key];
                return typeof v === 'number' ? (Number.isInteger(v) ? v : parseFloat(v.toFixed(6)).toString()) : v;
            }
            return `{${key}}`; // leave unknown vars as-is (will flag in validation)
        });
    }

    /* ─────────────────────────────────────────────
       PREVIEW GENERATION
    ───────────────────────────────────────────── */

    generatePreview(n = 5, template = '', answerNodeId = null, distractorRules = []) {
        const samples = [];
        for (let i = 0; i < n; i++) {
            const varValues = this.sampleAll();
            this.bp.setSampleValues(varValues);

            const evalResult = this.bp.getOutputValues();
            const nodeValues = evalResult.ok ? evalResult.allValues : {};

            const questionText = this.renderTemplate(template, varValues, nodeValues);
            const answer = answerNodeId ? (evalResult.ok ? evalResult.values[answerNodeId] ?? evalResult.values[Object.keys(evalResult.values)[0]] : 'ERROR') : null;
            const distractors = this._generateDistractors(answer, distractorRules, varValues);

            samples.push({
                variables: { ...varValues },
                nodeValues,
                questionText,
                answer,
                distractors,
                error: evalResult.ok ? null : evalResult.error
            });
        }
        // Restore a fresh sample so the UI updates
        this._refreshBlueprintPreview();
        return samples;
    }

    _generateDistractors(answer, rules, varValues) {
        if (!rules || !rules.length) return [];
        const ans = typeof answer === 'number' ? answer : parseFloat(answer);
        if (isNaN(ans)) return [];

        const distractors = new Set();
        rules.forEach(rule => {
            try {
                let val;
                switch (rule.type) {
                    case 'offset_const':
                        val = ans + parseFloat(rule.offset || 1);
                        distractors.add(val);
                        val = ans - parseFloat(rule.offset || 1);
                        distractors.add(val);
                        break;
                    case 'offset_rand': {
                        const r = Math.floor(Math.random() * (parseInt(rule.max,10) - parseInt(rule.min,10) + 1)) + parseInt(rule.min,10);
                        distractors.add(ans + r);
                        distractors.add(ans - r);
                        break;
                    }
                    case 'floor': distractors.add(Math.floor(ans)); break;
                    case 'ceil':  distractors.add(Math.ceil(ans));  break;
                    case 'neg':   distractors.add(-ans);            break;
                    case 'formula': {
                        const scope = { answer: ans, ...varValues };
                        const keys = Object.keys(scope).join(',');
                        const vals = Object.values(scope);
                        // eslint-disable-next-line no-new-func
                        const fn = new Function(keys, `"use strict"; return (${rule.formula});`);
                        distractors.add(fn(...vals));
                        break;
                    }
                }
            } catch (_) {}
        });

        return [...distractors].filter(d => d !== ans).slice(0, 3);
    }

    /* ─────────────────────────────────────────────
       VALIDATION
    ───────────────────────────────────────────── */

    validate(template, answerNodeId) {
        const errors = [];

        if (!template || !template.trim()) {
            errors.push('Question text template is empty.');
        }

        if (!answerNodeId) {
            errors.push('No answer Output node selected.');
        } else {
            const node = this.bp.nodes.get(answerNodeId);
            if (!node || node.type !== 'output') {
                errors.push('Selected answer node is not an Output node.');
            }
            // Check output node has an input connection
            const hasEdge = [...this.bp.edges.values()].some(e => e.toNodeId === answerNodeId);
            if (!hasEdge) {
                errors.push('Answer Output node has no input connected.');
            }
        }

        // Check for circular dependencies
        try { this.bp.evaluateAll(); }
        catch (e) { errors.push('Blueprint error: ' + e.message); }

        // Check template variables all exist
        const templateVars = [...(template.matchAll(/\{([^}]+)\}/g))].map(m => m[1]);
        const allNames = new Set(this.variables.map(v => v.name));
        // Also include output node label names
        this.bp.nodes.forEach((n, id) => { if (n.type === 'output') allNames.add(n.config.label || id); });
        templateVars.forEach(v => {
            if (!allNames.has(v)) errors.push(`Template references unknown variable: {${v}}`);
        });

        return errors;
    }

    /* ─────────────────────────────────────────────
       SERIALIZATION
    ───────────────────────────────────────────── */

    toJSON() {
        return {
            variables: this.variables.map(v => {
                const { _nodeId, ...rest } = v;
                return rest;
            }),
            workflow: this.bp.toJSON()
        };
    }

    fromJSON(data, template) {
        if (!data) return;

        // First restore blueprint
        if (data.workflow) this.bp.fromJSON(data.workflow);

        // Then reconnect variables to their nodes
        this.variables = [];
        if (Array.isArray(data.variables)) {
            data.variables.forEach(v => {
                // Find the variable node that matches this var name
                let nodeId = null;
                this.bp.nodes.forEach((n, id) => {
                    if (n.type === 'variable' && n.config.varName === v.name) nodeId = id;
                });
                this.variables.push({ ...v, _nodeId: nodeId });
            });
        }

        this._refreshBlueprintPreview();
    }

    onChange(cb) {
        this._onChangeCallbacks.push(cb);
    }
    _emitChange() {
        this._onChangeCallbacks.forEach(cb => cb());
    }
}

window.QuestionBuilder = QuestionBuilder;
