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

        // Show notification via UIManager
        if (this.game.ui) {
            const slotNumber = this.game.soundSystem.slots[1] === soundType ? 1 : 2;
            this.game.ui.notifySoundRecorded(soundType, slotNumber);
        }

        // Trigger tutorial progression
        if (this.game.tutorial) {
            this.game.tutorial.onSoundRecorded(soundType);
        }

        // Visual effect
        if (this.game.effects) {
            this.game.effects.spawnRecordComplete(this.game.player.position);
        }
    }

    _updateUI() {
        // Update recording state in UIManager
        if (!this.game.ui) return;

        if (this.isRecording) {
            const progress = this.recordProgress / this.recordDuration;
            this.game.ui.showRecording(this.currentSoundType);
            this.game.ui.updateRecordingProgress(progress);
        } else {
            this.game.ui.hideRecording();
        }
    }

    /**
     * Get current recording progress (0-1)
     */
    getProgress() {
        return this.recordProgress / this.recordDuration;
    }
}
