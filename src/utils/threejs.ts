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

// Momento del último disparo de la cámara: alimenta el destello del piloto
let lastCaptureAt = -Infinity;

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
    // ponytail: antialias solo en pantallas grandes; en móvil cuesta y no se nota
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: isDesktop,
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

    // Fog para difuminar los extremos de la cinta. Su color TIENE que ser el del
    // fondo de la banda, que se invierte con el tema: #211915 en claro, blanco en
    // oscuro. Si no, la bruma aparece como una franja del color contrario.
    const bandColor = () => document.documentElement.classList.contains('dark') ? 0xffffff : 0x211915;
    const fog = new THREE.Fog(bandColor(), 13, 30);
    scene.fog = fog;

    new MutationObserver(() => {
        fog.color.setHex(bandColor());
        renderer.render(scene, camera);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

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
        opacity: 0.3,
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
                opacity: 0.4
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
    const scanLight = new THREE.PointLight(0xff3333, 1.8, 6);
    scanLight.position.set(-1.5, 2, 0);
    scannerGroup.add(scanLight);

    scannerGroup.position.set(0, 0, 0);
    scene.add(scannerGroup);

    // ============================================
    // CELDA DE INSPECCIÓN
    // Estructura de perfil de aluminio ranurado, como las celdas reales: el perfil
    // no es una caja lisa, se reconoce por la ranura clara que corre por su cara.
    // Sostiene la iluminación, la cámara y la torreta andon.
    // ============================================

    const cabinGroup = new THREE.Group();

    const anodizedMat = new THREE.MeshStandardMaterial({ color: 0x33363b, metalness: 0.55, roughness: 0.45 });
    const grooveMat = new THREE.MeshStandardMaterial({ color: 0xb7bdc4, metalness: 0.85, roughness: 0.22 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x8f959d, metalness: 0.8, roughness: 0.3 });

    const PROFILE = 0.2;   // sección del perfil (40x40 a escala de la escena)
    const CABIN_H = 4.1;
    const CABIN_FLOOR = -1.05;   // el piso está más abajo que la cinta: las patas bajan hasta ahí
    const CABIN_BASE_Y = -0.85;  // marco de base POR DEBAJO de la banda, si no choca con las piezas
    const CABIN_X = [-4.6, 1.6];
    const CABIN_Z = [-1.95, 1.95];

    /**
     * Tramo de perfil ranurado. `axis` es la dirección en la que corre el tramo;
     * las ranuras se dibujan sobre las dos caras perpendiculares que se ven.
     */
    function profileBeam(length: number, axis: 'x' | 'y' | 'z'): THREE.Group {
        const beam = new THREE.Group();
        const size = (a: 'x' | 'y' | 'z') => (a === axis ? length : PROFILE);
        beam.add(new THREE.Mesh(new THREE.BoxGeometry(size('x'), size('y'), size('z')), anodizedMat));

        const g = PROFILE * 0.34;                 // ancho de la ranura
        const off = PROFILE / 2 + 0.002;          // apenas por fuera de la cara
        const faces: Array<[number, number, number, number, number, number]> = axis === 'y'
            ? [[0, 0, off, g, length * 0.97, 0.01], [off, 0, 0, 0.01, length * 0.97, g]]
            : axis === 'x'
                ? [[0, off, 0, length * 0.97, 0.01, g], [0, 0, off, length * 0.97, g, 0.01]]
                : [[0, off, 0, g, 0.01, length * 0.97], [off, 0, 0, 0.01, g, length * 0.97]];
        for (const [px, py, pz, sx, sy, sz] of faces) {
            const groove = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), grooveMat);
            groove.position.set(px, py, pz);
            beam.add(groove);
        }
        return beam;
    }

    // Postes
    for (const x of CABIN_X) {
        for (const z of CABIN_Z) {
            const post = profileBeam(CABIN_H - CABIN_FLOOR, 'y');
            post.position.set(x, (CABIN_H + CABIN_FLOOR) / 2, z);
            cabinGroup.add(post);

            // Pata niveladora, apoyada en el piso
            const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.12, 12), steelMat);
            foot.position.set(x, CABIN_FLOOR + 0.06, z);
            cabinGroup.add(foot);
        }
    }

    // Marco superior y travesaños de base (los de abajo atan la estructura al suelo)
    for (const y of [CABIN_H, CABIN_BASE_Y]) {
        for (const z of CABIN_Z) {
            const beam = profileBeam(6.2 + PROFILE, 'x');
            beam.position.set(-1.5, y, z);
            cabinGroup.add(beam);
        }
        for (const x of CABIN_X) {
            const beam = profileBeam(3.9 + PROFILE, 'z');
            beam.position.set(x, y, 0);
            cabinGroup.add(beam);
        }
    }

    // Escuadras de esquina: el detalle que quita el aire de dibujo de líneas
    for (const x of CABIN_X) {
        for (const z of CABIN_Z) {
            for (const [dx, dz] of [[Math.sign(-1.5 - x) * 0.42, 0], [0, Math.sign(-z) * 0.42]]) {
                const gusset = new THREE.Mesh(new THREE.BoxGeometry(dx ? 0.5 : 0.1, 0.5, dz ? 0.5 : 0.1), steelMat);
                gusset.position.set(x + dx / 2, CABIN_H - 0.3, z + dz / 2);
                gusset.rotation.z = dx ? Math.PI / 4 : 0;
                gusset.rotation.x = dz ? Math.PI / 4 : 0;
                cabinGroup.add(gusset);
            }
        }
    }

    // Riostras de esquina en la cara de atrás: dos, simétricas. Una diagonal larga
    // sola rompía la simetría del fondo y cruzaba la zona de inspección.
    for (const x of CABIN_X) {
        const dir = Math.sign(-1.5 - x);
        const cornerBrace = profileBeam(1.55, 'y');
        cornerBrace.position.set(x + dir * 0.55, CABIN_H - 0.55, CABIN_Z[0]);
        cornerBrace.rotation.z = dir * (Math.PI / 4);
        cabinGroup.add(cornerBrace);
    }

    // Acrílico SOLO en la cara de atrás: cierra el fondo de la celda y deja libres
    // los laterales, que es por donde entra y sale el producto.
    const backPanel = new THREE.Mesh(
        new THREE.PlaneGeometry(6.2, CABIN_H - CABIN_BASE_Y - 0.3),
        new THREE.MeshPhysicalMaterial({
            color: 0xc8e6f2, metalness: 0, roughness: 0.06, transmission: 0.9,
            thickness: 0.35, transparent: true, opacity: 0.14, side: THREE.DoubleSide,
            depthWrite: false
        })
    );
    backPanel.position.set(-1.5, (CABIN_H + CABIN_BASE_Y) / 2, CABIN_Z[0] + 0.02);
    cabinGroup.add(backPanel);

    // Acrílicos laterales: bajan del techo solo hasta media altura, para que el
    // producto entre y salga por el hueco de abajo.
    const sideGlassTop = CABIN_H;
    const sideGlassBottom = (CABIN_H + CABIN_BASE_Y) / 2;
    for (const x of CABIN_X) {
        const side = new THREE.Mesh(
            new THREE.PlaneGeometry(3.9, sideGlassTop - sideGlassBottom),
            new THREE.MeshPhysicalMaterial({
                color: 0xc8e6f2, metalness: 0, roughness: 0.06, transmission: 0.9,
                thickness: 0.35, transparent: true, opacity: 0.14, side: THREE.DoubleSide,
                depthWrite: false
            })
        );
        side.rotation.y = Math.PI / 2;
        side.position.set(x + Math.sign(-1.5 - x) * 0.02, (sideGlassTop + sideGlassBottom) / 2, 0);
        cabinGroup.add(side);

        // Canto inferior del panel
        const edge = profileBeam(3.9, 'z');
        edge.scale.set(0.5, 0.5, 1);
        edge.position.set(x, sideGlassBottom, 0);
        cabinGroup.add(edge);
    }

    // Faldón de aluminio al frente: cierra el bajo de la celda, del marco de base
    // hasta justo debajo de la banda, para que se lea como cabina y no como pórtico.
    const skirtTop = 0.2;   // a la altura del riel amarillo de la banda
    const frontSkirt = new THREE.Mesh(
        new THREE.BoxGeometry(6.2, skirtTop - CABIN_BASE_Y, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x9ba1a9, metalness: 0.8, roughness: 0.42 })
    );
    frontSkirt.position.set(-1.5, (skirtTop + CABIN_BASE_Y) / 2, CABIN_Z[1] - 0.02);
    cabinGroup.add(frontSkirt);

    // Travesaño que remata el faldón por arriba
    const skirtRail = profileBeam(6.2 + PROFILE, 'x');
    skirtRail.position.set(-1.5, skirtTop + PROFILE / 2, CABIN_Z[1]);
    cabinGroup.add(skirtRail);

    // Acrílico frontal: del techo a media altura, como los laterales. Va más
    // transparente que los otros porque queda entre el observador y la escena.
    const frontGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(6.2, CABIN_H - (CABIN_H + CABIN_BASE_Y) / 2),
        new THREE.MeshPhysicalMaterial({
            color: 0xc8e6f2, metalness: 0, roughness: 0.05, transmission: 0.94,
            thickness: 0.3, transparent: true, opacity: 0.07, side: THREE.DoubleSide,
            // Sin esto el panel escribe profundidad y recorta los láseres de detrás.
            depthWrite: false
        })
    );
    frontGlass.position.set(-1.5, (CABIN_H + (CABIN_H + CABIN_BASE_Y) / 2) / 2, CABIN_Z[1] - 0.02);
    cabinGroup.add(frontGlass);

    const frontGlassEdge = profileBeam(6.2, 'x');
    frontGlassEdge.scale.set(1, 0.5, 0.5);
    frontGlassEdge.position.set(-1.5, (CABIN_H + CABIN_BASE_Y) / 2, CABIN_Z[1] - 0.02);
    cabinGroup.add(frontGlassEdge);

    // Techo: panel claro con canto de perfil
    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(6.1, 0.05, 3.8),
        new THREE.MeshStandardMaterial({ color: 0xd8dce1, metalness: 0.3, roughness: 0.75 })
    );
    roof.position.set(-1.5, CABIN_H + 0.11, 0);
    cabinGroup.add(roof);

    // Luminarias: carcasa oscura con lente encendido, no una barra blanca suelta
    for (const z of [-1.15, 1.15]) {
        const housing = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.16, 0.22), anodizedMat);
        housing.position.set(-1.5, CABIN_H - 0.26, z);
        cabinGroup.add(housing);

        const lens = new THREE.Mesh(
            new THREE.BoxGeometry(5.0, 0.06, 0.16),
            new THREE.MeshBasicMaterial({ color: 0xf4f9ff })
        );
        lens.position.set(-1.5, CABIN_H - 0.35, z);
        cabinGroup.add(lens);

        for (const sx of [-2.6, 2.6]) {
            const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.12), steelMat);
            clamp.position.set(-1.5 + sx, CABIN_H - 0.14, z);
            cabinGroup.add(clamp);
        }

        const barLight = new THREE.RectAreaLight(0xffffff, 3, 5.0, 0.3);
        barLight.position.set(-1.5, CABIN_H - 0.4, z);
        barLight.lookAt(-1.5, 0, z);
        cabinGroup.add(barLight);
    }

    // Torreta andon: poste, domo ámbar y capucha, sobre su caja de conexión
    const andonX = 0.75;
    const andonBase = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.34), anodizedMat);
    andonBase.position.set(andonX, CABIN_H + 0.21, 0);
    cabinGroup.add(andonBase);

    const andonPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.34, 12), steelMat);
    andonPole.position.set(andonX, CABIN_H + 0.45, 0);
    cabinGroup.add(andonPole);

    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff8a00, transparent: true, opacity: 0.9 });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), beaconMat);
    beacon.position.set(andonX, CABIN_H + 0.62, 0);
    cabinGroup.add(beacon);

    const beaconCap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.1, 20), steelMat);
    beaconCap.position.set(andonX, CABIN_H + 0.87, 0);
    cabinGroup.add(beaconCap);

    const beaconLight = new THREE.PointLight(0xff8a00, 1.4, 4);
    beaconLight.position.set(andonX, CABIN_H + 0.62, 0);
    cabinGroup.add(beaconLight);

    // Gabinete de control montado en el poste derecho: inoxidable, con selector,
    // piloto verde y paro de emergencia.
    const panelX = 1.72;
    const panel = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 1.15, 0.85),
        new THREE.MeshStandardMaterial({ color: 0xc3c8ce, metalness: 0.85, roughness: 0.28 })
    );
    panel.position.set(panelX, 1.9, 0.5);
    cabinGroup.add(panel);

    const panelDoor = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 1.0, 0.72),
        new THREE.MeshStandardMaterial({ color: 0xd9dee3, metalness: 0.7, roughness: 0.35 })
    );
    panelDoor.position.set(panelX + 0.08, 1.9, 0.5);
    cabinGroup.add(panelDoor);

    const pilot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12),
        new THREE.MeshBasicMaterial({ color: 0x2bd96b })
    );
    pilot.rotation.z = Math.PI / 2;
    pilot.position.set(panelX + 0.11, 2.2, 0.62);
    cabinGroup.add(pilot);

    const selector = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.05, 12),
        new THREE.MeshStandardMaterial({ color: 0x2b2f34, metalness: 0.6, roughness: 0.4 })
    );
    selector.rotation.z = Math.PI / 2;
    selector.position.set(panelX + 0.11, 2.2, 0.4);
    cabinGroup.add(selector);

    const eStopBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16),
        new THREE.MeshStandardMaterial({ color: 0xf2c200, metalness: 0.3, roughness: 0.6 })
    );
    eStopBase.rotation.z = Math.PI / 2;
    eStopBase.position.set(panelX + 0.11, 1.78, 0.5);
    cabinGroup.add(eStopBase);

    const eStop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.06, 16),
        new THREE.MeshStandardMaterial({ color: 0xd42020, metalness: 0.2, roughness: 0.5 })
    );
    eStop.rotation.z = Math.PI / 2;
    eStop.position.set(panelX + 0.15, 1.78, 0.5);
    cabinGroup.add(eStop);

    scene.add(cabinGroup);

    // ============================================
    // CÁMARA INDUSTRIAL PRINCIPAL
    // Cuerpo maquinado de dos tonos con disipador, barril de lente escalonado con
    // anillo de foco, iluminador anular segmentado y conectores M12.
    // ============================================

    const cameraGroup = new THREE.Group();

    const camShellMat = new THREE.MeshStandardMaterial({ color: 0xa7aeb6, metalness: 0.9, roughness: 0.24 });
    const camDarkMat = new THREE.MeshStandardMaterial({ color: 0x2b2f35, metalness: 0.7, roughness: 0.38 });
    const camLensMat = new THREE.MeshStandardMaterial({ color: 0x1b1e23, metalness: 0.85, roughness: 0.18 });

    // Cuerpo: bloque claro con franja oscura arriba, para que no se lea como una caja
    const camBody = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.62, 1.35), camShellMat);
    cameraGroup.add(camBody);

    const camTopBand = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.16, 1.37), camDarkMat);
    camTopBand.position.set(0, 0.31, 0);
    cameraGroup.add(camTopBand);

    // Disipador: aletas en el lomo
    for (let i = -4; i <= 4; i++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.1, 0.05), camShellMat);
        fin.position.set(0, 0.42, i * 0.13);
        cameraGroup.add(fin);
    }

    // Frente: placa oscura embutida
    const camFront = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.5, 0.08), camDarkMat);
    camFront.position.set(0, 0, -0.7);
    cameraGroup.add(camFront);

    // Barril escalonado: montura, cuerpo del lente y anillo de foco
    const lensMount = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.14, 24), camDarkMat);
    lensMount.rotation.x = Math.PI / 2;
    lensMount.position.set(0, 0, -0.8);
    cameraGroup.add(lensMount);

    const lensHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.85, 24), camLensMat);
    lensHousing.rotation.x = Math.PI / 2;
    lensHousing.position.set(0, 0, -1.28);
    cameraGroup.add(lensHousing);

    const focusRing = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.16, 24), camShellMat);
    focusRing.rotation.x = Math.PI / 2;
    focusRing.position.set(0, 0, -1.32);
    cameraGroup.add(focusRing);

    const lensHood = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.25, 0.2, 24, 1, true), camDarkMat);
    lensHood.rotation.x = Math.PI / 2;
    lensHood.position.set(0, 0, -1.78);
    cameraGroup.add(lensHood);

    const lensGlass = new THREE.Mesh(
        new THREE.CircleGeometry(0.22, 32),
        new THREE.MeshPhysicalMaterial({
            color: 0x6fb7d8, metalness: 0.1, roughness: 0.02,
            transmission: 0.55, thickness: 0.1, clearcoat: 1, reflectivity: 1
        })
    );
    lensGlass.position.set(0, 0, -1.74);
    cameraGroup.add(lensGlass);

    // Iluminador anular segmentado. Su color lo anima el bucle: verde fijo en
    // espera, parpadeo cuando hay pieza en la zona.
    const ledRingMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.04), ledRingMat);
        seg.position.set(Math.cos(a) * 0.35, Math.sin(a) * 0.35, -1.86);
        seg.rotation.z = a;
        cameraGroup.add(seg);
    }
    const ringShroud = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.4, 0.08, 28, 1, true), camDarkMat);
    ringShroud.rotation.x = Math.PI / 2;
    ringShroud.position.set(0, 0, -1.84);
    cameraGroup.add(ringShroud);

    // Conectores M12 atrás
    for (const x of [-0.24, 0.24]) {
        const conn = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 12), camDarkMat);
        conn.rotation.x = Math.PI / 2;
        conn.position.set(x, -0.08, 0.78);
        cameraGroup.add(conn);
    }

    // Placa de montaje y rótula donde entra el soporte
    const camPlate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.6), camDarkMat);
    camPlate.position.set(0, 0.4, 0.1);
    cameraGroup.add(camPlate);

    const camKnuckle = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), camShellMat);
    camKnuckle.position.set(0, 0.5, 0.1);
    cameraGroup.add(camKnuckle);

    // Piloto de captura: destella cuando la cámara dispara sobre una pieza.
    const captureLedMat = new THREE.MeshBasicMaterial({ color: 0x1d6b38 });
    const captureLed = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), captureLedMat);
    captureLed.position.set(0.51, 0.12, -0.35);
    cameraGroup.add(captureLed);

    const captureGlow = new THREE.PointLight(0x2bd96b, 0, 1.6);
    captureGlow.position.set(0.62, 0.12, -0.35);
    cameraGroup.add(captureGlow);

    const LED_DIM = new THREE.Color(0x1d6b38);
    const LED_BRIGHT = new THREE.Color(0x8dffb4);

    // OJO: en un Group, lookAt() apunta el eje +Z al objetivo (el -Z solo aplica a
    // camaras y luces), y el lente de este modelo esta en -Z. Por eso se mira al
    // punto OPUESTO al de inspeccion: asi el lente queda apuntando a la pieza.
    const camPos = new THREE.Vector3(-3.85, 2.5, 1.35);
    const camTarget = new THREE.Vector3(-1.5, 0.75, 0.2);
    cameraGroup.position.copy(camPos);
    cameraGroup.scale.setScalar(0.5);
    cameraGroup.lookAt(camPos.clone().multiplyScalar(2).sub(camTarget));

    // Brazo que la sujeta al perfil de la cabina
    const camBracket = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.5, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.7, roughness: 0.35 })
    );
    camBracket.position.set(-3.85, 3.35, 1.35);
    scene.add(camBracket);

    scene.add(cameraGroup);

    // ============================================
    // CINTA TRANSPORTADORA PREMIUM
    // ============================================

    const conveyorGroup = new THREE.Group();

    // Base metálica de la cinta - color más claro
    const conveyorBase = new THREE.Mesh(
        new THREE.BoxGeometry(46, 0.3, 3),
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
        new THREE.BoxGeometry(45, 0.05, 2.6),
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
    for (let i = -22; i <= 22; i += 0.4) {
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
        new THREE.BoxGeometry(46, 0.2, 0.15),
        railMaterial
    );
    leftRail.position.set(0, 0.1, 1.4);
    conveyorGroup.add(leftRail);

    const rightRail = new THREE.Mesh(
        new THREE.BoxGeometry(46, 0.2, 0.15),
        railMaterial
    );
    rightRail.position.set(0, 0.1, -1.4);
    conveyorGroup.add(rightRail);

    // Rodillos en los extremos
    for (let x of [-22, 22]) {
        const roller = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.25, 3.2, 16),
            new THREE.MeshStandardMaterial({ color: 0x4a4a55, metalness: 0.7, roughness: 0.3 })
        );
        roller.rotation.x = Math.PI / 2;
        roller.position.set(x, 0, 0);
        conveyorGroup.add(roller);
    }

    // ── Bastidor de la cinta ─────────────────────────────────────────────────
    // Sin esto la banda parece flotar: patas de perfil hasta el piso, largueros
    // longitudinales que las atan y crucetas por pareja.
    const CONVEYOR_UNDER = -0.32;                 // cara inferior del cajón
    const LEG_Z = [-1.05, 1.05];
    const legLength = CONVEYOR_UNDER - CABIN_FLOOR;

    for (let x = -20; x <= 20; x += 5) {
        for (const z of LEG_Z) {
            const leg = profileBeam(legLength, 'y');
            leg.position.set(x, CABIN_FLOOR + legLength / 2, z);
            conveyorGroup.add(leg);

            const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.1, 12), steelMat);
            foot.position.set(x, CABIN_FLOOR + 0.05, z);
            conveyorGroup.add(foot);
        }

        // Cruceta que une la pareja de patas
        const crossBar = profileBeam(LEG_Z[1] - LEG_Z[0], 'z');
        crossBar.scale.set(0.7, 0.7, 1);
        crossBar.position.set(x, CABIN_FLOOR + legLength * 0.35, 0);
        conveyorGroup.add(crossBar);
    }

    // Largueros inferiores a lo largo de toda la cinta
    for (const z of LEG_Z) {
        const stringer = profileBeam(46, 'x');
        stringer.scale.set(1, 0.8, 0.8);
        stringer.position.set(0, CABIN_FLOOR + 0.34, z);
        conveyorGroup.add(stringer);
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

                        lastCaptureAt = performance.now();

                        // El registro del hero se escribe desde aqui: un renglon
                        // por pieza que termina de cruzar la cortina laser.
                        document.dispatchEvent(new CustomEvent('insytech:verdict', {
                            detail: { label: this.type.label, ok: !this.isDefective }
                        }));

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
            if (this.mesh.position.x > 20) {
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

    // Vista lateral baja: la banda es un rectangulo muy ancho a sangre, asi que
    // la camara se acuesta en vez de mirar desde arriba como en la tarjeta.
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(2, 3.1, 10.4);
    camera.lookAt(0, 1.75, 0);

    // ============================================
    // ANIMACIÓN PRINCIPAL
    // ============================================

    let lastProductTime = 0;
    const productInterval = 2500;
    let time = 0;

    let rafId = 0;

    function animate() {
        rafId = requestAnimationFrame(animate);
        time += 0.016;

        const now = Date.now();

        // Generar productos
        if (now - lastProductTime > productInterval) {
            const type = productTypes[Math.floor(Math.random() * productTypes.length)];
            const product = new Product(type, new THREE.Vector3(-20, 0.25, 0));
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
            if (line.position.x > 22) {
                line.position.x = -22;
            }
        });

        // Animar cortina láser (pulsación sutil)
        laserCurtainMaterial.opacity = 0.32 + Math.sin(time * 6) * 0.1;

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

        // Piloto de captura: destello corto tras cada disparo
        const flash = Math.max(0, 1 - (performance.now() - lastCaptureAt) / 420);
        captureLedMat.color.lerpColors(LED_DIM, LED_BRIGHT, flash);
        captureGlow.intensity = flash * 1.6;

        // Baliza: destello que barre
        const sweep = (Math.sin(time * 2.4) + 1) / 2;
        beaconMat.opacity = 0.45 + sweep * 0.5;
        beaconLight.intensity = 0.5 + sweep * 1.8;

        // LED panel pulsating rojo
        ledPanelMaterial.opacity = 0.2 + Math.sin(time * 4) * 0.15;

        // Movimiento sutil de la cámara
        camera.position.x = 2 + Math.sin(time * 0.3) * 0.3;
        camera.position.y = 3.1 + Math.sin(time * 0.4) * 0.12;
        camera.lookAt(0, 1.75, 0);

        renderer.render(scene, camera);
    }

    // Bajo reduced-motion se pinta un solo frame: la escena se ve, pero la
    // línea no corre. Con movimiento permitido, el bucle solo gira mientras el
    // canvas está en pantalla — si no, seguiría renderizando a 60 fps con el
    // visitante seis secciones más abajo.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        renderer.render(scene, camera);
    } else {
        let playing = false;
        const play = () => {
            if (playing) return;
            playing = true;
            animate();
        };
        const pause = () => {
            if (!playing) return;
            playing = false;
            cancelAnimationFrame(rafId);
        };
        new IntersectionObserver(([entry]) => {
            entry.isIntersecting ? play() : pause();
        }).observe(container);
    }

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