/**
 * blueprint.js — Unreal Engine-style node graph editor
 *
 * Renders draggable nodes on a pannable/zoomable canvas.
 * Nodes are connected via bezier wire SVGs.
 * Evaluates the graph as a DAG to compute live preview values.
 *
 * Depends on: blueprint.css
 * Exposes: window.BlueprintEngine
 */

class BlueprintEngine {
    constructor(wrapperEl) {
        this.wrapper = wrapperEl;
        this.nodes = new Map();   // id → nodeData
        this.edges = new Map();   // id → { fromNodeId, fromPin, toNodeId, toPin }
        this._nodeCounter = 0;
        this._edgeCounter = 0;

        // Viewport state
        this.panX = 0;
        this.panY = 0;
        this.zoom = 1;

        // Interaction state
        this._draggingNode = null;
        this._draggingEdge = null;   // { fromNodeId, fromPin, svgLine }
        this._isPanning = false;
        this._panStart = null;

        // Current sample values (from question-builder)
        this._sampleValues = {};

        this._build();
    }

    _build() {
        this.wrapper.innerHTML = `
            <div class="bp-canvas-outer" tabindex="0">
                <div class="bp-canvas-inner">
                    <svg class="bp-svg" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <marker id="bp-arrow" markerWidth="6" markerHeight="6"
                                    refX="5" refY="3" orient="auto">
                                <path d="M0,0 L0,6 L6,3 z" fill="rgba(100,255,218,0.6)"/>
                            </marker>
                        </defs>
                        <g class="bp-edges-group"></g>
                        <line class="bp-drag-wire" style="display:none"/>
                    </svg>
                    <div class="bp-nodes-group"></div>
                </div>
            </div>
        `;
        this.outer = this.wrapper.querySelector('.bp-canvas-outer');
        this.inner = this.wrapper.querySelector('.bp-canvas-inner');
        this.svg   = this.wrapper.querySelector('.bp-svg');
        this.edgesGroup = this.wrapper.querySelector('.bp-edges-group');
        this.nodesGroup = this.wrapper.querySelector('.bp-nodes-group');
        this.dragWire   = this.wrapper.querySelector('.bp-drag-wire');

        this._bindInteraction();
    }

    /* ─────────────────────────────────────────────
       NODE DEFINITIONS
    ───────────────────────────────────────────── */

    static NODE_DEFS = {
        variable: {
            label: 'Variable',
            color: '#8be9fd',
            inputs: [],
            outputs: ['value'],
            compute: (inputs, config) => config.previewValue ?? 0
        },
        add: {
            label: 'Add',
            color: '#64ffda',
            inputs: ['A', 'B'],
            outputs: ['result'],
            compute: (inputs) => (Number(inputs.A) || 0) + (Number(inputs.B) || 0)
        },
        subtract: {
            label: 'Subtract',
            color: '#64ffda',
            inputs: ['A', 'B'],
            outputs: ['result'],
            compute: (inputs) => (Number(inputs.A) || 0) - (Number(inputs.B) || 0)
        },
        multiply: {
            label: 'Multiply',
            color: '#64ffda',
            inputs: ['A', 'B'],
            outputs: ['result'],
            compute: (inputs) => (Number(inputs.A) || 0) * (Number(inputs.B) || 0)
        },
        divide: {
            label: 'Divide',
            color: '#64ffda',
            inputs: ['A', 'B'],
            outputs: ['result'],
            compute: (inputs) => {
                const b = Number(inputs.B) || 0;
                return b !== 0 ? (Number(inputs.A) || 0) / b : 'ERR:÷0';
            }
        },
        round: {
            label: 'Round',
            color: '#f1fa8c',
            inputs: ['value', 'decimals'],
            outputs: ['result'],
            compute: (inputs) => {
                const d = Math.max(0, Math.round(Number(inputs.decimals) || 0));
                return parseFloat((Number(inputs.value) || 0).toFixed(d));
            }
        },
        floor: {
            label: 'Floor',
            color: '#f1fa8c',
            inputs: ['value'],
            outputs: ['result'],
            compute: (inputs) => Math.floor(Number(inputs.value) || 0)
        },
        ceil: {
            label: 'Ceil',
            color: '#f1fa8c',
            inputs: ['value'],
            outputs: ['result'],
            compute: (inputs) => Math.ceil(Number(inputs.value) || 0)
        },
        abs: {
            label: 'Abs',
            color: '#f1fa8c',
            inputs: ['value'],
            outputs: ['result'],
            compute: (inputs) => Math.abs(Number(inputs.value) || 0)
        },
        power: {
            label: 'Power',
            color: '#f1fa8c',
            inputs: ['base', 'exp'],
            outputs: ['result'],
            compute: (inputs) => Math.pow(Number(inputs.base)||0, Number(inputs.exp)||0)
        },
        sqrt: {
            label: 'Sqrt √',
            color: '#f1fa8c',
            inputs: ['value'],
            outputs: ['result'],
            compute: (inputs) => {
                const v = Number(inputs.value)||0;
                return v >= 0 ? Math.sqrt(v) : 'ERR:√neg';
            }
        },
        modulo: {
            label: 'Modulo',
            color: '#f1fa8c',
            inputs: ['A', 'B'],
            outputs: ['result'],
            compute: (inputs) => {
                const b = Number(inputs.B)||0;
                return b !== 0 ? (Number(inputs.A)||0) % b : 'ERR:mod0';
            }
        },
        min: {
            label: 'Min',
            color: '#f1fa8c',
            inputs: ['A', 'B'],
            outputs: ['result'],
            compute: (inputs) => Math.min(Number(inputs.A)||0, Number(inputs.B)||0)
        },
        max: {
            label: 'Max',
            color: '#f1fa8c',
            inputs: ['A', 'B'],
            outputs: ['result'],
            compute: (inputs) => Math.max(Number(inputs.A)||0, Number(inputs.B)||0)
        },
        formula: {
            label: 'Formula',
            color: '#e08cfa',
            inputs: [],
            outputs: ['result'],
            compute: (inputs, config, allValues) => {
                try {
                    const expr = (config.formula || '').trim();
                    if (!expr) return 0;
                    // Build a safe evaluation scope from allValues
                    const keys = Object.keys(allValues).join(',');
                    const vals = Object.values(allValues);
                    // eslint-disable-next-line no-new-func
                    const fn = new Function(keys, `"use strict"; return (${expr});`);
                    return fn(...vals);
                } catch (e) {
                    return 'ERR:formula';
                }
            }
        },
        output: {
            label: 'Output',
            color: '#50fa7b',
            inputs: ['value'],
            outputs: [],
            compute: (inputs) => inputs.value ?? 0
        }
    };

    /* ─────────────────────────────────────────────
       NODE MANAGEMENT
    ───────────────────────────────────────────── */

    addNode(type, x, y, config = {}) {
        const id = `node_${++this._nodeCounter}`;
        const def = BlueprintEngine.NODE_DEFS[type];
        if (!def) throw new Error(`Unknown node type: ${type}`);

        const node = {
            id, type, x, y, config,
            inputs: {},   // pin → connected edge id
            outputs: {}   // pin → array of connected edge ids
        };
        this.nodes.set(id, node);
        this._renderNode(id);
        this.onChanged && this.onChanged();
        return id;
    }

    updateNodeConfig(id, config) {
        const node = this.nodes.get(id);
        if (!node) return;
        node.config = { ...node.config, ...config };
        const el = document.getElementById(`bp-node-${id}`);
        if (el) {
            const labelEl = el.querySelector('.bp-node-config-label');
            if (labelEl) labelEl.textContent = this._getConfigSummary(node);
        }
        this._updatePreview(id);
        this.onChanged && this.onChanged();
    }

    removeNode(id) {
        // Remove all connected edges first
        [...this.edges.entries()].forEach(([eid, edge]) => {
            if (edge.fromNodeId === id || edge.toNodeId === id) {
                this._removeEdgeEl(eid);
                this.edges.delete(eid);
            }
        });
        document.getElementById(`bp-node-${id}`)?.remove();
        this.nodes.delete(id);
        this.renderWires();
        this.onChanged && this.onChanged();
    }

    /* ─────────────────────────────────────────────
       EDGE MANAGEMENT
    ───────────────────────────────────────────── */

    connect(fromNodeId, fromPin, toNodeId, toPin) {
        // Prevent duplicate connection to same input
        const existing = [...this.edges.values()].find(
            e => e.toNodeId === toNodeId && e.toPin === toPin
        );
        if (existing) {
            this.edges.delete([...this.edges.entries()].find(([,v])=>v===existing)[0]);
        }

        const id = `edge_${++this._edgeCounter}`;
        this.edges.set(id, { fromNodeId, fromPin, toNodeId, toPin });
        this.renderWires();
        this._updatePreview(toNodeId);
        this.onChanged && this.onChanged();
        return id;
    }

    disconnect(edgeId) {
        const edge = this.edges.get(edgeId);
        if (!edge) return;
        this.edges.delete(edgeId);
        this._removeEdgeEl(edgeId);
        this.renderWires();
        this.onChanged && this.onChanged();
    }

    /* ─────────────────────────────────────────────
       RENDER
    ───────────────────────────────────────────── */

    _renderNode(id) {
        const node = this.nodes.get(id);
        const def = BlueprintEngine.NODE_DEFS[node.type];
        const el = document.createElement('div');
        el.className = `bp-node bp-node-${node.type}`;
        el.id = `bp-node-${id}`;
        el.style.left = `${node.x}px`;
        el.style.top  = `${node.y}px`;
        el.style.setProperty('--node-color', def.color);

        // Header
        const header = document.createElement('div');
        header.className = 'bp-node-header';
        header.innerHTML = `
            <span class="bp-node-label">${def.label}</span>
            ${node.type !== 'variable' && node.type !== 'output'
                ? `<button class="bp-node-delete" data-node-id="${id}" title="Remove node">×</button>`
                : ''}
        `;
        el.appendChild(header);

        // Config area (for formula and variable display)
        if (node.type === 'formula') {
            const cfgArea = document.createElement('div');
            cfgArea.className = 'bp-node-config';
            cfgArea.innerHTML = `<input class="bp-formula-input" placeholder="e.g. (a + b) * 2" value="${escHtmlAttr(node.config.formula||'')}">`;
            el.appendChild(cfgArea);
            cfgArea.querySelector('input').addEventListener('input', e => {
                this.updateNodeConfig(id, { formula: e.target.value });
            });
        } else if (node.type === 'variable') {
            const cfgArea = document.createElement('div');
            cfgArea.className = 'bp-node-config';
            cfgArea.innerHTML = `<span class="bp-node-config-label">${escHtml(this._getConfigSummary(node))}</span>`;
            el.appendChild(cfgArea);
        }

        // Pins row
        const pinsRow = document.createElement('div');
        pinsRow.className = 'bp-pins-row';

        // Input pins (left side)
        const inputCol = document.createElement('div');
        inputCol.className = 'bp-pins-col bp-inputs';
        def.inputs.forEach(pin => {
            const pinEl = document.createElement('div');
            pinEl.className = 'bp-pin bp-pin-input';
            pinEl.dataset.nodeId = id;
            pinEl.dataset.pin = pin;
            pinEl.dataset.dir = 'input';
            pinEl.innerHTML = `<div class="bp-pin-dot bp-pin-dot-input" data-node-id="${id}" data-pin="${pin}" data-dir="input"></div><span class="bp-pin-label">${escHtml(pin)}</span>`;
            inputCol.appendChild(pinEl);
        });

        // Preview value (center)
        const previewEl = document.createElement('div');
        previewEl.className = 'bp-node-preview';
        previewEl.id = `bp-preview-${id}`;
        previewEl.textContent = '–';

        // Output pins (right side)
        const outputCol = document.createElement('div');
        outputCol.className = 'bp-pins-col bp-outputs';
        def.outputs.forEach(pin => {
            const pinEl = document.createElement('div');
            pinEl.className = 'bp-pin bp-pin-output';
            pinEl.dataset.nodeId = id;
            pinEl.dataset.pin = pin;
            pinEl.dataset.dir = 'output';
            pinEl.innerHTML = `<span class="bp-pin-label">${escHtml(pin)}</span><div class="bp-pin-dot bp-pin-dot-output" data-node-id="${id}" data-pin="${pin}" data-dir="output"></div>`;
            outputCol.appendChild(pinEl);
        });

        pinsRow.appendChild(inputCol);
        pinsRow.appendChild(previewEl);
        pinsRow.appendChild(outputCol);
        el.appendChild(pinsRow);

        this.nodesGroup.appendChild(el);
        this._bindNodeInteraction(el, id);
    }

    _getConfigSummary(node) {
        if (node.type === 'variable') {
            const v = node.config;
            if (v.varType === 'constant')  return `= ${v.value}`;
            if (v.varType === 'int')       return `int [${v.min}, ${v.max}]`;
            if (v.varType === 'float')     return `float [${v.min}, ${v.max}] .${v.decimals}`;
            if (v.varType === 'stringpool') return `pool (${(v.pool||[]).length} strings)`;
        }
        return '';
    }

    renderWires() {
        this.edgesGroup.innerHTML = '';
        this.edges.forEach((edge, eid) => {
            const fromEl = this._getPinDotEl(edge.fromNodeId, edge.fromPin, 'output');
            const toEl   = this._getPinDotEl(edge.toNodeId,   edge.toPin,   'input');
            if (!fromEl || !toEl) return;

            const [x1,y1] = this._pinPos(fromEl);
            const [x2,y2] = this._pinPos(toEl);
            const path = this._makeBezier(x1, y1, x2, y2);

            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathEl.setAttribute('d', path);
            pathEl.setAttribute('class', 'bp-wire');
            pathEl.setAttribute('data-edge-id', eid);
            pathEl.addEventListener('dblclick', () => this.disconnect(eid));
            this.edgesGroup.appendChild(pathEl);
        });
    }

    _pinPos(dotEl) {
        const canvasRect = this.inner.getBoundingClientRect();
        const pinRect = dotEl.getBoundingClientRect();
        return [
            (pinRect.left + pinRect.width / 2 - canvasRect.left) / this.zoom,
            (pinRect.top  + pinRect.height / 2 - canvasRect.top) / this.zoom
        ];
    }

    _makeBezier(x1, y1, x2, y2) {
        const cx = Math.abs(x2 - x1) * 0.5;
        return `M ${x1} ${y1} C ${x1+cx} ${y1}, ${x2-cx} ${y2}, ${x2} ${y2}`;
    }

    _getPinDotEl(nodeId, pin, dir) {
        return this.nodesGroup.querySelector(
            `.bp-pin-dot[data-node-id="${nodeId}"][data-pin="${pin}"][data-dir="${dir}"]`
        );
    }

    _removeEdgeEl(eid) {
        this.edgesGroup.querySelector(`[data-edge-id="${eid}"]`)?.remove();
    }

    /* ─────────────────────────────────────────────
       EVALUATION
    ───────────────────────────────────────────── */

    setSampleValues(valMap) {
        // valMap: { variableName: sampledValue }
        this._sampleValues = valMap;
        // Inject into variable nodes
        this.nodes.forEach((node, id) => {
            if (node.type === 'variable' && node.config.varName) {
                const v = valMap[node.config.varName];
                node.config.previewValue = v ?? 0;
            }
        });
        this._updateAllPreviews();
    }

    evaluateAll() {
        const results = new Map();
        const visited = new Set();
        const inStack = new Set();

        const evaluate = (nodeId) => {
            if (results.has(nodeId)) return results.get(nodeId);
            if (inStack.has(nodeId)) throw new Error('Circular dependency detected');
            inStack.add(nodeId);

            const node = this.nodes.get(nodeId);
            if (!node) return 0;
            const def = BlueprintEngine.NODE_DEFS[node.type];

            // Resolve input values
            const inputValues = {};
            def.inputs.forEach(pin => {
                // Find edge connecting to this input
                const edge = [...this.edges.values()].find(
                    e => e.toNodeId === nodeId && e.toPin === pin
                );
                if (edge) {
                    const srcVal = evaluate(edge.fromNodeId);
                    inputValues[pin] = srcVal;
                } else {
                    inputValues[pin] = 0; // unconnected input defaults to 0
                }
            });

            // Build flat values map for formula node
            const allValues = {};
            this.nodes.forEach((n, nid) => {
                if (n.type === 'variable' && n.config.varName) {
                    allValues[n.config.varName] = n.config.previewValue ?? 0;
                }
            });

            const result = def.compute(inputValues, node.config, allValues);
            results.set(nodeId, result);
            inStack.delete(nodeId);
            visited.add(nodeId);
            return result;
        };

        try {
            this.nodes.forEach((_, id) => evaluate(id));
        } catch (e) {
            throw e;
        }

        return results;
    }

    getOutputValues() {
        // Returns { nodeId: value } for all Output nodes
        try {
            const all = this.evaluateAll();
            const outputs = {};
            this.nodes.forEach((node, id) => {
                if (node.type === 'output') {
                    outputs[id] = all.get(id) ?? 0;
                    outputs[node.config.label || id] = all.get(id) ?? 0;
                }
            });
            return { ok: true, values: outputs, allValues: Object.fromEntries(all) };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }

    _updateAllPreviews() {
        try {
            const all = this.evaluateAll();
            all.forEach((val, id) => {
                const el = document.getElementById(`bp-preview-${id}`);
                if (el) {
                    const display = typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(4).replace(/\.?0+$/, '')) : String(val);
                    el.textContent = display;
                    el.style.color = String(val).startsWith('ERR') ? 'var(--danger)' : '';
                }
            });
        } catch (e) {
            // Circular or error — mark affected nodes
        }
    }

    _updatePreview(nodeId) {
        this._updateAllPreviews();
    }

    /* ─────────────────────────────────────────────
       INTERACTION
    ───────────────────────────────────────────── */

    _bindInteraction() {
        // Pan on canvas background
        this.outer.addEventListener('mousedown', e => {
            if (e.target === this.outer || e.target === this.inner || e.target === this.svg) {
                this._isPanning = true;
                this._panStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
                this.outer.style.cursor = 'grabbing';
            }
        });
        window.addEventListener('mousemove', e => {
            if (this._isPanning) {
                this.panX = e.clientX - this._panStart.x;
                this.panY = e.clientY - this._panStart.y;
                this._applyTransform();
            }
            if (this._draggingNode) {
                const { id, startX, startY, startMouseX, startMouseY } = this._draggingNode;
                const dx = (e.clientX - startMouseX) / this.zoom;
                const dy = (e.clientY - startMouseY) / this.zoom;
                const node = this.nodes.get(id);
                node.x = startX + dx;
                node.y = startY + dy;
                const el = document.getElementById(`bp-node-${id}`);
                if (el) { el.style.left = `${node.x}px`; el.style.top = `${node.y}px`; }
                this.renderWires();
            }
            if (this._draggingEdge) {
                const rect = this.inner.getBoundingClientRect();
                const mx = (e.clientX - rect.left) / this.zoom;
                const my = (e.clientY - rect.top)  / this.zoom;
                const { x1, y1 } = this._draggingEdge;
                const cx = Math.abs(mx - x1) * 0.5;
                const d = `M ${x1} ${y1} C ${x1+cx} ${y1}, ${mx-cx} ${my}, ${mx} ${my}`;
                this._draggingEdge.tempPath.setAttribute('d', d);
            }
        });
        window.addEventListener('mouseup', e => {
            this._isPanning = false;
            this.outer.style.cursor = '';
            if (this._draggingNode) {
                this._draggingNode = null;
                this.onChanged && this.onChanged();
            }
            if (this._draggingEdge) {
                this._draggingEdge.tempPath?.remove();
                this._draggingEdge = null;
            }
        });

        // Zoom
        this.outer.addEventListener('wheel', e => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom = Math.min(Math.max(this.zoom * delta, 0.25), 3);
            this._applyTransform();
        }, { passive: false });

        // Pin wire drag start
        this.nodesGroup.addEventListener('mousedown', e => {
            const dot = e.target.closest('.bp-pin-dot-output');
            if (!dot) return;
            e.stopPropagation();
            const nodeId = dot.dataset.nodeId;
            const pin = dot.dataset.pin;
            const [x1, y1] = this._pinPos(dot);
            const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            tempPath.setAttribute('class', 'bp-wire bp-wire-temp');
            this.edgesGroup.appendChild(tempPath);
            this._draggingEdge = { fromNodeId: nodeId, fromPin: pin, x1, y1, tempPath };
        });

        // Pin wire drop
        this.nodesGroup.addEventListener('mouseup', e => {
            if (!this._draggingEdge) return;
            const dot = e.target.closest('.bp-pin-dot-input');
            if (dot) {
                const toNodeId = dot.dataset.nodeId;
                const toPin = dot.dataset.pin;
                const { fromNodeId, fromPin } = this._draggingEdge;
                if (fromNodeId !== toNodeId) {
                    this.connect(fromNodeId, fromPin, toNodeId, toPin);
                }
            }
        });

        // Node delete buttons
        this.nodesGroup.addEventListener('click', e => {
            const btn = e.target.closest('.bp-node-delete');
            if (btn) {
                const id = btn.dataset.nodeId;
                if (confirm('Remove this node and its connections?')) {
                    this.removeNode(id);
                }
            }
        });
    }

    _bindNodeInteraction(el, id) {
        const header = el.querySelector('.bp-node-header');
        header.addEventListener('mousedown', e => {
            if (e.target.closest('.bp-node-delete')) return;
            e.stopPropagation();
            const node = this.nodes.get(id);
            this._draggingNode = {
                id,
                startX: node.x,
                startY: node.y,
                startMouseX: e.clientX,
                startMouseY: e.clientY
            };
            el.style.zIndex = '10';
        });
        el.addEventListener('mouseup', () => {
            el.style.zIndex = '';
        });
    }

    _applyTransform() {
        this.inner.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
        this.renderWires();
    }

    resetView() {
        this.panX = 0; this.panY = 0; this.zoom = 1;
        this._applyTransform();
    }

    /* ─────────────────────────────────────────────
       SERIALIZATION
    ───────────────────────────────────────────── */

    toJSON() {
        return {
            nodes: [...this.nodes.values()].map(n => ({
                id: n.id, type: n.type, x: n.x, y: n.y, config: n.config
            })),
            edges: [...this.edges.values()],
            panX: this.panX, panY: this.panY, zoom: this.zoom
        };
    }

    fromJSON(data) {
        // Clear existing
        this.nodes.clear();
        this.edges.clear();
        this.nodesGroup.innerHTML = '';
        this.edgesGroup.innerHTML = '';
        this._nodeCounter = 0;
        this._edgeCounter = 0;

        if (!data || !data.nodes) return;

        // Restore pan/zoom
        this.panX = data.panX || 0;
        this.panY = data.panY || 0;
        this.zoom = data.zoom || 1;
        this._applyTransform();

        // Restore nodes (preserving original IDs)
        data.nodes.forEach(n => {
            const id = n.id;
            const num = parseInt(id.replace('node_', ''), 10);
            if (!isNaN(num) && num > this._nodeCounter) this._nodeCounter = num;

            const def = BlueprintEngine.NODE_DEFS[n.type];
            if (!def) return;
            this.nodes.set(id, { id, type: n.type, x: n.x, y: n.y, config: n.config || {}, inputs: {}, outputs: {} });
            this._renderNode(id);
        });

        // Restore edges
        data.edges.forEach(e => {
            const eid = `edge_${++this._edgeCounter}`;
            this.edges.set(eid, e);
        });
        this.renderWires();
    }
}

// Helpers used inside this file
function escHtml(s) { return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escHtmlAttr(s) { return String(s??'').replace(/"/g,'&quot;'); }

window.BlueprintEngine = BlueprintEngine;
