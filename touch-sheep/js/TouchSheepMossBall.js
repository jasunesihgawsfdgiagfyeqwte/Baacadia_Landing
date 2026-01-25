/**
 * TouchSheepMossBall - Physics-enabled moss ball that can be pushed
 * Based on play/js/entities/MossBall.js with improved push physics
 */
export class MossBall {
    constructor(game) {
        this.game = game;

        // Position and physics
        this.position = new THREE.Vector3(0, 0.6, 0);
        this.velocity = new THREE.Vector3();
        this.angularVelocity = new THREE.Vector3();

        // Physics settings - easier to push
        this.mass = 2.0; // Light for easy pushing
        this.friction = 0.94; // Slightly less friction for smoother rolling
        this.radius = 0.6; // Slightly smaller
        this.pushMultiplier = 3.0; // How responsive to pushing

        // Gravity settings
        this.gravity = 15.0; // Gravity strength
        this.groundY = 0; // Ground level (will be updated based on terrain)
        this.bounciness = 0.3; // How bouncy when hitting ground

        // State
        this.isMoving = false;
        this.isGrounded = true;

        // Visual
        this.mesh = null;
    }

    async init(x, z, scale = 1.0) {
        this.position.x = x;
        this.position.z = z;
        this.position.y = this.radius * scale;
        this.baseScale = scale;
        this.radius *= scale;

        this._createMesh();
    }

    _createMesh() {
        const group = new THREE.Group();

        // Main ball - warm mossy green matching Art Bible palette
        const geometry = new THREE.SphereGeometry(this.radius / this.baseScale, 24, 18);
        const material = new THREE.MeshStandardMaterial({
            color: 0x5D7A4A, // Muted sage green (Art Bible friendly)
            roughness: 0.95,
            metalness: 0.05,
        });

        const ball = new THREE.Mesh(geometry, material);
        ball.castShadow = true;
        ball.receiveShadow = true;
        group.add(ball);

        // Add moss texture bumps - varied greens
        const bumpCount = 25;
        const bumpColors = [0x6B8E5A, 0x4A6B3A, 0x7A9B6A, 0x526B42];

        for (let i = 0; i < bumpCount; i++) {
            const bumpGeometry = new THREE.SphereGeometry(0.12, 8, 6);
            const bumpMaterial = new THREE.MeshStandardMaterial({
                color: bumpColors[Math.floor(Math.random() * bumpColors.length)],
                roughness: 1.0,
            });
            const bump = new THREE.Mesh(bumpGeometry, bumpMaterial);

            // Random position on sphere surface
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            const r = this.radius / this.baseScale;
            bump.position.x = r * Math.sin(phi) * Math.cos(theta);
            bump.position.y = r * Math.sin(phi) * Math.sin(theta);
            bump.position.z = r * Math.cos(phi);

            // Random size
            const scale = 0.5 + Math.random() * 0.7;
            bump.scale.setScalar(scale);

            bump.castShadow = true;
            group.add(bump);
        }

        // Add some grass strands on top
        const grassColors = [0x7FB069, 0x8BC26A, 0x6A9B5A];

        for (let i = 0; i < 8; i++) {
            const grassGeometry = new THREE.PlaneGeometry(0.04, 0.2);
            const grassMaterial = new THREE.MeshStandardMaterial({
                color: grassColors[Math.floor(Math.random() * grassColors.length)],
                roughness: 0.85,
                side: THREE.DoubleSide,
            });
            const grass = new THREE.Mesh(grassGeometry, grassMaterial);

            const angle = Math.random() * Math.PI * 2;
            const rad = Math.random() * 0.3;

            grass.position.x = Math.cos(angle) * rad;
            grass.position.y = (this.radius / this.baseScale) + 0.08;
            grass.position.z = Math.sin(angle) * rad;

            grass.rotation.y = Math.random() * Math.PI;
            grass.rotation.x = -0.15 + Math.random() * 0.3;

            group.add(grass);
        }

        // Apply base scale
        group.scale.setScalar(this.baseScale);

        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.game.scene.add(this.mesh);
    }

    update(dt) {
        this._applyPhysics(dt);
        this._updateVisuals(dt);
    }

    _applyPhysics(dt) {
        // Get ground height at current position
        if (this.game.gameScene) {
            this.groundY = this.game.gameScene.getGroundHeight(this.position.x, this.position.z);
        }

        // Apply gravity
        if (!this.isGrounded) {
            this.velocity.y -= this.gravity * dt;
        }

        // Apply velocity
        this.position.add(this.velocity.clone().multiplyScalar(dt));

        // Ground collision
        const groundLevel = this.groundY + this.radius;
        if (this.position.y <= groundLevel) {
            this.position.y = groundLevel;

            // Bounce if falling fast enough
            if (this.velocity.y < -1) {
                this.velocity.y *= -this.bounciness;
                // Play sound on significant bounce
                if (this.velocity.y > 0.5 && this.game.audio) {
                    this.game.audio.playMossyImpact(Math.abs(this.velocity.y) * 0.5);
                }
            } else {
                this.velocity.y = 0;
            }
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        // Horizontal friction (only when grounded)
        if (this.isGrounded) {
            this.velocity.x *= this.friction;
            this.velocity.z *= this.friction;
        } else {
            // Less friction in air
            this.velocity.x *= 0.99;
            this.velocity.z *= 0.99;
        }

        // Check if still moving
        const horizontalSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
        this.isMoving = horizontalSpeed > 0.05 || Math.abs(this.velocity.y) > 0.1;

        // Stop completely if very slow and grounded
        if (this.isGrounded && horizontalSpeed < 0.02) {
            this.velocity.x = 0;
            this.velocity.z = 0;
        }

        // Bounds
        const bounds = 38;
        if (this.position.x < -bounds) {
            this.position.x = -bounds;
            this.velocity.x *= -0.4;
        }
        if (this.position.x > bounds) {
            this.position.x = bounds;
            this.velocity.x *= -0.4;
        }
        if (this.position.z < -bounds) {
            this.position.z = -bounds;
            this.velocity.z *= -0.4;
        }
        if (this.position.z > bounds) {
            this.position.z = bounds;
            this.velocity.z *= -0.4;
        }
    }

    _updateVisuals(dt) {
        if (!this.mesh) return;

        // Update position
        this.mesh.position.copy(this.position);

        // Rolling rotation based on velocity
        if (this.isMoving) {
            const speed = this.velocity.length();
            const rollAxis = new THREE.Vector3(-this.velocity.z, 0, this.velocity.x).normalize();

            if (rollAxis.length() > 0) {
                const rollAngle = (speed * dt) / this.radius;
                this.mesh.rotateOnWorldAxis(rollAxis, rollAngle);
            }
        }
    }

    /**
     * Push the moss ball in a direction with force
     * @param {THREE.Vector3} direction - Push direction (normalized)
     * @param {number} force - Push force
     * @param {boolean} addUpward - Add upward component for a "kick" effect
     */
    push(direction, force, addUpward = false) {
        // Apply push with multiplier for easier pushing
        const pushVel = direction.clone().multiplyScalar(force * this.pushMultiplier);

        // Add upward kick if requested (makes it more fun)
        if (addUpward && this.isGrounded) {
            pushVel.y = force * 0.8;
            this.isGrounded = false;
        }

        this.velocity.add(pushVel);
    }

    /**
     * Check collision with a point and radius
     */
    checkCollision(point, radius = 0) {
        const dx = this.position.x - point.x;
        const dz = this.position.z - point.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        return dist < this.radius + radius;
    }

    /**
     * Get distance to a point (2D, ignoring Y)
     */
    distanceTo(point) {
        const dx = this.position.x - point.x;
        const dz = this.position.z - point.z;
        return Math.sqrt(dx * dx + dz * dz);
    }
}
