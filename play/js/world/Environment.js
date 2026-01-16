/**
 * Environment - Decorative elements (grass, flowers, butterflies)
 * Adds visual juice and atmosphere
 */
export class Environment {
    constructor(game) {
        this.game = game;

        // Animated elements
        this.grassBlades = [];
        this.flowers = [];
        this.butterflies = [];

        // Time tracking
        this.time = 0;
    }

    async init() {
        this._createGrassPatches();
        this._createFlowers();
        this._createTrees();
        this._createButterflies();
    }

    _createGrassPatches() {
        // Create stylized grass blades using instanced meshes for performance

        const bladeGeometry = new THREE.PlaneGeometry(0.1, 0.5);
        bladeGeometry.translate(0, 0.25, 0);

        // Art Bible: Avoid verdant green - use teal/cyan tones instead
        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: 0x538084, // Teal-gray from Art Bible
            side: THREE.DoubleSide,
            roughness: 0.8,
        });

        // Create grass in several patches
        const patches = [
            { x: 10, z: 5, count: 200, radius: 8 },
            { x: -10, z: -5, count: 150, radius: 6 },
            { x: 15, z: -15, count: 180, radius: 7 },
            { x: -15, z: 10, count: 160, radius: 6 },
            { x: 0, z: 15, count: 200, radius: 10 },
        ];

        for (const patch of patches) {
            const instancedMesh = new THREE.InstancedMesh(
                bladeGeometry,
                bladeMaterial,
                patch.count
            );

            const dummy = new THREE.Object3D();
            const grassData = [];

            for (let i = 0; i < patch.count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const r = Math.random() * patch.radius;

                const x = patch.x + Math.cos(angle) * r;
                const z = patch.z + Math.sin(angle) * r;

                dummy.position.set(x, 0, z);
                dummy.rotation.y = Math.random() * Math.PI;
                dummy.scale.set(
                    0.8 + Math.random() * 0.4,
                    0.6 + Math.random() * 0.8,
                    1
                );
                dummy.updateMatrix();
                instancedMesh.setMatrixAt(i, dummy.matrix);

                grassData.push({
                    x, z,
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.5 + Math.random() * 0.5,
                });
            }

            instancedMesh.instanceMatrix.needsUpdate = true;
            this.game.scene.add(instancedMesh);

            this.grassBlades.push({
                mesh: instancedMesh,
                data: grassData,
                patchX: patch.x,
                patchZ: patch.z,
            });
        }
    }

    _createFlowers() {
        // Create colorful flower clusters

        // Art Bible: Alien desert palette flowers
        const flowerColors = [
            0xCB597D, // Pink from Art Bible
            0xD7F53D, // Lime-yellow from Art Bible
            0x7EFFD0, // Cyan/mint (POI highlight)
            0xFFB27D, // Orange/coral from Art Bible
            0x586575, // Blue-gray accent
        ];

        const flowerPositions = [
            { x: 8, z: 12, count: 15 },
            { x: -12, z: 8, count: 12 },
            { x: 18, z: -10, count: 10 },
            { x: -5, z: -18, count: 14 },
            { x: 25, z: 15, count: 8 },
        ];

        for (const cluster of flowerPositions) {
            for (let i = 0; i < cluster.count; i++) {
                const flower = this._createFlower(
                    flowerColors[Math.floor(Math.random() * flowerColors.length)]
                );

                const angle = Math.random() * Math.PI * 2;
                const r = Math.random() * 3;

                flower.position.set(
                    cluster.x + Math.cos(angle) * r,
                    0,
                    cluster.z + Math.sin(angle) * r
                );

                this.game.scene.add(flower);
                this.flowers.push({
                    mesh: flower,
                    phase: Math.random() * Math.PI * 2,
                });
            }
        }
    }

    _createFlower(color) {
        const group = new THREE.Group();

        // Stem - teal color matching grass
        const stemGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.4, 6);
        const stemMaterial = new THREE.MeshStandardMaterial({
            color: 0x538084, // Teal from Art Bible
            roughness: 0.8,
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = 0.2;
        group.add(stem);

        // Petals
        const petalGeometry = new THREE.CircleGeometry(0.1, 6);
        const petalMaterial = new THREE.MeshStandardMaterial({
            color: color,
            side: THREE.DoubleSide,
            roughness: 0.6,
        });

        for (let i = 0; i < 5; i++) {
            const petal = new THREE.Mesh(petalGeometry, petalMaterial);
            const angle = (i / 5) * Math.PI * 2;
            petal.position.set(
                Math.cos(angle) * 0.08,
                0.45,
                Math.sin(angle) * 0.08
            );
            petal.rotation.x = -Math.PI / 3;
            petal.rotation.y = angle;
            group.add(petal);
        }

        // Center - bright lime from Art Bible
        const centerGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const centerMaterial = new THREE.MeshStandardMaterial({
            color: 0xD7F53D, // Lime from Art Bible
            roughness: 0.5,
        });
        const center = new THREE.Mesh(centerGeometry, centerMaterial);
        center.position.y = 0.45;
        group.add(center);

        return group;
    }

    _createTrees() {
        // Create simple stylized trees

        const treePositions = [
            { x: -25, z: -25, scale: 1.2 },
            { x: 25, z: -20, scale: 1.0 },
            { x: 30, z: 20, scale: 1.3 },
            { x: -20, z: 30, scale: 1.1 },
            { x: 35, z: -5, scale: 0.9 },
        ];

        for (const pos of treePositions) {
            const tree = this._createTree(pos.scale);
            tree.position.set(pos.x, 0, pos.z);
            this.game.scene.add(tree);
        }
    }

    _createTree(scale) {
        const group = new THREE.Group();

        // Trunk - dark reddish-brown from Art Bible
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: 0x6A3A44, // Dark reddish-brown from Art Bible
            roughness: 0.9,
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 1.5;
        trunk.castShadow = true;
        group.add(trunk);

        // Foliage - teal color (avoid verdant green per Art Bible)
        const foliageMaterial = new THREE.MeshStandardMaterial({
            color: 0x538084, // Teal-gray from Art Bible
            roughness: 0.8,
        });

        const foliagePositions = [
            { x: 0, y: 4, z: 0, r: 1.5 },
            { x: 0.8, y: 3.5, z: 0.5, r: 1.0 },
            { x: -0.7, y: 3.3, z: -0.5, r: 1.1 },
            { x: 0, y: 5, z: 0, r: 1.0 },
        ];

        for (const f of foliagePositions) {
            const foliageGeometry = new THREE.SphereGeometry(f.r, 12, 10);
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.set(f.x, f.y, f.z);
            foliage.castShadow = true;
            group.add(foliage);
        }

        group.scale.setScalar(scale);
        return group;
    }

    _createButterflies() {
        // Create animated butterflies

        // Art Bible colors for butterflies
        const butterflyColors = [0xCB597D, 0x7EFFD0, 0xD7F53D, 0xFFB27D];

        for (let i = 0; i < 8; i++) {
            const butterfly = this._createButterfly(
                butterflyColors[i % butterflyColors.length]
            );

            // Random starting position
            butterfly.position.set(
                (Math.random() - 0.5) * 40,
                1 + Math.random() * 2,
                (Math.random() - 0.5) * 40
            );

            this.game.scene.add(butterfly);

            this.butterflies.push({
                mesh: butterfly,
                phase: Math.random() * Math.PI * 2,
                centerX: butterfly.position.x,
                centerZ: butterfly.position.z,
                radius: 3 + Math.random() * 5,
                speed: 0.3 + Math.random() * 0.4,
                wingPhase: Math.random() * Math.PI * 2,
            });
        }
    }

    _createButterfly(color) {
        const group = new THREE.Group();

        // Body
        const bodyGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 6);
        bodyGeometry.rotateX(Math.PI / 2);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            roughness: 0.5,
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        group.add(body);

        // Wings
        const wingGeometry = new THREE.CircleGeometry(0.15, 8);
        const wingMaterial = new THREE.MeshStandardMaterial({
            color: color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
        });

        // Left wing
        const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        leftWing.position.set(0, 0, 0.1);
        leftWing.rotation.y = 0.3;
        group.add(leftWing);
        group.leftWing = leftWing;

        // Right wing
        const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        rightWing.position.set(0, 0, -0.1);
        rightWing.rotation.y = -0.3;
        group.add(rightWing);
        group.rightWing = rightWing;

        return group;
    }

    update(dt) {
        this.time += dt;

        this._updateGrass(dt);
        this._updateFlowers(dt);
        this._updateButterflies(dt);
    }

    _updateGrass(dt) {
        // Animate grass swaying
        const dummy = new THREE.Object3D();

        for (const patch of this.grassBlades) {
            for (let i = 0; i < patch.data.length; i++) {
                const data = patch.data[i];

                // Get current matrix
                patch.mesh.getMatrixAt(i, dummy.matrix);
                dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

                // Apply sway
                const sway = Math.sin(this.time * data.speed + data.phase) * 0.15;
                dummy.rotation.z = sway;
                dummy.rotation.x = sway * 0.5;

                dummy.updateMatrix();
                patch.mesh.setMatrixAt(i, dummy.matrix);
            }
            patch.mesh.instanceMatrix.needsUpdate = true;
        }
    }

    _updateFlowers(dt) {
        // Gentle flower sway
        for (const flower of this.flowers) {
            const sway = Math.sin(this.time * 1.5 + flower.phase) * 0.1;
            flower.mesh.rotation.z = sway;
        }
    }

    _updateButterflies(dt) {
        // Animate butterfly flight
        for (const butterfly of this.butterflies) {
            // Circular flight path
            butterfly.phase += dt * butterfly.speed;

            butterfly.mesh.position.x = butterfly.centerX + Math.cos(butterfly.phase) * butterfly.radius;
            butterfly.mesh.position.z = butterfly.centerZ + Math.sin(butterfly.phase) * butterfly.radius;
            butterfly.mesh.position.y = 1.5 + Math.sin(butterfly.phase * 2) * 0.5;

            // Face direction of travel
            butterfly.mesh.rotation.y = butterfly.phase + Math.PI / 2;

            // Wing flapping
            butterfly.wingPhase += dt * 15;
            const wingAngle = Math.sin(butterfly.wingPhase) * 0.8;

            if (butterfly.mesh.leftWing) {
                butterfly.mesh.leftWing.rotation.y = 0.3 + wingAngle;
            }
            if (butterfly.mesh.rightWing) {
                butterfly.mesh.rightWing.rotation.y = -0.3 - wingAngle;
            }
        }
    }
}
