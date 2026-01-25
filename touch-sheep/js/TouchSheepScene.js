/**
 * TouchSheepScene - Expanded scene for first-person sheep herding
 * Larger meadow area with varied terrain
 * Art Bible colors: peach sky #E8C4A8, sandy ground #D4A574
 */
export class TouchSheepScene {
    constructor(game) {
        this.game = game;

        // Grass instances for animation
        this.grassBlades = [];
        this.grassMaterial = null;

        // Ground mesh for height sampling
        this.ground = null;
        this.groundVertices = null;
        this.groundSize = 100;
    }

    async init() {
        this._createGround();
        this._createDistantHills();
        this._createGrass();
        this._createRocks();
        this._createFlowers();
    }

    _createGround() {
        const geometry = new THREE.PlaneGeometry(this.groundSize, this.groundSize, 50, 50);
        geometry.rotateX(-Math.PI / 2);

        // Add rolling height variation
        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            // Gentle rolling hills
            vertices[i + 1] =
                Math.sin(x * 0.05) * Math.cos(z * 0.05) * 1.5 +
                Math.sin(x * 0.1 + 1) * Math.cos(z * 0.08) * 0.5;
        }
        geometry.computeVertexNormals();

        // Store for height sampling
        this.groundVertices = vertices;

        // Art Bible sandy ground
        const material = new THREE.MeshStandardMaterial({
            color: 0xD4A574,
            roughness: 0.95,
            metalness: 0.0,
        });

        this.ground = new THREE.Mesh(geometry, material);
        this.ground.receiveShadow = true;
        this.ground.position.y = 0;

        this.game.scene.add(this.ground);

        // Ground patches for visual variation
        this._addGroundPatches();
    }

    _addGroundPatches() {
        const patchMaterial = new THREE.MeshStandardMaterial({
            color: 0xC4956A,
            roughness: 0.98,
            metalness: 0,
            transparent: true,
            opacity: 0.3,
        });

        for (let i = 0; i < 20; i++) {
            const size = 3 + Math.random() * 6;
            const geometry = new THREE.CircleGeometry(size, 12);
            geometry.rotateX(-Math.PI / 2);

            const patch = new THREE.Mesh(geometry, patchMaterial);
            const x = (Math.random() - 0.5) * 70;
            const z = (Math.random() - 0.5) * 70;
            patch.position.set(x, this.getGroundHeight(x, z) + 0.02, z);
            patch.rotation.y = Math.random() * Math.PI * 2;

            this.game.scene.add(patch);
        }
    }

    _createDistantHills() {
        // Background hills for depth
        const hillMaterial = new THREE.MeshBasicMaterial({
            color: 0xD8B494,
            transparent: true,
            fog: true,
        });

        const hillConfigs = [
            { z: -45, height: 8, width: 120, opacity: 0.3 },
            { z: -35, height: 5, width: 100, opacity: 0.4 },
            { z: 45, height: 6, width: 100, opacity: 0.3 },
        ];

        for (const config of hillConfigs) {
            const geometry = new THREE.PlaneGeometry(config.width, config.height, 30, 1);

            const vertices = geometry.attributes.position.array;
            for (let i = 0; i < vertices.length; i += 3) {
                const x = vertices[i];
                const y = vertices[i + 1];
                if (y > 0) {
                    vertices[i + 1] += Math.sin(x * 0.08) * 2.5 + Math.sin(x * 0.2) * 1;
                }
            }
            geometry.computeVertexNormals();

            const mat = hillMaterial.clone();
            mat.opacity = config.opacity;

            const hill = new THREE.Mesh(geometry, mat);
            hill.position.set(0, config.height / 2 + 2, config.z);

            this.game.scene.add(hill);
        }
    }

    _createGrass() {
        // Stylized grass tufts
        this.grassMaterial = new THREE.MeshStandardMaterial({
            color: 0x538084,
            roughness: 0.8,
            metalness: 0,
            side: THREE.DoubleSide,
        });

        const bladeGeometry = this._createGrassBladeGeometry();

        // Scatter grass across the meadow
        const grassDensity = 400;

        for (let i = 0; i < grassDensity; i++) {
            const blade = new THREE.Mesh(bladeGeometry, this.grassMaterial);

            const x = (Math.random() - 0.5) * 80;
            const z = (Math.random() - 0.5) * 80;
            const y = this.getGroundHeight(x, z);

            blade.position.set(x, y, z);
            blade.rotation.y = Math.random() * Math.PI * 2;
            blade.scale.setScalar(0.3 + Math.random() * 0.5);

            blade.userData.swayPhase = Math.random() * Math.PI * 2;
            blade.userData.swaySpeed = 0.5 + Math.random() * 0.5;

            this.grassBlades.push(blade);
            this.game.scene.add(blade);
        }
    }

    _createGrassBladeGeometry() {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(0.06, 0);
        shape.lineTo(0.03, 0.5);
        shape.lineTo(0, 0);

        const geometry = new THREE.ShapeGeometry(shape);
        geometry.rotateX(-Math.PI / 2);
        geometry.rotateY(Math.PI / 2);

        return geometry;
    }

    _createRocks() {
        const rockMaterial = new THREE.MeshStandardMaterial({
            color: 0x7A5153,
            roughness: 0.95,
            metalness: 0.1,
        });

        // Large rocks
        const rockPositions = [
            { x: -15, z: 10, scale: 2.5 },
            { x: 20, z: -12, scale: 2 },
            { x: -25, z: -20, scale: 3 },
            { x: 18, z: 25, scale: 2.2 },
            { x: -30, z: 15, scale: 1.8 },
            { x: 28, z: 8, scale: 2.8 },
            { x: -10, z: -30, scale: 2 },
            { x: 5, z: 30, scale: 1.5 },
        ];

        for (const pos of rockPositions) {
            const rock = this._createRock(pos.scale);
            const y = this.getGroundHeight(pos.x, pos.z);
            rock.position.set(pos.x, y, pos.z);
            rock.rotation.y = Math.random() * Math.PI * 2;
            this.game.scene.add(rock);
        }

        // Small stones
        for (let i = 0; i < 40; i++) {
            const stone = this._createStone();
            const x = (Math.random() - 0.5) * 70;
            const z = (Math.random() - 0.5) * 70;
            const y = this.getGroundHeight(x, z);
            stone.position.set(x, y, z);
            stone.rotation.y = Math.random() * Math.PI * 2;
            this.game.scene.add(stone);
        }
    }

    _createRock(scale) {
        const geometry = new THREE.DodecahedronGeometry(1, 1);

        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i] *= 0.7 + Math.random() * 0.6;
            vertices[i + 1] *= 0.5 + Math.random() * 0.5;
            vertices[i + 2] *= 0.7 + Math.random() * 0.6;
        }
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: 0x7A5153,
            roughness: 0.95,
            metalness: 0.1,
        });

        const rock = new THREE.Mesh(geometry, material);
        rock.scale.setScalar(scale);
        rock.castShadow = true;
        rock.receiveShadow = true;

        return rock;
    }

    _createStone() {
        const geometry = new THREE.SphereGeometry(0.3, 6, 5);

        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i] *= 0.7 + Math.random() * 0.6;
            vertices[i + 1] *= 0.4;
            vertices[i + 2] *= 0.7 + Math.random() * 0.6;
        }
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: 0x6A3A44,
            roughness: 0.9,
        });

        const stone = new THREE.Mesh(geometry, material);
        stone.castShadow = true;

        return stone;
    }

    _createFlowers() {
        const flowerColors = [0xC87878, 0xCB597D, 0xE8A8B8, 0xFFE4B5];

        for (let i = 0; i < 30; i++) {
            const flower = this._createFlower(flowerColors[i % flowerColors.length]);
            const x = (Math.random() - 0.5) * 60;
            const z = (Math.random() - 0.5) * 60;
            const y = this.getGroundHeight(x, z);
            flower.position.set(x, y, z);
            flower.scale.setScalar(0.12 + Math.random() * 0.1);

            this.game.scene.add(flower);
        }
    }

    _createFlower(color) {
        const group = new THREE.Group();

        // Stem
        const stemGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.5, 4);
        const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x538084 });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = 0.25;
        group.add(stem);

        // Flower head
        const petalGeometry = new THREE.CircleGeometry(0.15, 6);
        const petalMaterial = new THREE.MeshStandardMaterial({
            color: color,
            side: THREE.DoubleSide,
        });
        const petals = new THREE.Mesh(petalGeometry, petalMaterial);
        petals.position.y = 0.5;
        petals.rotation.x = -Math.PI / 6;
        group.add(petals);

        // Center
        const centerGeometry = new THREE.SphereGeometry(0.05, 6, 6);
        const centerMaterial = new THREE.MeshStandardMaterial({ color: 0xFFE4B5 });
        const center = new THREE.Mesh(centerGeometry, centerMaterial);
        center.position.y = 0.52;
        group.add(center);

        return group;
    }

    /**
     * Get ground height at world position
     */
    getGroundHeight(x, z) {
        // Simple height calculation matching terrain generation
        const height =
            Math.sin(x * 0.05) * Math.cos(z * 0.05) * 1.5 +
            Math.sin(x * 0.1 + 1) * Math.cos(z * 0.08) * 0.5;
        return height;
    }

    update(dt) {
        // Animate grass swaying
        const time = this.game.clock.elapsedTime;

        for (const blade of this.grassBlades) {
            const phase = blade.userData.swayPhase;
            const speed = blade.userData.swaySpeed;

            blade.rotation.z = Math.sin(time * speed + phase) * 0.15;
            blade.rotation.x = Math.sin(time * speed * 0.7 + phase) * 0.05;
        }
    }
}
