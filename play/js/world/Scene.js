/**
 * Scene - Main game scene construction
 * Creates ground, terrain, and structural elements
 */
export class Scene {
    constructor(game) {
        this.game = game;
    }

    async init() {
        this._createGround();
        this._createTerrain();
        this._createStream();
        this._createBoundaries();
    }

    _createGround() {
        // Main ground plane with grass texture
        const groundSize = 100;

        const geometry = new THREE.PlaneGeometry(groundSize, groundSize, 50, 50);
        geometry.rotateX(-Math.PI / 2);

        // Add subtle height variation
        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            // Gentle rolling hills
            vertices[i + 1] = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.5;
        }
        geometry.computeVertexNormals();

        // Art Bible: Alien desert palette - sandy orange ground
        const material = new THREE.MeshStandardMaterial({
            color: 0xD4A574, // Sandy/tan based on Art Bible #FFB27D
            roughness: 0.9,
            metalness: 0.0,
        });

        const ground = new THREE.Mesh(geometry, material);
        ground.receiveShadow = true;
        ground.position.y = -0.1;

        this.game.scene.add(ground);
    }

    _createTerrain() {
        // Add some rocks and terrain features

        // Large rocks scattered around
        const rockPositions = [
            { x: -15, z: 10, scale: 2 },
            { x: 20, z: -8, scale: 1.5 },
            { x: -25, z: -15, scale: 2.5 },
            { x: 12, z: 20, scale: 1.8 },
            { x: -8, z: 25, scale: 1.2 },
            { x: 30, z: 5, scale: 2.2 },
        ];

        for (const pos of rockPositions) {
            const rock = this._createRock(pos.scale);
            rock.position.set(pos.x, 0, pos.z);
            rock.rotation.y = Math.random() * Math.PI * 2;
            this.game.scene.add(rock);
        }

        // Small stone clusters
        for (let i = 0; i < 20; i++) {
            const stone = this._createStone();
            stone.position.set(
                (Math.random() - 0.5) * 70,
                0,
                (Math.random() - 0.5) * 70
            );
            stone.rotation.y = Math.random() * Math.PI * 2;
            this.game.scene.add(stone);
        }
    }

    _createRock(scale) {
        const geometry = new THREE.DodecahedronGeometry(1, 1);

        // Distort vertices for natural look
        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i] *= 0.8 + Math.random() * 0.4;
            vertices[i + 1] *= 0.6 + Math.random() * 0.4;
            vertices[i + 2] *= 0.8 + Math.random() * 0.4;
        }
        geometry.computeVertexNormals();

        // Art Bible: Dark brownish-red rocks #7A5153 / #6A3A44
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

        // Flatten and distort
        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i] *= 0.7 + Math.random() * 0.6;
            vertices[i + 1] *= 0.5;
            vertices[i + 2] *= 0.7 + Math.random() * 0.6;
        }
        geometry.computeVertexNormals();

        // Art Bible: Darker stone color #6A3A44
        const material = new THREE.MeshStandardMaterial({
            color: 0x6A3A44,
            roughness: 0.9,
        });

        const stone = new THREE.Mesh(geometry, material);
        stone.castShadow = true;

        return stone;
    }

    _createStream() {
        // Create a small stream on one side

        const streamPath = new THREE.CurvePath();

        // Define stream path
        const points = [
            new THREE.Vector3(-40, 0, -20),
            new THREE.Vector3(-30, 0, -15),
            new THREE.Vector3(-25, 0, -5),
            new THREE.Vector3(-28, 0, 5),
            new THREE.Vector3(-35, 0, 15),
            new THREE.Vector3(-40, 0, 25),
        ];

        for (let i = 0; i < points.length - 1; i++) {
            const curve = new THREE.LineCurve3(points[i], points[i + 1]);
            streamPath.add(curve);
        }

        // Stream water
        const streamWidth = 3;
        const streamGeometry = new THREE.PlaneGeometry(streamWidth, 50, 10, 50);
        streamGeometry.rotateX(-Math.PI / 2);

        // Art Bible: Cyan/teal water #7EFFD0 / #538084
        const streamMaterial = new THREE.MeshStandardMaterial({
            color: 0x7EFFD0,
            roughness: 0.1,
            metalness: 0.3,
            transparent: true,
            opacity: 0.7,
        });

        const stream = new THREE.Mesh(streamGeometry, streamMaterial);
        stream.position.set(-32, 0.05, 0);
        stream.receiveShadow = true;

        this.game.scene.add(stream);

        // Stream banks - darker earth tone
        const bankMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B6914, // Darker sand/earth
            roughness: 0.95,
        });

        // Left bank
        const leftBankGeometry = new THREE.PlaneGeometry(2, 50, 5, 25);
        leftBankGeometry.rotateX(-Math.PI / 2);
        const leftBank = new THREE.Mesh(leftBankGeometry, bankMaterial);
        leftBank.position.set(-34.5, 0.1, 0);
        this.game.scene.add(leftBank);

        // Right bank
        const rightBankGeometry = new THREE.PlaneGeometry(2, 50, 5, 25);
        rightBankGeometry.rotateX(-Math.PI / 2);
        const rightBank = new THREE.Mesh(rightBankGeometry, bankMaterial);
        rightBank.position.set(-29.5, 0.1, 0);
        this.game.scene.add(rightBank);
    }

    _createBoundaries() {
        // Create subtle boundary markers (fence posts, hedges)

        // Fence posts around perimeter
        const postMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.9,
        });

        const bounds = 38;
        const spacing = 8;

        for (let x = -bounds; x <= bounds; x += spacing) {
            // North fence
            const northPost = this._createFencePost();
            northPost.position.set(x, 0, bounds);
            this.game.scene.add(northPost);

            // South fence
            const southPost = this._createFencePost();
            southPost.position.set(x, 0, -bounds);
            this.game.scene.add(southPost);
        }

        for (let z = -bounds; z <= bounds; z += spacing) {
            // East fence
            const eastPost = this._createFencePost();
            eastPost.position.set(bounds, 0, z);
            this.game.scene.add(eastPost);

            // West fence (skip where stream is)
            if (z < -25 || z > 25) {
                const westPost = this._createFencePost();
                westPost.position.set(-bounds, 0, z);
                this.game.scene.add(westPost);
            }
        }
    }

    _createFencePost() {
        const group = new THREE.Group();

        // Post - Art Bible darker tone
        const postGeometry = new THREE.CylinderGeometry(0.1, 0.15, 1.5, 6);
        const postMaterial = new THREE.MeshStandardMaterial({
            color: 0x6A3A44, // Dark reddish-brown from Art Bible
            roughness: 0.9,
        });

        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.y = 0.75;
        post.castShadow = true;
        group.add(post);

        // Cap
        const capGeometry = new THREE.ConeGeometry(0.15, 0.2, 6);
        const cap = new THREE.Mesh(capGeometry, postMaterial);
        cap.position.y = 1.6;
        group.add(cap);

        return group;
    }
}
