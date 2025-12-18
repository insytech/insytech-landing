// Servicios específicos de Insytech Vision
const visionServices = [
    {
        title: "Inspección de Calidad Automatizada",
        description: "Detecta defectos microscópicos en tiempo real con precisión superior al 99%. Nuestros modelos de IA identifican anomalías que escapan al ojo humano.",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"/></svg>`,
        image: "/images/vision1.webp",
        imageSecondary: "/images/vision2.webp",
        features: [
            "Detección de defectos en superficies y ensambles",
            "Verificación de soldaduras y uniones",
            "Control dimensional automático"
        ]
    },
    {
        title: "Reconocimiento y Clasificación",
        description: "Clasifica productos automáticamente según características visuales. Ideal para líneas de producción con múltiples variantes y SKUs.",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z"/></svg>`,
        image: "/images/tracking1.webp",
        imageSecondary: "/images/tracking2.webp",
        features: [
            "Identificación de objetos por forma y color",
            "Clasificación multi-clase en milisegundos",
            "Adaptación a nuevos productos sin reprogramar"
        ]
    },
    {
        title: "OCR Industrial",
        description: "Lee códigos de barras, QR, DataMatrix y texto impreso en cualquier superficie. Integración directa con sistemas de trazabilidad.",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"/></svg>`,
        image: "/images/software1.webp",
        imageSecondary: "/images/software2.webp",
        features: [
            "Lectura de códigos 1D y 2D a alta velocidad",
            "OCR en etiquetas y grabados industriales",
            "Verificación de fechas de caducidad y lotes"
        ]
    }
];

// Casos de uso / aplicaciones de Vision
const visionApplications = [
    {
        title: "Inspección de Soldadura",
        description: "Detecta cordones incompletos, porosidad y defectos dimensionales en soldaduras automotrices y electrónicas.",
        icon: "weld"
    },
    {
        title: "Verificación de Ensambles",
        description: "Confirma presencia y posición correcta de componentes en PCBs, arneses y sub-ensambles.",
        icon: "assembly"
    },
    {
        title: "Control de Empaque",
        description: "Valida etiquetado, sellado y contenido de empaques antes del envío.",
        icon: "package"
    },
    {
        title: "Medición Dimensional",
        description: "Mide tolerancias y dimensiones críticas sin contacto, a velocidades de línea.",
        icon: "measure"
    },
    {
        title: "Detección de Contaminantes",
        description: "Identifica partículas extrañas, manchas o contaminación en productos alimenticios y farmacéuticos.",
        icon: "contamination"
    },
    {
        title: "Trazabilidad Visual",
        description: "Registra imágenes de cada pieza inspeccionada para auditorías y análisis de calidad.",
        icon: "traceability"
    }
];

// Proceso de implementación específico de Vision
const visionProcess = [
    {
        step: 1,
        title: "Análisis del proceso",
        description: "Estudiamos tu línea de producción y definimos los criterios de inspección"
    },
    {
        step: 2,
        title: "Entrenamiento del modelo",
        description: "Desarrollamos y entrenamos modelos de IA con imágenes de tu producto"
    },
    {
        step: 3,
        title: "Integración industrial",
        description: "Conectamos con cámaras industriales, PLCs y sistemas SCADA existentes"
    },
    {
        step: 4,
        title: "Validación y mejora continua",
        description: "Optimizamos la precisión con retroalimentación de producción real"
    }
];

// Métricas y beneficios
const visionMetrics = [
    { value: "99.7%", label: "Precisión de detección" },
    { value: "<50ms", label: "Tiempo de inspección" },
    { value: "24/7", label: "Operación continua" },
    { value: "100%", label: "Trazabilidad visual" }
];

// Para compatibilidad con componentes existentes
const services = visionServices;

export {
    services,
    visionServices,
    visionApplications,
    visionProcess,
    visionMetrics
};