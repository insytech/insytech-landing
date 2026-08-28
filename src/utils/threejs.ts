import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Insytech Vision - Industrial Quality Inspection Animation
 * Demuestra detección de objetos, defectos y OCR en tiempo real
 */

// Tipos de productos industriales para inspección - colores más brillantes
const productTypes = [
    { name: 'PCB', shape: 'box', color: 0x4CAF50, defectRate: 0.12, label: 'PCB-2847' },
    { name: 'GEAR', shape: 'cylinder', color: 0xd2d7dc, defectRate: 0.08, label: 'GR-1052' },
    { name: 'CHIP', shape: 'box', color: 0x5C6BC0, defectRate: 0.15, label: 'IC-7734' },
    { name: 'BOTTLE', shape: 'bottle', color: 0x42A5F5, defectRate: 0.18, label: 'BT-0923' },
    { name: 'BEARING', shape: 'torus', color: 0xb9c4cd, defectRate: 0.10, label: 'BR-4455' }
];

// Momento del último disparo de la cámara y su veredicto: alimentan el destello
// del piloto y la pantalla de la estación de inspección.
let lastCaptureAt = -Infinity;
let lastVerdictOk = true;
let pusherFiredAt = -Infinity;

// Estadísticas de la línea
const stats = {
    totalInspected: 0,
    okCount: 0,
    defectCount: 0
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

    // Sin mapa de entorno un material metálico no tiene nada que reflejar y sale
    // negro. Este entorno de estudio es lo que permite usar metalness reales.
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.38;
    pmrem.dispose();

    // Fog para difuminar los extremos de la cinta. Su color TIENE que ser el del
    // fondo de la banda, que se invierte con el tema: #211915 en claro, blanco en
    // oscuro. Si no, la bruma aparece como una franja del color contrario.
    const bandColor = () => document.documentElement.classList.contains('dark') ? 0xffffff : 0x211915;
    const fog = new THREE.Fog(bandColor(), 13, 30);
    scene.fog = fog;

    new MutationObserver(() => {
        fog.color.setHex(bandColor());
        paintAcrylics();
        renderer.render(scene, camera);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // ============================================
    // ILUMINACIÓN INDUSTRIAL PROFESIONAL
    // ============================================

    // Luz ambiental más brillante para ver mejor los productos
    const ambientLight = new THREE.AmbientLight(0x6688aa, 0.45);
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

    // El relleno lateral y el acento cálido los aporta ahora el mapa de entorno:
    // dos direccionales menos que evaluar por fragmento.

    // ============================================
    // ZONA DE INSPECCIÓN (Scanner láser)
    // ============================================

    // Altura de la celda: la comparten el escáner (para que la cortina llegue al
    // perfil superior) y la propia estructura de la cabina.
    const CABIN_H = 4.75;
    const CURTAIN_H = CABIN_H - 0.14;   // del perfil superior a la banda

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
    ledPanel.position.set(-1.5, CURTAIN_H, 0);
    ledPanel.rotation.x = Math.PI / 2;
    scannerGroup.add(ledPanel);

    // CORTINA LÁSER ROJA VERTICAL (estilo industrial real)
    // Plano vertical que cruza la banda transportadora - altura completa
    const laserCurtainGeometry = new THREE.PlaneGeometry(0.05, CURTAIN_H);
    const laserCurtainMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3333,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const laserCurtain = new THREE.Mesh(laserCurtainGeometry, laserCurtainMaterial);
    laserCurtain.position.set(-1.5, CURTAIN_H / 2, 0);
    laserCurtain.rotation.y = Math.PI / 2;
    scannerGroup.add(laserCurtain);

    // Líneas láser - van desde la barra superior hasta el suelo
    for (let z = -1.3; z <= 1.3; z += 0.25) {
        const beamLine = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.012, CURTAIN_H, 8),
            new THREE.MeshBasicMaterial({
                color: 0xff4444,
                transparent: true,
                opacity: 0.4
            })
        );
        beamLine.position.set(-1.5, CURTAIN_H / 2, z); // Centrado en altura
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
    laserEmitter.position.set(-1.5, CURTAIN_H, 0);
    scannerGroup.add(laserEmitter);

    // LEDs del emisor, en una sola malla instanciada
    const emitterLeds = new THREE.InstancedMesh(
        new THREE.SphereGeometry(0.03, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff0000 }),
        7
    );
    {
        const m = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        const one = new THREE.Vector3(1, 1, 1);
        for (let i = 0; i < 7; i++) {
            const pos = new THREE.Vector3(-1.5, CURTAIN_H + 0.08, -1.2 + i * 0.4);
            emitterLeds.setMatrixAt(i, m.compose(pos, q, one));
        }
    }
    scannerGroup.add(emitterLeds);

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
    scanLight.position.set(-1.5, CURTAIN_H / 2, 0);
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
    const CABIN_FLOOR = -1.05;   // el piso está más abajo que la cinta: las patas bajan hasta ahí
    const CABIN_BASE_Y = -0.85;  // marco de base POR DEBAJO de la banda, si no choca con las piezas
    const CABIN_X = [-4.6, 1.6];
    const CABIN_Z = [-1.95, 1.95];

    // Los acrílicos se pintan según el fondo de la banda: sobre el fondo oscuro
    // basta un velo azulado, pero sobre la banda blanca del tema oscuro ese velo
    // desaparece, así que ahí se vuelven grises y algo más densos.
    const acrylics: Array<{ mat: THREE.MeshPhysicalMaterial; base: number }> = [];

    function makeAcrylic(baseOpacity: number): THREE.MeshPhysicalMaterial {
        const mat = new THREE.MeshPhysicalMaterial({
            color: 0xc8e6f2, metalness: 0, roughness: 0.06, transmission: 0.9,
            thickness: 0.35, transparent: true, side: THREE.DoubleSide,
            // Sin esto el panel escribe profundidad y recorta los láseres de detrás.
            depthWrite: false
        });
        acrylics.push({ mat, base: baseOpacity });
        return mat;
    }

    function paintAcrylics(): void {
        const overWhite = document.documentElement.classList.contains('dark');
        for (const { mat, base } of acrylics) {
            mat.color.setHex(overWhite ? 0x8b9299 : 0xc8e6f2);
            mat.opacity = overWhite ? base * 2.4 : base;
        }
    }

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
        makeAcrylic(0.14)
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
            makeAcrylic(0.14)
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
        makeAcrylic(0.10)
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

        // Solo la barra frontal aporta luz real: las de área son las más caras
        // del render y con dos el resultado era casi idéntico.
        if (z > 0) {
            const barLight = new THREE.RectAreaLight(0xffffff, 5, 5.0, 0.3);
            barLight.position.set(-1.5, CABIN_H - 0.4, z);
            barLight.lookAt(-1.5, 0, z);
            cabinGroup.add(barLight);
        }
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

    paintAcrylics();

    scene.add(cabinGroup);


    // ============================================
    // ESTACIÓN DE INSPECCIÓN
    // Gabinete de acero inoxidable con monitor de resultados, detrás y a la
    // derecha de la celda. La pantalla sigue el veredicto de la última pieza.
    // ============================================

    const stationGroup = new THREE.Group();
    const stainlessMat = new THREE.MeshStandardMaterial({ color: 0xc9ced4, metalness: 0.72, roughness: 0.34 });
    const stationDarkMat = new THREE.MeshStandardMaterial({ color: 0x2a2e33, metalness: 0.5, roughness: 0.45 });

    // Cuerpo y zócalo
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.85, 0.85), stainlessMat);
    cabinet.position.y = 0.95;
    stationGroup.add(cabinet);

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.75), stationDarkMat);
    plinth.position.y = 0.05;
    stationGroup.add(plinth);

    // Rejilla de ventilación: 15 hexágonos en una sola malla instanciada
    const hexGrid = new THREE.InstancedMesh(new THREE.CircleGeometry(0.075, 6), stationDarkMat, 15);
    {
        const m = new THREE.Matrix4();
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 6);
        const one = new THREE.Vector3(1, 1, 1);
        let i = 0;
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 5; col++) {
                const pos = new THREE.Vector3(-0.42 + col * 0.21 + (row % 2) * 0.105, 0.45 + row * 0.19, 0.431);
                hexGrid.setMatrixAt(i++, m.compose(pos, q, one));
            }
        }
    }
    stationGroup.add(hexGrid);

    // Manija seccionadora y su palanca roja
    const handleBase = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.06), stationDarkMat);
    handleBase.position.set(0.6, 1.3, 0.44);
    stationGroup.add(handleBase);

    const handleLever = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.17, 0.06), new THREE.MeshStandardMaterial({ color: 0xd42020, roughness: 0.5 }));
    handleLever.position.set(0.6, 1.3, 0.48);
    stationGroup.add(handleLever);

    // Logo de Insytech en la puerta
    const logoTex = new THREE.TextureLoader().load('/images/Versiones de logotipo-01.webp');
    logoTex.colorSpace = THREE.SRGBColorSpace;
    const logoPlate = new THREE.Mesh(
        new THREE.PlaneGeometry(1.06, 1.06 * (1134 / 5028)),
        new THREE.MeshBasicMaterial({ map: logoTex, transparent: true })
    );
    logoPlate.position.set(-0.15, 1.28, 0.432);
    stationGroup.add(logoPlate);

    // Monitor inclinado sobre el gabinete
    const monitorGroup = new THREE.Group();
    const monitorShell = new THREE.Mesh(new THREE.BoxGeometry(1.72, 1.06, 0.09), stainlessMat);
    monitorGroup.add(monitorShell);

    /** Pantalla del HMI: lista de piezas, miniaturas y el bloque de veredicto. */
    function hmiTexture(ok: boolean): THREE.CanvasTexture {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 320;
        const ctx = canvas.getContext('2d')!;

        ctx.fillStyle = '#eef1f4';
        ctx.fillRect(0, 0, 512, 320);

        ctx.fillStyle = '#001489';
        ctx.fillRect(0, 0, 512, 30);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('INSYTECH VISION', 12, 21);
        ctx.font = '12px monospace';
        ctx.fillText('LÍNEA 01', 420, 21);

        // Lista de piezas
        ctx.font = '11px monospace';
        for (let i = 0; i < 9; i++) {
            ctx.fillStyle = i % 2 ? '#e3e7ec' : '#f6f8fa';
            ctx.fillRect(10, 44 + i * 28, 170, 24);
            ctx.fillStyle = '#4b5563';
            ctx.fillText(['PCB-2847', 'BR-4455', 'IC-7734', 'GR-1052', 'BT-0923', 'PCB-2848', 'GR-1053', 'IC-7735', 'BR-4456'][i], 18, 60 + i * 28);
            ctx.fillStyle = i === 1 ? '#d93a1a' : '#0f9d58';
            ctx.fillText(i === 1 ? 'NG' : 'OK', 150, 60 + i * 28);
        }

        // Miniaturas de captura
        for (let i = 0; i < 2; i++) {
            ctx.fillStyle = '#20242a';
            ctx.fillRect(192, 44 + i * 122, 128, 112);
            ctx.strokeStyle = ok ? '#00B5E2' : '#F97316';
            ctx.lineWidth = 2;
            ctx.strokeRect(216, 68 + i * 122, 80, 64);
        }

        // Bloque de veredicto
        ctx.fillStyle = ok ? '#12a150' : '#c62828';
        ctx.fillRect(332, 44, 170, 190);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 58px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ok ? 'OK' : 'NG', 417, 160);
        ctx.font = '13px monospace';
        ctx.fillText(ok ? 'PIEZA CONFORME' : 'PIEZA RECHAZADA', 417, 200);
        ctx.textAlign = 'left';

        // Barra de estado
        ctx.fillStyle = '#d7dce2';
        ctx.fillRect(10, 248, 492, 60);
        ctx.fillStyle = '#374151';
        ctx.font = '12px monospace';
        ctx.fillText('INSPECCIÓN EN CURSO · CÁMARA 01 · MODELO v4', 22, 272);
        ctx.fillText('TRAZABILIDAD: FOTO ARCHIVADA', 22, 294);

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    const hmiOk = hmiTexture(true);
    const hmiNg = hmiTexture(false);
    const screenMat = new THREE.MeshBasicMaterial({ map: hmiOk });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.95), screenMat);
    screen.position.z = 0.05;
    monitorGroup.add(screen);

    monitorGroup.position.set(0, 2.35, 0.1);
    monitorGroup.rotation.x = -0.32;   // inclinado hacia el operador
    stationGroup.add(monitorGroup);

    // Pedestal del monitor
    const monitorStem = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.14), stationDarkMat);
    monitorStem.position.set(0, 1.95, -0.05);
    stationGroup.add(monitorStem);

    // Al frente y a la derecha, pegada a la celda
    // Alineada con la celda, sin giro propio
    stationGroup.position.set(3.3, CABIN_FLOOR, 2.4);
    scene.add(stationGroup);

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
    const ledRing = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.05, 0.04), ledRingMat, 16);
    {
        const m = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        const axis = new THREE.Vector3(0, 0, 1);
        const one = new THREE.Vector3(1, 1, 1);
        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            const pos = new THREE.Vector3(Math.cos(a) * 0.35, Math.sin(a) * 0.35, -1.86);
            ledRing.setMatrixAt(i, m.compose(pos, q.setFromAxisAngle(axis, a), one));
        }
    }
    cameraGroup.add(ledRing);
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
        new THREE.BoxGeometry(0.08, 2.15, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.7, roughness: 0.35 })
    );
    camBracket.position.set(-3.85, 3.68, 1.35);
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

    // Tablillas: antes eran ~110 mallas que se movían una por una (110 llamadas
    // de dibujo). Ahora son una textura que se desplaza sobre un solo plano.
    const slatCanvas = document.createElement('canvas');
    slatCanvas.width = 32;
    slatCanvas.height = 4;
    const slatCtx = slatCanvas.getContext('2d')!;
    slatCtx.fillStyle = '#3a3a45';
    slatCtx.fillRect(0, 0, 32, 4);
    slatCtx.fillStyle = '#575767';
    slatCtx.fillRect(0, 0, 7, 4);

    const slatTexture = new THREE.CanvasTexture(slatCanvas);
    slatTexture.colorSpace = THREE.SRGBColorSpace;
    slatTexture.wrapS = THREE.RepeatWrapping;
    slatTexture.wrapT = THREE.RepeatWrapping;
    slatTexture.repeat.set(112, 1);   // una tablilla cada 0.4 unidades

    const beltTread = new THREE.Mesh(
        new THREE.PlaneGeometry(45, 2.4),
        new THREE.MeshStandardMaterial({ map: slatTexture, metalness: 0.25, roughness: 0.62 })
    );
    beltTread.rotation.x = -Math.PI / 2;
    beltTread.position.set(0, 0.06, 0);
    beltTread.receiveShadow = true;
    conveyorGroup.add(beltTread);

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
    // EXPULSOR DE RECHAZO
    // Cilindro neumático que saca de la banda la pieza que no pasa la inspección
    // y la deja caer en el contenedor. Antes la pieza rechazada seguía de largo.
    // ============================================

    const PUSHER_X = 5.9;          // aguas abajo de la cortina láser y de la estación
    const pusherGroup = new THREE.Group();

    const pusherBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.3, 0.72),
        new THREE.MeshStandardMaterial({ color: 0x8f959d, metalness: 0.85, roughness: 0.3 })
    );
    pusherBody.position.set(PUSHER_X, 0.34, -2.15);
    pusherGroup.add(pusherBody);

    const pusherRod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 1.0, 12),
        new THREE.MeshStandardMaterial({ color: 0xd9dee3, metalness: 0.95, roughness: 0.12 })
    );
    pusherRod.rotation.x = Math.PI / 2;
    pusherGroup.add(pusherRod);

    const pusherPad = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.26, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x2b2f35, metalness: 0.4, roughness: 0.6 })
    );
    pusherGroup.add(pusherPad);

    // Soporte al bastidor
    const pusherMount = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.7, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x8f959d, metalness: 0.8, roughness: 0.35 })
    );
    pusherMount.position.set(PUSHER_X, 0.02, -2.4);
    pusherGroup.add(pusherMount);

    /** Extiende y retrae el vástago: 0 recogido, 1 fuera. */
    function setPusher(extend: number): void {
        const z = -1.85 + extend * 1.25;
        pusherRod.position.set(PUSHER_X, 0.34, z - 0.5);
        pusherPad.position.set(PUSHER_X, 0.34, z);
    }
    setPusher(0);

    // Contenedor de rechazo, del lado por el que sale la pieza
    const binMat = new THREE.MeshStandardMaterial({ color: 0xb4551f, metalness: 0.35, roughness: 0.6 });
    const bin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 1.2), binMat);
    bin.position.set(PUSHER_X, CABIN_FLOOR + 0.38, 2.55);
    pusherGroup.add(bin);

    const binMouth = new THREE.Mesh(
        new THREE.BoxGeometry(1.42, 0.06, 1.12),
        new THREE.MeshStandardMaterial({ color: 0x14171b, roughness: 0.9 })
    );
    binMouth.position.set(PUSHER_X, CABIN_FLOOR + 0.74, 2.55);
    pusherGroup.add(binMouth);

    scene.add(pusherGroup);

    // ============================================
    // SISTEMA DE PRODUCTOS
    // ============================================

    const products: Product[] = [];


    const BELT_TOP = 0.08;   // cara superior de la banda: ahí se apoyan las piezas

    /**
     * Arma la pieza con su base en y = 0 y devuelve su altura real. Antes todas
     * compartían la misma y, así que las altas (botella, rodamiento) se hundían.
     */
    function buildProduct(type: typeof productTypes[0]): { group: THREE.Group; height: number } {
        const group = new THREE.Group();
        const shell = (color: number, metalness: number, roughness: number) =>
            new THREE.MeshStandardMaterial({ color, metalness, roughness });

        const add = (mesh: THREE.Mesh) => {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            group.add(mesh);
            return mesh;
        };

        switch (type.shape) {
            case 'box': {
                // PCB: placa delgada con componentes y borde de contactos dorado
                const H = 0.07;
                const board = add(new THREE.Mesh(new THREE.BoxGeometry(0.62, H, 0.44), shell(type.color, 0.1, 0.7)));
                board.position.y = H / 2;

                for (const [cx, cz, w, d, h] of [[-0.15, 0.06, 0.16, 0.16, 0.1], [0.12, -0.08, 0.22, 0.12, 0.07], [0.2, 0.1, 0.08, 0.08, 0.12]]) {
                    const comp = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), shell(0x22262c, 0.4, 0.5)));
                    comp.position.set(cx, H + h / 2, cz);
                }
                for (let i = 0; i < 6; i++) {
                    const pad = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.06), shell(0xe8bd58, 0.95, 0.28)));
                    pad.position.set(-0.28, H, -0.15 + i * 0.06);
                }
                return { group, height: 0.19 };
            }

            case 'cylinder': {
                // Engrane: cubo, dientes alrededor y barreno central
                const H = 0.22;
                const hub = add(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, H, 24), shell(type.color, 0.88, 0.26)));
                hub.position.y = H / 2;

                const teeth = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, H, 0.05), shell(type.color, 0.88, 0.26), 14);
                teeth.castShadow = true;
                const tm = new THREE.Matrix4();
                const tq = new THREE.Quaternion();
                const up = new THREE.Vector3(0, 1, 0);
                const unit = new THREE.Vector3(1, 1, 1);
                for (let i = 0; i < 14; i++) {
                    const a = (i / 14) * Math.PI * 2;
                    const pos = new THREE.Vector3(Math.cos(a) * 0.27, H / 2, Math.sin(a) * 0.27);
                    teeth.setMatrixAt(i, tm.compose(pos, tq.setFromAxisAngle(up, -a), unit));
                }
                group.add(teeth);
                const bore = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, H + 0.02, 16), shell(0x3a4046, 0.4, 0.5)));
                bore.position.y = H / 2;
                return { group, height: H };
            }

            case 'torus': {
                // Rodamiento: acostado sobre la banda, no de canto
                const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 12, 28), shell(type.color, 0.9, 0.22)));
                ring.rotation.x = Math.PI / 2;
                ring.position.y = 0.07;

                const inner = add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 20), shell(0x9aa2aa, 0.85, 0.3)));
                inner.position.y = 0.06;
                return { group, height: 0.14 };
            }

            case 'bottle': {
                // Botella: cuerpo, hombro, cuello y tapa
                const body = add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.42, 20), shell(type.color, 0.15, 0.12)));
                body.position.y = 0.21;

                const shoulder = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.16, 0.14, 20), shell(type.color, 0.15, 0.12)));
                shoulder.position.y = 0.49;

                const neck = add(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.1, 16), shell(type.color, 0.15, 0.12)));
                neck.position.y = 0.61;

                const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.07, 16), shell(0xd9dee3, 0.5, 0.4)));
                cap.position.y = 0.69;
                return { group, height: 0.73 };
            }

            default: {
                // Chip: encapsulado oscuro con patas laterales
                const H = 0.1;
                const pack = add(new THREE.Mesh(new THREE.BoxGeometry(0.34, H, 0.4), shell(type.color, 0.3, 0.45)));
                pack.position.y = 0.05 + H / 2;

                for (const side of [-1, 1]) {
                    for (let i = 0; i < 5; i++) {
                        const pin = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.03), shell(0xd7dce1, 0.9, 0.25)));
                        pin.position.set(side * 0.19, 0.05, -0.14 + i * 0.07);
                    }
                }
                return { group, height: 0.15 };
            }
        }
    }

    class Product {
        mesh: THREE.Group;
        type: typeof productTypes[0];
        isDefective: boolean;
        boundingBox: THREE.LineSegments | null = null;
        label: THREE.Sprite | null = null;
        detected: boolean = false;
        scanProgress: number = 0;
        height: number = 0.2;
        rejected: boolean = false;
        fallSpeed: number = 0;

        constructor(type: typeof productTypes[0], position: THREE.Vector3) {
            this.type = type;
            this.isDefective = Math.random() < type.defectRate;
            this.mesh = new THREE.Group();

            const built = buildProduct(type);
            this.height = built.height;

            // El defecto es un bulto en la propia pieza, a su altura real
            if (this.isDefective) {
                const defect = new THREE.Mesh(
                    new THREE.SphereGeometry(0.055, 10, 8),
                    new THREE.MeshStandardMaterial({ color: 0xd93a1a, emissive: 0x521204, roughness: 0.6 })
                );
                defect.position.set(
                    (Math.random() - 0.5) * 0.28,
                    built.height * 0.72,
                    (Math.random() - 0.5) * 0.24
                );
                built.group.add(defect);
            }

            this.mesh.add(built.group);
            this.mesh.position.copy(position);
            scene.add(this.mesh);
        }

        createDetectionUI() {
            // Bounding box
            const boxGeo = new THREE.BoxGeometry(0.78, this.height + 0.12, 0.62);
            const edges = new THREE.EdgesGeometry(boxGeo);
            const lineMat = new THREE.LineBasicMaterial({
                color: this.isDefective ? 0xff4444 : 0x44ff44,
                transparent: true,
                opacity: 0
            });
            this.boundingBox = new THREE.LineSegments(edges, lineMat);
            this.boundingBox.position.copy(this.mesh.position);
            this.boundingBox.position.y += this.height / 2;
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
                // Con depthTest apagado la etiqueta se dibujaba encima de todo,
                // incluida la pantalla de la estación. Respeta la profundidad.
                depthTest: true
            });
            this.label = new THREE.Sprite(spriteMat);
            this.label.scale.set(2.2, 0.7, 1); // Escala más compacta
            this.label.position.copy(this.mesh.position);
            this.label.position.y += this.height + 0.75;
            this.label.position.z += 0.5; // Hacia la cámara
            scene.add(this.label);
        }

        update(deltaTime: number): boolean {
            // Mover en la cinta
            this.mesh.position.x += this.rejected ? 0.006 : 0.02;

            // Expulsión: la pieza rechazada sale de la banda y cae al contenedor
            if (this.isDefective && this.detected && !this.rejected && this.mesh.position.x >= PUSHER_X) {
                this.rejected = true;
                pusherFiredAt = performance.now();
            }

            if (this.rejected) {
                this.mesh.position.z += 0.055;
                if (this.mesh.position.z > 1.5) {
                    this.fallSpeed += 0.012;
                    this.mesh.position.y -= this.fallSpeed;
                    this.mesh.rotation.z += 0.06;
                }
                if (this.label && this.label.material instanceof THREE.SpriteMaterial) {
                    this.label.material.opacity = Math.max(0, this.label.material.opacity - 0.04);
                }
            }

            if (this.boundingBox) {
                this.boundingBox.position.x = this.mesh.position.x;
                this.boundingBox.position.z = this.mesh.position.z;
                this.boundingBox.position.y = this.mesh.position.y + this.height / 2;
            }
            if (this.label) {
                this.label.position.x = this.mesh.position.x;
                this.label.position.z = this.mesh.position.z + 0.5;
            }

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
                        lastVerdictOk = !this.isDefective;

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

            // Eliminar cuando sale de cuadro o cuando ya cayó al contenedor
            if (this.mesh.position.y < CABIN_FLOOR + 0.55 && this.rejected) {
                this.destroy();
                return false;
            }

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


    /**
     * Fusiona la geometría estática de un grupo en una malla por material. La
     * estructura no se mueve nunca, así que no hay razón para pagar una llamada
     * de dibujo por cada tramo de perfil: cada viga eran tres mallas.
     */
    function bakeStatic(root: THREE.Object3D): void {
        root.updateMatrixWorld(true);
        const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
        const byKey = new Map<string, { mat: THREE.Material; items: Array<{ mesh: THREE.Mesh; geo: THREE.BufferGeometry }> }>();

        root.traverse((node) => {
            if (!(node instanceof THREE.Mesh) || node instanceof THREE.InstancedMesh) return;
            if (Array.isArray(node.material)) return;
            const mat = node.material as THREE.Material;

            const geo = node.geometry.clone();
            geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, node.matrixWorld));
            // Los atributos tienen que coincidir para poder fusionar
            const key = mat.uuid + '|' + Object.keys(geo.attributes).sort().join(',');
            const bucket = byKey.get(key) ?? { mat, items: [] };
            bucket.items.push({ mesh: node, geo });
            byKey.set(key, bucket);
        });

        for (const { mat, items } of byKey.values()) {
            // Con una sola malla no hay nada que ganar: se deja intacta. Quitarla
            // aquí fue lo que borró la banda, la pantalla y los acrílicos.
            if (items.length < 2) {
                items[0].geo.dispose();
                continue;
            }

            const merged = BufferGeometryUtils.mergeGeometries(items.map((i) => i.geo), false);
            for (const item of items) item.geo.dispose();
            if (!merged) continue;

            const mesh = new THREE.Mesh(merged, mat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            root.add(mesh);
            for (const item of items) item.mesh.removeFromParent();
        }
    }

    bakeStatic(cabinGroup);
    bakeStatic(conveyorGroup);
    bakeStatic(stationGroup);

    // ============================================
    // CÁMARA PERSPECTIVA
    // ============================================

    // Vista lateral baja: la banda es un rectangulo muy ancho a sangre, asi que
    // la camara se acuesta en vez de mirar desde arriba como en la tarjeta.
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);

    // Encuadre según la forma del contenedor: en móvil la banda es casi cuadrada
    // y con el encuadre ancho la celda quedaba diminuta, así que ahí se cierra
    // sobre ella. La celda subió de alto, así que la cámara también se aleja.
    const host: HTMLElement = container;
    const camBase = { x: 2, y: 3.4, z: 11.4, tx: 0, ty: 2.05 };

    function frameCamera(): void {
        const aspect = (host.clientWidth || 1) / (host.clientHeight || 1);
        if (aspect < 1.7) {
            Object.assign(camBase, { x: 0.2, y: 3.4, z: 10.4, tx: -1.5, ty: 2.3 });
        } else if (aspect < 2.6) {
            Object.assign(camBase, { x: 1.1, y: 3.3, z: 10.4, tx: -0.9, ty: 2.1 });
        } else {
            Object.assign(camBase, { x: 2, y: 3.4, z: 11.4, tx: 0, ty: 2.05 });
        }
        camera.position.set(camBase.x, camBase.y, camBase.z);
        camera.lookAt(camBase.tx, camBase.ty, 0);
    }

    frameCamera();

    // Desplazamientos aportados por GSAP: la entrada y el scroll. El bucle los
    // suma al encuadre base, así que conviven con el vaivén de la cámara.
    const camFx = { dolly: 0, lift: 0, pan: 0 };

    // ============================================
    // ANIMACIÓN PRINCIPAL
    // ============================================

    let lastProductTime = 0;
    const productInterval = 2500;

    // Arranque en caliente: sin esto la primera pieza tardaba ~16 s en llegar a
    // la cortina y el visitante veía una línea vacía.
    for (const startX of [-16, -11.5, -7, -2.5, 1.5, 6]) {
        products.push(new Product(
            productTypes[Math.floor(Math.random() * productTypes.length)],
            new THREE.Vector3(startX, BELT_TOP, 0)
        ));
    }
    let time = 0;

    let rafId = 0;

    function animate() {
        rafId = requestAnimationFrame(animate);
        time += 0.016;

        const now = Date.now();

        // Generar productos
        if (now - lastProductTime > productInterval) {
            const type = productTypes[Math.floor(Math.random() * productTypes.length)];
            const product = new Product(type, new THREE.Vector3(-20, BELT_TOP, 0));
            products.push(product);
            lastProductTime = now;
        }

        // Actualizar productos
        for (let i = products.length - 1; i >= 0; i--) {
            if (!products[i].update(0.016)) {
                products.splice(i, 1);
            }
        }

        // Tablillas: se desplaza la textura, no 110 mallas. 0.02 unidades por
        // cuadro entre 0.4 de paso de tablilla = 0.05 de repetición.
        slatTexture.offset.x -= 0.05;

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

        // Vástago del expulsor: salida rápida, retorno lento
        const sincePush = performance.now() - pusherFiredAt;
        if (sincePush < 1100) {
            setPusher(sincePush < 220 ? sincePush / 220 : Math.max(0, 1 - (sincePush - 220) / 880));
        }

        // La pantalla de la estación muestra el veredicto de la última pieza
        const wantedHmi = lastVerdictOk ? hmiOk : hmiNg;
        if (screenMat.map !== wantedHmi) {
            screenMat.map = wantedHmi;
            screenMat.needsUpdate = true;
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
        camera.position.x = camBase.x + Math.sin(time * 0.3) * 0.3 + camFx.pan;
        camera.position.y = camBase.y + Math.sin(time * 0.4) * 0.12 + camFx.lift;
        camera.position.z = camBase.z + camFx.dolly;
        camera.lookAt(camBase.tx, camBase.ty, 0);

        renderer.render(scene, camera);
    }

    // Bajo reduced-motion se pinta un solo frame: la escena se ve, pero la
    // línea no corre. Con movimiento permitido, el bucle solo gira mientras el
    // canvas está en pantalla — si no, seguiría renderizando a 60 fps con el
    // visitante seis secciones más abajo.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        renderer.render(scene, camera);
    } else {
        gsap.registerPlugin(ScrollTrigger);

        // Entrada: la celda se acerca desde un plano más abierto.
        gsap.fromTo(camFx,
            { dolly: 3.4, lift: 0.7 },
            { dolly: 0, lift: 0, duration: 1.6, ease: "power3.out", delay: 0.15 }
        );

        // Scroll: al salir el hero, la cámara retrocede y sube, y la escena se
        // atenúa para no competir con la sección siguiente.
        // El id permite matar este trigger por nombre. Sin él, cualquier
        // navegación que reemplace el contenedor deja el trigger apuntando a un
        // nodo huérfano y ScrollTrigger sigue midiéndolo en cada refresh.
        const scrollFx = gsap.timeline({
            scrollTrigger: {
                id: "vision-hero-scene",
                trigger: container,
                start: "top top",
                end: "bottom top",
                scrub: 0.5,
                // Lenis mueve el scroll dentro del ticker de GSAP; sin
                // invalidateOnRefresh el scrub conserva medidas de antes del
                // resize y la cámara queda desfasada del scroll real.
                invalidateOnRefresh: true
            }
        });
        scrollFx.to(camFx, { dolly: 2.6, lift: 1.2, pan: 1.4, ease: "none" }, 0);
        scrollFx.to(container, { opacity: 0.45, ease: "none" }, 0);

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
        frameCamera();
        frameCamera();
        renderer.setSize(newWidth, newHeight);
    });

    return null;
}