/**
 * HUD - Heads-up display management
 * DEPRECATED: Most functionality moved to UIManager
 * Kept for backward compatibility during migration
 */
export class HUD {
    constructor(game) {
        this.game = game;

        // Delegate to UIManager if available
        if (game.ui) {
            console.warn('HUD class is deprecated. Using UIManager instead.');
        }
    }

    update(dt) {
        // No-op - UIManager handles updates
    }

    setActiveSlot(slot) {
        if (this.game.ui) {
            this.game.ui.setActiveSlot(slot);
        }
    }

    setSlotSound(slot, soundType) {
        if (this.game.ui) {
            this.game.ui.setSoundForSlot(slot, soundType);
        }
    }

    setVolume(volume) {
        if (this.game.ui) {
            this.game.ui.setVolume(volume);
        }
    }

    showPetPrompt(show) {
        if (this.game.ui) {
            if (show) {
                this.game.ui.showInteractionPrompt('pet');
            } else {
                this.game.ui.hideInteractionPrompt();
            }
        }
    }

    showRecordPrompt(show, soundType = null) {
        if (this.game.ui) {
            if (show && soundType) {
                this.game.ui.showInteractionPrompt(`record-${soundType}`);
            } else {
                this.game.ui.hideInteractionPrompt();
            }
        }
    }

    showNotification(message, duration = 3000) {
        if (this.game.ui) {
            this.game.ui.showNotification(message, { duration });
        }
    }
}
