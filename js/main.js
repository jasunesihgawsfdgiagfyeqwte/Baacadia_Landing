/**
 * ═══════════════════════════════════════════════════════════════
 * BAACADIA Landing Page - Main JavaScript
 * WebGL Scene + Scroll Animations + Loading States
 * ═══════════════════════════════════════════════════════════════
 */

(function() {
    'use strict';

    // ─────────────────────────────────────────────────────────────────
    // CONFIGURATION
    // ─────────────────────────────────────────────────────────────────
    const CONFIG = {
        maxPixelRatio: 2,
        particleCount: { desktop: 50, mobile: 20 },
        cloudfenCount: { desktop: 8, mobile: 4 },
        bobSpeed: { min: 0.8, max: 1.2 },
        rotateSpeed: { min: 0.08, max: 0.12 },
        jumpHeight: { min: 0.15, max: 0.25 },
        initialPosition: { 
            desktop: { x: 0, y: 1, z: 12 },
            mobile: { x: 0, y: 0.5, z: 14 }  // 移动端相机拉远一点，降低一点
        },
        scrollInfluence: { y: 4, z: 5 },
        modelScale: 1.0,
        // 移动端相机FOV更宽以看到更多内容
        fov: { desktop: 60, mobile: 75 }
    };

    // Colors (Baacadia Art Bible - NO greens, alien desert)
    const COLORS = {
        skyPeach: 0xf5d5c8,
        skyLavender: 0xc8b8c0,
        sand: 0xd4a574,
        cloudfenWhite: 0xf8f8f5,
        cloudfenFace: 0x2a2525,
        ink: 0x2a2420
    };

    // ─────────────────────────────────────────────────────────────────
    // STATE
    // ─────────────────────────────────────────────────────────────────
    let scene, camera, renderer;
    let scrollY = 0, targetScrollY = 0;
    let cloudfens = [];
    let loadedModel = null;
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || window.innerWidth < 768;

    // ─────────────────────────────────────────────────────────────────
    // RESPONSIVE POSITIONS - 根据屏幕尺寸调整羊的位置
    // ─────────────────────────────────────────────────────────────────
    function getCloudfenPositions() {
        // 移动端：更小、更分散的布局
        if (isMobile) {
            return [
                { x: -3.2, y: -0.8, scale: 0.75 },   // 左下
                { x: 3.0, y: -0.5, scale: 0.7 },    // 右下
                { x: -1.2, y: -1.8, scale: 0.85 },  // 中左（最近）
                { x: 1.8, y: -1.5, scale: 0.8 },    // 中右
                { x: -2.5, y: 0.8, scale: 0.55 },   // 左上（远处）
                { x: 2.8, y: 1.0, scale: 0.5 },     // 右上（远处）
            ];
        }
        
        // 桌面端使用原始布局
        return [
            { x: -5.5, y: -0.3, scale: 1.1 },
            { x: 5.5, y: -0.5, scale: 1.15 },
            { x: -2.5, y: -1.5, scale: 1.3 },
            { x: 3.0, y: -1.3, scale: 1.25 },
            { x: -3.5, y: 0.8, scale: 0.85 },
            { x: 4.0, y: 0.6, scale: 0.8 },
        ];
    }

    // ─────────────────────────────────────────────────────────────────
    // GRADIENT TEXTURE FOR TOON SHADING
    // ─────────────────────────────────────────────────────────────────
    function createGradientTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 4;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#c0c0c0'; ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = '#e0e0e0'; ctx.fillRect(1, 0, 1, 1);
        ctx.fillStyle = '#f0f0f0'; ctx.fillRect(2, 0, 1, 1);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(3, 0, 1, 1);
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        return texture;
    }

    // ─────────────────────────────────────────────────────────────────
    // SCENE INITIALIZATION
    // ─────────────────────────────────────────────────────────────────
    function initScene() {
        const canvas = document.getElementById('webgl-canvas');
        if (!canvas) return false;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(COLORS.skyPeach);
        scene.fog = new THREE.Fog(COLORS.skyPeach, 15, 60);

        // 根据设备选择FOV
        const fov = isMobile ? CONFIG.fov.mobile : CONFIG.fov.desktop;
        camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // 根据设备选择相机位置
        const camPos = isMobile ? CONFIG.initialPosition.mobile : CONFIG.initialPosition.desktop;
        camera.position.set(camPos.x, camPos.y, camPos.z);

        renderer = new THREE.WebGLRenderer({ 
            canvas, 
            antialias: !isMobile, 
            alpha: true, 
            powerPreference: 'high-performance' 
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.maxPixelRatio));
        renderer.sortObjects = true;

        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
        dirLight.position.set(5, 10, 7);
        scene.add(dirLight);
        const fillLight = new THREE.DirectionalLight(0xffe4d6, 0.3);
        fillLight.position.set(-3, -5, 2);
        scene.add(fillLight);

        // Load model
        loadCloudfenModel();

        window.addEventListener('resize', onResize, { passive: true });
        window.addEventListener('scroll', onScroll, { passive: true });

        animate();
        return true;
    }

    // ─────────────────────────────────────────────────────────────────
    // MODEL LOADING
    // ─────────────────────────────────────────────────────────────────
    function loadCloudfenModel() {
        const loader = new THREE.GLTFLoader();
        
        loader.load(
            'sheep.glb',
            (gltf) => {
                console.log('Model loaded!', gltf);
                loadedModel = gltf.scene;
                applyMaterials(loadedModel);
                createCloudfens();
                createParticles();
                createMountains();
                hideLoading();
            },
            (progress) => {
                if (progress.total > 0) {
                    const pct = Math.round((progress.loaded / progress.total) * 100);
                    updateLoadingText('Loading Cloudfens... ' + pct + '%');
                }
            },
            (error) => {
                console.error('Model load error:', error);
                // Fallback to procedural cloudfens
                createProceduralCloudfens();
                createParticles();
                createMountains();
                hideLoading();
            }
        );
    }

    // ─────────────────────────────────────────────────────────────────
    // MATERIAL APPLICATION
    // ─────────────────────────────────────────────────────────────────
    function applyMaterials(model) {
        const gradientMap = createGradientTexture();
        
        const woolMat = new THREE.MeshToonMaterial({
            color: 0xffffff,
            gradientMap: gradientMap
        });
        
        const darkMat = new THREE.MeshToonMaterial({
            color: 0x1a1a1a,
            gradientMap: gradientMap
        });

        const meshes = [];
        model.traverse((child) => {
            if (child.isMesh) {
                meshes.push(child);
            }
        });
        
        console.log('Found', meshes.length, 'meshes in model');
        
        meshes.forEach((mesh, index) => {
            const name = mesh.name.toLowerCase();
            const isWhitePart = name.includes('wool');
            mesh.material = isWhitePart ? woolMat : darkMat;
            console.log('Mesh', index, ':', mesh.name, '->', isWhitePart ? 'WHITE' : 'BLACK');
        });
        
        console.log('Materials applied!');
    }

    // ─────────────────────────────────────────────────────────────────
    // CLOUDFEN CREATION (GLB Model)
    // ─────────────────────────────────────────────────────────────────
    function createCloudfens() {
        if (!loadedModel) {
            createProceduralCloudfens();
            return;
        }
        
        applyMaterials(loadedModel);
        
        const count = isMobile ? CONFIG.cloudfenCount.mobile : CONFIG.cloudfenCount.desktop;
        const positions = getCloudfenPositions();
        
        // Shuffle positions
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }
        
        const tempCloudfens = [];
        
        for (let i = 0; i < Math.min(count, positions.length); i++) {
            const cf = loadedModel.clone();
            const pos = positions[i];
            
            const x = pos.x + (Math.random() - 0.5) * 0.3;
            const y = pos.y + (Math.random() - 0.5) * 0.2;
            const z = -y * 1.5 + 3;
            const scale = pos.scale + (Math.random() - 0.5) * 0.1;
            const rotY = (Math.random() - 0.5) * Math.PI;
            
            cf.position.set(x, y, z);
            cf.rotation.y = rotY;
            cf.scale.setScalar(CONFIG.modelScale * scale);
            
            cf.userData = {
                baseY: y,
                baseX: x,
                baseZ: z,
                phaseOffset: Math.random() * Math.PI * 2,
                bobSpeed: CONFIG.bobSpeed.min + Math.random() * (CONFIG.bobSpeed.max - CONFIG.bobSpeed.min),
                rotateSpeed: CONFIG.rotateSpeed.min + Math.random() * (CONFIG.rotateSpeed.max - CONFIG.rotateSpeed.min),
                jumpHeight: CONFIG.jumpHeight.min + Math.random() * (CONFIG.jumpHeight.max - CONFIG.jumpHeight.min),
                baseRotY: rotY,
                spinDirection: Math.random() > 0.5 ? 1 : -1
            };
            
            tempCloudfens.push(cf);
        }
        
        // Sort by Y - render top sheep first (further away)
        tempCloudfens.sort((a, b) => b.position.y - a.position.y);
        
        tempCloudfens.forEach((cf) => {
            cloudfens.push(cf);
            scene.add(cf);
        });
        
        console.log('Created', cloudfens.length, 'cloudfens from model!');
    }

    // ─────────────────────────────────────────────────────────────────
    // PROCEDURAL CLOUDFEN FALLBACK
    // ─────────────────────────────────────────────────────────────────
    function createProceduralCloudfens() {
        const count = isMobile ? 4 : 6;
        const gradientMap = createGradientTexture();
        const woolMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap });
        const darkMat = new THREE.MeshToonMaterial({ color: 0x1a1a1a, gradientMap });
        const outlineMat = new THREE.MeshBasicMaterial({ color: COLORS.ink, side: THREE.BackSide });
        
        const positions = getCloudfenPositions();
        
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }
        
        const tempCloudfens = [];
        
        for (let i = 0; i < Math.min(count, positions.length); i++) {
            const pos = positions[i];
            const group = new THREE.Group();

            // Body
            const bodyGeo = new THREE.IcosahedronGeometry(0.7, 1);
            const body = new THREE.Mesh(bodyGeo, woolMat);
            const bodyOut = new THREE.Mesh(bodyGeo, outlineMat.clone());
            bodyOut.scale.setScalar(1.05);
            group.add(bodyOut, body);

            // Head
            const headGeo = new THREE.SphereGeometry(0.28, 8, 8);
            const head = new THREE.Mesh(headGeo, darkMat);
            head.position.set(0.55, 0.22, 0);
            const headOut = new THREE.Mesh(headGeo, outlineMat.clone());
            headOut.position.copy(head.position);
            headOut.scale.setScalar(1.08);
            group.add(headOut, head);

            // Eyes
            const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
            eye1.position.set(0.75, 0.28, 0.1);
            const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
            eye2.position.set(0.75, 0.28, -0.1);
            group.add(eye1, eye2);

            // Ears
            const earGeo = new THREE.ConeGeometry(0.1, 0.3, 3);
            const ear1 = new THREE.Mesh(earGeo, darkMat);
            ear1.position.set(0.5, 0.5, 0.15);
            ear1.rotation.set(0.3, 0, -0.5);
            const ear2 = new THREE.Mesh(earGeo, darkMat);
            ear2.position.set(0.5, 0.5, -0.15);
            ear2.rotation.set(-0.3, 0, -0.5);
            group.add(ear1, ear2);

            // Legs
            const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.35, 6);
            [[-0.25, -0.55, 0.22], [-0.25, -0.55, -0.22], [0.25, -0.55, 0.22], [0.25, -0.55, -0.22]].forEach(p => {
                const leg = new THREE.Mesh(legGeo, darkMat);
                leg.position.set(p[0], p[1], p[2]);
                group.add(leg);
            });

            const x = pos.x + (Math.random() - 0.5) * 0.3;
            const y = pos.y + (Math.random() - 0.5) * 0.2;
            const z = -y * 1.5 + 3;
            const scale = pos.scale + (Math.random() - 0.5) * 0.1;
            const rotY = (Math.random() - 0.5) * Math.PI;

            group.position.set(x, y, z);
            group.rotation.y = rotY;
            group.scale.setScalar(scale * 1.5);
            
            group.userData = {
                baseY: y,
                baseX: x,
                baseZ: z,
                phaseOffset: Math.random() * Math.PI * 2,
                bobSpeed: CONFIG.bobSpeed.min + Math.random() * (CONFIG.bobSpeed.max - CONFIG.bobSpeed.min),
                rotateSpeed: CONFIG.rotateSpeed.min + Math.random() * (CONFIG.rotateSpeed.max - CONFIG.rotateSpeed.min),
                jumpHeight: CONFIG.jumpHeight.min + Math.random() * (CONFIG.jumpHeight.max - CONFIG.jumpHeight.min),
                baseRotY: rotY,
                spinDirection: Math.random() > 0.5 ? 1 : -1
            };
            
            tempCloudfens.push(group);
        }
        
        tempCloudfens.sort((a, b) => b.position.y - a.position.y);
        tempCloudfens.forEach((cf) => {
            cloudfens.push(cf);
            scene.add(cf);
        });
        
        console.log('Created', cloudfens.length, 'procedural cloudfens');
    }

    // ─────────────────────────────────────────────────────────────────
    // MOUNTAINS
    // ─────────────────────────────────────────────────────────────────
    function createMountains() {
        const mat = new THREE.MeshBasicMaterial({ 
            color: COLORS.skyLavender, 
            transparent: true, 
            opacity: 0.6 
        });
        
        const m1 = new THREE.Mesh(new THREE.ConeGeometry(8, 6, 4), mat);
        m1.position.set(-12, -2, -20);
        m1.scale.set(1.5, 1, 1);
        
        const m2 = new THREE.Mesh(new THREE.ConeGeometry(6, 5, 4), mat.clone());
        m2.position.set(10, -2.5, -18);
        
        const m3 = new THREE.Mesh(new THREE.ConeGeometry(10, 4, 4), mat.clone());
        m3.material.opacity = 0.4;
        m3.position.set(0, -3, -25);
        m3.scale.set(2, 1, 1);
        
        scene.add(m1, m2, m3);
    }

    // ─────────────────────────────────────────────────────────────────
    // PARTICLES
    // ─────────────────────────────────────────────────────────────────
    function createParticles() {
        const count = isMobile ? CONFIG.particleCount.mobile : CONFIG.particleCount.desktop;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 25;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const particles = new THREE.Points(geo, new THREE.PointsMaterial({
            color: COLORS.sand,
            size: 0.06,
            transparent: true,
            opacity: 0.5
        }));
        particles.name = 'particles';
        scene.add(particles);
    }

    // ─────────────────────────────────────────────────────────────────
    // EVENT HANDLERS
    // ─────────────────────────────────────────────────────────────────
    function onResize() {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function onScroll() {
        const max = document.body.scrollHeight - window.innerHeight;
        targetScrollY = max > 0 ? window.scrollY / max : 0;
    }

    // ─────────────────────────────────────────────────────────────────
    // ANIMATION LOOP
    // ─────────────────────────────────────────────────────────────────
    function animate() {
        requestAnimationFrame(animate);
        const time = performance.now() * 0.001;

        scrollY += (targetScrollY - scrollY) * 0.05;

        cloudfens.forEach(cf => {
            const d = cf.userData;
            if (!d) return;
            
            // Gentle bobbing
            const bobPhase = time * d.bobSpeed + d.phaseOffset;
            const bobValue = Math.sin(bobPhase);
            cf.position.y = d.baseY + bobValue * d.jumpHeight;
            
            // Subtle side-to-side sway
            cf.position.x = d.baseX + Math.sin(time * 0.2 + d.phaseOffset) * 0.1;
            
            // Slow gentle rotation
            const spinDir = d.spinDirection || 1;
            cf.rotation.y = d.baseRotY + Math.sin(time * d.rotateSpeed * spinDir) * 0.4;
            
            // Tiny tilt for life
            cf.rotation.z = Math.sin(bobPhase) * 0.03;
        });

        if (!isMobile) {
            const p = scene.getObjectByName('particles');
            if (p) {
                p.rotation.y = time * 0.015;
                const arr = p.geometry.attributes.position.array;
                for (let i = 0; i < arr.length; i += 3) {
                    arr[i + 1] += Math.sin(time + i) * 0.0008;
                }
                p.geometry.attributes.position.needsUpdate = true;
            }
        }

        // 使用设备对应的初始位置
        const initPos = isMobile ? CONFIG.initialPosition.mobile : CONFIG.initialPosition.desktop;
        camera.position.y = initPos.y - scrollY * CONFIG.scrollInfluence.y;
        camera.position.z = initPos.z - scrollY * CONFIG.scrollInfluence.z;
        camera.lookAt(0, scrollY * -2, -5);

        renderer.render(scene, camera);
    }

    // ─────────────────────────────────────────────────────────────────
    // LOADING STATE
    // ─────────────────────────────────────────────────────────────────
    function updateLoadingText(text) {
        const el = document.querySelector('.loading-text');
        if (el) el.textContent = text;
    }

    function hideLoading() {
        const loading = document.querySelector('.loading');
        if (loading) {
            loading.classList.add('hidden');
            setTimeout(() => loading.remove(), 600);
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // SCROLL REVEAL
    // ─────────────────────────────────────────────────────────────────
    function initScrollReveal() {
        const reveals = document.querySelectorAll('.reveal');
        if (!reveals.length) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add('visible');
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
        
        reveals.forEach(el => observer.observe(el));
    }

    // ─────────────────────────────────────────────────────────────────
    // INITIALIZATION
    // ─────────────────────────────────────────────────────────────────
    function init() {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (!reducedMotion) {
            initScene();
        } else {
            const canvas = document.getElementById('webgl-canvas');
            if (canvas) canvas.style.display = 'none';
            hideLoading();
        }

        initScrollReveal();
        console.log('BAACADIA Landing initialized | Mobile:', isMobile);
    }

    // DOM Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();