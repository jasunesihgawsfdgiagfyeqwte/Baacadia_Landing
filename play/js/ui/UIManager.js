/**
 * UIManager - Centralized UI controller
 * Manages all UI layers and state in a reactive, organized way
 */
export class UIManager {
    constructor(game) {
        this.game = game;

        // UI Layer references
        this.layers = {
            loading: document.getElementById('loading-screen'),
            hud: document.getElementById('hud'),
            tutorial: document.getElementById('tutorial'),
            victory: document.getElementById('victory-screen'),
        };

        // HUD element references
        this.elements = {
            // Sound slots
            soundSlots: document.querySelectorAll('.sound-slot'),

            // Volume
            volumeIndicator: document.getElementById('volume-indicator'),
            volumeFill: document.querySelector('.volume-fill'),

            // Recording
            recordProgress: document.getElementById('record-progress'),
            recordRingFill: document.querySelector('.ring-fill'),
            recordLabel: document.querySelector('.record-label'),

            // Prompts
            interactionPrompt: document.getElementById('interaction-prompt'),
            promptKey: document.querySelector('.prompt-key'),
            promptText: document.querySelector('.prompt-text'),

            // Crosshair
            crosshair: null, // Will be created
        };

        // UI State (single source of truth)
        this.state = {
            activeSlot: 1,
            volume: 0.7,
            soundSlots: {
                1: null, // slot1Sound
                2: null  // slot2Sound
            },

            // Recording state
            isRecording: false,
            recordingSoundType: null,
            recordProgress: 0,

            // Prompts
            showInteractionPrompt: false,
            interactionType: null, // 'pet', 'record-gather', 'record-charge'

            // Notifications queue
            notifications: [],

            // Tutorial
            tutorialActive: false,
            tutorialStep: 0,
        };

        this._init();
    }

    _init() {
        this._createCrosshair();
        this._initSoundSlots();
        this._bindReplayButton();

        // Set initial states
        this.setVolume(this.state.volume);
        this.hideRecording();
        this.hideInteractionPrompt();
    }

    _createCrosshair() {
        const crosshair = document.createElement('div');
        crosshair.id = 'crosshair';
        document.body.appendChild(crosshair);
        this.elements.crosshair = crosshair;
    }

    _initSoundSlots() {
        // Initialize slots as empty
        this.elements.soundSlots.forEach(slot => {
            const icon = slot.querySelector('.slot-icon');
            icon.classList.add('empty');
        });
    }

    _bindReplayButton() {
        const replayBtn = document.querySelector('.btn-replay');
        if (replayBtn) {
            replayBtn.addEventListener('click', () => {
                window.location.reload();
            });
        }
    }

    /**
     * Update UI each frame - handles reactive updates
     */
    update(dt) {
        this._updateSoundSlots();
        this._updateRecording();
        this._updateInteractionPrompt();
        this._updateNotifications(dt);
    }

    // ========================================
    // LAYER MANAGEMENT
    // ========================================

    showLayer(layerName) {
        const layer = this.layers[layerName];
        if (layer) {
            layer.classList.remove('hidden');
            layer.style.display = '';
        }
    }

    hideLayer(layerName) {
        const layer = this.layers[layerName];
        if (layer) {
            layer.classList.add('hidden');
        }
    }

    hideLoading() {
        const loadingScreen = this.layers.loading;
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    showVictory() {
        this.showLayer('victory');
    }

    // ========================================
    // SOUND SLOT MANAGEMENT
    // ========================================

    setActiveSlot(slotNumber) {
        this.state.activeSlot = slotNumber;
    }

    setSoundForSlot(slotNumber, soundType) {
        this.state.soundSlots[slotNumber] = soundType;

        // Trigger flash animation
        const slotEl = document.querySelector(`.sound-slot[data-slot="${slotNumber}"]`);
        if (slotEl) {
            slotEl.classList.add('recording');
            setTimeout(() => {
                slotEl.classList.remove('recording');
            }, 500);
        }
    }

    _updateSoundSlots() {
        this.elements.soundSlots.forEach((slotEl, index) => {
            const slotNumber = index + 1;
            const soundType = this.state.soundSlots[slotNumber];

            // Update active state
            if (slotNumber === this.state.activeSlot) {
                slotEl.classList.add('active');
            } else {
                slotEl.classList.remove('active');
            }

            // Update sound icon and name
            const icon = slotEl.querySelector('.slot-icon');
            const name = slotEl.querySelector('.slot-name');

            if (soundType) {
                icon.classList.remove('empty');
                icon.className = 'slot-icon ' + soundType;
                name.textContent = soundType.charAt(0).toUpperCase() + soundType.slice(1);
            } else {
                icon.className = 'slot-icon empty';
                name.textContent = '-';
            }
        });
    }

    // ========================================
    // VOLUME
    // ========================================

    setVolume(volume) {
        this.state.volume = volume;
        if (this.elements.volumeFill) {
            this.elements.volumeFill.style.height = `${volume * 100}%`;
        }
    }

    // ========================================
    // RECORDING
    // ========================================

    showRecording(soundType) {
        this.state.isRecording = true;
        this.state.recordingSoundType = soundType;
        this.state.recordProgress = 0;
    }

    updateRecordingProgress(progress) {
        this.state.recordProgress = progress;
    }

    hideRecording() {
        this.state.isRecording = false;
        this.state.recordingSoundType = null;
        this.state.recordProgress = 0;
    }

    _updateRecording() {
        const progressEl = this.elements.recordProgress;
        if (!progressEl) return;

        if (this.state.isRecording) {
            progressEl.classList.remove('hidden');

            // Update ring progress
            if (this.elements.recordRingFill) {
                const circumference = 2 * Math.PI * 45; // r=45 from SVG
                const offset = circumference * (1 - this.state.recordProgress);
                this.elements.recordRingFill.style.strokeDashoffset = offset;
            }

            // Update label
            if (this.elements.recordLabel) {
                this.elements.recordLabel.textContent = `Recording ${this.state.recordingSoundType}...`;
            }
        } else {
            progressEl.classList.add('hidden');
        }
    }

    // ========================================
    // INTERACTION PROMPTS
    // ========================================

    showInteractionPrompt(type) {
        this.state.showInteractionPrompt = true;
        this.state.interactionType = type;
    }

    hideInteractionPrompt() {
        this.state.showInteractionPrompt = false;
        this.state.interactionType = null;
    }

    _updateInteractionPrompt() {
        const prompt = this.elements.interactionPrompt;
        if (!prompt) return;

        if (this.state.showInteractionPrompt && this.state.interactionType) {
            prompt.classList.remove('hidden');

            const keyEl = this.elements.promptKey;
            const textEl = this.elements.promptText;

            switch (this.state.interactionType) {
                case 'pet':
                    keyEl.textContent = 'E';
                    textEl.textContent = 'Pet';
                    break;
                case 'record-gather':
                    keyEl.textContent = 'Q';
                    textEl.textContent = 'Record Gather';
                    break;
                case 'record-charge':
                    keyEl.textContent = 'Q';
                    textEl.textContent = 'Record Charge';
                    break;
            }
        } else {
            prompt.classList.add('hidden');
        }
    }

    // ========================================
    // NOTIFICATIONS
    // ========================================

    showNotification(message, options = {}) {
        const {
            duration = 3000,
            style = 'default',
            borderColor = null,
        } = options;

        const notification = {
            id: Date.now() + Math.random(),
            message,
            duration,
            style,
            borderColor,
            element: null,
            timeLeft: duration,
        };

        // Create DOM element
        const notifEl = document.createElement('div');
        notifEl.className = `notification ${style}`;
        notifEl.innerHTML = message;

        if (borderColor) {
            notifEl.style.borderLeftColor = borderColor;
        }

        document.body.appendChild(notifEl);
        notification.element = notifEl;

        // Add to queue
        this.state.notifications.push(notification);
    }

    _updateNotifications(dt) {
        // Update all active notifications
        this.state.notifications = this.state.notifications.filter(notif => {
            notif.timeLeft -= dt * 1000;

            if (notif.timeLeft <= 0) {
                // Remove from DOM
                if (notif.element) {
                    notif.element.remove();
                }
                return false; // Remove from array
            }

            return true; // Keep in array
        });
    }

    // ========================================
    // TUTORIAL HINTS
    // ========================================

    showTutorialHint(text, duration = 5000) {
        // Remove any existing tutorial hint
        const existing = document.querySelector('.tutorial-notification');
        if (existing) {
            existing.remove();
        }

        // Create new hint
        const hint = document.createElement('div');
        hint.className = 'tutorial-notification';
        hint.innerHTML = text;
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

        // Auto-remove after duration
        setTimeout(() => {
            hint.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => hint.remove(), 300);
        }, duration);

        return hint;
    }

    hideTutorialHint() {
        const existing = document.querySelector('.tutorial-notification');
        if (existing) {
            existing.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => existing.remove(), 300);
        }
    }

    // ========================================
    // CONVENIENCE METHODS
    // ========================================

    /**
     * Show a completion notification when sound is recorded
     */
    notifySoundRecorded(soundType, slotNumber) {
        this.showNotification(`
            <strong>${soundType.toUpperCase()}</strong> sound recorded!
            <br><small>Press ${slotNumber} to select</small>
        `);
    }

    /**
     * Show notification when exit is unblocked
     */
    notifyExitUnblocked() {
        this.showNotification(`
            <strong>The path is clear!</strong>
            <br><small>Lead your flock to Baacadia</small>
        `, {
            borderColor: '#7ee787'
        });
    }
}
