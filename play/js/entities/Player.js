/**
 * Player - Player entity with third-person camera control
 * Handles movement, camera rotation, and interaction detection
 */
export class Player {
    constructor(game) {
        this.game = game;

        // Position and rotation
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);

        // Camera settings
        this.cameraDistance = 10;
        this.cameraHeight = 5;
        this.cameraSensitivity = 0.15; // Degrees per pixel
        this.cameraYaw = 0;   // Horizontal rotation (radians)
        this.cameraPitch = 20; // Vertical angle (degrees) - positive = looking down

        // Camera limits (degrees)
        this.minPitch = -10;  // Can look slightly up
        this.maxPitch = 60;   // Can look down

        // Movement settings
        this.moveSpeed = 5;   // Slower, more controllable
        this.velocity = new THREE.Vector3();
        this.friction = 0.88;

        // Collision
        this.radius = 0.5;

        // Scout (visual representation)
        this.scout = null;
        this.scoutBob = 0;

        // Interaction
        this.nearbyCloudfen = null;
        this.nearbySoundSource = null;
    }

    async init() {
        this._createScout();
        this._setupCamera();
    }

    _createScout() {
        // Create Scout mesh (glowing orb)
        const geometry = new THREE.SphereGeometry(0.4, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0x7ee787,
            emissive: 0x7ee787,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.9,
        });

        this.scout = new THREE.Mesh(geometry, material);
        this.scout.castShadow = true;
        this.scout.position.copy(this.position);
        this.scout.position.y = 1.5;

        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(0.6, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x7ee787,
            transparent: true,
            opacity: 0.3,
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.scout.add(glow);

        // Add inner core
        const coreGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        this.scout.add(core);

        this.game.scene.add(this.scout);
    }

    _setupCamera() {
        // Position camera behind player
        this._updateCameraPosition();
    }

    update(dt) {
        this._handleInput(dt);
        this._updateMovement(dt);
        this._handleCollisions();
        this._updateCameraPosition();
        this._updateScout(dt);
        this._checkInteractions();
    }

    _handleInput(dt) {
        const input = this.game.input;

        // Camera rotation (mouse)
        if (input.isLocked) {
            const delta = input.consumeMouseDelta();

            // Third-person camera: mouse right should rotate view right
            // Camera is behind player, so mouse right (positive deltaX) = yaw decreases
            this.cameraYaw -= delta.x * this.cameraSensitivity * (Math.PI / 180);

            // Mouse down (positive deltaY) should look down (increase pitch)
            this.cameraPitch += delta.y * this.cameraSensitivity;

            // Clamp pitch
            this.cameraPitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.cameraPitch));
        }

        // Movement direction (relative to camera)
        const moveDir = input.getMovementDirection();

        if (moveDir.x !== 0 || moveDir.z !== 0) {
            // Camera position: player - distance * (sin(yaw), cos(yaw))
            // Forward direction (where W should move) = direction camera looks = (sin(yaw), cos(yaw))
            const forwardX = Math.sin(this.cameraYaw);
            const forwardZ = Math.cos(this.cameraYaw);

            // Right direction (where D should move)
            // Rotate forward 90 degrees clockwise (when viewed from above, Y-up)
            // If forward = (fx, fz), then right = (-fz, fx)
            const rightX = -forwardZ;
            const rightZ = forwardX;

            // moveDir: W=-z, S=+z, A=-x, D=+x
            // W pressed: moveDir.z = -1, multiply by -1 to move forward
            // D pressed: moveDir.x = +1, multiply by +1 to move right
            const targetVelX = (forwardX * (-moveDir.z) + rightX * moveDir.x) * this.moveSpeed;
            const targetVelZ = (forwardZ * (-moveDir.z) + rightZ * moveDir.x) * this.moveSpeed;

            // Smooth acceleration
            this.velocity.x += (targetVelX - this.velocity.x) * 0.15;
            this.velocity.z += (targetVelZ - this.velocity.z) * 0.15;
        } else {
            // Apply friction when not moving
            this.velocity.x *= this.friction;
            this.velocity.z *= this.friction;
        }

        // Stop if very slow
        if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
        if (Math.abs(this.velocity.z) < 0.01) this.velocity.z = 0;
    }

    _updateMovement(dt) {
        // Apply velocity
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;

        // Keep within bounds
        const bounds = 38;
        this.position.x = Math.max(-bounds, Math.min(bounds, this.position.x));
        this.position.z = Math.max(-bounds, Math.min(bounds, this.position.z));

        // Update rotation to face movement direction
        if (Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.z) > 0.1) {
            this.rotation.y = Math.atan2(this.velocity.x, this.velocity.z);
        }
    }

    _handleCollisions() {
        // Collision with rocks (simple sphere collision)
        const rockPositions = [
            { x: -15, z: 10, r: 2 },
            { x: 20, z: -8, r: 1.5 },
            { x: -25, z: -15, r: 2.5 },
            { x: 12, z: 20, r: 1.8 },
            { x: -8, z: 25, r: 1.2 },
            { x: 30, z: 5, r: 2.2 },
        ];

        for (const rock of rockPositions) {
            const dx = this.position.x - rock.x;
            const dz = this.position.z - rock.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const minDist = rock.r + this.radius;

            if (dist < minDist && dist > 0) {
                // Push player out of rock
                const overlap = minDist - dist;
                const nx = dx / dist;
                const nz = dz / dist;
                this.position.x += nx * overlap;
                this.position.z += nz * overlap;

                // Cancel velocity into rock
                const velDot = this.velocity.x * nx + this.velocity.z * nz;
                if (velDot < 0) {
                    this.velocity.x -= nx * velDot;
                    this.velocity.z -= nz * velDot;
                }
            }
        }

        // Player can pass through moss ball (no collision)

        // Collision with trees
        const treePositions = [
            { x: -25, z: -25, r: 1 },
            { x: 25, z: -20, r: 1 },
            { x: 30, z: 20, r: 1 },
            { x: -20, z: 30, r: 1 },
            { x: 35, z: -5, r: 1 },
        ];

        for (const tree of treePositions) {
            const dx = this.position.x - tree.x;
            const dz = this.position.z - tree.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const minDist = tree.r + this.radius;

            if (dist < minDist && dist > 0) {
                const overlap = minDist - dist;
                const nx = dx / dist;
                const nz = dz / dist;
                this.position.x += nx * overlap;
                this.position.z += nz * overlap;
            }
        }
    }

    _updateCameraPosition() {
        const camera = this.game.camera;

        // Convert pitch from degrees to radians
        const pitchRad = this.cameraPitch * (Math.PI / 180);

        // Calculate camera position based on yaw and pitch
        const horizontalDistance = this.cameraDistance * Math.cos(pitchRad);
        const verticalDistance = this.cameraDistance * Math.sin(pitchRad);

        camera.position.x = this.position.x - horizontalDistance * Math.sin(this.cameraYaw);
        camera.position.y = this.position.y + this.cameraHeight + verticalDistance;
        camera.position.z = this.position.z - horizontalDistance * Math.cos(this.cameraYaw);

        // Look at player position (slightly above ground)
        camera.lookAt(
            this.position.x,
            this.position.y + 1.5,
            this.position.z
        );
    }

    _updateScout(dt) {
        if (!this.scout) return;

        // Bob animation
        this.scoutBob += dt * 3;
        const bobOffset = Math.sin(this.scoutBob) * 0.15;

        // Update position
        this.scout.position.x = this.position.x;
        this.scout.position.y = 1.5 + bobOffset;
        this.scout.position.z = this.position.z;

        // Gentle rotation
        this.scout.rotation.y += dt * 0.5;

        // Pulse glow based on movement
        const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
        const glowIntensity = 0.5 + speed * 0.1;
        this.scout.material.emissiveIntensity = glowIntensity;
    }

    _checkInteractions() {
        const input = this.game.input;

        // Find nearest Cloudfen for petting
        this.nearbyCloudfen = null;
        let nearestDist = 3; // Interaction range

        for (const cloudfen of this.game.cloudfens) {
            const dist = this.position.distanceTo(cloudfen.position);
            if (dist < nearestDist) {
                nearestDist = dist;
                this.nearbyCloudfen = cloudfen;
            }
        }

        // Check for nearby sound sources (Bird)
        this.nearbySoundSource = null;
        if (this.game.bird) {
            const distToBird = this.position.distanceTo(this.game.bird.position);
            if (distToBird < 6) {
                this.nearbySoundSource = {
                    type: 'charge',
                    source: this.game.bird,
                    distance: distToBird
                };
            }
        }

        // Check for Cloudfen sound source (Gather)
        if (this.nearbyCloudfen && !this.game.state.hasGather) {
            const dist = this.position.distanceTo(this.nearbyCloudfen.position);
            if (dist < 4) {
                this.nearbySoundSource = {
                    type: 'gather',
                    source: this.nearbyCloudfen,
                    distance: dist
                };
            }
        }

        // Update UI prompts
        if (this.game.hud) {
            this.game.hud.showPetPrompt(this.nearbyCloudfen !== null);
            this.game.hud.showRecordPrompt(this.nearbySoundSource !== null, this.nearbySoundSource?.type);
        }

        // Handle pet interaction
        if (input.keys.pet && this.nearbyCloudfen) {
            this.nearbyCloudfen.pet();
            if (this.game.effects) {
                this.game.effects.spawnHearts(this.nearbyCloudfen.position);
            }
        }
    }

    /**
     * Get the forward direction vector (where camera is looking horizontally)
     */
    getForwardDirection() {
        const dir = new THREE.Vector3(
            Math.sin(this.cameraYaw),
            0,
            Math.cos(this.cameraYaw)
        );
        return dir.normalize();
    }

    /**
     * Get world position for sound origin
     */
    getSoundOrigin() {
        return this.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    }
}
