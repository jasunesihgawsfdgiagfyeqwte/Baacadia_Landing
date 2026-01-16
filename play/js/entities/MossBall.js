/**
 * MossBall - Physics-enabled ball that blocks the exit
 * Can be pushed by charging Cloudfens
 */
export class MossBall {
    constructor(game) {
        this.game = game;

        // Position and physics (closer to center for easier gameplay)
        this.position = new THREE.Vector3(0, 0.8, 15);
        this.velocity = new THREE.Vector3();
        this.angularVelocity = new THREE.Vector3();

        // Physics settings
        this.mass = 5;
        this.friction = 0.92;
        this.radius = 0.8;

        // State
        this.isMoving = false;
        this.hasBeenPushed = false;

        // Visual
        this.mesh = null;
    }

    async init() {
        this._createMesh();
    }

    _createMesh() {
        const group = new THREE.Group();

        // Main ball
        const geometry = new THREE.SphereGeometry(this.radius, 24, 18);
        const material = new THREE.MeshStandardMaterial({
            color: 0x228B22,
            roughness: 0.9,
            metalness: 0.1,
        });

        const ball = new THREE.Mesh(geometry, material);
        ball.castShadow = true;
        ball.receiveShadow = true;
        group.add(ball);

        // Add moss texture bumps
        const bumpCount = 30;
        const bumpGeometry = new THREE.SphereGeometry(0.15, 8, 6);
        const bumpMaterial = new THREE.MeshStandardMaterial({
            color: 0x2E8B2E,
            roughness: 1.0,
        });

        for (let i = 0; i < bumpCount; i++) {
            const bump = new THREE.Mesh(bumpGeometry, bumpMaterial);

            // Random position on sphere surface
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            bump.position.x = this.radius * Math.sin(phi) * Math.cos(theta);
            bump.position.y = this.radius * Math.sin(phi) * Math.sin(theta);
            bump.position.z = this.radius * Math.cos(phi);

            // Random size
            const scale = 0.5 + Math.random() * 0.8;
            bump.scale.setScalar(scale);

            bump.castShadow = true;
            group.add(bump);
        }

        // Add some grass strands on top
        const grassMaterial = new THREE.MeshStandardMaterial({
            color: 0x32CD32,
            roughness: 0.8,
            side: THREE.DoubleSide,
        });

        for (let i = 0; i < 10; i++) {
            const grassGeometry = new THREE.PlaneGeometry(0.05, 0.3);
            const grass = new THREE.Mesh(grassGeometry, grassMaterial);

            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * 0.4;

            grass.position.x = Math.cos(angle) * r;
            grass.position.y = this.radius + 0.1;
            grass.position.z = Math.sin(angle) * r;

            grass.rotation.y = Math.random() * Math.PI;
            grass.rotation.x = -0.2 + Math.random() * 0.4;

            group.add(grass);
        }

        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.game.scene.add(this.mesh);
    }

    update(dt) {
        this._applyPhysics(dt);
        this._updateVisuals(dt);
        this._checkPuzzle();
    }

    _applyPhysics(dt) {
        // Apply velocity
        this.position.add(this.velocity.clone().multiplyScalar(dt));

        // Ground constraint
        this.position.y = this.radius;

        // Friction
        this.velocity.multiplyScalar(this.friction);

        // Check if still moving
        this.isMoving = this.velocity.length() > 0.1;

        // Bounds (don't let it go too far)
        const bounds = 40;
        if (this.position.x < -bounds) {
            this.position.x = -bounds;
            this.velocity.x *= -0.5;
        }
        if (this.position.x > bounds) {
            this.position.x = bounds;
            this.velocity.x *= -0.5;
        }
        if (this.position.z < -bounds) {
            this.position.z = -bounds;
            this.velocity.z *= -0.5;
        }
        if (this.position.z > bounds) {
            this.position.z = bounds;
            this.velocity.z *= -0.5;
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

    _checkPuzzle() {
        // Check if ball has moved away from exit
        const exitPos = new THREE.Vector3(0, 0, 35);
        const distToExit = this.position.distanceTo(exitPos);

        // If ball is far enough from original position and exit
        if (distToExit > 5 && this.hasBeenPushed) {
            // Signal puzzle system
            if (this.game.puzzleSystem) {
                this.game.puzzleSystem.onMossBallMoved();
            }
        }
    }

    /**
     * Push the moss ball in a direction with force
     */
    push(direction, force) {
        this.velocity.add(direction.clone().multiplyScalar(force));
        this.hasBeenPushed = true;

        // Visual feedback
        if (this.game.effects) {
            this.game.effects.spawnImpact(this.position, 0x228B22);
        }
    }

    /**
     * Check collision with a point
     */
    checkCollision(point, radius = 0) {
        const dist = this.position.distanceTo(point);
        return dist < this.radius + radius;
    }
}
