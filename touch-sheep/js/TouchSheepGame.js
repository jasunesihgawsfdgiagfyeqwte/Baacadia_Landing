/**
 * TouchSheepGame - Main game controller for Touch Sheep demo
 * First-person sheep herding experience with petting
 * Based on Baacadia GDD "Touch Sheep" design document
 */
import { TouchSheepInput } from './TouchSheepInput.js';
import { TouchSheepScene } from './TouchSheepScene.js';
import { TouchSheepEffects } from './TouchSheepEffects.js';
import { Cloudfen } from './TouchSheepCloudfen.js';

class TouchSheepGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.clock = new THREE.Clock();
        this.isRunning = false;

        // Game entities
        this.cloudfens = [];
        this.activeSheep = null;

        // Systems
        this.input = null;
        this.gameScene = null;
        this.effects = null;

        // Three.js core
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;

        // Player state (first-person)
        this.player = {
            position: new THREE.Vector3(0, 1.6, 10),
            velocity: new THREE.Vector3(),
            rotation: { yaw: 0, pitch: -0.1 }, // Slightly looking down
            speed: 3.5,
            runSpeed: 6.0,
            friction: 0.88,
            eyeHeight: 1.0,
            isRunning: false,
            smoothY: 1.6, // Smoothed Y position for camera
        };

        // Camera settings
        this.cameraConfig = {
            fov: 70,
            sensitivity: 0.002,
            pitchLimit: Math.PI / 2.2,
            bobAmount: 0.04,
            bobSpeed: 12,
        };

        // Raycaster for interactions
        this.raycaster = new THREE.Raycaster();
        this.interactionRange = 3.5;

        // Interaction state
        this.hoveredSheep = null;
        this.isPetting = false;
        this.petStartTime = 0;
        this.canInteract = false;

        // Sheep spawning system
        this.spawnTimer = 0;
        this.nextSpawnTime = 15 + Math.random() * 20; // First spawn after 15-35 seconds
        this.maxSheep = 25; // Don't spawn more than this
        this.totalSpawned = 0;
        this.isSpawningSheep = false;

        // Pointer lock state
        this.isLocked = false;

        // Input keys state (managed here for reliability)
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            run: false,
        };

        // Mobile touch state
        this.isTouchDevice = false;
        this.touch = {
            // Joystick
            joystickActive: false,
            joystickTouchId: null,
            joystickStart: { x: 0, y: 0 },
            joystickDelta: { x: 0, y: 0 },
            // Camera look
            lookActive: false,
            lookTouchId: null,
            lookLast: { x: 0, y: 0 },
            // Look velocity for smooth inertia
            lookVelocity: { x: 0, y: 0 },
            // Movement direction from joystick
            moveX: 0,
            moveZ: 0,
        };
        // Touch look sensitivity (higher = more responsive)
        this.touchLookSensitivity = 0.004;

        this._init();
    }

    async _init() {
        try {
            this._detectTouchDevice();
            this._initThree();
            this._initPostProcessing();
            this._initInput();
            await this._initWorld();
            await this._initEntities();
            this._bindEvents();
            this._hideLoading();

            this.isRunning = true;
            this._gameLoop();
        } catch (error) {
            console.error('Game initialization failed:', error);
        }
    }

    _detectTouchDevice() {
        // Detect if this is a touch device
        this.isTouchDevice = (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            window.matchMedia('(pointer: coarse)').matches
        );

        if (this.isTouchDevice) {
            document.body.classList.add('touch-device');
            // On touch devices, we skip pointer lock and use touch controls
            this.isLocked = true; // Pretend we're "locked" to enable gameplay
        }
    }

    _initThree() {
        // Scene - Art Bible atmosphere
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xE8C4A8);
        this.scene.fog = new THREE.Fog(0xE8C4A8, 15, 80);

        // Camera - First person
        this.camera = new THREE.PerspectiveCamera(
            this.cameraConfig.fov,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        );
        this.camera.position.copy(this.player.position);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        this._initLighting();

        window.addEventListener('resize', this._onResize.bind(this));
    }

    _initLighting() {
        // Soft ambient
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        // Warm sunset sun
        const sun = new THREE.DirectionalLight(0xFFE4C4, 1.0);
        sun.position.set(30, 50, 30);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 150;
        sun.shadow.camera.left = -50;
        sun.shadow.camera.right = 50;
        sun.shadow.camera.top = 50;
        sun.shadow.camera.bottom = -50;
        sun.shadow.bias = -0.0001;
        this.scene.add(sun);

        // Hemisphere light
        const hemi = new THREE.HemisphereLight(0xE8C4A8, 0xD4A574, 0.5);
        this.scene.add(hemi);

        // Rim light
        const rimLight = new THREE.DirectionalLight(0xFFB27D, 0.3);
        rimLight.position.set(-20, 30, -30);
        this.scene.add(rimLight);
    }

    _initPostProcessing() {
        if (typeof THREE.EffectComposer === 'undefined') {
            console.log('EffectComposer not loaded, using direct rendering');
            return;
        }

        this.composer = new THREE.EffectComposer(this.renderer);

        const renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        const moebiusShader = this._createMoebiusShader();
        this.moebiusPass = new THREE.ShaderPass(moebiusShader);
        this.moebiusPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
        this.composer.addPass(this.moebiusPass);
    }

    _createMoebiusShader() {
        return {
            uniforms: {
                tDiffuse: { value: null },
                resolution: { value: new THREE.Vector2() },
                outlineThickness: { value: 1.0 },
                outlineColor: { value: new THREE.Color(0x2D262E) },
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

                float luma(vec3 color) {
                    return dot(color, vec3(0.2126, 0.7152, 0.0722));
                }

                const mat3 Sx = mat3(-1.0, -2.0, -1.0, 0.0, 0.0, 0.0, 1.0, 2.0, 1.0);
                const mat3 Sy = mat3(-1.0, 0.0, 1.0, -2.0, 0.0, 2.0, -1.0, 0.0, 1.0);

                void main() {
                    vec2 texel = 1.0 / resolution;

                    float samples[9];
                    int idx = 0;
                    for (int y = -1; y <= 1; y++) {
                        for (int x = -1; x <= 1; x++) {
                            vec2 offset = vec2(float(x), float(y)) * texel * outlineThickness;
                            samples[idx] = luma(texture2D(tDiffuse, vUv + offset).rgb);
                            idx++;
                        }
                    }

                    float xSobel =
                        Sx[0][0] * samples[0] + Sx[1][0] * samples[1] + Sx[2][0] * samples[2] +
                        Sx[0][1] * samples[3] + Sx[1][1] * samples[4] + Sx[2][1] * samples[5] +
                        Sx[0][2] * samples[6] + Sx[1][2] * samples[7] + Sx[2][2] * samples[8];

                    float ySobel =
                        Sy[0][0] * samples[0] + Sy[1][0] * samples[1] + Sy[2][0] * samples[2] +
                        Sy[0][1] * samples[3] + Sy[1][1] * samples[4] + Sy[2][1] * samples[5] +
                        Sy[0][2] * samples[6] + Sy[1][2] * samples[7] + Sy[2][2] * samples[8];

                    float edge = sqrt(xSobel * xSobel + ySobel * ySobel);

                    vec4 pixelColor = texture2D(tDiffuse, vUv);
                    float pixelLuma = luma(pixelColor.rgb);

                    if (pixelLuma <= 0.25) {
                        float shadowStrength = smoothstep(0.25, 0.1, pixelLuma) * 0.3;
                        pixelColor.rgb = mix(pixelColor.rgb, outlineColor, shadowStrength);
                    }

                    float outlineStrength = smoothstep(0.2, 0.6, edge) * 0.85;
                    vec3 finalColor = mix(pixelColor.rgb, outlineColor, outlineStrength);

                    gl_FragColor = vec4(finalColor, pixelColor.a);
                }
            `,
        };
    }

    _initInput() {
        this.input = new TouchSheepInput(this);
    }

    async _initWorld() {
        this.gameScene = new TouchSheepScene(this);
        await this.gameScene.init();

        this.effects = new TouchSheepEffects(this);
        await this.effects.init();
    }

    async _initEntities() {
        // Spawn sheep spread out across the meadow
        const sheepConfigs = [
            // More spread out distribution
            { x: -5, z: -3, scale: 1.0 },
            { x: 4, z: -5, scale: 0.95 },
            { x: -8, z: 2, scale: 0.98 },
            { x: 6, z: 4, scale: 0.92 },
            { x: -3, z: 8, scale: 0.9 },
            { x: 10, z: -2, scale: 0.96 },
            // Far scattered
            { x: -12, z: -6, scale: 0.88 },
            { x: 8, z: 10, scale: 0.85 },
            { x: -6, z: -10, scale: 0.9 },
            { x: 15, z: 5, scale: 0.87 },
        ];

        for (const config of sheepConfigs) {
            const cloudfen = new Cloudfen(this);
            await cloudfen.init(config.x, config.z, config.scale);
            this.cloudfens.push(cloudfen);
        }
    }

    _bindEvents() {
        if (this.isTouchDevice) {
            // Touch device: bind touch controls
            this._bindTouchEvents();
        } else {
            // Desktop: use pointer lock
            this.canvas.addEventListener('click', () => {
                if (!this.isLocked) {
                    this.canvas.requestPointerLock();
                }
            });

            document.addEventListener('pointerlockchange', () => {
                this.isLocked = document.pointerLockElement === this.canvas;
                this._updateUI();

                // Reset keys when losing lock to prevent stuck keys
                if (!this.isLocked) {
                    this.keys.forward = false;
                    this.keys.backward = false;
                    this.keys.left = false;
                    this.keys.right = false;
                    this.keys.run = false;
                }
            });

            // Mouse look
            document.addEventListener('mousemove', this._onMouseMove.bind(this));

            // Keyboard - always listen, but only process movement when locked
            document.addEventListener('keydown', this._onKeyDown.bind(this));
            document.addEventListener('keyup', this._onKeyUp.bind(this));

            // Mouse buttons for petting
            document.addEventListener('mousedown', this._onMouseDown.bind(this));
            document.addEventListener('mouseup', this._onMouseUp.bind(this));
        }
    }

    _bindTouchEvents() {
        // Get UI elements
        const joystickZone = document.getElementById('joystick-zone');
        const joystickBase = document.getElementById('joystick-base');
        const joystickThumb = document.getElementById('joystick-thumb');
        const btnCall = document.getElementById('btn-call');

        // Joystick touch events
        if (joystickZone) {
            joystickZone.addEventListener('touchstart', (e) => this._onJoystickStart(e, joystickBase, joystickThumb), { passive: false });
            joystickZone.addEventListener('touchmove', (e) => this._onJoystickMove(e, joystickBase, joystickThumb), { passive: false });
            joystickZone.addEventListener('touchend', (e) => this._onJoystickEnd(e, joystickBase, joystickThumb), { passive: false });
            joystickZone.addEventListener('touchcancel', (e) => this._onJoystickEnd(e, joystickBase, joystickThumb), { passive: false });
        }

        // Call/Gather button
        if (btnCall) {
            btnCall.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btnCall.classList.add('active');
                this._callSheep();
            }, { passive: false });
            btnCall.addEventListener('touchend', () => {
                btnCall.classList.remove('active');
            });
            btnCall.addEventListener('touchcancel', () => {
                btnCall.classList.remove('active');
            });
        }

        // Camera look: touch anywhere on canvas (except joystick/buttons area)
        this.canvas.addEventListener('touchstart', this._onCanvasTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this._onCanvasTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this._onCanvasTouchEnd.bind(this), { passive: false });
        this.canvas.addEventListener('touchcancel', this._onCanvasTouchEnd.bind(this), { passive: false });

        // Prevent double-tap zoom on the entire game
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (this._lastTouchEnd && now - this._lastTouchEnd < 300) {
                e.preventDefault();
            }
            this._lastTouchEnd = now;
        }, { passive: false });

        // Hide start prompt on touch devices
        const startPrompt = document.getElementById('start-prompt');
        if (startPrompt) {
            startPrompt.style.display = 'none';
        }
    }

    _onJoystickStart(e, base, thumb) {
        e.preventDefault();
        if (this.touch.joystickActive) return;

        const touch = e.changedTouches[0];
        this.touch.joystickActive = true;
        this.touch.joystickTouchId = touch.identifier;

        const rect = base.getBoundingClientRect();
        this.touch.joystickStart.x = rect.left + rect.width / 2;
        this.touch.joystickStart.y = rect.top + rect.height / 2;

        base.classList.add('active');
        this._updateJoystick(touch.clientX, touch.clientY, base, thumb);
    }

    _onJoystickMove(e, base, thumb) {
        e.preventDefault();
        if (!this.touch.joystickActive) return;

        for (const touch of e.changedTouches) {
            if (touch.identifier === this.touch.joystickTouchId) {
                this._updateJoystick(touch.clientX, touch.clientY, base, thumb);
                break;
            }
        }
    }

    _onJoystickEnd(e, joystickBase, thumb) {
        for (const touch of e.changedTouches) {
            if (touch.identifier === this.touch.joystickTouchId) {
                this.touch.joystickActive = false;
                this.touch.joystickTouchId = null;
                this.touch.joystickDelta.x = 0;
                this.touch.joystickDelta.y = 0;
                this.touch.moveX = 0;
                this.touch.moveZ = 0;

                joystickBase.classList.remove('active');
                thumb.style.transform = 'translate(0, 0)';
                break;
            }
        }
    }

    _updateJoystick(touchX, touchY, base, thumb) {
        const maxRadius = 35; // Max thumb movement

        let dx = touchX - this.touch.joystickStart.x;
        let dy = touchY - this.touch.joystickStart.y;

        // Clamp to max radius
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxRadius) {
            dx = (dx / dist) * maxRadius;
            dy = (dy / dist) * maxRadius;
        }

        // Update thumb position
        thumb.style.transform = `translate(${dx}px, ${dy}px)`;

        // Normalize to -1 to 1 range
        this.touch.joystickDelta.x = dx / maxRadius;
        this.touch.joystickDelta.y = dy / maxRadius;

        // Convert to movement (forward is -Z in game, Y down on screen is forward)
        this.touch.moveX = this.touch.joystickDelta.x;
        this.touch.moveZ = this.touch.joystickDelta.y;
    }

    _onCanvasTouchStart(e) {
        // Check if this touch is for looking (not on UI elements)
        for (const touch of e.changedTouches) {
            const x = touch.clientX / window.innerWidth;
            const y = touch.clientY / window.innerHeight;

            // More generous exclusion zones for controls
            // Joystick: bottom-left corner
            const isJoystickArea = x < 0.30 && y > 0.55;
            // Button: bottom-right corner
            const isButtonArea = x > 0.75 && y > 0.55;

            if (!isJoystickArea && !isButtonArea) {
                // This is a look touch or tap-to-pet
                if (!this.touch.lookActive) {
                    this.touch.lookActive = true;
                    this.touch.lookTouchId = touch.identifier;
                    this.touch.lookLast.x = touch.clientX;
                    this.touch.lookLast.y = touch.clientY;
                    this.touch.lookStartTime = Date.now();
                    this.touch.lookStartPos = { x: touch.clientX, y: touch.clientY };
                    // Reset velocity on new touch
                    this.touch.lookVelocity.x = 0;
                    this.touch.lookVelocity.y = 0;
                }
            }
        }
    }

    _onCanvasTouchMove(e) {
        if (!this.touch.lookActive) return;

        for (const touch of e.changedTouches) {
            if (touch.identifier === this.touch.lookTouchId) {
                const dx = touch.clientX - this.touch.lookLast.x;
                const dy = touch.clientY - this.touch.lookLast.y;

                // Apply camera rotation with better sensitivity
                this.player.rotation.yaw -= dx * this.touchLookSensitivity;
                this.player.rotation.pitch -= dy * this.touchLookSensitivity;

                // Clamp pitch
                this.player.rotation.pitch = Math.max(
                    -this.cameraConfig.pitchLimit,
                    Math.min(this.cameraConfig.pitchLimit, this.player.rotation.pitch)
                );

                // Store velocity for potential inertia
                this.touch.lookVelocity.x = dx * this.touchLookSensitivity;
                this.touch.lookVelocity.y = dy * this.touchLookSensitivity;

                this.touch.lookLast.x = touch.clientX;
                this.touch.lookLast.y = touch.clientY;
                break;
            }
        }
    }

    _onCanvasTouchEnd(e) {
        for (const touch of e.changedTouches) {
            if (touch.identifier === this.touch.lookTouchId) {
                // Check if this was a tap (short duration, minimal movement)
                const duration = Date.now() - (this.touch.lookStartTime || 0);
                const dx = touch.clientX - (this.touch.lookStartPos?.x || 0);
                const dy = touch.clientY - (this.touch.lookStartPos?.y || 0);
                const dist = Math.sqrt(dx * dx + dy * dy);

                // If it's a quick tap with minimal movement, try to pet sheep
                if (duration < 300 && dist < 20) {
                    this._onTapToPet(touch.clientX, touch.clientY);
                    // No inertia on tap
                    this.touch.lookVelocity.x = 0;
                    this.touch.lookVelocity.y = 0;
                }
                // Otherwise, keep some inertia for smooth feel (velocity already set)

                this.touch.lookActive = false;
                this.touch.lookTouchId = null;
                break;
            }
        }
    }

    _updateTouchLookInertia() {
        // Apply inertia when not actively touching
        if (!this.touch.lookActive && this.isTouchDevice) {
            const friction = 0.92; // How quickly inertia decays
            const minVelocity = 0.0001;

            if (Math.abs(this.touch.lookVelocity.x) > minVelocity ||
                Math.abs(this.touch.lookVelocity.y) > minVelocity) {

                this.player.rotation.yaw -= this.touch.lookVelocity.x;
                this.player.rotation.pitch -= this.touch.lookVelocity.y;

                // Clamp pitch
                this.player.rotation.pitch = Math.max(
                    -this.cameraConfig.pitchLimit,
                    Math.min(this.cameraConfig.pitchLimit, this.player.rotation.pitch)
                );

                // Apply friction
                this.touch.lookVelocity.x *= friction;
                this.touch.lookVelocity.y *= friction;
            }
        }
    }

    _onTapToPet(screenX, screenY) {
        // Convert screen position to normalized device coordinates
        const x = (screenX / window.innerWidth) * 2 - 1;
        const y = -(screenY / window.innerHeight) * 2 + 1;

        // Raycast from tap position
        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

        const sheepMeshes = this.cloudfens
            .filter(c => c.mesh)
            .map(c => ({ mesh: c.mesh, cloudfen: c }));

        const meshes = sheepMeshes.map(s => s.mesh);
        const intersects = this.raycaster.intersectObjects(meshes, true);

        if (intersects.length > 0) {
            const distance = intersects[0].distance;

            // Find which sheep was tapped
            let tappedSheep = null;
            for (const sheepData of sheepMeshes) {
                let obj = intersects[0].object;
                while (obj) {
                    if (obj === sheepData.mesh) {
                        tappedSheep = sheepData.cloudfen;
                        break;
                    }
                    obj = obj.parent;
                }
                if (tappedSheep) break;
            }

            if (tappedSheep && distance <= this.interactionRange * 1.5) {
                // Pet the sheep!
                tappedSheep.startPetting();

                // Quick pet animation (auto-end after short delay)
                setTimeout(() => {
                    tappedSheep.endPetting(1.0);
                }, 800);

                // Show feedback
                this._showMobilePetHint(false);
            } else if (tappedSheep) {
                // Too far - show hint
                this._showMobilePetHint(true, 'Move closer to pet');
            }
        }
    }

    _showMobilePetHint(show, text = 'Tap sheep to pet') {
        const hint = document.getElementById('mobile-pet-hint');
        if (hint) {
            hint.textContent = text;
            if (show) {
                hint.classList.add('visible');
                clearTimeout(this._petHintTimeout);
                this._petHintTimeout = setTimeout(() => {
                    hint.classList.remove('visible');
                }, 2000);
            } else {
                hint.classList.remove('visible');
            }
        }
    }

    _onMouseMove(e) {
        if (!this.isLocked) return;

        let dx = e.movementX || 0;
        let dy = e.movementY || 0;

        // Filter out extreme/invalid values that cause camera jumping
        if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;

        const maxMovement = 150;
        if (Math.abs(dx) > maxMovement || Math.abs(dy) > maxMovement) {
            // Ignore sudden large movements (likely a browser glitch)
            return;
        }

        this.player.rotation.yaw -= dx * this.cameraConfig.sensitivity;
        this.player.rotation.pitch -= dy * this.cameraConfig.sensitivity;

        this.player.rotation.pitch = Math.max(
            -this.cameraConfig.pitchLimit,
            Math.min(this.cameraConfig.pitchLimit, this.player.rotation.pitch)
        );
    }

    _onKeyDown(e) {
        // Always track key state
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.run = true;
                break;
        }

        // Actions only when locked
        if (this.isLocked) {
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this._callSheep();
                    break;
                case 'KeyE':
                    e.preventDefault();
                    this._tryPetSheep();
                    break;
            }
        }
    }

    _onKeyUp(e) {
        // Always track key release
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.run = false;
                break;
        }
    }

    _onMouseDown(e) {
        if (!this.isLocked) return;
        if (e.button === 0) {
            this._tryPetSheep();
        }
    }

    _onMouseUp(e) {
        if (e.button === 0 && this.isPetting && this.hoveredSheep) {
            const petDuration = (Date.now() - this.petStartTime) / 1000;
            this.hoveredSheep.endPetting(petDuration);
            this.isPetting = false;
        }
    }

    _tryPetSheep() {
        if (this.canInteract && this.hoveredSheep && !this.isPetting) {
            this.isPetting = true;
            this.petStartTime = Date.now();
            this.hoveredSheep.startPetting();
        }
    }

    _callSheep() {
        const callOrigin = this.player.position.clone();
        callOrigin.y = 0.5;
        this.effects.spawnCallWave(callOrigin);

        for (const cloudfen of this.cloudfens) {
            cloudfen.onCalled(callOrigin);
        }
    }

    _updatePlayer(dt) {
        if (!this.isLocked) return;

        // Get movement input
        const moveDir = new THREE.Vector3();

        if (this.isTouchDevice) {
            // Use joystick input for touch devices
            moveDir.x = this.touch.moveX;
            moveDir.z = this.touch.moveZ;
        } else {
            // Keyboard input for desktop
            if (this.keys.forward) moveDir.z -= 1;
            if (this.keys.backward) moveDir.z += 1;
            if (this.keys.left) moveDir.x -= 1;
            if (this.keys.right) moveDir.x += 1;
        }

        // Normalize diagonal movement (only for keyboard, joystick is already normalized)
        if (!this.isTouchDevice && moveDir.length() > 0) {
            moveDir.normalize();
        }

        // Apply rotation to movement
        const yawMatrix = new THREE.Matrix4().makeRotationY(this.player.rotation.yaw);
        moveDir.applyMatrix4(yawMatrix);

        // Apply speed - direct movement, no acceleration drift
        const isRunning = this.keys.run;
        const speed = isRunning ? this.player.runSpeed : this.player.speed;

        // Set velocity directly based on input (no accumulation)
        this.player.velocity.x = moveDir.x * speed;
        this.player.velocity.z = moveDir.z * speed;

        // Update position
        this.player.position.x += this.player.velocity.x * dt;
        this.player.position.z += this.player.velocity.z * dt;

        // Collision with sheep
        this._handleSheepCollision();

        // Bounds
        const bounds = 40;
        this.player.position.x = Math.max(-bounds, Math.min(bounds, this.player.position.x));
        this.player.position.z = Math.max(-bounds, Math.min(bounds, this.player.position.z));

        // Get ground height with smooth Y transition to avoid camera jitter
        const groundY = this.gameScene ? this.gameScene.getGroundHeight(this.player.position.x, this.player.position.z) : 0;
        const targetY = groundY + this.player.eyeHeight;
        // Smooth Y movement to prevent jarring camera jumps on terrain changes
        this.player.smoothY += (targetY - this.player.smoothY) * Math.min(1, dt * 8);
        this.player.position.y = this.player.smoothY;

        // Update camera position
        this.camera.position.copy(this.player.position);

        // Head bob when moving
        const speed2D = Math.sqrt(this.player.velocity.x ** 2 + this.player.velocity.z ** 2);
        if (speed2D > 0.3) {
            const bobPhase = this.clock.elapsedTime * this.cameraConfig.bobSpeed;
            const bobIntensity = Math.min(speed2D / this.player.speed, 1);
            const bobAmount = this.cameraConfig.bobAmount * bobIntensity;
            this.camera.position.y += Math.sin(bobPhase) * bobAmount;
        }

        // Set camera rotation (with slight smoothing for stability)
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.player.rotation.yaw;
        // Smooth pitch to avoid jitter
        const targetPitch = this.player.rotation.pitch;
        this.camera.rotation.x += (targetPitch - this.camera.rotation.x) * Math.min(1, dt * 30);
    }

    _handleSheepCollision() {
        const playerRadius = 0.4; // Player collision radius

        for (const sheep of this.cloudfens) {
            if (!sheep.mesh) continue;

            const sheepRadius = 0.9 * sheep.baseScale; // Sheep collision radius
            const minDist = playerRadius + sheepRadius;

            const dx = this.player.position.x - sheep.position.x;
            const dz = this.player.position.z - sheep.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < minDist && dist > 0) {
                // Push player out of sheep
                const overlap = minDist - dist;
                const nx = dx / dist;
                const nz = dz / dist;

                // Move player away
                this.player.position.x += nx * overlap;
                this.player.position.z += nz * overlap;

                // Also push sheep slightly (soft collision)
                sheep.velocity.x -= nx * 1.5;
                sheep.velocity.z -= nz * 1.5;
                sheep.woolBounceVel += 0.5; // Wool bounce feedback
            }
        }
    }

    _updateInteraction() {
        if (!this.isLocked) {
            this.hoveredSheep = null;
            this.canInteract = false;
            return;
        }

        // Raycast from camera center
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        const sheepMeshes = this.cloudfens
            .filter(c => c.mesh)
            .map(c => ({ mesh: c.mesh, cloudfen: c }));

        const meshes = sheepMeshes.map(s => s.mesh);
        const intersects = this.raycaster.intersectObjects(meshes, true);

        let newHovered = null;
        let distance = Infinity;

        if (intersects.length > 0) {
            distance = intersects[0].distance;

            for (const sheepData of sheepMeshes) {
                let obj = intersects[0].object;
                while (obj) {
                    if (obj === sheepData.mesh) {
                        newHovered = sheepData.cloudfen;
                        break;
                    }
                    obj = obj.parent;
                }
                if (newHovered) break;
            }
        }

        this.canInteract = newHovered && distance <= this.interactionRange;

        // Update hover states
        if (newHovered !== this.hoveredSheep) {
            if (this.hoveredSheep && !this.isPetting) {
                this.hoveredSheep.onHoverEnd();
            }
            if (newHovered) {
                newHovered.onHoverStart();
            }
            this.hoveredSheep = newHovered;
        }

        this._updateInteractionPrompt(newHovered, distance);

        // Continue petting
        if (this.isPetting && this.hoveredSheep && this.canInteract) {
            this.hoveredSheep.onStroke(0, 0, 5);
        } else if (this.isPetting && (!this.canInteract || !this.hoveredSheep)) {
            if (this.hoveredSheep) {
                const petDuration = (Date.now() - this.petStartTime) / 1000;
                this.hoveredSheep.endPetting(petDuration);
            }
            this.isPetting = false;
        }
    }

    _updateInteractionPrompt(sheep, distance) {
        const prompt = document.getElementById('interaction-prompt');
        if (!prompt) return;

        // On touch devices, use mobile pet hint instead
        if (this.isTouchDevice) {
            prompt.classList.remove('visible');
            prompt.classList.remove('can-interact');

            // Show mobile hint when near sheep
            if (sheep && distance <= this.interactionRange * 1.5) {
                this._showMobilePetHint(true, distance <= this.interactionRange ? 'Tap sheep to pet!' : 'Move closer to pet');
            }
            return;
        }

        if (sheep && this.isLocked) {
            prompt.classList.add('visible');

            if (distance <= this.interactionRange) {
                prompt.textContent = 'Click or [E] to pet';
                prompt.classList.add('can-interact');
            } else {
                const dist = distance.toFixed(1);
                prompt.textContent = `Move closer (${dist}m)`;
                prompt.classList.remove('can-interact');
            }
        } else {
            prompt.classList.remove('visible');
            prompt.classList.remove('can-interact');
        }
    }

    _updateUI() {
        const startPrompt = document.getElementById('start-prompt');
        const crosshair = document.getElementById('crosshair');
        const controlsHint = document.getElementById('controls-hint');

        if (this.isTouchDevice) {
            // Touch device: always hide desktop UI, show mobile controls
            if (startPrompt) startPrompt.style.display = 'none';
            if (crosshair) crosshair.style.display = 'none';
            if (controlsHint) controlsHint.style.display = 'none';
        } else {
            // Desktop
            if (startPrompt) {
                startPrompt.style.display = this.isLocked ? 'none' : 'flex';
            }
            if (crosshair) {
                crosshair.style.display = this.isLocked ? 'block' : 'none';
            }
            if (controlsHint) {
                controlsHint.style.opacity = this.isLocked ? '0.5' : '0';
            }
        }
    }

    _hideLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    _onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);

        if (this.composer) {
            this.composer.setSize(width, height);
        }

        if (this.moebiusPass) {
            this.moebiusPass.uniforms.resolution.value.set(width, height);
        }
    }

    _updateSheepSpawning(dt) {
        if (this.cloudfens.length >= this.maxSheep) return;
        if (this.isSpawningSheep) return; // Prevent multiple spawns at once

        this.spawnTimer += dt;

        if (this.spawnTimer >= this.nextSpawnTime) {
            this.spawnTimer = 0;
            // Next spawn gets slightly faster as flock grows (more satisfying)
            const baseTime = Math.max(8, 20 - this.totalSpawned * 0.5);
            this.nextSpawnTime = baseTime + Math.random() * 15;

            this._spawnNewSheep();
        }
    }

    async _spawnNewSheep() {
        this.isSpawningSheep = true;

        try {
            // Find a spawn position away from player and other sheep
            let spawnX, spawnZ;
            let attempts = 0;
            const minDistFromPlayer = 15;
            const minDistFromSheep = 4;

            do {
                // Spawn within safe meadow area (not at edges where terrain drops off)
                const safeRadius = 20; // Stay within safe ground
                const angle = Math.random() * Math.PI * 2;
                const distance = 8 + Math.random() * (safeRadius - 8); // Between 8-20 units from center
                spawnX = Math.cos(angle) * distance;
                spawnZ = Math.sin(angle) * distance;

                // Check distance from player
                const distFromPlayer = Math.sqrt(
                    (spawnX - this.player.position.x) ** 2 +
                    (spawnZ - this.player.position.z) ** 2
                );

                if (distFromPlayer < minDistFromPlayer) {
                    attempts++;
                    continue;
                }

                // Check distance from other sheep
                let tooClose = false;
                for (const sheep of this.cloudfens) {
                    const dist = Math.sqrt(
                        (spawnX - sheep.position.x) ** 2 +
                        (spawnZ - sheep.position.z) ** 2
                    );
                    if (dist < minDistFromSheep) {
                        tooClose = true;
                        break;
                    }
                }

                if (!tooClose) break;
                attempts++;
            } while (attempts < 10);

            // Spawn the new sheep using the same method as initial sheep
            const scale = 0.85 + Math.random() * 0.15;
            const cloudfen = new Cloudfen(this);
            await cloudfen.init(spawnX, spawnZ, scale);
            this.cloudfens.push(cloudfen);
            this.totalSpawned++;

            // Spawn effect - small ripple where sheep appears
            if (this.effects) {
                const spawnPos = new THREE.Vector3(spawnX, 0, spawnZ);
                this.effects.spawnRipple(spawnPos, 0xFFE4C4); // Warm peach color
            }

            console.log(`New sheep joined! Total: ${this.cloudfens.length}`);
        } finally {
            this.isSpawningSheep = false;
        }
    }

    _gameLoop() {
        if (!this.isRunning) return;

        requestAnimationFrame(this._gameLoop.bind(this));

        const delta = this.clock.getDelta();
        const dt = Math.min(delta, 0.1);

        this._update(dt);
        this._render();
    }

    _update(dt) {
        this._updatePlayer(dt);
        this._updateTouchLookInertia();
        this._updateInteraction();

        // Update sheep with player info
        const playerInfo = {
            position: this.player.position.clone(),
            velocity: this.player.velocity.clone(),
            isRunning: this.keys.run,
            isMoving: this.isTouchDevice
                ? (Math.abs(this.touch.moveX) > 0.1 || Math.abs(this.touch.moveZ) > 0.1)
                : (this.keys.forward || this.keys.backward || this.keys.left || this.keys.right),
        };

        for (const cloudfen of this.cloudfens) {
            cloudfen.update(dt, playerInfo);
        }

        // Sheep spawning system
        this._updateSheepSpawning(dt);

        if (this.effects) {
            this.effects.update(dt);
        }

        if (this.gameScene) {
            this.gameScene.update(dt);
        }
    }

    _render() {
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Start game
window.addEventListener('DOMContentLoaded', () => {
    window.game = new TouchSheepGame();
});
