/**
 * TouchSheepEffects - Visual effects for Touch Sheep demo
 * Hearts, wool particles, call waves, bliss glow
 * Art Bible colors: pink #CB597D, cyan #7EFFD0, orange #FFB27D
 */
export class TouchSheepEffects {
    constructor(game) {
        this.game = game;

        // Active effects
        this.particles = [];
        this.glows = [];
        this.waves = [];
    }

    async init() {
        // Pre-create some reusable geometries
        this.heartGeometry = this._createHeartGeometry();
        this.woolGeometry = new THREE.SphereGeometry(0.03, 4, 4);
    }

    _createHeartGeometry() {
        // Create heart shape
        const shape = new THREE.Shape();
        const x = 0, y = 0;

        shape.moveTo(x, y + 0.25);
        shape.bezierCurveTo(x, y + 0.25, x - 0.25, y, x - 0.25, y);
        shape.bezierCurveTo(x - 0.55, y, x - 0.55, y + 0.35, x - 0.55, y + 0.35);
        shape.bezierCurveTo(x - 0.55, y + 0.55, x - 0.35, y + 0.77, x, y + 1);
        shape.bezierCurveTo(x + 0.35, y + 0.77, x + 0.55, y + 0.55, x + 0.55, y + 0.35);
        shape.bezierCurveTo(x + 0.55, y + 0.35, x + 0.55, y, x + 0.25, y);
        shape.bezierCurveTo(x + 0.1, y, x, y + 0.25, x, y + 0.25);

        return new THREE.ShapeGeometry(shape);
    }

    update(dt) {
        this._updateParticles(dt);
        this._updateGlows(dt);
        this._updateWaves(dt);
    }

    _updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.age += dt;

            // Update position
            particle.mesh.position.add(particle.velocity.clone().multiplyScalar(dt));

            // Apply gravity (reduced for floaty feel)
            particle.velocity.y -= particle.gravity * dt;

            // Billboard - face camera
            if (particle.isBillboard && this.game.camera) {
                particle.mesh.quaternion.copy(this.game.camera.quaternion);
                particle.mesh.rotateZ(Math.PI); // Flip heart right-side up
            }

            // Fade and scale
            const progress = particle.age / particle.lifetime;
            const easedProgress = this._easeOutCubic(progress);

            particle.mesh.material.opacity = 1 - easedProgress;

            if (particle.scaleAnimation === 'pop') {
                // Pop in then shrink
                const popScale = progress < 0.2
                    ? this._easeOutBack(progress / 0.2)
                    : 1 - (progress - 0.2) / 0.8 * 0.3;
                particle.mesh.scale.setScalar(particle.startScale * popScale);
            } else if (particle.scaleAnimation === 'float') {
                // Gentle float up
                particle.mesh.scale.setScalar(particle.startScale * (1 - easedProgress * 0.5));
            } else {
                particle.mesh.scale.setScalar(particle.startScale * (1 - easedProgress * 0.5));
            }

            // Remove dead particles
            if (particle.age >= particle.lifetime) {
                this.game.scene.remove(particle.mesh);
                particle.mesh.geometry.dispose();
                particle.mesh.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    _updateGlows(dt) {
        for (let i = this.glows.length - 1; i >= 0; i--) {
            const glow = this.glows[i];
            glow.age += dt;

            const progress = glow.age / glow.lifetime;

            // Pulse and fade
            const pulse = Math.sin(glow.age * 5) * 0.1 + 1;
            glow.mesh.scale.setScalar(glow.startScale * pulse * (1 + progress * 0.5));
            glow.mesh.material.opacity = glow.startOpacity * (1 - progress);

            // Remove dead glows
            if (glow.age >= glow.lifetime) {
                this.game.scene.remove(glow.mesh);
                glow.mesh.geometry.dispose();
                glow.mesh.material.dispose();
                this.glows.splice(i, 1);
            }
        }
    }

    _updateWaves(dt) {
        for (let i = this.waves.length - 1; i >= 0; i--) {
            const wave = this.waves[i];
            wave.age += dt;

            const progress = wave.age / wave.lifetime;

            // Expand and fade
            const scale = 1 + progress * wave.expandScale;
            wave.mesh.scale.set(scale, scale, 1);
            wave.mesh.material.opacity = wave.startOpacity * (1 - progress);

            // Remove dead waves
            if (wave.age >= wave.lifetime) {
                this.game.scene.remove(wave.mesh);
                wave.mesh.geometry.dispose();
                wave.mesh.material.dispose();
                this.waves.splice(i, 1);
            }
        }
    }

    // ==================== EFFECT SPAWNERS ====================

    /**
     * Spawn floating hearts when petting
     */
    spawnHearts(position, count = 2) {
        for (let i = 0; i < count; i++) {
            const material = new THREE.MeshBasicMaterial({
                color: 0xCB597D, // Art Bible pink
                transparent: true,
                opacity: 1,
                side: THREE.DoubleSide,
            });

            const heart = new THREE.Mesh(this.heartGeometry.clone(), material);

            // Position with spread
            heart.position.copy(position);
            heart.position.y += 1.2 + Math.random() * 0.3;
            heart.position.x += (Math.random() - 0.5) * 0.8;
            heart.position.z += (Math.random() - 0.5) * 0.8;

            this.game.scene.add(heart);

            this.particles.push({
                mesh: heart,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.8,
                    1.5 + Math.random() * 1.0,
                    (Math.random() - 0.5) * 0.8
                ),
                gravity: 2.0,
                age: 0,
                lifetime: 1.5 + Math.random() * 0.5,
                startScale: 0.25 + Math.random() * 0.15,
                scaleAnimation: 'pop',
                isBillboard: true,
            });
        }
    }

    /**
     * Spawn small wool particle when stroking
     */
    spawnWoolParticle(position, direction) {
        const material = new THREE.MeshBasicMaterial({
            color: 0xFFFAF0, // Warm white wool
            transparent: true,
            opacity: 0.8,
        });

        const wool = new THREE.Mesh(this.woolGeometry.clone(), material);

        wool.position.copy(position);
        wool.position.y += 1.0 + Math.random() * 0.3;
        wool.position.x += (Math.random() - 0.5) * 0.3;
        wool.position.z += (Math.random() - 0.5) * 0.3;

        this.game.scene.add(wool);

        // Float in stroke direction
        const velX = direction.x * 0.5 + (Math.random() - 0.5) * 0.3;
        const velZ = -direction.y * 0.5 + (Math.random() - 0.5) * 0.3; // Note: screen Y to world Z

        this.particles.push({
            mesh: wool,
            velocity: new THREE.Vector3(velX, 0.5 + Math.random() * 0.5, velZ),
            gravity: 1.0,
            age: 0,
            lifetime: 1.0 + Math.random() * 0.5,
            startScale: 1.0,
            scaleAnimation: 'float',
            isBillboard: false,
        });
    }

    /**
     * Spawn glow effect when entering bliss state
     */
    spawnBlissGlow(position) {
        // Soft glow ring
        const geometry = new THREE.RingGeometry(0.3, 1.5, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xFFE4C4, // Warm peach glow
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
        });

        const glow = new THREE.Mesh(geometry, material);
        glow.position.copy(position);
        glow.position.y = 0.1;
        glow.rotation.x = -Math.PI / 2;

        this.game.scene.add(glow);

        this.glows.push({
            mesh: glow,
            age: 0,
            lifetime: 2.0,
            startScale: 1.0,
            startOpacity: 0.4,
        });

        // Extra hearts burst
        this.spawnHearts(position, 5);

        // Sparkles
        this._spawnSparkles(position, 8);
    }

    _spawnSparkles(position, count) {
        const colors = [0xFFE4C4, 0xCB597D, 0xFFFFFF];

        for (let i = 0; i < count; i++) {
            const geometry = new THREE.OctahedronGeometry(0.05);
            const material = new THREE.MeshBasicMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                transparent: true,
                opacity: 1,
            });

            const sparkle = new THREE.Mesh(geometry, material);
            sparkle.position.copy(position);
            sparkle.position.y += 1.0;

            this.game.scene.add(sparkle);

            const angle = (i / count) * Math.PI * 2;
            this.particles.push({
                mesh: sparkle,
                velocity: new THREE.Vector3(
                    Math.cos(angle) * 2,
                    1.5 + Math.random(),
                    Math.sin(angle) * 2
                ),
                gravity: 3.0,
                age: 0,
                lifetime: 1.0,
                startScale: 1.0,
                scaleAnimation: 'float',
                isBillboard: false,
            });
        }
    }

    /**
     * Spawn call wave when player calls sheep
     */
    spawnCallWave(position) {
        // Green-teal wave rings
        const colors = [0x7EFFD0, 0x538084];

        // Get ground height at position
        const groundY = this.game.gameScene ? this.game.gameScene.getGroundHeight(position.x, position.z) : 0;

        for (let i = 0; i < 2; i++) {
            setTimeout(() => {
                const geometry = new THREE.RingGeometry(0.2, 0.4, 32);
                const material = new THREE.MeshBasicMaterial({
                    color: colors[i],
                    transparent: true,
                    opacity: 0.6,
                    side: THREE.DoubleSide,
                });

                const wave = new THREE.Mesh(geometry, material);
                wave.position.copy(position);
                wave.position.y = groundY + 0.5; // Relative to ground
                wave.rotation.x = -Math.PI / 2;

                this.game.scene.add(wave);

                this.waves.push({
                    mesh: wave,
                    age: 0,
                    lifetime: 1.5,
                    expandScale: 8,
                    startOpacity: 0.6,
                });
            }, i * 150);
        }
    }

    /**
     * Spawn impact ripple (for general use)
     */
    spawnRipple(position, color = 0x7EFFD0) {
        const geometry = new THREE.RingGeometry(0.1, 0.3, 16);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
        });

        const ripple = new THREE.Mesh(geometry, material);
        ripple.position.copy(position);
        ripple.rotation.x = -Math.PI / 2;

        this.game.scene.add(ripple);

        this.waves.push({
            mesh: ripple,
            age: 0,
            lifetime: 0.8,
            expandScale: 3,
            startOpacity: 0.8,
        });
    }

    // ==================== EASING FUNCTIONS ====================

    _easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    _easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    _easeInOutSine(t) {
        return -(Math.cos(Math.PI * t) - 1) / 2;
    }
}
