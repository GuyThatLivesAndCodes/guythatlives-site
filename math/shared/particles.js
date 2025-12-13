// Shared Particle Effect System
// Casino-style reduced spawn rate for subtle psychological engagement

class ParticleSystem {
    constructor() {
        this.styleInjected = false;
        this.init();
    }

    init() {
        // Inject CSS for animations
        if (!this.styleInjected) {
            const style = document.createElement('style');
            style.setAttribute('data-particles', 'true');
            style.textContent = `
                @keyframes sparkleAnimation {
                    0% { transform: scale(0) rotate(0deg); opacity: 1; }
                    50% { transform: scale(1) rotate(180deg); opacity: 0.8; }
                    100% { transform: scale(0) rotate(360deg); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
            this.styleInjected = true;
        }

        // Add mousemove listener with reduced spawn rate
        document.addEventListener('mousemove', (e) => {
            // 99.5% miss rate = 0.5% spawn rate (50% reduction from original 2%)
            if (Math.random() > 0.995) {
                this.createSparkle(e.clientX, e.clientY);
            }
        });
    }

    createSparkle(x, y) {
        const sparkle = document.createElement('div');
        sparkle.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: 4px;
            height: 4px;
            background: var(--accent);
            border-radius: 50%;
            pointer-events: none;
            z-index: 1000;
            animation: sparkleAnimation 1s ease-out forwards;
        `;

        document.body.appendChild(sparkle);
        setTimeout(() => sparkle.remove(), 1000);
    }
}

// Auto-initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.particleSystem = new ParticleSystem();
    });
} else {
    window.particleSystem = new ParticleSystem();
}
