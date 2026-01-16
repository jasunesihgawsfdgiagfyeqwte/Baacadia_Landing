/**
 * RecordSystem - Handles recording sounds from sound sources
 * Hold Q near a sound source to record it
 */
export class RecordSystem {
    constructor(game) {
        this.game = game;

        // Recording state
        this.isRecording = false;
        this.recordProgress = 0;
        this.recordDuration = 2.0; // Seconds to complete recording
        this.currentSource = null;
        this.currentSoundType = null;
    }

    update(dt) {
        const input = this.game.input;
        const player = this.game.player;

        if (!player) return;

        // Check if Q is held and near a sound source
        if (input.keys.record) {
            const soundSource = player.nearbySoundSource;

            if (soundSource && !this._alreadyHasSound(soundSource.type)) {
                this._startOrContinueRecording(soundSource, dt);
            } else {
                this._cancelRecording();
            }
        } else {
            this._cancelRecording();
        }

        // Update UI
        this._updateUI();
    }

    _alreadyHasSound(type) {
        return this.game.soundSystem && this.game.soundSystem.hasSound(type);
    }

    _startOrContinueRecording(soundSource, dt) {
        // Check if switching sources
        if (this.currentSoundType !== soundSource.type) {
            this.isRecording = true;
            this.recordProgress = 0;
            this.currentSource = soundSource.source;
            this.currentSoundType = soundSource.type;
        }

        // Continue recording
        this.recordProgress += dt;

        // Check completion
        if (this.recordProgress >= this.recordDuration) {
            this._completeRecording();
        }
    }

    _cancelRecording() {
        if (this.isRecording) {
            this.isRecording = false;
            this.recordProgress = 0;
            this.currentSource = null;
            this.currentSoundType = null;
        }
    }

    _completeRecording() {
        const soundType = this.currentSoundType;

        // Reset state
        this.isRecording = false;
        this.recordProgress = 0;
        this.currentSource = null;
        this.currentSoundType = null;

        // Unlock the sound
        if (this.game.soundSystem) {
            this.game.soundSystem.unlockSound(soundType);
        }

        // Show notification
        this._showRecordComplete(soundType);

        // Trigger tutorial progression
        if (this.game.tutorial) {
            this.game.tutorial.onSoundRecorded(soundType);
        }

        // Visual effect
        if (this.game.effects) {
            this.game.effects.spawnRecordComplete(this.game.player.position);
        }
    }

    _showRecordComplete(soundType) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <strong>${soundType.toUpperCase()}</strong> sound recorded!
            <br><small>Press ${this.game.soundSystem.slots[1] === soundType ? '1' : '2'} to select</small>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    _updateUI() {
        const progressEl = document.getElementById('record-progress');
        if (!progressEl) return;

        if (this.isRecording) {
            progressEl.classList.remove('hidden');

            // Update ring progress
            const ring = progressEl.querySelector('.ring-fill');
            if (ring) {
                const circumference = 2 * Math.PI * 45; // r=45 from SVG
                const progress = this.recordProgress / this.recordDuration;
                const offset = circumference * (1 - progress);
                ring.style.strokeDashoffset = offset;
            }

            // Update label
            const label = progressEl.querySelector('.record-label');
            if (label) {
                label.textContent = `Recording ${this.currentSoundType}...`;
            }
        } else {
            progressEl.classList.add('hidden');
        }
    }

    /**
     * Get current recording progress (0-1)
     */
    getProgress() {
        return this.recordProgress / this.recordDuration;
    }
}
