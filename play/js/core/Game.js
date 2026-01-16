/**
 * Game - Main game controller
 * Initializes Three.js, manages game loop, coordinates all systems
 */
import { Input } from './Input.js';
import { Player } from '../entities/Player.js';
import { Cloudfen } from '../entities/Cloudfen.js';
import { Bird } from '../entities/Bird.js';
import { MossBall } from '../entities/MossBall.js';
import { SoundSystem } from '../systems/SoundSystem.js';
import { RecordSystem } from '../systems/RecordSystem.js';
import { PuzzleSystem } from '../systems/PuzzleSystem.js';
import { Scene as GameScene } from '../world/Scene.js';
import { Environment } from '../world/Environment.js';
import { Effects } from '../world/Effects.js';
import { HUD } from '../ui/HUD.js';
import { Tutorial } from '../ui/Tutorial.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.clock = new THREE.Clock();
        this.isRunning = false;
        this.isPaused = false;

        // Game entities
        this.player = null;
        this.cloudfens = [];
        this.bird = null;
        this.mossBall = null;

        // Systems
        this.input = null;
        this.soundSystem = null;
        this.recordSystem = null;
        this.puzzleSystem = null;

        // World
        this.gameScene = null;
        this.environment = null;
        this.effects = null;

        // UI
        this.hud = null;
        this.tutorial = null;

        // Three.js core
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;

        // Game state
        this.state = {
            phase: 'loading', // loading, tutorial, playing, victory
            tutorialStep: 0,
            hasGather: false,
            hasCharge: false,
            puzzleSolved: false,
        };

        this._init();
    }

    async _init() {
        try {
            this._initThree();
            this._initPostProcessing();
            await this._initSystems();
            await this._initWorld();
            await this._initEntities();
            this._initUI();
            this._bindEvents();

            // Hide loading screen
            this._hideLoading();

            // Start game loop
            this.isRunning = true;
            this._gameLoop();
        } catch (error) {
            console.error('Game initialization failed:', error);
        }
    }

    _initThree() {
        // Scene - Art Bible: Alien desert atmosphere with peach/salmon sky
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xE8C4A8); // Warm peach sky from Art Bible cover
        this.scene.fog = new THREE.Fog(0xE8C4A8, 50, 150);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

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

        // Lighting
        this._initLighting();

        // Handle resize
        window.addEventListener('resize', this._onResize.bind(this));
    }

    _initLighting() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambient);

        // Directional light (sun)
        const sun = new THREE.DirectionalLight(0xffffff, 1.0);
        sun.position.set(50, 100, 50);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 200;
        sun.shadow.camera.left = -50;
        sun.shadow.camera.right = 50;
        sun.shadow.camera.top = 50;
        sun.shadow.camera.bottom = -50;
        this.scene.add(sun);

        // Hemisphere light - Art Bible warm sky + sandy ground
        const hemi = new THREE.HemisphereLight(0xE8C4A8, 0xD4A574, 0.4);
        this.scene.add(hemi);
    }

    _initPostProcessing() {
        // Will be implemented in Effects.js for Moebius shader
        // For now, direct rendering
    }

    async _initSystems() {
        // Input system
        this.input = new Input();

        // Connect input callbacks
        this.input.onSlotChange = (slot) => {
            if (this.hud) this.hud.setActiveSlot(slot);
            if (this.soundSystem) this.soundSystem.setActiveSlot(slot);
        };

        this.input.onVolumeChange = (volume) => {
            if (this.hud) this.hud.setVolume(volume);
            if (this.soundSystem) this.soundSystem.setVolume(volume);
        };

        // Sound system
        this.soundSystem = new SoundSystem(this);

        // Record system
        this.recordSystem = new RecordSystem(this);

        // Puzzle system
        this.puzzleSystem = new PuzzleSystem(this);
        this.puzzleSystem.init();
    }

    async _initWorld() {
        // Create game scene (ground, terrain, etc.)
        this.gameScene = new GameScene(this);
        await this.gameScene.init();

        // Environment decorations (grass, flowers, etc.)
        this.environment = new Environment(this);
        await this.environment.init();

        // Visual effects (particles, waves)
        this.effects = new Effects(this);
        await this.effects.init();
    }

    async _initEntities() {
        // Player
        this.player = new Player(this);
        await this.player.init();

        // Cloudfens (5 sheep)
        const cloudfenPositions = [
            { x: 5, z: 0 },
            { x: -3, z: 4 },
            { x: 2, z: -5 },
            { x: -5, z: -2 },
            { x: 0, z: 6 },
        ];

        for (const pos of cloudfenPositions) {
            const cloudfen = new Cloudfen(this);
            await cloudfen.init(pos.x, pos.z);
            this.cloudfens.push(cloudfen);
        }

        // Bird
        this.bird = new Bird(this);
        await this.bird.init();

        // Moss Ball
        this.mossBall = new MossBall(this);
        await this.mossBall.init();
    }

    _initUI() {
        this.hud = new HUD(this);
        this.tutorial = new Tutorial(this);
    }

    _bindEvents() {
        // Click to start / lock pointer
        this.canvas.addEventListener('click', () => {
            if (!this.input.isLocked) {
                this.input.requestPointerLock(this.canvas);
                if (this.state.phase === 'loading') {
                    this.state.phase = 'tutorial';
                    this.tutorial.start();
                }
            }
        });

        // Escape to pause
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' && this.input.isLocked) {
                this.isPaused = !this.isPaused;
            }
        });

        // Replay button
        const replayBtn = document.querySelector('.btn-replay');
        if (replayBtn) {
            replayBtn.addEventListener('click', () => this.replay());
        }
    }

    _hideLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
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

        if (this.effects) {
            this.effects.onResize(width, height);
        }
    }

    _gameLoop() {
        if (!this.isRunning) return;

        requestAnimationFrame(this._gameLoop.bind(this));

        const delta = this.clock.getDelta();

        if (!this.isPaused && this.input.isLocked) {
            this._update(delta);
        }

        this._render();
    }

    _update(delta) {
        // Clamp delta to avoid large jumps
        const dt = Math.min(delta, 0.1);

        // Update player
        if (this.player) {
            this.player.update(dt);
        }

        // Update cloudfens
        for (const cloudfen of this.cloudfens) {
            cloudfen.update(dt);
        }

        // Update bird
        if (this.bird) {
            this.bird.update(dt);
        }

        // Update moss ball
        if (this.mossBall) {
            this.mossBall.update(dt);
        }

        // Update systems
        if (this.soundSystem) {
            this.soundSystem.update(dt);
        }

        if (this.recordSystem) {
            this.recordSystem.update(dt);
        }

        if (this.puzzleSystem) {
            this.puzzleSystem.update(dt);
        }

        // Update environment
        if (this.environment) {
            this.environment.update(dt);
        }

        // Update effects
        if (this.effects) {
            this.effects.update(dt);
        }

        // Update UI
        if (this.hud) {
            this.hud.update(dt);
        }
    }

    _render() {
        if (this.effects && this.effects.composer) {
            this.effects.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Trigger victory state
     */
    victory() {
        this.state.phase = 'victory';
        this.input.exitPointerLock();

        // Show victory screen
        const victoryScreen = document.getElementById('victory-screen');
        if (victoryScreen) {
            victoryScreen.classList.remove('hidden');
        }

        // Spawn celebration particles
        if (this.effects) {
            this.effects.celebrationBurst(this.player.position);
        }
    }

    /**
     * Reset and replay
     */
    replay() {
        window.location.reload();
    }
}

// Start game when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
