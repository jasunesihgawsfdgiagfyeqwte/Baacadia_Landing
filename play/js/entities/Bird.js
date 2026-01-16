/**
 * Bird - Guardian bird that patrols around moss ball
 * Emits Charge sound that player can record
 */
export class Bird {
    constructor(game) {
        this.game = game;

        // Position
        this.position = new THREE.Vector3(0, 2, 25);
        this.homePosition = new THREE.Vector3(0, 2, 25);

        // Patrol behavior
        this.patrolRadius = 6;
        this.patrolSpeed = 2;
        this.patrolAngle = 0;
        this.patrolHeight = 2;

        // State
        this.isAlerted = false;
        this.alertTimer = 0;

        // Visual
        this.mesh = null;
        this.wingPhase = 0;
    }

    async init() {
        this._createMesh();
        this._createSoundVisual();
    }

    _createMesh() {
        const group = new THREE.Group();

        // Body
        const bodyGeometry = new THREE.ConeGeometry(0.3, 0.8, 8);
        bodyGeometry.rotateX(Math.PI / 2);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a90d9,
            roughness: 0.6,
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeometry = new THREE.SphereGeometry(0.2, 12, 10);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0x5a9fe9,
            roughness: 0.5,
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0.4, 0.1, 0);
        head.castShadow = true;
        group.add(head);

        // Beak
        const beakGeometry = new THREE.ConeGeometry(0.08, 0.25, 6);
        beakGeometry.rotateZ(-Math.PI / 2);
        const beakMaterial = new THREE.MeshStandardMaterial({
            color: 0xffa500,
            roughness: 0.4,
        });
        const beak = new THREE.Mesh(beakGeometry, beakMaterial);
        beak.position.set(0.6, 0.1, 0);
        group.add(beak);

        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.04, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(0.5, 0.2, 0.12);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.5, 0.2, -0.12);
        group.add(rightEye);

        // Wings
        const wingGeometry = new THREE.PlaneGeometry(0.6, 0.3);
        const wingMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a80c9,
            side: THREE.DoubleSide,
            roughness: 0.7,
        });

        this.leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        this.leftWing.position.set(0, 0, 0.35);
        this.leftWing.rotation.y = Math.PI / 2;
        group.add(this.leftWing);

        this.rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        this.rightWing.position.set(0, 0, -0.35);
        this.rightWing.rotation.y = -Math.PI / 2;
        group.add(this.rightWing);

        // Tail
        const tailGeometry = new THREE.PlaneGeometry(0.3, 0.2);
        const tail = new THREE.Mesh(tailGeometry, wingMaterial);
        tail.position.set(-0.5, 0, 0);
        tail.rotation.y = Math.PI / 2;
        group.add(tail);

        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.game.scene.add(this.mesh);
    }

    _createSoundVisual() {
        // Create pulsing ring to indicate sound source
        const ringGeometry = new THREE.RingGeometry(0.8, 1.0, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xff9f43,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
        });

        this.soundRing = new THREE.Mesh(ringGeometry, ringMaterial);
        this.soundRing.rotation.x = -Math.PI / 2;
        this.soundRing.position.y = 0.1;
        this.mesh.add(this.soundRing);
    }

    update(dt) {
        this._updatePatrol(dt);
        this._updateAlert(dt);
        this._updateVisuals(dt);
        this._emitSound(dt);
    }

    _updatePatrol(dt) {
        if (this.isAlerted) return;

        // Circular patrol around home position
        this.patrolAngle += dt * this.patrolSpeed;

        this.position.x = this.homePosition.x + Math.cos(this.patrolAngle) * this.patrolRadius;
        this.position.z = this.homePosition.z + Math.sin(this.patrolAngle) * this.patrolRadius;
        this.position.y = this.patrolHeight + Math.sin(this.patrolAngle * 2) * 0.5;
    }

    _updateAlert(dt) {
        const player = this.game.player;
        if (!player) return;

        const distToPlayer = this.position.distanceTo(player.position);

        // Alert if player is too close
        if (distToPlayer < 8) {
            if (!this.isAlerted) {
                this.isAlerted = true;
                this.alertTimer = 0;
            }

            // Fly higher and circle faster when alerted
            this.patrolAngle += dt * this.patrolSpeed * 2;
            this.position.y = this.patrolHeight + 2 + Math.sin(this.patrolAngle * 3) * 0.3;
        } else {
            if (this.isAlerted) {
                this.alertTimer += dt;
                if (this.alertTimer > 3) {
                    this.isAlerted = false;
                }
            }
        }
    }

    _updateVisuals(dt) {
        if (!this.mesh) return;

        // Update position
        this.mesh.position.copy(this.position);

        // Wing flapping
        this.wingPhase += dt * (this.isAlerted ? 25 : 15);
        const wingAngle = Math.sin(this.wingPhase) * 0.6;

        if (this.leftWing) {
            this.leftWing.rotation.x = wingAngle;
        }
        if (this.rightWing) {
            this.rightWing.rotation.x = -wingAngle;
        }

        // Face movement direction
        const targetRotation = this.patrolAngle + Math.PI / 2;
        this.mesh.rotation.y = targetRotation;

        // Body tilt
        this.mesh.rotation.z = Math.sin(this.wingPhase * 0.5) * 0.1;

        // Sound ring pulse
        if (this.soundRing) {
            const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.2;
            this.soundRing.scale.set(pulse, pulse, 1);
            this.soundRing.material.opacity = 0.3 + Math.sin(Date.now() * 0.003) * 0.2;
        }
    }

    _emitSound(dt) {
        // Bird periodically "chirps" (visual cue for charge sound)
        // This is mainly for visual feedback, actual recording is handled by RecordSystem
    }

    /**
     * Check if player is in range to record
     */
    isInRecordRange(playerPos) {
        return this.position.distanceTo(playerPos) < 5;
    }

    /**
     * Get the sound type this bird emits
     */
    getSoundType() {
        return 'charge';
    }
}
