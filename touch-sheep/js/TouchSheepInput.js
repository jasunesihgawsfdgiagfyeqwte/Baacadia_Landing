/**
 * TouchSheepInput - Input handler for first-person sheep herding
 * WASD movement, mouse look, E to pet, Space to call
 */
export class TouchSheepInput {
    constructor(game) {
        this.game = game;

        // Movement keys
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
        };

        // Mouse state
        this.mouse = {
            x: 0,
            y: 0,
            deltaX: 0,
            deltaY: 0,
            leftButton: false,
        };

        this._init();
    }

    _init() {
        // Prevent context menu
        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /**
     * Get movement direction (normalized)
     */
    getMovementDirection() {
        const dir = { x: 0, z: 0 };

        if (this.keys.forward) dir.z -= 1;
        if (this.keys.backward) dir.z += 1;
        if (this.keys.left) dir.x -= 1;
        if (this.keys.right) dir.x += 1;

        const len = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
        if (len > 0) {
            dir.x /= len;
            dir.z /= len;
        }

        return dir;
    }

    /**
     * Check if player is moving
     */
    isMoving() {
        return this.keys.forward || this.keys.backward || this.keys.left || this.keys.right;
    }

    dispose() {
        // Cleanup if needed
    }
}
