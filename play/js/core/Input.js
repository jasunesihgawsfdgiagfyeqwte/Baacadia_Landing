/**
 * Input Manager - Handles all user input
 * Controls: WASD movement, Mouse look, LMB sound, Q record, E pet, Scroll volume, 1/2 switch
 */
export class Input {
    constructor() {
        // Movement keys
        this.keys = {
            forward: false,  // W
            backward: false, // S
            left: false,     // A
            right: false,    // D
            record: false,   // Q
            pet: false,      // E
        };

        // Mouse state
        this.mouse = {
            x: 0,
            y: 0,
            deltaX: 0,
            deltaY: 0,
            leftButton: false,
            rightButton: false,
        };

        // Sound selection (1-2)
        this.selectedSlot = 1;

        // Volume (0-1)
        this.volume = 0.7;

        // Pointer lock state
        this.isLocked = false;

        // Event listeners storage for cleanup
        this._listeners = [];

        this._init();
    }

    _init() {
        // Keyboard events
        this._addListener(document, 'keydown', this._onKeyDown.bind(this));
        this._addListener(document, 'keyup', this._onKeyUp.bind(this));

        // Mouse events
        this._addListener(document, 'mousemove', this._onMouseMove.bind(this));
        this._addListener(document, 'mousedown', this._onMouseDown.bind(this));
        this._addListener(document, 'mouseup', this._onMouseUp.bind(this));
        this._addListener(document, 'wheel', this._onWheel.bind(this), { passive: false });

        // Pointer lock events
        this._addListener(document, 'pointerlockchange', this._onPointerLockChange.bind(this));
    }

    _addListener(target, event, handler, options) {
        target.addEventListener(event, handler, options);
        this._listeners.push({ target, event, handler, options });
    }

    _onKeyDown(e) {
        // Prevent default for game keys
        if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'Digit1', 'Digit2'].includes(e.code)) {
            e.preventDefault();
        }

        switch (e.code) {
            case 'KeyW': this.keys.forward = true; break;
            case 'KeyS': this.keys.backward = true; break;
            case 'KeyA': this.keys.left = true; break;
            case 'KeyD': this.keys.right = true; break;
            case 'KeyQ': this.keys.record = true; break;
            case 'KeyE': this.keys.pet = true; break;
            case 'Digit1': this.selectedSlot = 1; this._onSlotChange(1); break;
            case 'Digit2': this.selectedSlot = 2; this._onSlotChange(2); break;
        }
    }

    _onKeyUp(e) {
        switch (e.code) {
            case 'KeyW': this.keys.forward = false; break;
            case 'KeyS': this.keys.backward = false; break;
            case 'KeyA': this.keys.left = false; break;
            case 'KeyD': this.keys.right = false; break;
            case 'KeyQ': this.keys.record = false; break;
            case 'KeyE': this.keys.pet = false; break;
        }
    }

    _onMouseMove(e) {
        if (this.isLocked) {
            this.mouse.deltaX = e.movementX || 0;
            this.mouse.deltaY = e.movementY || 0;
        }
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
    }

    _onMouseDown(e) {
        if (e.button === 0) this.mouse.leftButton = true;
        if (e.button === 2) this.mouse.rightButton = true;
    }

    _onMouseUp(e) {
        if (e.button === 0) this.mouse.leftButton = false;
        if (e.button === 2) this.mouse.rightButton = false;
    }

    _onWheel(e) {
        e.preventDefault();
        // Adjust volume with scroll
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        this.volume = Math.max(0.1, Math.min(1.0, this.volume + delta));
        this._onVolumeChange(this.volume);
    }

    _onPointerLockChange() {
        this.isLocked = document.pointerLockElement !== null;
    }

    _onSlotChange(slot) {
        // Override in Game to handle slot change
        if (this.onSlotChange) this.onSlotChange(slot);
    }

    _onVolumeChange(volume) {
        // Override in Game to handle volume change
        if (this.onVolumeChange) this.onVolumeChange(volume);
    }

    /**
     * Get movement direction vector (normalized)
     */
    getMovementDirection() {
        const dir = { x: 0, z: 0 };

        if (this.keys.forward) dir.z -= 1;
        if (this.keys.backward) dir.z += 1;
        if (this.keys.left) dir.x -= 1;
        if (this.keys.right) dir.x += 1;

        // Normalize
        const len = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
        if (len > 0) {
            dir.x /= len;
            dir.z /= len;
        }

        return dir;
    }

    /**
     * Get and reset mouse delta (for camera rotation)
     */
    consumeMouseDelta() {
        const delta = { x: this.mouse.deltaX, y: this.mouse.deltaY };
        this.mouse.deltaX = 0;
        this.mouse.deltaY = 0;
        return delta;
    }

    /**
     * Request pointer lock on canvas
     */
    requestPointerLock(element) {
        element.requestPointerLock();
    }

    /**
     * Exit pointer lock
     */
    exitPointerLock() {
        document.exitPointerLock();
    }

    /**
     * Clean up event listeners
     */
    dispose() {
        for (const { target, event, handler, options } of this._listeners) {
            target.removeEventListener(event, handler, options);
        }
        this._listeners = [];
    }
}
