/**
 * SoundSystem - Handles Gather and Charge sound mechanics
 * Gather: State Sound (hold to activate) - Cloudfens gather to player
 * Charge: Event Sound (click to activate) - Cloudfens charge forward
 */
export class SoundSystem {
    constructor(game) {
        this.game = game;

        // Sound slots
        this.slots = {
            1: null, // Sound type or null
            2: null,
        };

        this.activeSlot = 1;
        this.volume = 0.7;

        // State sounds (currently active)
        this.isPlayingState = false;
        this.stateSoundType = null;

        // Visual feedback
        this.soundWaves = [];
    }

    update(dt) {
        const input = this.game.input;

        // Check for sound activation
        if (input.mouse.leftButton) {
            this._handleSoundActivation();
        } else {
            this._handleSoundDeactivation();
        }

        // Update sound waves
        this._updateSoundWaves(dt);
    }

    _handleSoundActivation() {
        const currentSound = this.slots[this.activeSlot];
        if (!currentSound) return;

        if (currentSound === 'gather') {
            // Gather is a State Sound - hold to maintain
            if (!this.isPlayingState || this.stateSoundType !== 'gather') {
                this._startGather();
            }
            this._maintainGather();
        } else if (currentSound === 'charge') {
            // Charge is an Event Sound - single click
            if (!this.isPlayingState) {
                this._triggerCharge();
            }
        }
    }

    _handleSoundDeactivation() {
        if (this.isPlayingState && this.stateSoundType === 'gather') {
            this._stopGather();
        }
        this.isPlayingState = false;
    }

    _startGather() {
        this.isPlayingState = true;
        this.stateSoundType = 'gather';

        // Visual feedback
        this._spawnGatherWave();

        // Start all cloudfens gathering
        for (const cloudfen of this.game.cloudfens) {
            cloudfen.startGathering();
        }
    }

    _maintainGather() {
        // Continuously spawn waves while holding
        if (Math.random() < 0.1) {
            this._spawnGatherWave();
        }
    }

    _stopGather() {
        this.isPlayingState = false;
        this.stateSoundType = null;

        // Stop all cloudfens from gathering
        for (const cloudfen of this.game.cloudfens) {
            cloudfen.stopGathering();
        }
    }

    _triggerCharge() {
        this.isPlayingState = true;

        // Get player forward direction
        const player = this.game.player;
        const direction = player.getForwardDirection();

        // Visual feedback - directional wave
        this._spawnChargeWave(direction);

        // Make all nearby cloudfens charge
        const playerPos = player.position;
        const range = 8 * this.volume;

        for (const cloudfen of this.game.cloudfens) {
            const dist = cloudfen.position.distanceTo(playerPos);
            if (dist < range) {
                cloudfen.charge(direction);
            }
        }

        // Reset after short delay
        setTimeout(() => {
            this.isPlayingState = false;
        }, 100);
    }

    _spawnGatherWave() {
        const player = this.game.player;
        if (!player) return;

        // Create expanding ring
        const geometry = new THREE.RingGeometry(0.5, 0.7, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x7ee787,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
        });

        const ring = new THREE.Mesh(geometry, material);
        ring.position.copy(player.getSoundOrigin());
        ring.rotation.x = -Math.PI / 2;

        this.game.scene.add(ring);

        this.soundWaves.push({
            mesh: ring,
            type: 'gather',
            age: 0,
            maxAge: 1.5,
            maxScale: 10 * this.volume,
        });
    }

    _spawnChargeWave(direction) {
        const player = this.game.player;
        if (!player) return;

        // Create directional cone/arrow shape
        const geometry = new THREE.ConeGeometry(0.5, 2, 8);
        geometry.rotateX(Math.PI / 2);

        const material = new THREE.MeshBasicMaterial({
            color: 0xff9f43,
            transparent: true,
            opacity: 0.8,
        });

        const cone = new THREE.Mesh(geometry, material);
        cone.position.copy(player.getSoundOrigin());

        // Rotate to face direction
        cone.lookAt(
            player.position.x + direction.x,
            player.position.y + 1.5,
            player.position.z + direction.z
        );

        this.game.scene.add(cone);

        this.soundWaves.push({
            mesh: cone,
            type: 'charge',
            direction: direction.clone(),
            age: 0,
            maxAge: 0.8,
            speed: 15,
        });
    }

    _updateSoundWaves(dt) {
        for (let i = this.soundWaves.length - 1; i >= 0; i--) {
            const wave = this.soundWaves[i];
            wave.age += dt;

            const progress = wave.age / wave.maxAge;

            if (wave.type === 'gather') {
                // Expand and fade
                const scale = 1 + progress * wave.maxScale;
                wave.mesh.scale.set(scale, scale, 1);
                wave.mesh.material.opacity = 0.8 * (1 - progress);
            } else if (wave.type === 'charge') {
                // Move forward and fade
                wave.mesh.position.add(
                    wave.direction.clone().multiplyScalar(wave.speed * dt)
                );
                wave.mesh.material.opacity = 0.8 * (1 - progress);
                wave.mesh.scale.setScalar(1 + progress * 2);
            }

            // Remove old waves
            if (wave.age >= wave.maxAge) {
                this.game.scene.remove(wave.mesh);
                wave.mesh.geometry.dispose();
                wave.mesh.material.dispose();
                this.soundWaves.splice(i, 1);
            }
        }
    }

    /**
     * Unlock a sound type
     */
    unlockSound(type) {
        // Put in first empty slot, or slot 2 if both empty
        if (this.slots[1] === null) {
            this.slots[1] = type;
            if (this.game.ui) {
                this.game.ui.setSoundForSlot(1, type);
            }
        } else if (this.slots[2] === null) {
            this.slots[2] = type;
            if (this.game.ui) {
                this.game.ui.setSoundForSlot(2, type);
            }
        }

        // Update game state
        if (type === 'gather') {
            this.game.state.hasGather = true;
        } else if (type === 'charge') {
            this.game.state.hasCharge = true;
        }
    }

    /**
     * Set active slot
     */
    setActiveSlot(slot) {
        this.activeSlot = slot;
    }

    /**
     * Set volume (affects range)
     */
    setVolume(volume) {
        this.volume = volume;
    }

    /**
     * Check if a sound is unlocked
     */
    hasSound(type) {
        return this.slots[1] === type || this.slots[2] === type;
    }
}
