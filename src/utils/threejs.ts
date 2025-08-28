import * as THREE from "three";

// Datos de productos realistas para inspección
const productTypes = [
    { name: 'APPLE', color: 0xff4444, defectRate: 0.15 },
    { name: 'BOTTLE', color: 0x4444ff, defectRate: 0.08 },
    { name: 'COOKIE', color: 0xffaa44, defectRate: 0.12 },
    { name: 'TOMATO', color: 0xff6644, defectRate: 0.20 }
];

const container = document.getElementById('three-hero');
if (!container) throw new Error('No se encontró el div #three-hero');
const width = container.clientWidth;
const height = container.clientHeight;

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(width, height);
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();

// Iluminación profesional desde arriba (como cámara industrial)
const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
mainLight.position.set(0, 15, 0); // Luz desde arriba
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
scene.add(mainLight);

// Luz de inspección desde arriba con efecto de escáner
const scannerLight = new THREE.SpotLight(0x00ffff, 2, 20, Math.PI * 0.15, 0.3);
scannerLight.position.set(0, 12, 0);
scannerLight.target.position.set(0, 0, 0);
scene.add(scannerLight);
scene.add(scannerLight.target);

// Cinta transportadora más realista
const conveyorGroup = new THREE.Group();
const conveyorBase = new THREE.Mesh(
    new THREE.BoxGeometry(20, 0.2, 3),
    new THREE.MeshStandardMaterial({
        color: 0x2c2c2c,
        roughness: 0.7,
        metalness: 0.3
    })
);
conveyorBase.receiveShadow = true;
conveyorGroup.add(conveyorBase);

// Líneas de la cinta para efecto de movimiento
for (let i = -10; i <= 10; i += 0.3) {
    const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, 2.8),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    line.position.set(i, 0.12, 0);
    conveyorGroup.add(line);
}
scene.add(conveyorGroup);

// Cámara de inspección lateral
const inspectionCameraGroup = new THREE.Group();

// Cuerpo principal de la cámara
const cameraBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.6, 1.2),
    new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.3,
        metalness: 0.7
    })
);
// Quitar sombra
cameraBody.castShadow = false;
inspectionCameraGroup.add(cameraBody);

// Lente de la cámara
const cameraLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.3, 0.4, 16),
    new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.1,
        metalness: 0.9
    })
);
cameraLens.rotation.z = Math.PI / 2;
cameraLens.position.set(-0.5, 0, 0);
// Quitar sombra
cameraLens.castShadow = false;
inspectionCameraGroup.add(cameraLens);

// Cristal del lente (mejorado para mayor realismo y visibilidad)
const lensGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.07, 32),
    new THREE.MeshPhysicalMaterial({
        color: 0x66aaff,
        transparent: true,
        opacity: 0.6,
        roughness: 0.05,
        metalness: 0.2,
        transmission: 1,
        ior: 1.5,
        thickness: 0.1,
        reflectivity: 0.8,
        clearcoat: 1,
        clearcoatRoughness: 0
    })
);
lensGlass.rotation.z = Math.PI / 2;
lensGlass.position.set(-0.7, 0, 0);
// Quitar sombra
lensGlass.castShadow = false;
inspectionCameraGroup.add(lensGlass);

// LED de estado
const statusLED = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 6),
    new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        emissive: 0x004400
    })
);
statusLED.position.set(0.3, 0.25, 0.5);
// Quitar sombra
statusLED.castShadow = false;
inspectionCameraGroup.add(statusLED);

// Soporte de la cámara
const cameraMount = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.15, 1.5, 8),
    new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.6,
        metalness: 0.4
    })
);
cameraMount.position.set(0, -1, 0);
// Quitar sombra
cameraMount.castShadow = false;
inspectionCameraGroup.add(cameraMount);

// Base del soporte
const mountBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.2, 0.6),
    new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.7,
        metalness: 0.3
    })
);
mountBase.position.set(0, -1.6, 0);
// Quitar sombra
mountBase.castShadow = false;
mountBase.receiveShadow = false;
inspectionCameraGroup.add(mountBase);

// Posicionar la cámara al lado de la banda
inspectionCameraGroup.position.set(3, 4.8, 0); // Movida a la derecha y más arriba
inspectionCameraGroup.rotation.y = -Math.PI / 6; // Rotación hacia la banda desde la derecha
scene.add(inspectionCameraGroup);

// Función para crear geometrías más definidas
function createProductGeometry(type: string) {
    switch (type) {
        case 'APPLE': {
            // Manzana más realista con forma ligeramente aplastada
            const appleGeo = new THREE.SphereGeometry(0.4, 16, 12);
            appleGeo.scale(1, 0.9, 1);
            return appleGeo;
        }
        case 'BOTTLE': {
            // Botella con formas más definidas
            const bottleGroup = new THREE.Group();
            const body = new THREE.CylinderGeometry(0.15, 0.2, 0.8, 12);
            const neck = new THREE.CylinderGeometry(0.08, 0.12, 0.3, 8);
            const cap = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 8);

            const bodyMesh = new THREE.Mesh(body);
            const neckMesh = new THREE.Mesh(neck);
            const capMesh = new THREE.Mesh(cap);

            neckMesh.position.y = 0.55;
            capMesh.position.y = 0.74;

            bottleGroup.add(bodyMesh, neckMesh, capMesh);
            return bottleGroup;
        }
        case 'COOKIE': {
            const cookieGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16);
            return cookieGeo;
        }
        // Galleta con textura
        case 'TOMATO': {
            // Tomate con forma más natural
            const tomatoGeo = new THREE.SphereGeometry(0.35, 12, 8);
            tomatoGeo.scale(1, 0.8, 1);
            return tomatoGeo;
        }
        default:
            return new THREE.BoxGeometry(0.4, 0.4, 0.4);
    }
}

// Sistema de productos mejorado
const products: any[] = [];

class Product {
    mesh: THREE.Mesh | THREE.Group;
    type: any;
    isDefective: boolean;
    detectionBox: THREE.LineSegments;
    labelSprite: THREE.Sprite;
    scanProgress: number;
    detected: boolean;
    scanBeam: THREE.Mesh;

    constructor(type: any, position: THREE.Vector3) {
        this.type = type;
        this.isDefective = Math.random() < type.defectRate;
        this.scanProgress = 0;
        this.detected = false;

        // Crear geometría definida
        const geometry = createProductGeometry(type.name);

        let material;
        if (geometry instanceof THREE.Group) {
            // Para objetos complejos como botellas
            this.mesh = geometry;
            this.mesh.children.forEach(child => {
                if (child instanceof THREE.Mesh) {
                    child.material = new THREE.MeshPhysicalMaterial({
                        color: this.isDefective ? 0xff3333 : type.color,
                        roughness: 0.3,
                        metalness: 0.1,
                        clearcoat: 0.5,
                        transparent: this.isDefective,
                        opacity: this.isDefective ? 0.8 : 1
                    });
                    child.castShadow = true;
                }
            });
        } else {
            // Para objetos simples
            material = new THREE.MeshPhysicalMaterial({
                color: this.isDefective ? 0xff3333 : type.color,
                roughness: 0.3,
                metalness: 0.1,
                clearcoat: 0.5,
                transparent: this.isDefective,
                opacity: this.isDefective ? 0.8 : 1
            });
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.castShadow = true;
        }

        this.mesh.position.copy(position);
        this.mesh.receiveShadow = true;
        scene.add(this.mesh);

        // Crear elementos de detección
        this.createDetectionBox();
        this.createLabel();
        this.createScanBeam();
    }

    createDetectionBox() {
        const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.8, 0.8, 0.8));
        const material = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0,
            linewidth: 3
        });
        this.detectionBox = new THREE.LineSegments(geometry, material);
        this.detectionBox.position.copy(this.mesh.position);
        this.detectionBox.position.y += 0.4;
        scene.add(this.detectionBox);
    }

    createLabel() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 400; // Más grande para mejor resolución
        canvas.height = 100;

        // Fondo con bordes redondeados
        context.fillStyle = this.isDefective ? 'rgba(117, 22, 22, 0.95)' : 'rgba(16, 99, 16, 0.95)';
        context.roundRect(5, 5, 390, 90, 10);
        context.fill();

        // Borde
        context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        context.lineWidth = 2;
        context.roundRect(5, 5, 390, 90, 10);
        context.stroke();

        // Texto principal más grande
        context.fillStyle = 'white';
        context.font = 'Bold 32px Arial';
        context.textAlign = 'center';
        context.fillText(this.type.name, 200, 38);

        // Estado
        context.font = 'Bold 32px Arial';
        context.fillText(
            this.isDefective ? 'DEFECTIVE' : 'OK',
            200, 70
        );

        // Agregar función roundRect si no existe
        if (!context.roundRect) {
            context.roundRect = function (x, y, w, h, r) {
                if (w < 2 * r) r = w / 2;
                if (h < 2 * r) r = h / 2;
                this.beginPath();
                this.moveTo(x + r, y);
                this.arcTo(x + w, y, x + w, y + h, r);
                this.arcTo(x + w, y + h, x, y + h, r);
                this.arcTo(x, y + h, x, y, r);
                this.arcTo(x, y, x + w, y, r);
                this.closePath();
                return this;
            };
        }

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0
        });

        this.labelSprite = new THREE.Sprite(material);
        this.labelSprite.scale.set(3, 0.75, 1); // Más grande
        this.labelSprite.position.copy(this.mesh.position);
        this.labelSprite.position.y += 2;
        scene.add(this.labelSprite);
    }

    createScanBeam() {
        // Rayo de escáner láser
        const beamGeo = new THREE.CylinderGeometry(0.02, 0.02, 2, 8);
        const beamMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0
        });
        this.scanBeam = new THREE.Mesh(beamGeo, beamMat);
        this.scanBeam.position.copy(this.mesh.position);
        this.scanBeam.position.y += 1;
        scene.add(this.scanBeam);
    }

    update(deltaTime: number) {
        // Movimiento en la cinta
        this.mesh.position.x += 0.015;
        this.detectionBox.position.x = this.mesh.position.x;
        this.labelSprite.position.x = this.mesh.position.x;
        this.scanBeam.position.x = this.mesh.position.x;

        // Rotación sutil del producto
        if (this.mesh instanceof THREE.Mesh) {
            this.mesh.rotation.y += 0.01;
        }

        // Zona de inspección (zona central)
        if (this.mesh.position.x > -1.5 && this.mesh.position.x < 1.5 && !this.detected) {
            this.scanProgress += deltaTime * 1.5;

            // Efecto de escáner láser
            this.scanBeam.material.opacity = Math.sin(this.scanProgress * 15) * 0.7 + 0.3;
            this.detectionBox.material.opacity = Math.sin(this.scanProgress * 10) * 0.8 + 0.2;
            this.detectionBox.material.color.setHex(
                this.isDefective ? 0xff4444 : 0x44ff44
            );

            // Luz de escáner sigue al objeto
            scannerLight.target.position.x = this.mesh.position.x;
            scannerLight.intensity = 2 + Math.sin(this.scanProgress * 20) * 1;

            if (this.scanProgress > 1.2) {
                this.detected = true;
                this.labelSprite.material.opacity = 1;
                this.detectionBox.material.opacity = 0.9;
                this.scanBeam.material.opacity = 0;
            }
        }

        // Remover cuando sale de la pantalla
        if (this.mesh.position.x > 12) {
            this.destroy();
            return false;
        }

        return true;
    }

    destroy() {
        scene.remove(this.mesh);
        scene.remove(this.detectionBox);
        scene.remove(this.labelSprite);
        scene.remove(this.scanBeam);
    }
}

// Cámara desde arriba (vista de inspección industrial)
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
camera.position.set(0, 10, 8); // Vista desde arriba y ligeramente hacia adelante
camera.lookAt(0, 0, 0);

let lastProductTime = 0;
const productInterval = 3000; // Nuevo producto cada 3 segundos

function animate() {
    requestAnimationFrame(animate);
    const time = Date.now();
    const deltaTime = 0.016; // ~60fps

    // Generar nuevos productos
    if (time - lastProductTime > productInterval) {
        const randomType = productTypes[Math.floor(Math.random() * productTypes.length)];
        const newProduct = new Product(randomType, new THREE.Vector3(-10, 0.3, 0));
        products.push(newProduct);
        lastProductTime = time;
    }

    // Actualizar productos existentes
    for (let i = products.length - 1; i >= 0; i--) {
        if (!products[i].update(deltaTime)) {
            products.splice(i, 1);
        }
    }

    // Movimiento sutil de la cinta (efecto visual)
    conveyorGroup.children.forEach((child, i) => {
        if (child !== conveyorBase) {
            child.position.x += 0.015;
            if (child.position.x > 10) {
                child.position.x = -10;
            }
        }
    });

    // Cámara con ligero movimiento de inspección
    camera.position.x = Math.sin(time * 0.0003) * 0.5;
    camera.lookAt(0, 0, 0);

    // Animación sutil de la cámara de inspección
    inspectionCameraGroup.rotation.y = Math.PI / 6 + Math.sin(time * 0.001) * 0.1;

    // LED parpadeante cuando hay productos en la zona de inspección
    const hasProductsInZone = products.some(product =>
        product.mesh.position.x > -1.5 && product.mesh.position.x < 1.5
    );

    // Verificaciones más robustas para el statusLED
    if (statusLED?.material && statusLED.material instanceof THREE.MeshBasicMaterial) {
        try {
            if (hasProductsInZone) {
                if (statusLED.material.emissive) statusLED.material.emissive.setHex(0x004400);
                if (statusLED.material.color) statusLED.material.color.setHex(0x00ff00);
                statusLED.scale.setScalar(1 + Math.sin(time * 0.01) * 0.2);
            } else {
                if (statusLED.material.emissive) statusLED.material.emissive.setHex(0x440000);
                if (statusLED.material.color) statusLED.material.color.setHex(0xff4400);
                statusLED.scale.setScalar(1);
            }
        } catch (error) {
            // Silenciar errores del LED para no interrumpir la animación
            console.warn('Error updating LED:', error);
        }
    }

    renderer.render(scene, camera);
}

animate();

// Responsividad
window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});