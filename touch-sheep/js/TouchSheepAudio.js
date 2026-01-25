/**
 * TouchSheepAudio - Audio manager for Touch Sheep demo
 * Handles all sound effects with Web Audio API
 */
export class TouchSheepAudio {
    constructor(game) {
        this.game = game;

        // Audio context (created on first user interaction)
        this.context = null;
        this.masterGain = null;
        this.initialized = false;

        // Audio buffers
        this.buffers = {
            sheepBaa: null,
            sheepBleat: null,
            mossyImpact: null,
            footsteps: null,
        };

        // Footstep state
        this.footstepTimer = 0;
        this.footstepInterval = 0.4; // Time between footsteps
        this.isWalking = false;

        // Volume settings
        this.volumes = {
            master: 0.7,
            sheep: 0.25, // Reduced for softer sheep sounds
            footsteps: 0.3,
            impact: 0.5,
        };

        // Cooldowns to prevent sound spam
        this.cooldowns = {
            sheepBaa: 0,
            sheepBleat: 0,
            mossyImpact: 0,
        };

        // Fade state
        this.fadeState = {
            isFading: false,
            targetVolume: 0.7,
            fadeSpeed: 1.0, // Volume change per second
        };

        // Track active sounds for fade control
        this.activeSounds = [];

        // Distance-based audio settings
        this.distanceSettings = {
            // Reference distance where volume is at 100%
            refDistance: 2.0,
            // Maximum distance where sound is still audible
            maxDistance: 30.0,
            // Rolloff factor (higher = faster falloff)
            rolloffFactor: 1.5,
            // Minimum volume at max distance
            minVolume: 0.05,
        };
    }

    async init() {
        // Don't initialize audio context here - wait for user interaction
        // This is required by browser autoplay policies
        this._setupUserInteraction();
    }

    _setupUserInteraction() {
        // Initialize audio on first user interaction
        const initAudio = async () => {
            if (this.initialized) return;

            try {
                this.context = new (window.AudioContext || window.webkitAudioContext)();
                this.masterGain = this.context.createGain();
                this.masterGain.gain.value = this.volumes.master;
                this.masterGain.connect(this.context.destination);

                // Load all audio files
                await this._loadAllAudio();
                this.initialized = true;
                console.log('Audio system initialized');
            } catch (error) {
                console.warn('Audio initialization failed:', error);
            }

            // Remove listeners after initialization
            document.removeEventListener('click', initAudio);
            document.removeEventListener('touchstart', initAudio);
            document.removeEventListener('keydown', initAudio);
        };

        document.addEventListener('click', initAudio, { once: true });
        document.addEventListener('touchstart', initAudio, { once: true });
        document.addEventListener('keydown', initAudio, { once: true });
    }

    async _loadAllAudio() {
        const audioFiles = {
            sheepBaa: 'assets/audio/Baacadia_SheepBaa_V1_04_(BEST).wav',
            sheepBleat: 'assets/audio/Baacadia_SheepBleat_V1_05_(BEST).wav',
            mossyImpact: 'assets/audio/Baacadia_Mossy_Impact_v4.wav',
            footsteps: 'assets/audio/SFX_Footsteps_Dirt.wav',
        };

        const loadPromises = Object.entries(audioFiles).map(async ([key, path]) => {
            try {
                const response = await fetch(path);
                const arrayBuffer = await response.arrayBuffer();
                this.buffers[key] = await this.context.decodeAudioData(arrayBuffer);
            } catch (error) {
                console.warn(`Failed to load audio: ${path}`, error);
            }
        });

        await Promise.all(loadPromises);
    }

    /**
     * Play a sound effect with optional fade in
     * @param {AudioBuffer} buffer - The audio buffer to play
     * @param {number} volume - Base volume (0-1)
     * @param {number} playbackRate - Playback speed
     * @param {boolean} loop - Whether to loop
     * @param {number} fadeInDuration - Fade in time in seconds (0 = no fade)
     * @returns {Object} Sound control object with stop() and fadeOut() methods
     */
    _playSound(buffer, volume = 1.0, playbackRate = 1.0, loop = false, fadeInDuration = 0) {
        if (!this.initialized || !buffer || !this.context) return null;

        // Resume context if suspended (required by some browsers)
        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = playbackRate;
        source.loop = loop;

        const gainNode = this.context.createGain();
        const targetVolume = volume * this.volumes.master;

        // Apply fade in if specified
        if (fadeInDuration > 0) {
            gainNode.gain.setValueAtTime(0, this.context.currentTime);
            gainNode.gain.linearRampToValueAtTime(targetVolume, this.context.currentTime + fadeInDuration);
        } else {
            gainNode.gain.value = targetVolume;
        }

        source.connect(gainNode);
        gainNode.connect(this.masterGain);

        source.start(0);

        // Create control object
        const soundControl = {
            source,
            gainNode,
            baseVolume: volume,
            isPlaying: true,
            stop: () => {
                if (soundControl.isPlaying) {
                    source.stop();
                    soundControl.isPlaying = false;
                    this._removeActiveSound(soundControl);
                }
            },
            fadeOut: (duration = 0.5) => {
                if (!soundControl.isPlaying) return;
                const now = this.context.currentTime;
                gainNode.gain.setValueAtTime(gainNode.gain.value, now);
                gainNode.gain.linearRampToValueAtTime(0, now + duration);
                setTimeout(() => {
                    soundControl.stop();
                }, duration * 1000);
            },
            setVolume: (vol) => {
                gainNode.gain.setValueAtTime(vol * this.volumes.master, this.context.currentTime);
            },
        };

        // Track active sounds
        this.activeSounds.push(soundControl);

        // Auto-remove when sound ends
        source.onended = () => {
            soundControl.isPlaying = false;
            this._removeActiveSound(soundControl);
        };

        return soundControl;
    }

    /**
     * Remove a sound from active sounds list
     */
    _removeActiveSound(soundControl) {
        const idx = this.activeSounds.indexOf(soundControl);
        if (idx !== -1) {
            this.activeSounds.splice(idx, 1);
        }
    }

    /**
     * Calculate volume multiplier based on distance from player
     * Uses inverse distance attenuation model
     * @param {number} distance - Distance from sound source to player
     * @param {Object} options - Optional override settings
     * @returns {number} Volume multiplier (0-1)
     */
    getDistanceVolume(distance, options = {}) {
        const settings = { ...this.distanceSettings, ...options };
        const { refDistance, maxDistance, rolloffFactor, minVolume } = settings;

        // If within reference distance, full volume
        if (distance <= refDistance) {
            return 1.0;
        }

        // If beyond max distance, minimum volume
        if (distance >= maxDistance) {
            return minVolume;
        }

        // Inverse distance attenuation with rolloff
        // Formula: refDistance / (refDistance + rolloffFactor * (distance - refDistance))
        const attenuation = refDistance / (refDistance + rolloffFactor * (distance - refDistance));

        // Clamp to minimum volume
        return Math.max(minVolume, attenuation);
    }

    /**
     * Play a positioned sound with distance-based volume
     * @param {AudioBuffer} buffer - Audio buffer to play
     * @param {THREE.Vector3|{x,z}} position - Sound source position
     * @param {number} baseVolume - Base volume before distance attenuation
     * @param {Object} options - Additional options (playbackRate, fadeIn, distanceSettings)
     * @returns {Object} Sound control object
     */
    playSoundAtPosition(buffer, position, baseVolume = 1.0, options = {}) {
        if (!this.initialized || !buffer || !this.context) return null;
        if (!this.game.player) return null;

        // Calculate distance to player
        const playerPos = this.game.player.position;
        const dx = position.x - playerPos.x;
        const dz = position.z - playerPos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // Get distance-based volume
        const distanceVolume = this.getDistanceVolume(distance, options.distanceSettings);

        // Skip if too quiet
        if (distanceVolume < 0.01) return null;

        // Calculate final volume
        const finalVolume = baseVolume * distanceVolume;

        // Play the sound
        return this._playSound(
            buffer,
            finalVolume,
            options.playbackRate || 1.0,
            options.loop || false,
            options.fadeIn || 0
        );
    }

    /**
     * Create a positioned sound that updates volume based on distance
     * Useful for looping ambient sounds that move with objects
     * @param {AudioBuffer} buffer - Audio buffer to play
     * @param {Object} source - Object with position property (will be tracked)
     * @param {number} baseVolume - Base volume
     * @param {Object} options - Options including loop, distanceSettings
     * @returns {Object} Sound control with updatePosition method
     */
    createPositionedSound(buffer, source, baseVolume = 1.0, options = {}) {
        if (!this.initialized || !buffer || !this.context) return null;

        const sound = this._playSound(buffer, 0, options.playbackRate || 1.0, true, 0);
        if (!sound) return null;

        // Add position tracking
        sound.source = source;
        sound.baseVolume = baseVolume;
        sound.distanceSettings = options.distanceSettings || {};

        // Update method to be called each frame
        sound.updatePosition = () => {
            if (!sound.isPlaying || !this.game.player) return;

            const playerPos = this.game.player.position;
            const pos = sound.source.position || sound.source;
            const dx = pos.x - playerPos.x;
            const dz = pos.z - playerPos.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            const distanceVolume = this.getDistanceVolume(distance, sound.distanceSettings);
            const targetVol = sound.baseVolume * distanceVolume * this.volumes.master;

            // Smooth volume transition
            const currentVol = sound.gainNode.gain.value;
            const newVol = currentVol + (targetVol - currentVol) * 0.1;
            sound.gainNode.gain.setValueAtTime(newVol, this.context.currentTime);
        };

        return sound;
    }

    /**
     * Play sheep baa sound (when called/gathered)
     * @param {THREE.Vector3|{x,z}|number} positionOrDistance - Position or distance from player
     * @returns {Object} Sound control object
     */
    playSheepBaa(positionOrDistance = 0) {
        if (this.cooldowns.sheepBaa > 0) return null;

        // Calculate distance-based volume
        let distanceVolume = 1.0;
        if (typeof positionOrDistance === 'object' && this.game.player) {
            // Position-based: use new distance system
            const playerPos = this.game.player.position;
            const dx = positionOrDistance.x - playerPos.x;
            const dz = positionOrDistance.z - playerPos.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            distanceVolume = this.getDistanceVolume(distance, {
                refDistance: 2.0,
                maxDistance: 20.0,
                rolloffFactor: 1.8, // Faster falloff for softer distant sounds
            });
        } else if (typeof positionOrDistance === 'number') {
            // Legacy: direct distance value
            distanceVolume = this.getDistanceVolume(positionOrDistance, {
                refDistance: 2.0,
                maxDistance: 20.0,
                rolloffFactor: 1.8,
            });
        }

        // Skip if too quiet
        if (distanceVolume < 0.02) return null;

        // Random pitch variation for natural feel
        const pitch = 0.9 + Math.random() * 0.2;

        // Slight fade in for softer attack
        const sound = this._playSound(
            this.buffers.sheepBaa,
            this.volumes.sheep * distanceVolume,
            pitch,
            false,
            0.05 // 50ms fade in
        );

        // Cooldown to prevent spam
        this.cooldowns.sheepBaa = 0.5 + Math.random() * 0.5;

        return sound;
    }

    /**
     * Play sheep bleat sound (when petted/happy)
     * @param {THREE.Vector3|{x,z}|number} positionOrDistance - Position or distance from player
     * @returns {Object} Sound control object
     */
    playSheepBleat(positionOrDistance = 0) {
        if (this.cooldowns.sheepBleat > 0) return null;

        // Calculate distance-based volume
        let distanceVolume = 1.0;
        if (typeof positionOrDistance === 'object' && this.game.player) {
            // Position-based
            const playerPos = this.game.player.position;
            const dx = positionOrDistance.x - playerPos.x;
            const dz = positionOrDistance.z - playerPos.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            distanceVolume = this.getDistanceVolume(distance, {
                refDistance: 1.5,
                maxDistance: 15.0,
                rolloffFactor: 2.0, // Faster falloff
            });
        } else if (typeof positionOrDistance === 'number') {
            // Legacy: direct distance value
            distanceVolume = this.getDistanceVolume(positionOrDistance, {
                refDistance: 1.5,
                maxDistance: 15.0,
                rolloffFactor: 2.0,
            });
        }

        // Skip if too quiet
        if (distanceVolume < 0.02) return null;

        const pitch = 0.95 + Math.random() * 0.1;

        // Slight fade in for softer attack
        const sound = this._playSound(
            this.buffers.sheepBleat,
            this.volumes.sheep * distanceVolume,
            pitch,
            false,
            0.03 // 30ms fade in
        );

        this.cooldowns.sheepBleat = 0.8 + Math.random() * 0.4;

        return sound;
    }

    /**
     * Play mossy impact sound (when pushing moss balls)
     * @param {number} force - Impact force for volume
     * @param {THREE.Vector3|{x,z}} position - Optional position for distance attenuation
     * @returns {Object} Sound control object
     */
    playMossyImpact(force = 1.0, position = null) {
        if (this.cooldowns.mossyImpact > 0) return null;

        // Calculate distance-based volume if position provided
        let distanceVolume = 1.0;
        if (position && this.game.player) {
            const playerPos = this.game.player.position;
            const dx = position.x - playerPos.x;
            const dz = position.z - playerPos.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            distanceVolume = this.getDistanceVolume(distance, {
                refDistance: 2.0,
                maxDistance: 20.0,
                rolloffFactor: 1.3,
            });
        }

        // Skip if too quiet
        if (distanceVolume < 0.02) return null;

        // Volume based on impact force and distance
        const forceMultiplier = Math.min(1.0, 0.4 + force * 0.3);
        const pitch = 0.85 + Math.random() * 0.3;

        const sound = this._playSound(
            this.buffers.mossyImpact,
            this.volumes.impact * forceMultiplier * distanceVolume,
            pitch
        );

        this.cooldowns.mossyImpact = 0.15;

        return sound;
    }

    /**
     * Play footstep sound with natural fade envelope
     * @param {boolean} isRunning - Whether player is running
     */
    playFootstep(isRunning = false) {
        if (!this.buffers.footsteps) return;
        if (!this.initialized || !this.context) return;

        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        // Randomize starting point in the footsteps audio
        const buffer = this.buffers.footsteps;
        const duration = 0.25; // Length of each footstep sample

        // Random pitch variation
        const pitch = isRunning ? 1.1 + Math.random() * 0.1 : 0.95 + Math.random() * 0.1;
        const volume = isRunning ? this.volumes.footsteps * 1.2 : this.volumes.footsteps;

        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = pitch;

        const gainNode = this.context.createGain();
        const now = this.context.currentTime;
        const targetVolume = volume * this.volumes.master;

        // Natural footstep envelope: quick attack, gradual release
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(targetVolume, now + 0.02); // 20ms attack
        gainNode.gain.setValueAtTime(targetVolume, now + duration * 0.6);
        gainNode.gain.linearRampToValueAtTime(0, now + duration); // Fade out at end

        source.connect(gainNode);
        gainNode.connect(this.masterGain);

        // Start at random position in the audio file
        const randomStart = Math.random() * (buffer.duration - duration);
        source.start(0, randomStart, duration);
    }

    /**
     * Update audio system (call every frame)
     */
    update(dt, playerInfo) {
        // Update cooldowns
        for (const key in this.cooldowns) {
            if (this.cooldowns[key] > 0) {
                this.cooldowns[key] -= dt;
            }
        }

        // Handle footsteps
        if (playerInfo && playerInfo.isMoving) {
            this.footstepTimer += dt;
            const interval = playerInfo.isRunning
                ? this.footstepInterval * 0.6
                : this.footstepInterval;

            if (this.footstepTimer >= interval) {
                this.footstepTimer = 0;
                this.playFootstep(playerInfo.isRunning);
            }
        } else {
            this.footstepTimer = this.footstepInterval * 0.8; // Ready to play next step quickly
        }
    }

    /**
     * Set master volume (0-1)
     */
    setMasterVolume(volume) {
        this.volumes.master = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.volumes.master;
        }
    }

    /**
     * Fade master volume to target over duration
     * @param {number} targetVolume - Target volume (0-1)
     * @param {number} duration - Fade duration in seconds
     */
    fadeMasterTo(targetVolume, duration = 1.0) {
        if (!this.initialized || !this.masterGain) return;

        targetVolume = Math.max(0, Math.min(1, targetVolume));
        const now = this.context.currentTime;

        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(targetVolume, now + duration);

        this.volumes.master = targetVolume;
    }

    /**
     * Fade in all audio from silence
     * @param {number} duration - Fade duration in seconds
     */
    fadeIn(duration = 1.0) {
        if (!this.initialized || !this.masterGain) return;

        const now = this.context.currentTime;
        const targetVolume = this.volumes.master;

        this.masterGain.gain.setValueAtTime(0, now);
        this.masterGain.gain.linearRampToValueAtTime(targetVolume, now + duration);
    }

    /**
     * Fade out all audio to silence
     * @param {number} duration - Fade duration in seconds
     * @param {Function} onComplete - Callback when fade completes
     */
    fadeOut(duration = 1.0, onComplete = null) {
        if (!this.initialized || !this.masterGain) return;

        const now = this.context.currentTime;

        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0, now + duration);

        if (onComplete) {
            setTimeout(onComplete, duration * 1000);
        }
    }

    /**
     * Stop all active sounds with optional fade
     * @param {number} fadeDuration - Fade out duration (0 = immediate stop)
     */
    stopAll(fadeDuration = 0) {
        if (fadeDuration > 0) {
            // Fade out each active sound
            for (const sound of this.activeSounds) {
                sound.fadeOut(fadeDuration);
            }
        } else {
            // Immediate stop
            for (const sound of [...this.activeSounds]) {
                sound.stop();
            }
            this.activeSounds = [];
        }
    }

    /**
     * Mute/unmute all audio
     * @param {boolean} muted - Whether to mute
     * @param {number} fadeDuration - Fade duration for transition
     */
    setMuted(muted, fadeDuration = 0.3) {
        if (muted) {
            this.fadeMasterTo(0, fadeDuration);
        } else {
            this.fadeMasterTo(this.volumes.master, fadeDuration);
        }
    }
}
