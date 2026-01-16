/**
 * HUD - Heads-up display management
 * Handles sound slots, volume indicator, prompts
 */
export class HUD {
    constructor(game) {
        this.game = game;

        // DOM elements
        this.soundSlots = document.querySelectorAll('.sound-slot');
        this.volumeIndicator = document.getElementById('volume-indicator');
        this.volumeFill = document.querySelector('.volume-fill');
        this.interactionPrompt = document.getElementById('interaction-prompt');
        this.recordProgress = document.getElementById('record-progress');

        // State
        this.activeSlot = 1;

        this._init();
    }

    _init() {
        // Add crosshair
        this._createCrosshair();

        // Initialize slots as empty
        this.soundSlots.forEach(slot => {
            const icon = slot.querySelector('.slot-icon');
            icon.classList.add('empty');
        });

        // Set initial volume
        this.setVolume(0.7);
    }

    _createCrosshair() {
        const crosshair = document.createElement('div');
        crosshair.id = 'crosshair';
        document.body.appendChild(crosshair);
    }

    update(dt) {
        // Update active slot highlight based on input
        const input = this.game.input;

        // Show which slot is active
        this.soundSlots.forEach((slot, index) => {
            const slotNum = index + 1;
            if (slotNum === this.activeSlot) {
                slot.classList.add('active');
            } else {
                slot.classList.remove('active');
            }
        });
    }

    /**
     * Set active sound slot
     */
    setActiveSlot(slot) {
        this.activeSlot = slot;

        this.soundSlots.forEach((slotEl, index) => {
            if (index + 1 === slot) {
                slotEl.classList.add('active');
            } else {
                slotEl.classList.remove('active');
            }
        });
    }

    /**
     * Set sound type for a slot
     */
    setSlotSound(slot, soundType) {
        const slotEl = document.querySelector(`.sound-slot[data-slot="${slot}"]`);
        if (!slotEl) return;

        const icon = slotEl.querySelector('.slot-icon');
        const name = slotEl.querySelector('.slot-name');

        // Remove empty class
        icon.classList.remove('empty');

        // Add sound type class
        icon.classList.add(soundType);

        // Update name
        name.textContent = soundType.charAt(0).toUpperCase() + soundType.slice(1);

        // Flash animation
        slotEl.classList.add('recording');
        setTimeout(() => {
            slotEl.classList.remove('recording');
        }, 500);
    }

    /**
     * Set volume display
     */
    setVolume(volume) {
        if (this.volumeFill) {
            this.volumeFill.style.height = `${volume * 100}%`;
        }
    }

    /**
     * Show/hide pet interaction prompt
     */
    showPetPrompt(show) {
        if (!this.interactionPrompt) return;

        if (show) {
            this.interactionPrompt.classList.remove('hidden');
            this.interactionPrompt.querySelector('.prompt-key').textContent = 'E';
            this.interactionPrompt.querySelector('.prompt-text').textContent = 'Pet';
        } else {
            this.interactionPrompt.classList.add('hidden');
        }
    }

    /**
     * Show/hide record prompt
     */
    showRecordPrompt(show, soundType = null) {
        // Create or update record prompt near sound source
        let prompt = document.getElementById('record-prompt');

        if (show && soundType) {
            if (!prompt) {
                prompt = document.createElement('div');
                prompt.id = 'record-prompt';
                prompt.className = 'record-available';
                document.body.appendChild(prompt);
            }

            prompt.innerHTML = `
                <span class="key">Q</span>
                Record ${soundType}
            `;
            prompt.style.display = 'flex';

            // Position at bottom center
            prompt.style.position = 'fixed';
            prompt.style.bottom = '200px';
            prompt.style.left = '50%';
            prompt.style.transform = 'translateX(-50%)';
        } else if (prompt) {
            prompt.style.display = 'none';
        }
    }

    /**
     * Show notification message
     */
    showNotification(message, duration = 3000) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, duration);
    }
}
