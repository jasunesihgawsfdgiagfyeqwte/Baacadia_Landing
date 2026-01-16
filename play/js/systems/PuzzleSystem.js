/**
 * PuzzleSystem - Manages puzzle state and victory condition
 * Puzzle: Move the moss ball away from exit using Charge sound
 */
export class PuzzleSystem {
    constructor(game) {
        this.game = game;

        // Puzzle state
        this.isExitBlocked = true;
        this.isExitOpen = false;
        this.victoryTriggered = false;

        // Exit position
        this.exitPosition = new THREE.Vector3(0, 0, 38);
        this.exitRadius = 3;

        // Exit visual
        this.exitMesh = null;
        this.exitGlow = null;
    }

    init() {
        this._createExitVisual();
    }

    _createExitVisual() {
        // Create exit portal/gate
        const group = new THREE.Group();

        // Gate frame (arch)
        const archGeometry = new THREE.TorusGeometry(2, 0.2, 8, 32, Math.PI);
        const archMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.8,
        });

        const arch = new THREE.Mesh(archGeometry, archMaterial);
        arch.rotation.x = Math.PI / 2;
        arch.position.y = 2;
        group.add(arch);

        // Side pillars
        const pillarGeometry = new THREE.CylinderGeometry(0.2, 0.25, 2, 8);
        const pillarMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.8,
        });

        const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        leftPillar.position.set(-2, 1, 0);
        leftPillar.castShadow = true;
        group.add(leftPillar);

        const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        rightPillar.position.set(2, 1, 0);
        rightPillar.castShadow = true;
        group.add(rightPillar);

        // Glow effect (shows when open)
        const glowGeometry = new THREE.PlaneGeometry(3.5, 3.5);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x7ee787,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
        });

        this.exitGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.exitGlow.position.y = 1.8;
        group.add(this.exitGlow);

        // Position gate
        group.position.copy(this.exitPosition);
        this.exitMesh = group;

        this.game.scene.add(group);
    }

    update(dt) {
        this._checkMossBallPosition();
        this._checkPlayerAtExit();
        this._updateExitVisual(dt);
    }

    _checkMossBallPosition() {
        const mossBall = this.game.mossBall;
        if (!mossBall) return;

        // Check distance from exit
        const distToExit = mossBall.position.distanceTo(this.exitPosition);

        // Exit is unblocked if moss ball is far enough
        if (distToExit > 5) {
            if (this.isExitBlocked) {
                this.isExitBlocked = false;
                this._onExitUnblocked();
            }
        }
    }

    _onExitUnblocked() {
        this.isExitOpen = true;

        // Show notification
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <strong>The path is clear!</strong>
            <br><small>Lead your flock to Baacadia</small>
        `;
        notification.style.borderLeftColor = '#7ee787';
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);

        // Tutorial progression
        if (this.game.tutorial) {
            this.game.tutorial.onExitOpened();
        }
    }

    _checkPlayerAtExit() {
        if (!this.isExitOpen || this.victoryTriggered) return;

        const player = this.game.player;
        if (!player) return;

        // Check if player is at exit (use 2D distance)
        const dx = player.position.x - this.exitPosition.x;
        const dz = player.position.z - this.exitPosition.z;
        const distToExit = Math.sqrt(dx * dx + dz * dz);

        if (distToExit < this.exitRadius) {
            // Also check if at least 1 cloudfen is nearby
            const nearbyCount = this._countNearbyCloudfen();

            if (nearbyCount >= 1) {
                this._triggerVictory();
            }
        }
    }

    _countNearbyCloudfen() {
        let count = 0;
        for (const cloudfen of this.game.cloudfens) {
            // Use 2D distance
            const dx = cloudfen.position.x - this.exitPosition.x;
            const dz = cloudfen.position.z - this.exitPosition.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 10) {
                count++;
            }
        }
        return count;
    }

    _triggerVictory() {
        if (this.victoryTriggered) return;
        this.victoryTriggered = true;

        // Trigger victory in game
        this.game.victory();
    }

    _updateExitVisual(dt) {
        if (!this.exitGlow) return;

        if (this.isExitOpen) {
            // Glow when open
            const pulse = 0.3 + Math.sin(Date.now() * 0.003) * 0.1;
            this.exitGlow.material.opacity = pulse;

            // Gentle rotation
            this.exitGlow.rotation.z += dt * 0.5;
        } else {
            // Dim when blocked
            this.exitGlow.material.opacity = 0.05;
        }
    }

    /**
     * Called when moss ball is pushed away
     */
    onMossBallMoved() {
        // This can be used for additional effects when the puzzle progresses
    }
}
