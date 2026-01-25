/**
 * Cloudfen - Sheep AI with state machine
 * States: IDLE, GATHERING, CHARGING, PETTED
 */
export class Cloudfen {
    // State constants
    static STATE = {
        IDLE: 'idle',
        GATHERING: 'gathering',
        CHARGING: 'charging',
        PETTED: 'petted',
    };

    constructor(game) {
        this.game = game;

        // Position and physics
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.targetPosition = null;

        // State machine
        this.state = Cloudfen.STATE.IDLE;
        this.stateTimer = 0;

        // Movement settings
        this.wanderSpeed = 1.5;
        this.gatherSpeed = 4;
        this.chargeSpeed = 12;

        // Idle behavior
        this.idleTimer = 0;
        this.nextWanderTime = Math.random() * 3 + 2;

        // Visual
        this.mesh = null;
        this.model = null;
        this.bobPhase = Math.random() * Math.PI * 2;
        this.bounceHeight = 0;

        // Pet reaction
        this.petCooldown = 0;
        this.happiness = 0;

        // Animation
        this.mixer = null;
        this.animations = {};
        this.currentAnimation = null;
    }

    async init(x, z) {
        this.position.set(x, 0, z);
        await this._createMesh();
    }

    // Create gradient texture for toon shading (same as landing page)
    _createGradientTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 4;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#c0c0c0'; ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = '#e0e0e0'; ctx.fillRect(1, 0, 1, 1);
        ctx.fillStyle = '#f0f0f0'; ctx.fillRect(2, 0, 1, 1);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(3, 0, 1, 1);
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        return texture;
    }

    async _createMesh() {
        const loader = new THREE.GLTFLoader();

        try {
            // Use static sheep.glb for now (animation models have issues)
            const gltf = await new Promise((resolve, reject) => {
                loader.load(
                    'assets/models/sheep.glb',
                    resolve,
                    undefined,
                    reject
                );
            });

            this.model = gltf.scene;

            // Create materials
            const gradientMap = this._createGradientTexture();
            const woolMat = new THREE.MeshToonMaterial({
                color: 0xffffff,
                gradientMap: gradientMap
            });
            const darkMat = new THREE.MeshToonMaterial({
                color: 0x1a1a1a,
                gradientMap: gradientMap
            });

            // Apply materials based on mesh name
            // sheep.glb nodes: horn, leg, Group1, interior_body2, wool4, Cylinder0-2
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    const name = child.name.toLowerCase();
                    
                    // White parts: wool only
                    // Dark parts: everything else (horn, leg, body/face, cylinders)
                    const isWhitePart = name.includes('wool');
                    child.material = isWhitePart ? woolMat : darkMat;
                    
                    console.log(`Mesh: ${name}, material: ${isWhitePart ? 'wool' : 'dark'}`);
                }
            });

            this.model.scale.setScalar(0.8);
            this.modelYOffset = 0.9;
            this.mesh = this.model;
            
            console.log('Loaded sheep.glb successfully');

        } catch (e) {
            console.warn('Failed to load sheep.glb, using fallback:', e);
            this.mesh = this._createFallbackMesh();
            this.modelYOffset = 0;
        }

        // Set initial position
        this.mesh.position.set(this.position.x, this.modelYOffset, this.position.z);
        this.game.scene.add(this.mesh);
    }

    _createFallbackMesh() {
        const group = new THREE.Group();

        // Use MeshBasicMaterial for guaranteed color display (no lighting needed)
        const woolMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const darkMat = new THREE.MeshBasicMaterial({ color: 0x333333 });

        // Body (fluffy sphere) - positioned so bottom is at y=0
        const bodyGeometry = new THREE.IcosahedronGeometry(0.6, 1);
        const body = new THREE.Mesh(bodyGeometry, woolMat);
        body.position.y = 0.6;
        group.add(body);

        // Head
        const headGeometry = new THREE.SphereGeometry(0.25, 12, 10);
        const head = new THREE.Mesh(headGeometry, darkMat);
        head.position.set(0.5, 0.75, 0);
        group.add(head);

        // Eyes (white)
        const eyeGeometry = new THREE.SphereGeometry(0.06, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(0.7, 0.82, 0.1);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.7, 0.82, -0.1);
        group.add(rightEye);

        // Pupils (black)
        const pupilGeometry = new THREE.SphereGeometry(0.025, 6, 6);
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(0.74, 0.82, 0.1);
        group.add(leftPupil);

        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0.74, 0.82, -0.1);
        group.add(rightPupil);

        // Ears
        const earGeometry = new THREE.ConeGeometry(0.08, 0.2, 4);

        const leftEar = new THREE.Mesh(earGeometry, darkMat);
        leftEar.position.set(0.4, 0.95, 0.15);
        leftEar.rotation.set(0.3, 0, -0.5);
        group.add(leftEar);

        const rightEar = new THREE.Mesh(earGeometry, darkMat);
        rightEar.position.set(0.4, 0.95, -0.15);
        rightEar.rotation.set(-0.3, 0, -0.5);
        group.add(rightEar);

        // Legs (4 stubby cylinders) - positioned so feet touch y=0
        const legGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8);

        const legPositions = [
            { x: -0.22, z: 0.2 },
            { x: -0.22, z: -0.2 },
            { x: 0.22, z: 0.2 },
            { x: 0.22, z: -0.2 },
        ];

        for (const pos of legPositions) {
            const leg = new THREE.Mesh(legGeometry, darkMat);
            leg.position.set(pos.x, 0.15, pos.z);  // leg center at 0.15, so bottom at 0
            group.add(leg);
        }

        // Tiny tail
        const tailGeometry = new THREE.SphereGeometry(0.1, 8, 6);
        const tail = new THREE.Mesh(tailGeometry, woolMat);
        tail.position.set(-0.55, 0.6, 0);
        group.add(tail);

        return group;
    }

    /**
     * Play an animation with smooth crossfade transition
     * @param {string} name - Animation name ('idle' or 'walk')
     * @param {number} fadeTime - Crossfade duration in seconds
     */
    playAnimation(name, fadeTime = 0.2) {
        if (!this.mixer || !this.animations[name]) return;
        if (this.currentAnimation === name) return;

        const newAction = this.animations[name];

        if (this.currentAnimation && this.animations[this.currentAnimation]) {
            // Crossfade from current animation
            const currentAction = this.animations[this.currentAnimation];
            newAction.reset();
            newAction.play();
            currentAction.crossFadeTo(newAction, fadeTime, true);
        } else {
            // No current animation, just play
            newAction.reset();
            newAction.play();
        }

        this.currentAnimation = name;
    }

    update(dt) {
        // No animation mixer needed for static model

        // Update cooldowns
        this.petCooldown = Math.max(0, this.petCooldown - dt);
        this.happiness = Math.max(0, this.happiness - dt * 0.1);

        // State machine
        switch (this.state) {
            case Cloudfen.STATE.IDLE:
                this._updateIdle(dt);
                break;
            case Cloudfen.STATE.GATHERING:
                this._updateGathering(dt);
                break;
            case Cloudfen.STATE.CHARGING:
                this._updateCharging(dt);
                break;
            case Cloudfen.STATE.PETTED:
                this._updatePetted(dt);
                break;
        }

        // Apply physics
        this._applyPhysics(dt);

        // Update visuals
        this._updateVisuals(dt);
    }

    _updateIdle(dt) {
        this.idleTimer += dt;

        // Random wandering
        if (this.idleTimer >= this.nextWanderTime) {
            this.idleTimer = 0;
            this.nextWanderTime = Math.random() * 4 + 2;

            // Pick random nearby position
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 3 + 1;

            this.targetPosition = new THREE.Vector3(
                this.position.x + Math.cos(angle) * distance,
                0,
                this.position.z + Math.sin(angle) * distance
            );

            // Keep within bounds
            const bounds = 35;
            this.targetPosition.x = Math.max(-bounds, Math.min(bounds, this.targetPosition.x));
            this.targetPosition.z = Math.max(-bounds, Math.min(bounds, this.targetPosition.z));
        }

        // Move towards target
        if (this.targetPosition) {
            const dir = new THREE.Vector3().subVectors(this.targetPosition, this.position);
            const dist = dir.length();

            if (dist > 0.3) {
                dir.normalize();
                this.velocity.x = dir.x * this.wanderSpeed;
                this.velocity.z = dir.z * this.wanderSpeed;
            } else {
                this.targetPosition = null;
                this.velocity.x *= 0.8;
                this.velocity.z *= 0.8;
            }
        }
    }

    _updateGathering(dt) {
        // Move towards player
        const player = this.game.player;
        if (!player) return;

        const dir = new THREE.Vector3().subVectors(player.position, this.position);
        const dist = dir.length();

        if (dist > 2) {
            dir.normalize();
            this.velocity.x = dir.x * this.gatherSpeed;
            this.velocity.z = dir.z * this.gatherSpeed;
        } else {
            // Close enough, slow down
            this.velocity.x *= 0.9;
            this.velocity.z *= 0.9;
        }
    }

    _updateCharging(dt) {
        this.stateTimer += dt;

        // Charge in stored direction
        if (this.chargeDirection) {
            this.velocity.x = this.chargeDirection.x * this.chargeSpeed;
            this.velocity.z = this.chargeDirection.z * this.chargeSpeed;
        }

        // End charge after duration
        if (this.stateTimer >= 0.8) {
            this.setState(Cloudfen.STATE.IDLE);
            this.chargeDirection = null;
        }
    }

    _updatePetted(dt) {
        this.stateTimer += dt;

        // Happy wiggle
        this.velocity.x = Math.sin(this.stateTimer * 15) * 0.5;

        // End petted state
        if (this.stateTimer >= 1.0) {
            this.setState(Cloudfen.STATE.IDLE);
        }
    }

    _applyPhysics(dt) {
        // Apply velocity
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;

        // Ground collision
        this.position.y = 0;

        // Bounds
        const bounds = 38;
        this.position.x = Math.max(-bounds, Math.min(bounds, this.position.x));
        this.position.z = Math.max(-bounds, Math.min(bounds, this.position.z));

        // Friction
        this.velocity.x *= 0.95;
        this.velocity.z *= 0.95;

        // Collision with moss ball - always active
        const mossBall = this.game.mossBall;
        if (mossBall) {
            // Use 2D distance (ignore Y) for ground-level collision
            const dx = this.position.x - mossBall.position.x;
            const dz = this.position.z - mossBall.position.z;
            const dist2D = Math.sqrt(dx * dx + dz * dz);
            const cloudfenRadius = 0.6;
            const collisionDist = cloudfenRadius + mossBall.radius;

            if (dist2D < collisionDist && dist2D > 0) {
                // Calculate push direction (from cloudfen to moss ball)
                const pushDir = new THREE.Vector3(
                    mossBall.position.x - this.position.x,
                    0,
                    mossBall.position.z - this.position.z
                ).normalize();

                // Push strength depends on cloudfen's speed
                const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);

                if (this.state === Cloudfen.STATE.CHARGING) {
                    // Strong push when charging
                    mossBall.push(pushDir, this.chargeSpeed * 1.2);

                    // Visual feedback
                    if (this.game.effects) {
                        this.game.effects.spawnImpact(mossBall.position, 0x228B22);
                    }
                } else if (speed > 0.5) {
                    // Light push when walking into it
                    mossBall.push(pushDir, speed * 0.8);
                }

                // Push cloudfen back (separation)
                const overlap = collisionDist - dist2D;
                this.position.x -= pushDir.x * overlap * 0.5;
                this.position.z -= pushDir.z * overlap * 0.5;
            }
        }

        // Collision with other cloudfens - soft balloon-like bouncing
        const cloudfenRadius = 0.6;
        for (const other of this.game.cloudfens) {
            if (other === this) continue;

            const dx = this.position.x - other.position.x;
            const dz = this.position.z - other.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const minDist = cloudfenRadius * 2; // Both sheep radii

            if (dist < minDist && dist > 0) {
                // Soft push apart (like balloons)
                const overlap = minDist - dist;
                const nx = dx / dist;
                const nz = dz / dist;

                // Push this cloudfen away (soft, bouncy)
                const pushStrength = overlap * 0.4;
                this.position.x += nx * pushStrength;
                this.position.z += nz * pushStrength;

                // Add a tiny velocity bounce for fun balloon effect
                this.velocity.x += nx * 0.3;
                this.velocity.z += nz * 0.3;
            }
        }
    }

    _updateVisuals(dt) {
        if (!this.mesh) return;

        // Update position
        this.mesh.position.x = this.position.x;
        this.mesh.position.z = this.position.z;

        // Raycast to find ground height
        const raycaster = new THREE.Raycaster();
        const origin = new THREE.Vector3(this.position.x, 10, this.position.z);
        raycaster.set(origin, new THREE.Vector3(0, -1, 0));

        const intersects = raycaster.intersectObjects(this.game.scene.children, true);
        let groundY = 0;
        for (const hit of intersects) {
            // Skip self and non-ground objects
            if (hit.object === this.mesh || hit.object.parent === this.mesh) continue;
            if (hit.object.geometry && hit.object.geometry.type === 'PlaneGeometry') {
                groundY = hit.point.y;
                break;
            }
        }

        // Set Y position: ground height + model offset
        this.mesh.position.y = groundY + (this.modelYOffset || 0.75);

        // Bob animation
        this.bobPhase += dt * 5;
        const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);

        // No animation switching for static model

        if (speed > 0.5) {
            // Tilt in movement direction when moving
            this.mesh.rotation.z = Math.sin(this.bobPhase * 2) * 0.1;
        } else {
            // Reset tilt when stationary
            this.mesh.rotation.z *= 0.9;
        }

        // Face movement direction
        if (speed > 0.3) {
            const targetRotation = Math.atan2(this.velocity.x, this.velocity.z);
            this.mesh.rotation.y = THREE.MathUtils.lerp(
                this.mesh.rotation.y,
                targetRotation,
                dt * 5
            );
        }

        // Scale pulse when happy (petted)
        if (this.happiness > 0) {
            const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.05 * this.happiness;
            this.mesh.scale.setScalar(pulse * 0.8);
        } else {
            this.mesh.scale.setScalar(0.8);
        }
    }

    /**
     * Change state
     */
    setState(newState) {
        if (this.state === newState) return;

        this.state = newState;
        this.stateTimer = 0;
    }

    /**
     * Start gathering towards player
     */
    startGathering() {
        if (this.state !== Cloudfen.STATE.PETTED) {
            this.setState(Cloudfen.STATE.GATHERING);
        }
    }

    /**
     * Stop gathering
     */
    stopGathering() {
        if (this.state === Cloudfen.STATE.GATHERING) {
            this.setState(Cloudfen.STATE.IDLE);
        }
    }

    /**
     * Charge in direction
     */
    charge(direction) {
        this.chargeDirection = direction.clone().normalize();
        this.setState(Cloudfen.STATE.CHARGING);

        // Visual feedback
        if (this.game.effects) {
            this.game.effects.spawnChargeTrail(this.position);
        }
    }

    /**
     * Pet the cloudfen
     */
    pet() {
        if (this.petCooldown > 0) return;

        this.petCooldown = 0.5;
        this.happiness = 1;
        this.setState(Cloudfen.STATE.PETTED);
    }
}