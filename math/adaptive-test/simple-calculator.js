/**
 * SimpleCalculator - Moveable calculator widget for math test
 */

class SimpleCalculator {
    constructor(elementId) {
        this.element = document.getElementById(elementId);
        this.display = document.getElementById('calc-display');
        this.header = document.getElementById('calc-header');
        this.closeBtn = document.getElementById('calc-close');

        this.currentValue = '0';
        this.previousValue = null;
        this.operator = null;
        this.waitingForOperand = false;

        // Drag functionality
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.elementStartX = 0;
        this.elementStartY = 0;

        this.init();
    }

    init() {
        // Button event listeners
        this.element.querySelectorAll('.calc-btn').forEach(button => {
            button.addEventListener('click', (e) => this.handleButtonClick(e));
        });

        // Close button
        this.closeBtn.addEventListener('click', () => this.hide());

        // Make draggable
        this.header.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());

        // Touch support for mobile
        this.header.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]));
        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
                this.drag(e.touches[0]);
            }
        }, { passive: false });
        document.addEventListener('touchend', () => this.endDrag());
    }

    handleButtonClick(e) {
        const button = e.target.closest('.calc-btn');
        if (!button) return;

        const action = button.dataset.action;
        const value = button.dataset.value;

        switch (action) {
            case 'number':
                this.inputNumber(value);
                break;
            case 'decimal':
                this.inputDecimal();
                break;
            case 'operator':
                this.inputOperator(value);
                break;
            case 'equals':
                this.calculate();
                break;
            case 'clear':
                this.clear();
                break;
        }
    }

    inputNumber(num) {
        if (this.waitingForOperand) {
            this.currentValue = num;
            this.waitingForOperand = false;
        } else {
            this.currentValue = this.currentValue === '0' ? num : this.currentValue + num;
        }
        this.updateDisplay();
    }

    inputDecimal() {
        if (this.waitingForOperand) {
            this.currentValue = '0.';
            this.waitingForOperand = false;
        } else if (!this.currentValue.includes('.')) {
            this.currentValue += '.';
        }
        this.updateDisplay();
    }

    inputOperator(op) {
        const inputValue = parseFloat(this.currentValue);

        if (this.previousValue === null) {
            this.previousValue = inputValue;
        } else if (this.operator) {
            const result = this.performCalculation();
            this.currentValue = String(result);
            this.previousValue = result;
        }

        this.waitingForOperand = true;
        this.operator = op;
        this.updateDisplay();
    }

    calculate() {
        const inputValue = parseFloat(this.currentValue);

        if (this.previousValue !== null && this.operator) {
            const result = this.performCalculation();
            this.currentValue = String(result);
            this.previousValue = null;
            this.operator = null;
            this.waitingForOperand = true;
            this.updateDisplay();
        }
    }

    performCalculation() {
        const prev = this.previousValue;
        const current = parseFloat(this.currentValue);

        switch (this.operator) {
            case '+':
                return prev + current;
            case '-':
                return prev - current;
            case '*':
                return prev * current;
            case '/':
                return current !== 0 ? prev / current : 0;
            default:
                return current;
        }
    }

    clear() {
        this.currentValue = '0';
        this.previousValue = null;
        this.operator = null;
        this.waitingForOperand = false;
        this.updateDisplay();
    }

    updateDisplay() {
        // Limit display to reasonable length
        const displayValue = this.currentValue.length > 12
            ? parseFloat(this.currentValue).toExponential(4)
            : this.currentValue;
        this.display.textContent = displayValue;
    }

    // Drag functionality
    startDrag(e) {
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;

        const rect = this.element.getBoundingClientRect();
        this.elementStartX = rect.left;
        this.elementStartY = rect.top;

        this.header.style.cursor = 'grabbing';
    }

    drag(e) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.dragStartX;
        const deltaY = e.clientY - this.dragStartY;

        const newX = this.elementStartX + deltaX;
        const newY = this.elementStartY + deltaY;

        // Keep calculator within viewport
        const maxX = window.innerWidth - this.element.offsetWidth;
        const maxY = window.innerHeight - this.element.offsetHeight;

        const boundedX = Math.max(0, Math.min(newX, maxX));
        const boundedY = Math.max(0, Math.min(newY, maxY));

        this.element.style.left = boundedX + 'px';
        this.element.style.top = boundedY + 'px';
        this.element.style.right = 'auto';
    }

    endDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            this.header.style.cursor = 'move';
        }
    }

    show() {
        this.element.classList.add('active');
        this.clear(); // Reset calculator when showing
    }

    hide() {
        this.element.classList.remove('active');
    }

    isVisible() {
        return this.element.classList.contains('active');
    }
}

// Initialize calculator when DOM is ready
let simpleCalculator = null;

document.addEventListener('DOMContentLoaded', () => {
    simpleCalculator = new SimpleCalculator('simple-calculator');
});
