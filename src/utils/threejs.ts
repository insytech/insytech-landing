import * as THREE from "three";

/**
 * Insytech Vision - Industrial Quality Inspection Animation
 * Demuestra detección de objetos, defectos y OCR en tiempo real
 */

// Tipos de productos industriales para inspección - colores más brillantes
const productTypes = [
    { name: 'PCB', shape: 'box', color: 0x4CAF50, defectRate: 0.12, label: 'PCB-2847' },
    { name: 'GEAR', shape: 'cylinder', color: 0xB0B0B0, defectRate: 0.08, label: 'GR-1052' },
    { name: 'CHIP', shape: 'box', color: 0x5C6BC0, defectRate: 0.15, label: 'IC-7734' },
    { name: 'BOTTLE', shape: 'bottle', color: 0x42A5F5, defectRate: 0.18, label: 'BT-0923' },
    { name: 'BEARING', shape: 'torus', color: 0x90A4AE, defectRate: 0.10, label: 'BR-4455' }
];

// Estadísticas de la línea
const stats = {
    totalInspected: 0,
    okCount: 0,
    defectCount: 0,
    accuracy: 99.7
};

export default function ThreeHero() {
    if (typeof window === "undefined") return null;

    const container = document.getElementById('three-hero');
    if (!container) return null;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Renderer con efectos premium
    const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Fog muy sutil para profundidad (menos denso)
    scene.fog = new THREE.Fog(0x1a1a25, 25, 50);

    // ============================================
    // ILUMINACIÓN INDUSTRIAL PROFESIONAL
    // ============================================

    // Luz ambiental más brillante para ver mejor los productos
    const ambientLight = new THREE.AmbientLight(0x6688aa, 1.2);
    scene.add(ambientLight);

    // Luz principal desde arriba (spotlight industrial) - más brillante
    const mainSpot = new THREE.SpotLight(0xffffff, 4, 40, Math.PI * 0.35, 0.3, 1);
    mainSpot.position.set(0, 15, 5);
    mainSpot.castShadow = true;
    mainSpot.shadow.mapSize.width = 2048;
    mainSpot.shadow.mapSize.height = 2048;
    mainSpot.shadow.camera.near = 1;
    mainSpot.shadow.camera.far = 30;
    scene.add(mainSpot);

    // Luz frontal para iluminar productos
    const frontLight = new THREE.DirectionalLight(0xffffff, 1.5);
    frontLight.position.set(0, 8, 10);
    scene.add(frontLight);

    // Luz de relleno lateral azul (atmósfera tech) - más intensa
    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.8);
    fillLight.position.set(-8, 6, 8);
    scene.add(fillLight);

    // Luz de acento cálida - más intensa
    const accentLight = new THREE.DirectionalLight(0xffaa44, 0.5);
    accentLight.position.set(8, 5, -5);
    scene.add(accentLight);

    // ============================================
    // ZONA DE INSPECCIÓN (Scanner láser)
    // ============================================

    const scannerGroup = new THREE.Group();

    // Marco del escáner
    const frameGeometry = new THREE.BoxGeometry(3, 4, 0.15);
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        metalness: 0.8,
        roughness: 0.2
    });

    // Postes laterales - a los lados de la banda para que los productos no pasen a través
    const leftPost = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 4, 0.15),
        frameMaterial
    );
    leftPost.position.set(-1.5, 2, 1.6); // Movido al frente de la banda
    scannerGroup.add(leftPost);

    const rightPost = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 4, 0.15),
        frameMaterial
    );
    rightPost.position.set(-1.5, 2, -1.6); // Movido al fondo de la banda
    scannerGroup.add(rightPost);

    // Barra superior conectando los postes (perpendicular a la banda)
    const topBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.25, 3.4),
        frameMaterial
    );
    topBar.position.set(-1.5, 4, 0);
    scannerGroup.add(topBar);

    // Panel de luz LED en barra superior (efecto de escáner activo)
    const ledPanelGeometry = new THREE.PlaneGeometry(0.15, 3.2);
    const ledPanelMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const ledPanel = new THREE.Mesh(ledPanelGeometry, ledPanelMaterial);
    ledPanel.position.set(-1.5, 4, 0);
    ledPanel.rotation.x = Math.PI / 2;
    scannerGroup.add(ledPanel);

    // CORTINA LÁSER ROJA VERTICAL (estilo industrial real)
    // Plano vertical que cruza la banda transportadora - altura completa
    const laserCurtainGeometry = new THREE.PlaneGeometry(0.05, 4);
    const laserCurtainMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3333,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    const laserCurtain = new THREE.Mesh(laserCurtainGeometry, laserCurtainMaterial);
    laserCurtain.position.set(-1.5, 2, 0);
    laserCurtain.rotation.y = Math.PI / 2;
    scannerGroup.add(laserCurtain);

    // Líneas láser - van desde la barra superior hasta el suelo
    for (let z = -1.3; z <= 1.3; z += 0.25) {
        const beamLine = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.012, 4, 8),
            new THREE.MeshBasicMaterial({
                color: 0xff4444,
                transparent: true,
                opacity: 0.85
            })
        );
        beamLine.position.set(-1.5, 2, z); // Centrado en altura
        scannerGroup.add(beamLine);
    }

    // BARRA EMISORA superior (de donde salen los láseres)
    const laserEmitter = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.15, 3),
        new THREE.MeshStandardMaterial({
            color: 0x880000,
            metalness: 0.6,
            roughness: 0.3,
            emissive: 0x330000
        })
    );
    laserEmitter.position.set(-1.5, 4.0, 0);
    scannerGroup.add(laserEmitter);

    // LEDs en el emisor
    for (let z = -1.2; z <= 1.2; z += 0.4) {
        const emitterLed = new THREE.Mesh(
            new THREE.SphereGeometry(0.03, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        emitterLed.position.set(-1.5, 4.08, z);
        scannerGroup.add(emitterLed);
    }

    // BARRA RECEPTORA inferior (donde se reciben los láseres)
    const laserReceiver = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.1, 3),
        new THREE.MeshStandardMaterial({
            color: 0x333340,
            metalness: 0.5,
            roughness: 0.4
        })
    );
    laserReceiver.position.set(-1.5, -0.05, 0);
    scannerGroup.add(laserReceiver);

    // Luz roja de escaneo más intensa
    const scanLight = new THREE.PointLight(0xff3333, 3, 6);
    scanLight.position.set(-1.5, 2, 0);
    scannerGroup.add(scanLight);

    scannerGroup.position.set(0, 0, 0);
    scene.add(scannerGroup);

    // ============================================
    // CÁMARA INDUSTRIAL PRINCIPAL
    // ============================================

    const cameraGroup = new THREE.Group();

    // Cuerpo principal de la cámara (más grande y detallado)
    const camBodyGeo = new THREE.BoxGeometry(1.2, 0.8, 1.5);
    const camBodyMat = new THREE.MeshStandardMaterial({
        color: 0x2a2a3a,
        metalness: 0.7,
        roughness: 0.3
    });
    const camBody = new THREE.Mesh(camBodyGeo, camBodyMat);
    cameraGroup.add(camBody);

    // Detalle frontal
    const camFront = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.6, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x1a1a25, metalness: 0.8, roughness: 0.2 })
    );
    camFront.position.set(0, 0, -0.8);
    cameraGroup.add(camFront);

    // Lente principal (más prominente)
    const lensHousing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.4, 0.6, 24),
        new THREE.MeshStandardMaterial({ color: 0x1a1a25, metalness: 0.9, roughness: 0.1 })
    );
    lensHousing.rotation.x = Math.PI / 2;
    lensHousing.position.set(0, 0, -1.1);
    cameraGroup.add(lensHousing);

    // Cristal del lente con reflejo
    const lensGlass = new THREE.Mesh(
        new THREE.CircleGeometry(0.3, 32),
        new THREE.MeshPhysicalMaterial({
            color: 0x88ccff,
            metalness: 0.1,
            roughness: 0.0,
            transmission: 0.5,
            thickness: 0.1,
            clearcoat: 1.0,
            reflectivity: 1.0
        })
    );
    lensGlass.position.set(0, 0, -1.42);
    cameraGroup.add(lensGlass);

    // Anillo de LEDs alrededor del lente (guardamos referencia para animación)
    const ledRingGeo = new THREE.TorusGeometry(0.38, 0.04, 8, 32);
    const ledRingMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const ledRing = new THREE.Mesh(ledRingGeo, ledRingMat);
    ledRing.position.set(0, 0, -1.4);
    cameraGroup.add(ledRing);

    // LEDs indicadores en el cuerpo
    const led1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    led1.position.set(0.4, 0.3, -0.74);
    cameraGroup.add(led1);

    const led2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x0088ff })
    );
    led2.position.set(0.5, 0.3, -0.74);
    cameraGroup.add(led2);

    // Soporte de montaje - conecta cámara con barra superior
    const mountArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.8, 12),
        new THREE.MeshStandardMaterial({ color: 0x3a3a4a, metalness: 0.6, roughness: 0.4 })
    );
    mountArm.position.set(0, 0.6, 0);
    cameraGroup.add(mountArm);

    // Base de montaje sobre la barra
    const mountBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.08, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x2a2a3a, metalness: 0.7, roughness: 0.3 })
    );
    mountBase.position.set(0, 1.0, 0);
    cameraGroup.add(mountBase);

    // Cable de la cámara - sale hacia atrás
    const cableCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0.4, 0.2, 0.5),
        new THREE.Vector3(1.0, 0.5, 1.0),
        new THREE.Vector3(1.5, 0, 1.5)
    );
    const cableGeo = new THREE.TubeGeometry(cableCurve, 20, 0.025, 8, false);
    const cable = new THREE.Mesh(
        cableGeo,
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 })
    );
    cameraGroup.add(cable);

    // Posicionar cámara sobre la cortina láser
    cameraGroup.position.set(-1.5, 4.5, 0); // Ahora sobre la cortina (x=-1.5)
    cameraGroup.rotation.x = Math.PI / 4; // Inclinada hacia abajo mirando productos
    scene.add(cameraGroup);

    // ============================================
    // CINTA TRANSPORTADORA PREMIUM
    // ============================================

    const conveyorGroup = new THREE.Group();

    // Base metálica de la cinta - color más claro
    const conveyorBase = new THREE.Mesh(
        new THREE.BoxGeometry(25, 0.3, 3),
        new THREE.MeshStandardMaterial({
            color: 0x4a4a55,
            metalness: 0.5,
            roughness: 0.5
        })
    );
    conveyorBase.position.y = -0.15;
    conveyorBase.receiveShadow = true;
    conveyorGroup.add(conveyorBase);

    // Superficie de la cinta - gris más claro para contraste
    const beltSurface = new THREE.Mesh(
        new THREE.BoxGeometry(24, 0.05, 2.6),
        new THREE.MeshStandardMaterial({
            color: 0x3a3a45,
            metalness: 0.2,
            roughness: 0.6
        })
    );
    beltSurface.position.y = 0.02;
    beltSurface.receiveShadow = true;
    conveyorGroup.add(beltSurface);

    // Líneas de la cinta para efecto de movimiento - más visibles
    const beltLines: THREE.Mesh[] = [];
    for (let i = -12; i <= 12; i += 0.4) {
        const line = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.04, 2.4),
            new THREE.MeshStandardMaterial({ color: 0x505060 })
        );
        line.position.set(i, 0.06, 0);
        beltLines.push(line);
        conveyorGroup.add(line);
    }

    // Rieles laterales
    const railMaterial = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        metalness: 0.4,
        roughness: 0.5
    });

    const leftRail = new THREE.Mesh(
        new THREE.BoxGeometry(25, 0.2, 0.15),
        railMaterial
    );
    leftRail.position.set(0, 0.1, 1.4);
    conveyorGroup.add(leftRail);

    const rightRail = new THREE.Mesh(
        new THREE.BoxGeometry(25, 0.2, 0.15),
        railMaterial
    );
    rightRail.position.set(0, 0.1, -1.4);
    conveyorGroup.add(rightRail);

    // Rodillos en los extremos
    for (let x of [-12, 12]) {
        const roller = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.25, 3.2, 16),
            new THREE.MeshStandardMaterial({ color: 0x4a4a55, metalness: 0.7, roughness: 0.3 })
        );
        roller.rotation.x = Math.PI / 2;
        roller.position.set(x, 0, 0);
        conveyorGroup.add(roller);
    }

    scene.add(conveyorGroup);

    // ============================================
    // SISTEMA DE PRODUCTOS
    // ============================================

    const products: Product[] = [];

    class Product {
        mesh: THREE.Group;
        type: typeof productTypes[0];
        isDefective: boolean;
        boundingBox: THREE.LineSegments | null = null;
        label: THREE.Sprite | null = null;
        detected: boolean = false;
        scanProgress: number = 0;

        constructor(type: typeof productTypes[0], position: THREE.Vector3) {
            this.type = type;
            this.isDefective = Math.random() < type.defectRate;
            this.mesh = new THREE.Group();

            // Crear geometría según tipo
            let geometry: THREE.BufferGeometry;
            switch (type.shape) {
                case 'box':
                    geometry = new THREE.BoxGeometry(0.5, 0.3, 0.6);
                    break;
                case 'cylinder':
                    geometry = new THREE.CylinderGeometry(0.25, 0.25, 0.4, 16);
                    break;
                case 'torus':
                    geometry = new THREE.TorusGeometry(0.25, 0.08, 8, 24);
                    break;
                case 'bottle':
                    geometry = new THREE.CylinderGeometry(0.12, 0.18, 0.7, 12);
                    break;
                default:
                    geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
            }

            const material = new THREE.MeshStandardMaterial({
                color: type.color,
                metalness: 0.3,
                roughness: 0.5
            });

            const productMesh = new THREE.Mesh(geometry, material);
            productMesh.castShadow = true;
            productMesh.receiveShadow = true;

            // Añadir defecto visual si es defectuoso
            if (this.isDefective) {
                const defectGeo = new THREE.SphereGeometry(0.08, 8, 8);
                const defectMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
                const defect = new THREE.Mesh(defectGeo, defectMat);
                defect.position.set(
                    (Math.random() - 0.5) * 0.3,
                    0.15,
                    (Math.random() - 0.5) * 0.3
                );
                this.mesh.add(defect);
            }

            this.mesh.add(productMesh);
            this.mesh.position.copy(position);
            scene.add(this.mesh);
        }

        createDetectionUI() {
            // Bounding box
            const boxGeo = new THREE.BoxGeometry(0.8, 0.6, 0.8);
            const edges = new THREE.EdgesGeometry(boxGeo);
            const lineMat = new THREE.LineBasicMaterial({
                color: this.isDefective ? 0xff4444 : 0x44ff44,
                transparent: true,
                opacity: 0
            });
            this.boundingBox = new THREE.LineSegments(edges, lineMat);
            this.boundingBox.position.copy(this.mesh.position);
            this.boundingBox.position.y += 0.2;
            scene.add(this.boundingBox);

            // Label
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            canvas.width = 256;
            canvas.height = 80;

            // Fondo con gradiente
            const gradient = ctx.createLinearGradient(0, 0, 256, 0);
            if (this.isDefective) {
                gradient.addColorStop(0, 'rgba(180, 40, 40, 0.95)');
                gradient.addColorStop(1, 'rgba(120, 20, 20, 0.95)');
            } else {
                gradient.addColorStop(0, 'rgba(30, 120, 50, 0.95)');
                gradient.addColorStop(1, 'rgba(20, 80, 30, 0.95)');
            }
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(4, 4, 248, 72, 8);
            ctx.fill();

            // Borde
            ctx.strokeStyle = this.isDefective ? '#ff6666' : '#66ff66';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(4, 4, 248, 72, 8);
            ctx.stroke();

            // Texto del tipo y código
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(this.type.label, 16, 32);

            // Estado
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(this.isDefective ? 'DEFECT' : 'OK', 240, 32);

            // Confidence
            const confidence = (95 + Math.random() * 4.5).toFixed(1);
            ctx.font = '14px monospace';
            ctx.fillStyle = '#aaffaa';
            ctx.textAlign = 'left';
            ctx.fillText(`Conf: ${confidence}%`, 16, 58);

            // Tipo
            ctx.textAlign = 'right';
            ctx.fillStyle = '#aaaaff';
            ctx.fillText(this.type.name, 240, 58);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 0,
                depthTest: false // Asegurar que siempre se vea
            });
            this.label = new THREE.Sprite(spriteMat);
            this.label.scale.set(2.2, 0.7, 1); // Escala más compacta
            this.label.position.copy(this.mesh.position);
            this.label.position.y += 1.2; // Más cercano al producto
            this.label.position.z += 0.5; // Hacia la cámara
            scene.add(this.label);
        }

        update(deltaTime: number): boolean {
            // Mover en la cinta
            this.mesh.position.x += 0.02;
            if (this.boundingBox) this.boundingBox.position.x = this.mesh.position.x;
            if (this.label) this.label.position.x = this.mesh.position.x;

            // Rotación sutil
            this.mesh.rotation.y += 0.005;

            // Zona de inspección
            if (this.mesh.position.x > -1.2 && this.mesh.position.x < 1.2) {
                if (!this.detected) {
                    this.scanProgress += deltaTime * 2;

                    // Crear UI al entrar a la zona
                    if (this.scanProgress > 0.3 && !this.boundingBox) {
                        this.createDetectionUI();
                    }

                    // Fade in del bounding box
                    if (this.boundingBox && this.boundingBox.material instanceof THREE.LineBasicMaterial) {
                        this.boundingBox.material.opacity = Math.min(this.scanProgress, 0.9);
                    }

                    // Mostrar label
                    if (this.scanProgress > 0.8) {
                        this.detected = true;
                        if (this.label && this.label.material instanceof THREE.SpriteMaterial) {
                            this.label.material.opacity = 1;
                        }

                        // Actualizar estadísticas
                        stats.totalInspected++;
                        if (this.isDefective) {
                            stats.defectCount++;
                        } else {
                            stats.okCount++;
                        }
                    }
                }
            }

            // Eliminar cuando sale
            if (this.mesh.position.x > 14) {
                this.destroy();
                return false;
            }

            return true;
        }

        destroy() {
            scene.remove(this.mesh);
            if (this.boundingBox) scene.remove(this.boundingBox);
            if (this.label) scene.remove(this.label);
        }
    }

    // ============================================
    // CÁMARA PERSPECTIVA
    // ============================================

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(4, 6, 8);
    camera.lookAt(0, 1, 0);

    // ============================================
    // ANIMACIÓN PRINCIPAL
    // ============================================

    let lastProductTime = 0;
    const productInterval = 2500;
    let time = 0;

    function animate() {
        requestAnimationFrame(animate);
        time += 0.016;

        const now = Date.now();

        // Generar productos
        if (now - lastProductTime > productInterval) {
            const type = productTypes[Math.floor(Math.random() * productTypes.length)];
            const product = new Product(type, new THREE.Vector3(-13, 0.25, 0));
            products.push(product);
            lastProductTime = now;
        }

        // Actualizar productos
        for (let i = products.length - 1; i >= 0; i--) {
            if (!products[i].update(0.016)) {
                products.splice(i, 1);
            }
        }

        // Animar líneas de la cinta
        beltLines.forEach(line => {
            line.position.x += 0.02;
            if (line.position.x > 12) {
                line.position.x = -12;
            }
        });

        // Animar cortina láser (pulsación sutil)
        laserCurtainMaterial.opacity = 0.7 + Math.sin(time * 6) * 0.2;

        // Detectar si hay productos en la zona del escáner
        const hasProductsInZone = products.some(p => p.mesh.position.x > -2 && p.mesh.position.x < -1);

        // Parpadeo del LED ring cuando detecta productos
        if (hasProductsInZone) {
            // Parpadeo rápido verde cuando detecta
            const blinkIntensity = Math.sin(time * 15) > 0 ? 0x00ff00 : 0x00aa00;
            ledRingMat.color.setHex(blinkIntensity);
            // Luz del escáner más intensa
            scanLight.intensity = 3 + Math.sin(time * 10) * 1;
        } else {
            // Verde fijo cuando está en espera
            ledRingMat.color.setHex(0x004400);
            scanLight.intensity = 1.5;
        }

        // LED panel pulsating rojo
        ledPanelMaterial.opacity = 0.2 + Math.sin(time * 4) * 0.15;

        // Movimiento sutil de la cámara
        camera.position.x = 4 + Math.sin(time * 0.3) * 0.5;
        camera.position.y = 6 + Math.sin(time * 0.4) * 0.3;
        camera.lookAt(0, 1, 0);

        renderer.render(scene, camera);
    }

    animate();

    // Responsividad
    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    });

    return null;
}