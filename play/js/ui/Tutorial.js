/**
 * Tutorial - Guided tutorial system
 * Uses UIManager for displaying hints
 */
export class Tutorial {
    constructor(game) {
        this.game = game;

        // Tutorial state
        this.currentStep = 0;
        this.isActive = false;
        this.currentTimer = null;

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

        // Clear any previous timer
        if (this.currentTimer) {
            clearTimeout(this.currentTimer);
        }

        // Show hint via UIManager
        if (this.game.ui) {
            this.game.ui.showTutorialHint(step.text, step.duration);
        }

        // Auto advance after duration
        this.currentTimer = setTimeout(() => {
            if (this.currentStep === index && this.isActive) {
                this._advanceStep();
            }
        }, step.duration);
    }

    _advanceStep() {
        // Clear current timer
        if (this.currentTimer) {
            clearTimeout(this.currentTimer);
            this.currentTimer = null;
        }

        // Hide current hint
        if (this.game.ui) {
            this.game.ui.hideTutorialHint();
        }

        // Show next step after a short delay
        setTimeout(() => {
            this._showStep(this.currentStep + 1);
        }, 500);
    }

    _complete() {
        this.isActive = false;

        if (this.currentTimer) {
            clearTimeout(this.currentTimer);
            this.currentTimer = null;
        }

        if (this.game.ui) {
            this.game.ui.hideTutorialHint();
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
