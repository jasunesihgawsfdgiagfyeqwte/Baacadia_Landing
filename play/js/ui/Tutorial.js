/**
 * Tutorial - Guided tutorial system
 * Simple notification-based hints, no blocking overlays
 */
export class Tutorial {
    constructor(game) {
        this.game = game;

        // Tutorial state
        this.currentStep = 0;
        this.isActive = false;

        // Tutorial steps - all use inline hints, no blocking overlay
        this.steps = [
            {
                text: "Use <b>WASD</b> to move, <b>Mouse</b> to look around",
                duration: 5000,
            },
            {
                text: "Approach a <b>Cloudfen</b> and hold <b>Q</b> to record its sound",
                duration: 8000,
            },
            {
                text: "Hold <b>Left Click</b> to play the Gather sound",
                duration: 6000,
            },
            {
                text: "Find the <b>Bird</b> near the exit and record its <b>Charge</b> sound",
                duration: 8000,
            },
            {
                text: "Use <b>Charge</b> to make Cloudfens push the <b>Moss Ball</b>!",
                duration: 10000,
            },
        ];

        this.currentHintEl = null;
    }

    start() {
        this.isActive = true;
        this.currentStep = 0;

        // Hide the overlay completely
        const overlay = document.getElementById('tutorial');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';
        }

        // Show first hint
        this._showStep(0);
    }

    _showStep(index) {
        if (index >= this.steps.length) {
            this._complete();
            return;
        }

        const step = this.steps[index];
        this.currentStep = index;

        // Remove previous hint
        if (this.currentHintEl) {
            this.currentHintEl.remove();
            this.currentHintEl = null;
        }

        // Create inline hint notification
        const hint = document.createElement('div');
        hint.className = 'tutorial-notification';
        hint.innerHTML = step.text;
        hint.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            border-left: 4px solid #4ecdc4;
            font-size: 14px;
            z-index: 200;
            animation: fadeIn 0.3s ease;
            pointer-events: none;
        `;
        document.body.appendChild(hint);
        this.currentHintEl = hint;

        // Auto advance after duration
        setTimeout(() => {
            if (this.currentStep === index && this.isActive) {
                this._advanceStep();
            }
        }, step.duration);
    }

    _advanceStep() {
        // Fade out current hint
        if (this.currentHintEl) {
            this.currentHintEl.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                if (this.currentHintEl) {
                    this.currentHintEl.remove();
                    this.currentHintEl = null;
                }
            }, 300);
        }

        // Show next step after a short delay
        setTimeout(() => {
            this._showStep(this.currentStep + 1);
        }, 500);
    }

    _complete() {
        this.isActive = false;
        if (this.currentHintEl) {
            this.currentHintEl.remove();
            this.currentHintEl = null;
        }
    }

    /**
     * Skip to next step (called by game events)
     */
    advance() {
        if (this.isActive) {
            this._advanceStep();
        }
    }

    /**
     * Called when a sound is recorded
     */
    onSoundRecorded(soundType) {
        // Optionally advance tutorial when player records a sound
        if (soundType === 'gather' && this.currentStep <= 1) {
            this._advanceStep();
        } else if (soundType === 'charge' && this.currentStep <= 3) {
            this.currentStep = 3;
            this._advanceStep();
        }
    }

    /**
     * Called when exit opens
     */
    onExitOpened() {
        this._complete();
    }
}
