/**
 * Effects - Visual effects and post-processing
 * Includes Moebius shader, particles, and impact effects
 * Art Bible: Moebius and Scavengers Reign style linework
 */
export class Effects {
    constructor(game) {
        this.game = game;

        // Post-processing
        this.composer = null;
        this.moebiusPass = null;

        // Active effects
        this.particles = [];
        this.trails = [];
    }

    async init() {
        this._initPostProcessing();
    }

    _initPostProcessing() {
        // Check if EffectComposer is available
        if (typeof THREE.EffectComposer === 'undefined') {
            console.log('EffectComposer not loaded, using direct rendering');
            return;
        }

        const renderer = this.game.renderer;
        const scene = this.game.scene;
        const camera = this.game.camera;
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Create composer
        this.composer = new THREE.EffectComposer(renderer);

        // Render pass
        const renderPass = new THREE.RenderPass(scene, camera);
        this.composer.addPass(renderPass);

        // Moebius shader pass
        const moebiusShader = this._createMoebiusShader();
        this.moebiusPass = new THREE.ShaderPass(moebiusShader);
        this.moebiusPass.uniforms.resolution.value.set(width, height);
        this.composer.addPass(this.moebiusPass);

        console.log('Moebius post-processing shader initialized');
    }

    _createMoebiusShader() {
        // Moebius-style post-processing shader based on maximeheckel.com implementation
        // Art Bible: "Our shader is based off of the linework" - Moebius style
        return {
            uniforms: {
                tDiffuse: { value: null },
                resolution: { value: new THREE.Vector2() },
                outlineThickness: { value: 1.0 }, // Reduced from 2.0 for subtler outlines
                outlineColor: { value: new THREE.Color(0x2D262E) }, // Art Bible dark purple-black
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec2 resolution;
                uniform float outlineThickness;
                uniform vec3 outlineColor;

                varying vec2 vUv;

                // Luma function for brightness calculation
                float luma(vec3 color) {
                    return dot(color, vec3(0.2126, 0.7152, 0.0722));
                }

                // Hash function for hand-drawn effect
                float hash(vec2 p) {
                    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
                    p3 += dot(p3, p3.yzx + 33.33);
                    return fract((p3.x + p3.y) * p3.z);
                }

                // Sobel operator matrices
                const mat3 Sx = mat3(-1.0, -2.0, -1.0, 0.0, 0.0, 0.0, 1.0, 2.0, 1.0);
                const mat3 Sy = mat3(-1.0, 0.0, 1.0, -2.0, 0.0, 2.0, -1.0, 0.0, 1.0);

                void main() {
                    vec2 texel = 1.0 / resolution;

                    // Minimal displacement for subtle hand-drawn feel (reduced from 1.2)
                    float frequency = 0.02;
                    float amplitude = 0.15;
                    vec2 displacement = vec2(
                        hash(gl_FragCoord.xy) * sin(gl_FragCoord.y * frequency),
                        hash(gl_FragCoord.xy) * cos(gl_FragCoord.x * frequency)
                    ) * amplitude * texel;

                    // Sample 3x3 neighborhood for Sobel edge detection
                    float samples[9];
                    int idx = 0;
                    for (int y = -1; y <= 1; y++) {
                        for (int x = -1; x <= 1; x++) {
                            vec2 offset = vec2(float(x), float(y)) * texel * outlineThickness;
                            samples[idx] = luma(texture2D(tDiffuse, vUv + offset).rgb);
                            idx++;
                        }
                    }

                    // Apply Sobel operators
                    float xSobel =
                        Sx[0][0] * samples[0] + Sx[1][0] * samples[1] + Sx[2][0] * samples[2] +
                        Sx[0][1] * samples[3] + Sx[1][1] * samples[4] + Sx[2][1] * samples[5] +
                        Sx[0][2] * samples[6] + Sx[1][2] * samples[7] + Sx[2][2] * samples[8];

                    float ySobel =
                        Sy[0][0] * samples[0] + Sy[1][0] * samples[1] + Sy[2][0] * samples[2] +
                        Sy[0][1] * samples[3] + Sy[1][1] * samples[4] + Sy[2][1] * samples[5] +
                        Sy[0][2] * samples[6] + Sy[1][2] * samples[7] + Sy[2][2] * samples[8];

                    // Calculate edge gradient
                    float edge = sqrt(xSobel * xSobel + ySobel * ySobel);

                    // Get base color
                    vec4 pixelColor = texture2D(tDiffuse, vUv);
                    float pixelLuma = luma(pixelColor.rgb);

                    // Subtle dark area shading - only for very dark regions
                    // Reduced crosshatch visibility, keeping dark area tinting
                    float modVal = 8.0;

                    // Only darken the darkest areas with subtle gradient
                    if (pixelLuma <= 0.25) {
                        // Subtle darkening for shadows
                        float shadowStrength = smoothstep(0.25, 0.1, pixelLuma) * 0.3;
                        pixelColor.rgb = mix(pixelColor.rgb, outlineColor, shadowStrength);
                    }

                    // Apply outline with smooth transition - subtler edges
                    float outlineStrength = smoothstep(0.2, 0.6, edge) * 0.85;
                    vec3 finalColor = mix(pixelColor.rgb, outlineColor, outlineStrength);

                    gl_FragColor = vec4(finalColor, pixelColor.a);
                }
            `,
        };
    }

    onResize(width, height) {
        if (this.composer) {
            this.composer.setSize(width, height);
        }

        if (this.moebiusPass) {
            this.moebiusPass.uniforms.resolution.value.set(width, height);
        }
    }

    update(dt) {
        this._updateParticles(dt);
        this._updateTrails(dt);
    }

    _updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.age += dt;

            // Update position
            particle.mesh.position.add(particle.velocity.clone().multiplyScalar(dt));

            // Apply gravity
            particle.velocity.y -= 9.8 * dt * 0.5;

            // Billboard behavior - always face camera
            if (particle.isBillboard && this.game.camera) {
                particle.mesh.quaternion.copy(this.game.camera.quaternion);
                // Rotate 180 degrees on Z axis to flip heart right-side up
                particle.mesh.rotateZ(Math.PI);
            }

            // Fade out
            const progress = particle.age / particle.lifetime;
            particle.mesh.material.opacity = 1 - progress;
            particle.mesh.scale.setScalar(particle.startScale * (1 - progress * 0.5));

            // Remove dead particles
            if (particle.age >= particle.lifetime) {
                this.game.scene.remove(particle.mesh);
                particle.mesh.geometry.dispose();
                particle.mesh.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    _updateTrails(dt) {
        for (let i = this.trails.length - 1; i >= 0; i--) {
            const trail = this.trails[i];
            trail.age += dt;

            // Fade out
            const progress = trail.age / trail.lifetime;
            trail.mesh.material.opacity = 0.5 * (1 - progress);

            // Shrink
            trail.mesh.scale.y = 1 - progress;

            // Remove dead trails
            if (trail.age >= trail.lifetime) {
                this.game.scene.remove(trail.mesh);
                trail.mesh.geometry.dispose();
                trail.mesh.material.dispose();
                this.trails.splice(i, 1);
            }
        }
    }

    /**
     * Spawn hearts when petting Cloudfen
     */
    spawnHearts(position) {
        // Spawn 2-3 hearts for a flourish effect
        const heartCount = 2 + Math.floor(Math.random() * 2);

        for (let i = 0; i < heartCount; i++) {
            const heart = this._createHeart();
            heart.position.copy(position);
            heart.position.y += 1.5;
            // Add random X and Z offset for spread
            heart.position.x += (Math.random() - 0.5) * 0.6;
            heart.position.z += (Math.random() - 0.5) * 0.6;

            this.game.scene.add(heart);

            this.particles.push({
                mesh: heart,
                velocity: new THREE.Vector3(
                    2 + Math.random() * 1.5,     // Upward with variation
                    (Math.random() - 0.5) * 1.5  // Random Z velocity
                ),
                age: 0,
                lifetime: 1.5 + Math.random() * 0.5,
                startScale: 0.5 + Math.random() * 0.3, // Varied sizes
                isBillboard: true, // Mark as billboard to face camera
            });
        }
    }

    _createHeart() {
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

        const geometry = new THREE.ShapeGeometry(shape);
        // Art Bible: Pink #CB597D
        const material = new THREE.MeshBasicMaterial({
            color: 0xCB597D,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide,
        });

        const heart = new THREE.Mesh(geometry, material);
        heart.scale.setScalar(0.8); // Larger initial scale
        // No rotation - keep heart right-side up!

        return heart;
    }

    /**
     * Spawn charge trail effect
     */
    spawnChargeTrail(position) {
        const geometry = new THREE.CylinderGeometry(0.1, 0.3, 1, 8);
        // Art Bible: Orange #FFB27D
        const material = new THREE.MeshBasicMaterial({
            color: 0xFFB27D,
            transparent: true,
            opacity: 0.5,
        });

        const trail = new THREE.Mesh(geometry, material);
        trail.position.copy(position);
        trail.position.y = 0.5;

        this.game.scene.add(trail);

        this.trails.push({
            mesh: trail,
            age: 0,
            lifetime: 0.5,
        });
    }

    /**
     * Spawn impact effect
     */
    spawnImpact(position, color = 0x7EFFD0) {
        // Ring burst - Art Bible cyan default
        const ringGeometry = new THREE.RingGeometry(0.1, 0.3, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
        });

        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.rotation.x = -Math.PI / 2;

        this.game.scene.add(ring);

        this.particles.push({
            mesh: ring,
            velocity: new THREE.Vector3(0, 0.5, 0),
            age: 0,
            lifetime: 0.5,
            startScale: 1,
        });

        // Small debris particles
        for (let i = 0; i < 5; i++) {
            const debrisGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const debrisMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8,
            });

            const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
            debris.position.copy(position);

            this.game.scene.add(debris);

            this.particles.push({
                mesh: debris,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 5,
                    3 + Math.random() * 3,
                    (Math.random() - 0.5) * 5
                ),
                age: 0,
                lifetime: 1,
                startScale: 0.1,
            });
        }
    }

    /**
     * Spawn record complete effect
     */
    spawnRecordComplete(position) {
        // Sparkle burst - Art Bible bright green for Caretaker tech
        for (let i = 0; i < 10; i++) {
            const geometry = new THREE.OctahedronGeometry(0.1);
            const material = new THREE.MeshBasicMaterial({
                color: 0x7AE600, // Bright green from Art Bible
                transparent: true,
                opacity: 1,
            });

            const sparkle = new THREE.Mesh(geometry, material);
            sparkle.position.copy(position);
            sparkle.position.y += 1.5;

            this.game.scene.add(sparkle);

            const angle = (i / 10) * Math.PI * 2;
            this.particles.push({
                mesh: sparkle,
                velocity: new THREE.Vector3(
                    Math.cos(angle) * 3,
                    2 + Math.random() * 2,
                    Math.sin(angle) * 3
                ),
                age: 0,
                lifetime: 1,
                startScale: 0.15,
            });
        }
    }

    /**
     * Celebration burst for victory
     */
    celebrationBurst(position) {
        // Art Bible colors
        const colors = [0xCB597D, 0x7EFFD0, 0xD7F53D, 0xFFB27D, 0x7AE600];

        for (let i = 0; i < 50; i++) {
            const geometry = new THREE.SphereGeometry(0.1, 8, 6);
            const material = new THREE.MeshBasicMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                transparent: true,
                opacity: 1,
            });

            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            particle.position.y += 2;

            this.game.scene.add(particle);

            const angle = Math.random() * Math.PI * 2;
            const elevation = Math.random() * Math.PI / 2;
            const speed = 5 + Math.random() * 5;

            this.particles.push({
                mesh: particle,
                velocity: new THREE.Vector3(
                    Math.cos(angle) * Math.cos(elevation) * speed,
                    Math.sin(elevation) * speed,
                    Math.sin(angle) * Math.cos(elevation) * speed
                ),
                age: 0,
                lifetime: 2 + Math.random(),
                startScale: 0.15 + Math.random() * 0.1,
            });
        }
    }
}
