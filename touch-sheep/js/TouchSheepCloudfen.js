/**
 * Cloudfen - Sheep AI for first-person herding demo
 * Rich behavior system with grazing, sleeping, social interactions
 * Reacts to player position and movement
 */
export class Cloudfen {
    static STATE = {
        IDLE: 'idle',
        GRAZING: 'grazing',
        LOOKING: 'looking',
        STRETCHING: 'stretching',
        RESTING: 'resting',
        SLEEPING: 'sleeping',
        SOCIAL: 'social',
        CURIOUS: 'curious',
        PETTED: 'petted',
        BLISS: 'bliss',
        CALLED: 'called',
        FLEEING: 'fleeing',
    };

    constructor(game) {
        this.game = game;

        // Position and physics
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.targetPosition = null;
        this.baseScale = 1.0;

        // State machine
        this.state = Cloudfen.STATE.IDLE;
        this.stateTimer = 0;
        this.previousState = null;

        // Movement settings
        this.wanderSpeed = 0.8;
        this.approachSpeed = 1.5;
        this.fleeSpeed = 4.0;

        // Idle behavior
        this.idleTimer = 0;
        this.nextWanderTime = Math.random() * 2 + 0.5; // Start wandering sooner
        this.homePosition = new THREE.Vector3();
        this.initialRotation = Math.random() * Math.PI * 2; // Random initial facing

        // Grazing behavior
        this.grazingTimer = 0;
        this.grazeHeadBob = 0;
        this.grazeDuration = 0;

        // Resting/sleeping behavior
        this.tiredness = Math.random() * 0.3;
        this.sleepTimer = 0;
        this.isLyingDown = false;
        this.lyingDownProgress = 0;

        // Looking around behavior
        this.lookTarget = null;
        this.lookTimer = 0;
        this.headTilt = 0;
        this.earWiggle = 0;

        // Social behavior
        this.socialTarget = null;
        this.socialTimer = 0;
        this.lastSocialTime = 0;

        // Stretching
        this.stretchProgress = 0;
        this.stretchType = 0;

        // Visual
        this.mesh = null;
        this.model = null;
        this.modelYOffset = 0;
        this.bobPhase = Math.random() * Math.PI * 2;

        // Petting state
        this.happiness = 0;
        this.blissLevel = 0;
        this.isPetted = false;
        this.petDuration = 0;
        this.lastStrokeTime = 0;

        // Hover state
        this.isHovered = false;
        this.hoverTime = 0;

        // Player awareness
        this.playerAwareness = 0;
        this.fleeThreshold = 2.5;
        this.comfortDistance = 4;

        // Expression state
        this.eyeOpenness = 1.0;
        this.targetEyeOpenness = 1.0;

        // Animation
        this.mixer = null;
        this.animations = {};
        this.currentAnimation = null;

        // Personality
        this.personality = {
            shyness: 0.3 + Math.random() * 0.4,
            friendliness: 0.5 + Math.random() * 0.5,
            curiosity: 0.3 + Math.random() * 0.5,
            flightiness: 0.2 + Math.random() * 0.4,
            laziness: 0.2 + Math.random() * 0.5,
            sociability: 0.3 + Math.random() * 0.6,
        };

        // Behavior weights
        this.behaviorWeights = {
            wander: 0.25,
            graze: 0.30,
            look: 0.15,
            stretch: 0.05,
            rest: 0.15,
            social: 0.10,
        };

        // Agency properties
        this.attentionTarget = null;
        this.attentionStrength = 0;
        this.lastAttentionShift = 0;

        // Micro-behaviors
        this.earTwitchTimer = Math.random() * 3;
        this.tailWagTimer = Math.random() * 5;
        this.headShakeTimer = Math.random() * 8;
        this.pawGroundTimer = Math.random() * 15;
        this.sniffTimer = Math.random() * 6;

        // Memory
        this.lastPlayerPosition = null;
        this.lastSeenPlayerTime = 0;
        this.favoriteSpot = null;
        this.timesBeenPetted = 0;

        // Mood system
        this.mood = {
            contentment: 0.5 + Math.random() * 0.3,
            alertness: 0.3 + Math.random() * 0.2,
            playfulness: Math.random() * 0.5,
        };

        // Vocalization
        this.vocalizationTimer = Math.random() * 20;
        this.isVocalizing = false;

        // Body language
        this.earRotation = { left: 0, right: 0 };
        this.tailPosition = 0;
        this.headHeight = 1;

        // Micro-behavior states
        this.headShakeActive = false;
        this.headShakeProgress = 0;
        this.pawingGround = false;
        this.pawProgress = 0;
        this.isSniffing = false;
        this.sniffProgress = 0;

        // Soft physics
        this.squashStretch = { x: 1, y: 1, z: 1 };
        this.targetSquash = { x: 1, y: 1, z: 1 };
        this.woolBounce = 0;
        this.woolBounceVel = 0;
        this.lastVelocityY = 0;

        // Breathing
        this.breathPhase = Math.random() * Math.PI * 2;
        this.breathRate = 0.8 + Math.random() * 0.4;

        // Impact
        this.impactSquash = 0;
        this.contentWobble = 0;
        this.lastSpeed = 0;

        // X-axis wiggle for petting (rotation around X)
        this.petWiggle = 0;
        this.petWiggleTarget = 0;
    }

    async init(x, z, scale = 1.0) {
        // Get ground height at spawn position
        const groundY = this.game.gameScene ? this.game.gameScene.getGroundHeight(x, z) : 0;
        this.position.set(x, groundY, z);
        this.homePosition.copy(this.position);
        this.baseScale = scale;
        await this._createMesh();
    }

    _createGradientTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 4;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#d0d0d0'; ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = '#e8e8e8'; ctx.fillRect(1, 0, 1, 1);
        ctx.fillStyle = '#f5f5f5'; ctx.fillRect(2, 0, 1, 1);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(3, 0, 1, 1);
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        return texture;
    }

    async _createMesh() {
        const loader = new THREE.GLTFLoader();

        try {
            const gltf = await new Promise((resolve, reject) => {
                loader.load(
                    '../play/assets/models/sheep.glb',
                    resolve,
                    undefined,
                    reject
                );
            });

            this.model = gltf.scene;

            const gradientMap = this._createGradientTexture();
            const woolMat = new THREE.MeshToonMaterial({
                color: 0xffffff,
                gradientMap: gradientMap
            });
            const darkMat = new THREE.MeshToonMaterial({
                color: 0x1a1a1a,
                gradientMap: gradientMap
            });

            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    const name = child.name.toLowerCase();
                    const isWhitePart = name.includes('wool');
                    child.material = isWhitePart ? woolMat : darkMat;
                }
            });

            this.model.scale.setScalar(0.8 * this.baseScale);
            this.modelYOffset = 0.95 * this.baseScale;
            this.mesh = this.model;

        } catch (e) {
            console.warn('Failed to load sheep.glb, using fallback:', e);
            this.mesh = this._createFallbackMesh();
            this.modelYOffset = 0.3 * this.baseScale; // Fallback mesh needs offset too
        }

        const groundY = this.game.gameScene ? this.game.gameScene.getGroundHeight(this.position.x, this.position.z) : 0;
        this.mesh.position.set(this.position.x, groundY + this.modelYOffset, this.position.z);
        // Set random initial facing direction
        this.mesh.rotation.y = this.initialRotation;
        this.game.scene.add(this.mesh);
    }

    _createFallbackMesh() {
        const group = new THREE.Group();

        const woolMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const darkMat = new THREE.MeshBasicMaterial({ color: 0x333333 });

        const bodyGeometry = new THREE.IcosahedronGeometry(0.6, 1);
        const body = new THREE.Mesh(bodyGeometry, woolMat);
        body.position.y = 0.6;
        group.add(body);

        const headGeometry = new THREE.SphereGeometry(0.25, 12, 10);
        const head = new THREE.Mesh(headGeometry, darkMat);
        head.position.set(0.5, 0.75, 0);
        group.add(head);

        const eyeGeometry = new THREE.SphereGeometry(0.06, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(0.7, 0.82, 0.1);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.7, 0.82, -0.1);
        group.add(rightEye);

        const pupilGeometry = new THREE.SphereGeometry(0.025, 6, 6);
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(0.74, 0.82, 0.1);
        group.add(leftPupil);

        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0.74, 0.82, -0.1);
        group.add(rightPupil);

        const earGeometry = new THREE.ConeGeometry(0.08, 0.2, 4);

        const leftEar = new THREE.Mesh(earGeometry, darkMat);
        leftEar.position.set(0.4, 0.95, 0.15);
        leftEar.rotation.set(0.3, 0, -0.5);
        group.add(leftEar);

        const rightEar = new THREE.Mesh(earGeometry, darkMat);
        rightEar.position.set(0.4, 0.95, -0.15);
        rightEar.rotation.set(-0.3, 0, -0.5);
        group.add(rightEar);

        const legGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8);
        const legPositions = [
            { x: -0.22, z: 0.2 },
            { x: -0.22, z: -0.2 },
            { x: 0.22, z: 0.2 },
            { x: 0.22, z: -0.2 },
        ];

        for (const pos of legPositions) {
            const leg = new THREE.Mesh(legGeometry, darkMat);
            leg.position.set(pos.x, 0.15, pos.z);
            group.add(leg);
        }

        const tailGeometry = new THREE.SphereGeometry(0.1, 8, 6);
        const tail = new THREE.Mesh(tailGeometry, woolMat);
        tail.position.set(-0.55, 0.6, 0);
        group.add(tail);

        group.scale.setScalar(this.baseScale);

        return group;
    }

    // ==================== INTERACTION HANDLERS ====================

    onHoverStart() {
        if (this.state === Cloudfen.STATE.BLISS || this.state === Cloudfen.STATE.FLEEING) return;
        this.isHovered = true;
        this.hoverTime = 0;
    }

    onHoverEnd() {
        this.isHovered = false;
        this.hoverTime = 0;
    }

    onStroke(dx, dy, speed) {
        if (!this.isPetted) return;

        this.lastStrokeTime = Date.now();

        const strokeBonus = Math.min(speed * 0.02, 0.15) * this.personality.friendliness;
        this.happiness = Math.min(1, this.happiness + strokeBonus);

        // Physical reaction - wool jiggle and x-axis wiggle
        this.woolBounceVel += speed * 0.15;
        this.impactSquash = Math.min(0.1, speed * 0.02);

        // Add x-axis wiggle based on stroke direction
        this.petWiggleTarget += dx * 0.003;

        this.velocity.x += dx * 0.02;
        this.velocity.z += dy * 0.02;

        if (this.game.effects && Math.random() < 0.2) {
            this.game.effects.spawnWoolParticle(this.mesh.position, new THREE.Vector2(dx, dy).normalize());
        }
    }

    endPetting(duration) {
        this.isPetted = false;
        this.petDuration = duration;

        if (this.state === Cloudfen.STATE.BLISS) {
            this.stateTimer = 0;
        } else if (this.state === Cloudfen.STATE.PETTED) {
            const heartCount = Math.min(Math.floor(duration * 2), 5);
            if (this.game.effects && heartCount > 0) {
                this.game.effects.spawnHearts(this.mesh.position, heartCount);
            }

            setTimeout(() => {
                if (this.state === Cloudfen.STATE.PETTED) {
                    this.setState(Cloudfen.STATE.IDLE);
                }
            }, 1000);
        }
    }

    onCalled(sourcePosition) {
        if (this.state === Cloudfen.STATE.BLISS || this.state === Cloudfen.STATE.FLEEING) return;

        if (this.state === Cloudfen.STATE.SLEEPING || this.state === Cloudfen.STATE.RESTING) {
            this._standUp();
        }

        const dir = new THREE.Vector3().subVectors(sourcePosition, this.position);
        const distance = dir.length();
        const delay = Math.min(distance * 80, 400);

        setTimeout(() => {
            if (Math.random() > this.personality.shyness * 0.5) {
                this.setState(Cloudfen.STATE.CALLED);
                this.targetPosition = sourcePosition.clone();
                this.targetPosition.y = 0;
                const approachDir = dir.clone().normalize();
                this.targetPosition.sub(approachDir.multiplyScalar(this.comfortDistance));
            } else {
                this.setState(Cloudfen.STATE.CURIOUS);
            }
        }, delay);
    }

    // ==================== STATE MACHINE ====================

    setState(newState) {
        if (this.state === newState) return;
        this.previousState = this.state;
        this.state = newState;
        this.stateTimer = 0;
    }

    update(dt, playerInfo) {
        const playerPosition = playerInfo?.position || playerInfo;

        this.stateTimer += dt;
        if (this.isHovered) {
            this.hoverTime += dt;
        }

        if (!this.isPetted) {
            this.happiness = Math.max(0, this.happiness - dt * 0.08);
        }

        this._updatePlayerAwareness(dt, playerPosition);
        this._updateMicroBehaviors(dt, playerPosition);
        this._updateMood(dt, playerPosition);
        this._updateAttention(dt, playerPosition);

        if (this.state !== Cloudfen.STATE.RESTING && this.state !== Cloudfen.STATE.SLEEPING) {
            this.tiredness = Math.min(1, this.tiredness + dt * 0.005 * this.personality.laziness);
        }

        switch (this.state) {
            case Cloudfen.STATE.IDLE:
                this._updateIdle(dt, playerPosition);
                break;
            case Cloudfen.STATE.GRAZING:
                this._updateGrazing(dt, playerPosition);
                break;
            case Cloudfen.STATE.LOOKING:
                this._updateLooking(dt, playerPosition);
                break;
            case Cloudfen.STATE.STRETCHING:
                this._updateStretching(dt, playerPosition);
                break;
            case Cloudfen.STATE.RESTING:
                this._updateResting(dt, playerPosition);
                break;
            case Cloudfen.STATE.SLEEPING:
                this._updateSleeping(dt, playerPosition);
                break;
            case Cloudfen.STATE.SOCIAL:
                this._updateSocial(dt, playerPosition);
                break;
            case Cloudfen.STATE.CURIOUS:
                this._updateCurious(dt, playerPosition);
                break;
            case Cloudfen.STATE.PETTED:
                this._updatePetted(dt, playerPosition);
                break;
            case Cloudfen.STATE.BLISS:
                this._updateBliss(dt, playerPosition);
                break;
            case Cloudfen.STATE.CALLED:
                this._updateCalled(dt, playerPosition);
                break;
            case Cloudfen.STATE.FLEEING:
                this._updateFleeing(dt, playerPosition);
                break;
        }

        this._applyPhysics(dt);
        this._handleMossBallCollision();
        this._updateVisuals(dt, playerPosition);
    }

    _updatePlayerAwareness(dt, playerPosition) {
        if (!playerPosition) return;

        const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.position);
        toPlayer.y = 0;
        const distance = toPlayer.length();

        const playerVelocity = this.game.player?.velocity;
        const playerSpeed = playerVelocity ? Math.sqrt(playerVelocity.x ** 2 + playerVelocity.z ** 2) : 0;
        const isPlayerRunning = playerSpeed > 3;

        const canFlee = this.state !== Cloudfen.STATE.PETTED &&
                        this.state !== Cloudfen.STATE.BLISS &&
                        this.state !== Cloudfen.STATE.SLEEPING;

        if (distance < this.fleeThreshold && isPlayerRunning && canFlee) {
            if (this.state === Cloudfen.STATE.RESTING) {
                this._standUp();
            }

            if (Math.random() < this.personality.flightiness) {
                this.setState(Cloudfen.STATE.FLEEING);
                this.targetPosition = this.position.clone();
                const fleeDir = toPlayer.normalize().multiplyScalar(-1);
                this.targetPosition.add(fleeDir.multiplyScalar(8 + Math.random() * 5));
            }
        }

        if (distance < 8) {
            this.playerAwareness = Math.min(1, this.playerAwareness + dt * 0.5);
        } else {
            this.playerAwareness = Math.max(0, this.playerAwareness - dt * 0.2);
        }
    }

    _updateIdle(dt, playerPosition) {
        this.idleTimer += dt;
        this.targetEyeOpenness = 1.0;

        if (this.isHovered && this.hoverTime > 1.5 && this.playerAwareness > 0.3) {
            this.setState(Cloudfen.STATE.CURIOUS);
            return;
        }

        if (playerPosition && this.playerAwareness > 0.5) {
            const dist = this.position.distanceTo(playerPosition);
            if (this.timesBeenPetted > 0 && dist < 6 && Math.random() < 0.01) {
                this._pickLookTarget(playerPosition);
                this.setState(Cloudfen.STATE.LOOKING);
                return;
            }
        }

        if (this.idleTimer >= this.nextWanderTime) {
            this.idleTimer = 0;
            const baseTime = 1.5 + Math.random() * 2.5; // Shorter wait between behaviors
            this.nextWanderTime = baseTime * (1 + this.personality.laziness * 0.3);
            this._chooseNextBehavior(playerPosition);
            return;
        }

        if (this.targetPosition) {
            const dir = new THREE.Vector3().subVectors(this.targetPosition, this.position);
            dir.y = 0;
            const dist = dir.length();

            if (dist > 0.3) {
                dir.normalize();
                const speedMod = 0.9 + this.mood.playfulness * 0.2;
                this.velocity.x = dir.x * this.wanderSpeed * speedMod;
                this.velocity.z = dir.z * this.wanderSpeed * speedMod;
            } else {
                this.targetPosition = null;
                this.velocity.multiplyScalar(0.8);

                if (Math.random() < 0.3) {
                    this._pickLookTarget(playerPosition);
                    this.setState(Cloudfen.STATE.LOOKING);
                    return;
                }
            }
        } else {
            this.velocity.multiplyScalar(0.9);

            if (Math.random() < 0.005) {
                this.velocity.x += (Math.random() - 0.5) * 0.1;
            }
        }

        if (Math.random() < 0.003) {
            this._doBlink();
        }
    }

    _chooseNextBehavior(playerPosition) {
        if (this.tiredness > 0.7 && Math.random() < this.tiredness) {
            if (this.favoriteSpot && this.position.distanceTo(this.favoriteSpot) > 3) {
                this.targetPosition = this.favoriteSpot.clone();
            }
            this.setState(Cloudfen.STATE.RESTING);
            return;
        }

        const moodModifiers = {
            graze: 1 + (this.mood.contentment - 0.5) * 0.3,
            social: 1 + this.mood.playfulness * 0.5,
            look: 1 + this.mood.alertness * 0.4,
            rest: 1 + (1 - this.mood.playfulness) * 0.3,
        };

        let playerNearby = false;
        if (playerPosition) {
            const dist = this.position.distanceTo(playerPosition);
            playerNearby = dist < 8;
        }

        const roll = Math.random();
        let cumulative = 0;

        const nearestSheep = this._findNearestSheep();
        if (nearestSheep && nearestSheep.distance < 6 &&
            Date.now() - this.lastSocialTime > 10000 &&
            Math.random() < this.personality.sociability * moodModifiers.social) {
            cumulative += this.behaviorWeights.social * moodModifiers.social;
            if (roll < cumulative) {
                this.socialTarget = nearestSheep.sheep;
                this.setState(Cloudfen.STATE.SOCIAL);
                return;
            }
        }

        let grazeWeight = this.behaviorWeights.graze * moodModifiers.graze;
        if (playerNearby) grazeWeight *= 0.5;
        cumulative += grazeWeight;
        if (roll < cumulative) {
            this.grazeDuration = 3 + Math.random() * 5;
            this.setState(Cloudfen.STATE.GRAZING);
            return;
        }

        let lookWeight = this.behaviorWeights.look * moodModifiers.look;
        if (playerNearby) lookWeight *= 1.5;
        cumulative += lookWeight;
        if (roll < cumulative) {
            this._pickLookTarget(playerPosition);
            this.setState(Cloudfen.STATE.LOOKING);
            return;
        }

        let stretchWeight = this.behaviorWeights.stretch;
        if (this.previousState === Cloudfen.STATE.RESTING ||
            this.previousState === Cloudfen.STATE.SLEEPING) {
            stretchWeight *= 3;
        }
        cumulative += stretchWeight;
        if (roll < cumulative) {
            this.stretchType = Math.floor(Math.random() * 3);
            this.stretchProgress = 0;
            this.setState(Cloudfen.STATE.STRETCHING);
            return;
        }

        cumulative += this.behaviorWeights.rest * moodModifiers.rest;
        if (roll < cumulative && this.tiredness > 0.3) {
            if (this.favoriteSpot && this.position.distanceTo(this.favoriteSpot) > 3) {
                this.targetPosition = this.favoriteSpot.clone();
            }
            this.setState(Cloudfen.STATE.RESTING);
            return;
        }

        this._chooseWanderTarget(playerPosition);
    }

    _chooseWanderTarget(playerPosition) {
        const roll = Math.random();

        if (roll < 0.3 && this.personality.sociability > 0.4) {
            const nearestSheep = this._findNearestSheep();
            if (nearestSheep && nearestSheep.distance > 4 && nearestSheep.distance < 15) {
                const dir = new THREE.Vector3().subVectors(nearestSheep.sheep.position, this.position);
                dir.normalize();
                this.targetPosition = this.position.clone().add(dir.multiplyScalar(2 + Math.random() * 2));
                return;
            }
        }

        if (roll < 0.5 && this.position.distanceTo(this.homePosition) > 8) {
            const dir = new THREE.Vector3().subVectors(this.homePosition, this.position);
            dir.normalize();
            this.targetPosition = this.position.clone().add(dir.multiplyScalar(3 + Math.random() * 3));
            return;
        }

        if (roll < 0.75 && this.personality.curiosity > 0.3) {
            // Explore in a random direction from current position
            const angle = Math.random() * Math.PI * 2;
            const distance = 3 + Math.random() * 6;
            this.targetPosition = new THREE.Vector3(
                this.position.x + Math.cos(angle) * distance,
                0,
                this.position.z + Math.sin(angle) * distance
            );
            return;
        }

        const wanderRadius = 8; // Larger wander range
        const angle = Math.random() * Math.PI * 2;
        const distance = 2 + Math.random() * wanderRadius; // Minimum distance to encourage spreading
        this.targetPosition = new THREE.Vector3(
            this.homePosition.x + Math.cos(angle) * distance,
            0,
            this.homePosition.z + Math.sin(angle) * distance
        );
    }

    _findNearestSheep() {
        let nearest = null;
        let nearestDist = Infinity;

        for (const other of this.game.cloudfens) {
            if (other === this) continue;
            if (other.state === Cloudfen.STATE.SLEEPING ||
                other.state === Cloudfen.STATE.FLEEING ||
                other.state === Cloudfen.STATE.PETTED ||
                other.state === Cloudfen.STATE.BLISS) continue;

            const dx = other.position.x - this.position.x;
            const dz = other.position.z - this.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = other;
            }
        }

        return nearest ? { sheep: nearest, distance: nearestDist } : null;
    }

    _pickLookTarget(playerPosition) {
        const roll = Math.random();

        if (playerPosition && roll < 0.3 && this.playerAwareness > 0.2) {
            this.lookTarget = playerPosition.clone();
        } else if (roll < 0.6) {
            const nearestSheep = this._findNearestSheep();
            if (nearestSheep) {
                this.lookTarget = nearestSheep.sheep.position.clone();
            } else {
                this.lookTarget = null;
            }
        } else {
            const angle = Math.random() * Math.PI * 2;
            this.lookTarget = this.position.clone().add(
                new THREE.Vector3(Math.cos(angle) * 5, 0, Math.sin(angle) * 5)
            );
        }
        this.lookTimer = 2 + Math.random() * 3;
    }

    _updateGrazing(dt, playerPosition) {
        this.grazingTimer += dt;
        this.velocity.multiplyScalar(0.85);

        this.grazeHeadBob = Math.sin(this.grazingTimer * 3) * 0.08;

        if (Math.random() < 0.01) {
            const angle = this.mesh.rotation.y + (Math.random() - 0.5) * 0.5;
            this.velocity.x += Math.sin(angle) * 0.15;
            this.velocity.z += Math.cos(angle) * 0.15;
        }

        if (playerPosition) {
            const dist = this.position.distanceTo(playerPosition);
            if (dist < 3) {
                this.setState(Cloudfen.STATE.CURIOUS);
                return;
            }
        }

        if (this.grazingTimer >= this.grazeDuration) {
            this.grazingTimer = 0;
            this.grazeHeadBob = 0;
            this.setState(Cloudfen.STATE.IDLE);
        }

        if (Math.random() < 0.004) {
            this._doBlink();
        }
    }

    _updateLooking(dt, playerPosition) {
        this.lookTimer -= dt;
        this.velocity.multiplyScalar(0.9);

        if (this.lookTimer <= 0) {
            this.lookTarget = null;
            this.setState(Cloudfen.STATE.IDLE);
        }

        if (this.isHovered && this.hoverTime > 1) {
            this.setState(Cloudfen.STATE.CURIOUS);
        }
    }

    _updateStretching(dt, playerPosition) {
        this.stretchProgress += dt;
        this.velocity.multiplyScalar(0.8);

        const stretchDuration = 2.5;

        if (this.stretchProgress >= stretchDuration) {
            this.stretchProgress = 0;
            this.setState(Cloudfen.STATE.IDLE);
        }

        if (this.isHovered && this.hoverTime > 0.5) {
            this.stretchProgress = 0;
            this.setState(Cloudfen.STATE.CURIOUS);
        }
    }

    _updateResting(dt, playerPosition) {
        this.velocity.multiplyScalar(0.8);
        this.targetEyeOpenness = 0.7;

        if (!this.isLyingDown) {
            this.lyingDownProgress = Math.min(1, this.lyingDownProgress + dt * 0.8);
            if (this.lyingDownProgress >= 1) {
                this.isLyingDown = true;
            }
        }

        this.tiredness = Math.max(0, this.tiredness - dt * 0.03);

        if (this.tiredness < 0.2 && this.stateTimer > 5 && Math.random() < 0.01) {
            this.setState(Cloudfen.STATE.SLEEPING);
            return;
        }

        if (playerPosition) {
            const dist = this.position.distanceTo(playerPosition);
            if (dist < 4 && this.playerAwareness > 0.5) {
                this._standUp();
                this.setState(Cloudfen.STATE.CURIOUS);
                return;
            }
        }

        if (this.stateTimer > 8 + Math.random() * 5 && this.tiredness < 0.4) {
            this._standUp();
            this.setState(Cloudfen.STATE.IDLE);
        }

        if (Math.random() < 0.006) {
            this._doBlink();
        }
    }

    _updateSleeping(dt, playerPosition) {
        this.sleepTimer += dt;
        this.velocity.multiplyScalar(0.9);
        this.targetEyeOpenness = 0.05;

        this.isLyingDown = true;
        this.lyingDownProgress = 1;

        this.tiredness = Math.max(0, this.tiredness - dt * 0.05);

        if (playerPosition) {
            const dist = this.position.distanceTo(playerPosition);
            if (dist < 3) {
                this.targetEyeOpenness = 0.5;
                if (dist < 2 || this.isHovered) {
                    this._standUp();
                    this.setState(Cloudfen.STATE.CURIOUS);
                    return;
                }
            }
        }

        if (this.sleepTimer > 10 + Math.random() * 10 && this.tiredness < 0.1) {
            this.sleepTimer = 0;
            this._standUp();
            this.stretchType = 0;
            this.stretchProgress = 0;
            this.setState(Cloudfen.STATE.STRETCHING);
        }
    }

    _standUp() {
        this.isLyingDown = false;
        this.lyingDownProgress = 0;
        this.targetEyeOpenness = 1;
    }

    _updateSocial(dt, playerPosition) {
        this.socialTimer += dt;
        this.lastSocialTime = Date.now();

        if (!this.socialTarget || !this.socialTarget.mesh) {
            this.setState(Cloudfen.STATE.IDLE);
            return;
        }

        const toTarget = new THREE.Vector3().subVectors(this.socialTarget.position, this.position);
        toTarget.y = 0;
        const dist = toTarget.length();

        if (dist > 1.8) {
            toTarget.normalize();
            this.velocity.x = toTarget.x * this.wanderSpeed * 1.2;
            this.velocity.z = toTarget.z * this.wanderSpeed * 1.2;
        } else {
            this.velocity.multiplyScalar(0.8);

            this.headTilt = Math.sin(this.socialTimer * 2) * 0.03;

            if (Math.random() < 0.02) {
                this.tailPosition = 0.3;
            }

            if (Math.random() < 0.008) {
                this._doVocalize();
            }

            if (Math.random() < 0.01 && !this.isSniffing) {
                this._doSniff();
            }

            if (this.socialTarget.state === Cloudfen.STATE.IDLE &&
                Math.random() < 0.02) {
                this.socialTarget.socialTarget = this;
                this.socialTarget.setState(Cloudfen.STATE.SOCIAL);
            }
        }

        if (this.socialTimer > 4 + Math.random() * 3) {
            this.socialTimer = 0;
            this.socialTarget = null;
            this.headTilt = 0;
            this.earWiggle = 0;

            if (Math.random() < 0.4) {
                this.grazeDuration = 3 + Math.random() * 3;
                this.setState(Cloudfen.STATE.GRAZING);
            } else {
                this.setState(Cloudfen.STATE.IDLE);
            }
        }

        if (this.isHovered && this.hoverTime > 1.5) {
            this.socialTarget = null;
            this.setState(Cloudfen.STATE.CURIOUS);
        }
    }

    _updateCurious(dt, playerPosition) {
        this.targetEyeOpenness = 1.0;
        this.velocity.multiplyScalar(0.9);

        this.headTilt = Math.sin(this.stateTimer * 1.5) * 0.04;

        if (this.stateTimer < 2) {
            this.earRotation.left = 0.15;
            this.earRotation.right = 0.15;
        }

        if (this.stateTimer > 1 && Math.random() < 0.01 && !this.pawingGround) {
            this._doPawGround();
        }

        if (!this.isHovered && this.stateTimer > 4) {
            this.headTilt = 0;
            this.setState(Cloudfen.STATE.IDLE);
        }

        if (playerPosition && this.stateTimer > 2) {
            const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.position);
            toPlayer.y = 0;
            const dist = toPlayer.length();

            if (dist > this.comfortDistance && Math.random() < 0.008 * this.personality.friendliness) {
                toPlayer.normalize();
                this.velocity.add(toPlayer.multiplyScalar(0.4));
            }

            if (this.timesBeenPetted > 0 && dist > 2 && Math.random() < 0.01 * this.personality.friendliness) {
                toPlayer.normalize();
                this.velocity.add(toPlayer.multiplyScalar(0.5));
            }
        }

        if (this.stateTimer > 2 && Math.random() < 0.005) {
            this._doVocalize();
        }
    }

    _updatePetted(dt, playerPosition) {
        this.velocity.multiplyScalar(0.85);
        this.targetEyeOpenness = Math.max(0.2, 1 - this.happiness * 0.8);

        // X-axis wiggle animation when being petted
        this.petWiggleTarget = Math.sin(this.stateTimer * 8) * 0.15 * this.happiness;

        const leanAmount = Math.sin(this.stateTimer * 2) * 0.3 * this.happiness;
        this.velocity.x += leanAmount * 0.1;

        this.targetSquash.x = 1 + this.happiness * 0.08;
        this.targetSquash.z = 1 + this.happiness * 0.08;
        this.targetSquash.y = 1 - this.happiness * 0.04;

        if (this.happiness > 0.3) {
            this.woolBounceVel += Math.sin(this.stateTimer * 6) * 0.1 * this.happiness;
        }

        this.tailPosition = 0.3 + this.happiness * 0.4;

        if (this.happiness > 0.8 && this.isPetted && this.stateTimer > 2) {
            this.setState(Cloudfen.STATE.BLISS);

            if (this.game.effects) {
                this.game.effects.spawnHearts(this.mesh.position, 5);
                this.game.effects.spawnBlissGlow(this.mesh.position);
            }
        }

        if (this.isPetted && Date.now() - this.lastStrokeTime > 300) {
            this.happiness = Math.min(1, this.happiness + dt * 0.15);
        }
    }

    _updateBliss(dt, playerPosition) {
        this.velocity.multiplyScalar(0.92);
        this.targetEyeOpenness = 0.15;

        // X-axis wiggle in bliss - dreamy sway
        this.petWiggleTarget = Math.sin(this.stateTimer * 3) * 0.12;

        const swayPhase = this.stateTimer * 1.5;
        this.velocity.x = Math.sin(swayPhase) * 0.15;
        this.velocity.z = Math.cos(swayPhase * 0.7) * 0.08;

        const puffAmount = 0.08 + Math.sin(this.stateTimer * 2) * 0.03;
        this.targetSquash.x = 1 + puffAmount;
        this.targetSquash.z = 1 + puffAmount;
        this.targetSquash.y = 1 - puffAmount * 0.3;

        this.woolBounceVel += Math.sin(this.stateTimer * 3) * 0.15;

        this.tailPosition = 0.6 + Math.sin(this.stateTimer * 8) * 0.2;

        if (this.isPetted && this.game.effects && Math.random() < 0.1) {
            this.game.effects.spawnHearts(this.mesh.position, 1);
        }

        if (!this.isPetted) {
            if (this.stateTimer > 3) {
                this.setState(Cloudfen.STATE.IDLE);
                this.happiness = 0.3;
            }
        }
    }

    _updateCalled(dt, playerPosition) {
        if (this.targetPosition) {
            const dir = new THREE.Vector3().subVectors(this.targetPosition, this.position);
            dir.y = 0;
            const dist = dir.length();

            if (dist > 0.8) {
                dir.normalize();
                this.velocity.x = dir.x * this.approachSpeed;
                this.velocity.z = dir.z * this.approachSpeed;
            } else {
                this.targetPosition = null;
                this.homePosition.copy(this.position);
                this.setState(Cloudfen.STATE.CURIOUS);
            }
        } else {
            this.setState(Cloudfen.STATE.IDLE);
        }
    }

    _updateFleeing(dt, playerPosition) {
        if (this.targetPosition) {
            const dir = new THREE.Vector3().subVectors(this.targetPosition, this.position);
            dir.y = 0;
            const dist = dir.length();

            if (dist > 1) {
                dir.normalize();
                this.velocity.x = dir.x * this.fleeSpeed;
                this.velocity.z = dir.z * this.fleeSpeed;
            } else {
                this.targetPosition = null;
                this.homePosition.copy(this.position);
                this.setState(Cloudfen.STATE.IDLE);
            }
        } else {
            this.setState(Cloudfen.STATE.IDLE);
        }

        if (this.stateTimer > 3) {
            this.setState(Cloudfen.STATE.IDLE);
        }
    }

    _applyPhysics(dt) {
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;

        const bounds = 25; // Keep sheep in safe terrain area
        this.position.x = Math.max(-bounds, Math.min(bounds, this.position.x));
        this.position.z = Math.max(-bounds, Math.min(bounds, this.position.z));

        this.velocity.x *= 0.92;
        this.velocity.z *= 0.92;

        // Balloon-like collision
        const sheepRadius = 0.8 * this.baseScale;
        for (const other of this.game.cloudfens) {
            if (other === this) continue;

            const dx = this.position.x - other.position.x;
            const dz = this.position.z - other.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const minDist = sheepRadius * 2;

            if (dist < minDist && dist > 0) {
                const overlap = minDist - dist;
                const nx = dx / dist;
                const nz = dz / dist;

                const pushStrength = overlap * 0.4;
                this.position.x += nx * pushStrength;
                this.position.z += nz * pushStrength;

                this.velocity.x += nx * 0.4;
                this.velocity.z += nz * 0.4;

                this.woolBounceVel += 0.3;
            }
        }

        // Apply bounds again after collision push
        this.position.x = Math.max(-bounds, Math.min(bounds, this.position.x));
        this.position.z = Math.max(-bounds, Math.min(bounds, this.position.z));

        // Rock collision
        if (this.game.gameScene && this.game.gameScene.checkRockCollision) {
            const rockCollision = this.game.gameScene.checkRockCollision(
                this.position.x,
                this.position.z,
                sheepRadius
            );

            if (rockCollision) {
                // Push sheep out of rock
                this.position.x += rockCollision.normalX * rockCollision.overlap;
                this.position.z += rockCollision.normalZ * rockCollision.overlap;

                // Bounce velocity slightly
                const dotProduct = this.velocity.x * rockCollision.normalX + this.velocity.z * rockCollision.normalZ;
                if (dotProduct < 0) {
                    this.velocity.x -= 1.5 * dotProduct * rockCollision.normalX;
                    this.velocity.z -= 1.5 * dotProduct * rockCollision.normalZ;
                }

                // Wool bounce on impact
                this.woolBounceVel += 0.4;
            }
        }

        // Update ground height after all position changes
        const groundY = this.game.gameScene ? this.game.gameScene.getGroundHeight(this.position.x, this.position.z) : 0;
        this.position.y = groundY;
    }

    _handleMossBallCollision() {
        if (!this.game.mossBalls) return;

        const sheepRadius = 0.9 * this.baseScale;

        for (const ball of this.game.mossBalls) {
            if (!ball.mesh) continue;

            const dx = ball.position.x - this.position.x;
            const dz = ball.position.z - this.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const minDist = sheepRadius + ball.radius;

            if (dist < minDist && dist > 0) {
                // Calculate push direction (from sheep to ball)
                const nx = dx / dist;
                const nz = dz / dist;

                // Push force based on sheep speed
                const sheepSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
                const pushForce = Math.max(0.8, sheepSpeed * 0.6);

                // Push the ball with upward kick for fun bouncy effect
                const pushDir = new THREE.Vector3(nx, 0, nz);
                ball.push(pushDir, pushForce, sheepSpeed > 1.5);

                // Play impact sound with position for distance-based volume
                if (this.game.audio && sheepSpeed > 0.5) {
                    this.game.audio.playMossyImpact(pushForce, ball.position);
                }

                // Push sheep back slightly
                const overlap = minDist - dist;
                this.position.x -= nx * overlap * 0.3;
                this.position.z -= nz * overlap * 0.3;

                // Wool bounce feedback
                this.woolBounceVel += 0.4;

                // Add some velocity bounce to sheep
                this.velocity.x -= nx * 0.5;
                this.velocity.z -= nz * 0.5;
            }
        }
    }

    _updateVisuals(dt, playerPosition) {
        if (!this.mesh) return;

        const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);

        this._updateSoftPhysics(dt, speed);

        this.mesh.position.x = this.position.x;
        this.mesh.position.z = this.position.z;

        const groundY = this.game.gameScene ? this.game.gameScene.getGroundHeight(this.position.x, this.position.z) : 0;
        let yOffset = this.modelYOffset;

        if (this.isLyingDown || this.lyingDownProgress > 0) {
            yOffset *= (1 - this.lyingDownProgress * 0.5);
        }

        this.mesh.position.y = groundY + yOffset;

        this.bobPhase += dt * 4;

        let targetRotX = 0;
        let targetRotZ = 0;
        let yBob = 0;

        // Breathing
        this.breathPhase += dt * this.breathRate * Math.PI;
        const breathAmount = Math.sin(this.breathPhase);

        if (this.state === Cloudfen.STATE.SLEEPING) {
            this.targetSquash.x = 1 + breathAmount * 0.04;
            this.targetSquash.y = 1 - breathAmount * 0.02;
            this.targetSquash.z = 1 + breathAmount * 0.04;
        } else if (this.state === Cloudfen.STATE.RESTING) {
            this.targetSquash.x = 1 + breathAmount * 0.03;
            this.targetSquash.y = 1 - breathAmount * 0.015;
            this.targetSquash.z = 1 + breathAmount * 0.03;
        } else if (this.state === Cloudfen.STATE.GRAZING) {
            yBob = this.grazeHeadBob * 0.08 * this.baseScale;
            targetRotX = this.grazeHeadBob * 0.12;
            this.targetSquash.y = 1 - Math.abs(this.grazeHeadBob) * 0.03;
        } else if (this.state === Cloudfen.STATE.STRETCHING) {
            const t = this.stretchProgress / 2.5;
            const stretchAmount = Math.sin(t * Math.PI);

            if (this.stretchType === 0) {
                targetRotX = stretchAmount * 0.15;
                yBob = -stretchAmount * 0.05 * this.baseScale;
                this.targetSquash.z = 1 + stretchAmount * 0.1;
                this.targetSquash.y = 1 - stretchAmount * 0.05;
            } else if (this.stretchType === 1) {
                targetRotX = -stretchAmount * 0.12;
                this.targetSquash.z = 1 - stretchAmount * 0.05;
                this.targetSquash.y = 1 + stretchAmount * 0.08;
            } else {
                targetRotZ = Math.sin(this.stretchProgress * 18) * stretchAmount * 0.1;
                this.woolBounceVel += Math.sin(this.stretchProgress * 18) * 0.3;
            }
        } else if (speed > 0.3) {
            const walkBob = Math.sin(this.bobPhase * 2.5);
            yBob = Math.abs(walkBob) * 0.04 * this.baseScale;
            targetRotZ = walkBob * 0.03;

            this.targetSquash.y = 1 - Math.abs(walkBob) * 0.06;
            this.targetSquash.x = 1 + Math.abs(walkBob) * 0.03;
            this.targetSquash.z = 1 + Math.abs(walkBob) * 0.03;

            this.woolBounceVel += walkBob * 0.05;
        } else {
            yBob = breathAmount * 0.01 * this.baseScale;

            this.targetSquash.x = 1 + breathAmount * 0.02;
            this.targetSquash.y = 1 - breathAmount * 0.01;
            this.targetSquash.z = 1 + breathAmount * 0.02;

            if (this.mood.contentment > 0.6) {
                this.contentWobble += dt * 2;
                targetRotZ += Math.sin(this.contentWobble) * 0.015 * this.mood.contentment;
            }
        }

        // Micro-behavior animations
        if (this.headShakeActive) {
            this.headShakeProgress = (this.headShakeProgress || 0) + dt * 15;
            const shakeAmount = Math.sin(this.headShakeProgress) * Math.exp(-this.headShakeProgress * 0.3);
            targetRotZ += shakeAmount * 0.12;
            this.woolBounceVel += shakeAmount * 0.2;
        }

        if (this.isSniffing) {
            this.sniffProgress = (this.sniffProgress || 0) + dt * 3;
            const sniffAmount = Math.sin(this.sniffProgress * Math.PI);
            targetRotX -= sniffAmount * 0.1;
            yBob += sniffAmount * 0.04 * this.baseScale;
            this.targetSquash.y = 1 + sniffAmount * 0.05;
            this.targetSquash.x = 1 - sniffAmount * 0.02;
        }

        if (this.pawingGround) {
            this.pawProgress = (this.pawProgress || 0) + dt * 10;
            const pawAmount = Math.sin(this.pawProgress * Math.PI * 2);
            targetRotX += pawAmount * 0.06;
            if (pawAmount < -0.5) {
                this.impactSquash = 0.08;
            }
        }

        if (this.isVocalizing) {
            const vocalPhase = (Date.now() % 500) / 500;
            const vocalPulse = Math.sin(vocalPhase * Math.PI);
            this.targetSquash.x = 1 + vocalPulse * 0.08;
            this.targetSquash.z = 1 + vocalPulse * 0.08;
            this.targetSquash.y = 1 - vocalPulse * 0.04;
            targetRotX -= vocalPulse * 0.05;
        }

        if (this.tailPosition > 0.1) {
            const waggle = Math.sin(this.bobPhase * 10) * this.tailPosition;
            targetRotZ += waggle * 0.04;
            this.woolBounceVel += waggle * 0.05;
        }

        if (this.mood && this.mood.alertness > 0.6) {
            yBob += 0.02 * this.baseScale * this.mood.alertness;
            this.targetSquash.y = Math.max(this.targetSquash.y, 1 + this.mood.alertness * 0.02);
        }

        // Apply X-axis wiggle for petting (smooth interpolation)
        this.petWiggle += (this.petWiggleTarget - this.petWiggle) * dt * 10;
        // Decay wiggle target when not being petted
        if (this.state !== Cloudfen.STATE.PETTED && this.state !== Cloudfen.STATE.BLISS) {
            this.petWiggleTarget *= 0.95;
        }

        this.mesh.position.y += yBob + this.woolBounce * 0.02 * this.baseScale;

        // Apply rotations - add petWiggle to X rotation
        this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, targetRotX + this.petWiggle, dt * 6);
        this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, targetRotZ, dt * 6);

        // Rotation Y
        let hasMainRotation = false;

        if (this.state === Cloudfen.STATE.CURIOUS || this.state === Cloudfen.STATE.PETTED || this.state === Cloudfen.STATE.BLISS) {
            if (playerPosition) {
                const lookDir = new THREE.Vector3().subVectors(playerPosition, this.position);
                lookDir.y = 0;
                const targetRotation = Math.atan2(lookDir.x, lookDir.z);
                this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetRotation, dt * 3);
                hasMainRotation = true;
            }
        } else if (this.state === Cloudfen.STATE.LOOKING && this.lookTarget) {
            const dir = new THREE.Vector3().subVectors(this.lookTarget, this.position);
            dir.y = 0;
            const targetRotation = Math.atan2(dir.x, dir.z);
            this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetRotation, dt * 2);
            hasMainRotation = true;
        } else if (this.state !== Cloudfen.STATE.SLEEPING && this.state !== Cloudfen.STATE.RESTING && speed > 0.2) {
            const targetRotation = Math.atan2(this.velocity.x, this.velocity.z);
            this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetRotation, dt * 5);
            hasMainRotation = true;
        }

        if (!hasMainRotation && this.attentionTarget && this.attentionStrength > 0.2) {
            const dir = new THREE.Vector3().subVectors(this.attentionTarget, this.position);
            dir.y = 0;
            if (dir.length() > 0.5) {
                const targetRotation = Math.atan2(dir.x, dir.z);
                this.mesh.rotation.y = THREE.MathUtils.lerp(
                    this.mesh.rotation.y,
                    targetRotation,
                    dt * 0.5 * this.attentionStrength
                );
            }
        }

        // Apply scale
        const lerpSpeed = 8;
        this.squashStretch.x = THREE.MathUtils.lerp(this.squashStretch.x, this.targetSquash.x, dt * lerpSpeed);
        this.squashStretch.y = THREE.MathUtils.lerp(this.squashStretch.y, this.targetSquash.y, dt * lerpSpeed);
        this.squashStretch.z = THREE.MathUtils.lerp(this.squashStretch.z, this.targetSquash.z, dt * lerpSpeed);

        const impactY = 1 - this.impactSquash;
        const impactXZ = 1 + this.impactSquash * 0.5;
        this.impactSquash *= 0.85;

        const woolY = 1 + this.woolBounce * 0.02;

        const baseScale = 0.8 * this.baseScale;
        this.mesh.scale.set(
            baseScale * this.squashStretch.x * impactXZ,
            baseScale * this.squashStretch.y * impactY * woolY,
            baseScale * this.squashStretch.z * impactXZ
        );

        this.targetSquash.x = 1;
        this.targetSquash.y = 1;
        this.targetSquash.z = 1;
    }

    _updateSoftPhysics(dt, speed) {
        const springStiffness = 25;
        const damping = 4;

        const springForce = -this.woolBounce * springStiffness;
        const dampingForce = -this.woolBounceVel * damping;

        this.woolBounceVel += (springForce + dampingForce) * dt;
        this.woolBounce += this.woolBounceVel * dt;

        this.woolBounce = Math.max(-0.5, Math.min(0.5, this.woolBounce));
        this.woolBounceVel = Math.max(-2, Math.min(2, this.woolBounceVel));

        if (speed > 0.5) {
            const accel = speed - (this.lastSpeed || 0);
            if (Math.abs(accel) > 0.1) {
                this.woolBounceVel += accel * 0.3;
            }
        }
        this.lastSpeed = speed;
    }

    _doBlink() {
        const originalEye = this.targetEyeOpenness;
        this.targetEyeOpenness = 0;
        setTimeout(() => {
            this.targetEyeOpenness = originalEye;
        }, 100);
    }

    // ==================== MICRO-BEHAVIORS ====================

    _updateMicroBehaviors(dt, playerPosition) {
        this.earTwitchTimer -= dt;
        if (this.earTwitchTimer <= 0) {
            this._doEarTwitch();
            this.earTwitchTimer = 2 + Math.random() * 5;
        }

        this.tailWagTimer -= dt;
        if (this.tailWagTimer <= 0) {
            this._doTailWag();
            this.tailWagTimer = 3 + Math.random() * 8;
        }

        this.headShakeTimer -= dt;
        if (this.headShakeTimer <= 0 && this.state !== Cloudfen.STATE.SLEEPING) {
            this._doHeadShake();
            this.headShakeTimer = 10 + Math.random() * 20;
        }

        this.pawGroundTimer -= dt;
        if (this.pawGroundTimer <= 0 &&
            (this.state === Cloudfen.STATE.IDLE || this.state === Cloudfen.STATE.CURIOUS)) {
            this._doPawGround();
            this.pawGroundTimer = 12 + Math.random() * 25;
        }

        this.sniffTimer -= dt;
        if (this.sniffTimer <= 0 && this.state !== Cloudfen.STATE.SLEEPING) {
            this._doSniff();
            this.sniffTimer = 5 + Math.random() * 10;
        }

        this.vocalizationTimer -= dt;
        if (this.vocalizationTimer <= 0) {
            this._doVocalize();
            const baseInterval = this.happiness > 0.3 ? 15 : 25;
            this.vocalizationTimer = baseInterval + Math.random() * 20;
        }

        this.earRotation.left *= 0.95;
        this.earRotation.right *= 0.95;
        this.tailPosition *= 0.93;
    }

    _doEarTwitch() {
        const which = Math.random();
        if (which < 0.4) {
            this.earRotation.left = (Math.random() - 0.5) * 0.3;
        } else if (which < 0.8) {
            this.earRotation.right = (Math.random() - 0.5) * 0.3;
        } else {
            const amount = (Math.random() - 0.5) * 0.2;
            this.earRotation.left = amount;
            this.earRotation.right = amount;
        }
    }

    _doTailWag() {
        if (this.happiness > 0.4 || this.mood.contentment > 0.6) {
            this.tailPosition = 0.3 + Math.random() * 0.3;
        } else {
            this.tailPosition = Math.random() * 0.2;
        }
    }

    _doHeadShake() {
        this.headShakeActive = true;
        this.headShakeProgress = 0;
        setTimeout(() => {
            this.headShakeActive = false;
        }, 400);
    }

    _doPawGround() {
        this.pawingGround = true;
        this.pawProgress = 0;
        setTimeout(() => {
            this.pawingGround = false;
        }, 600);
    }

    _doSniff() {
        this.isSniffing = true;
        this.sniffProgress = 0;
        setTimeout(() => {
            this.isSniffing = false;
        }, 800);
    }

    _doVocalize() {
        this.isVocalizing = true;
        setTimeout(() => {
            this.isVocalizing = false;
        }, 500);

        if (Math.random() < 0.3) {
            const nearestSheep = this._findNearestSheep();
            if (nearestSheep && nearestSheep.distance < 10) {
                setTimeout(() => {
                    nearestSheep.sheep._doRespondVocalize();
                }, 300 + Math.random() * 500);
            }
        }
    }

    _doRespondVocalize() {
        if (this.state !== Cloudfen.STATE.SLEEPING) {
            this.isVocalizing = true;
            setTimeout(() => {
                this.isVocalizing = false;
            }, 400);
        }
    }

    // ==================== MOOD SYSTEM ====================

    _updateMood(dt, playerPosition) {
        if (this.state === Cloudfen.STATE.RESTING || this.state === Cloudfen.STATE.SLEEPING) {
            this.mood.contentment = Math.min(1, this.mood.contentment + dt * 0.02);
        }
        if (this.happiness > 0.5) {
            this.mood.contentment = Math.min(1, this.mood.contentment + dt * 0.05);
        }
        if (this.state === Cloudfen.STATE.FLEEING) {
            this.mood.contentment = Math.max(0, this.mood.contentment - dt * 0.1);
        }
        this.mood.contentment += (0.5 - this.mood.contentment) * dt * 0.01;

        if (playerPosition) {
            const dist = this.position.distanceTo(playerPosition);
            if (dist < 5) {
                this.mood.alertness = Math.min(1, this.mood.alertness + dt * 0.1);
            } else {
                this.mood.alertness = Math.max(0.2, this.mood.alertness - dt * 0.05);
            }
        }

        if (this.timesBeenPetted > 2) {
            this.mood.playfulness = Math.min(0.8, this.mood.playfulness + dt * 0.01);
        }
        if (this.tiredness > 0.6) {
            this.mood.playfulness = Math.max(0, this.mood.playfulness - dt * 0.02);
        }
    }

    // ==================== ATTENTION SYSTEM ====================

    _updateAttention(dt, playerPosition) {
        const now = Date.now();

        this.attentionStrength = Math.max(0, this.attentionStrength - dt * 0.3);

        if (now - this.lastAttentionShift > 3000 + Math.random() * 4000) {
            this._shiftAttention(playerPosition);
            this.lastAttentionShift = now;
        }

        if (playerPosition) {
            const dist = this.position.distanceTo(playerPosition);
            if (dist < 10) {
                this.lastPlayerPosition = playerPosition.clone();
                this.lastSeenPlayerTime = now;
            }
        }

        if (this.state === Cloudfen.STATE.RESTING || this.state === Cloudfen.STATE.SLEEPING) {
            if (!this.favoriteSpot) {
                this.favoriteSpot = this.position.clone();
            } else {
                this.favoriteSpot.lerp(this.position, 0.01);
            }
        }
    }

    _shiftAttention(playerPosition) {
        const roll = Math.random();

        if (this.isHovered || (this.playerAwareness > 0.5 && roll < 0.4)) {
            this.attentionTarget = playerPosition?.clone() || null;
            this.attentionStrength = 0.8;
        } else if (roll < 0.6) {
            const nearestSheep = this._findNearestSheep();
            if (nearestSheep) {
                this.attentionTarget = nearestSheep.sheep.position.clone();
                this.attentionStrength = 0.5;
            }
        } else if (roll < 0.8) {
            const angle = Math.random() * Math.PI * 2;
            this.attentionTarget = this.position.clone().add(
                new THREE.Vector3(Math.cos(angle) * 5, 0, Math.sin(angle) * 5)
            );
            this.attentionStrength = 0.3;
        } else {
            this.attentionTarget = null;
            this.attentionStrength = 0;
        }
    }

    // ==================== PETTING ====================

    startPetting() {
        this.isPetted = true;
        this.petDuration = 0;
        this.lastStrokeTime = Date.now();
        this.timesBeenPetted++;

        if (this.state !== Cloudfen.STATE.BLISS) {
            this.setState(Cloudfen.STATE.PETTED);
        }

        if (this.game.effects) {
            this.game.effects.spawnHearts(this.mesh.position, 1);
        }

        // Play happy bleat sound with sheep position for distance-based volume
        if (this.game.audio && Math.random() < 0.6) {
            this.game.audio.playSheepBleat(this.position);
        }

        this.mood.contentment = Math.min(1, this.mood.contentment + 0.2);
        this.mood.playfulness = Math.min(1, this.mood.playfulness + 0.1);
    }
}
