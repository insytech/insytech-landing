// Helpers de AnimatedRunner — extraídos para que el componente quede focalizado
// en lifecycle y orquestación de animación.

// Cache de posiciones para evitar recálculos del getBoundingClientRect.
const positionCache = new Map<string, { x: number; y: number }>();
let cacheTimestamp = 0;
const CACHE_DURATION = 1000; // 1 segundo

export type PerformanceLevel = 'low' | 'medium' | 'high';

// Detección de capacidad del dispositivo para ajustar la complejidad de la animación.
export const detectPerformanceLevel = (): PerformanceLevel => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isSmallScreen = window.innerWidth < 768;
  const isSlowDevice = navigator.hardwareConcurrency < 4;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const hasLowMemory = deviceMemory !== undefined && deviceMemory < 4;

  if ((isMobile && isSmallScreen) || isSafari || isSlowDevice || hasLowMemory) return 'low';
  if (isMobile || isSmallScreen) return 'medium';
  return 'high';
};

// Debounce genérico
export const debounce = <T extends (...args: unknown[]) => void>(func: T, wait: number) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Posición del centro de un nodo, relativa al contenedor `.automation-flows`.
// Cachea resultados durante CACHE_DURATION para evitar layout thrashing.
export const getNodePosition = (element: HTMLElement): { x: number; y: number } => {
  const now = Date.now();
  const cacheKey = element.id;

  if (positionCache.has(cacheKey) && (now - cacheTimestamp) < CACHE_DURATION) {
    return positionCache.get(cacheKey)!;
  }

  if ((now - cacheTimestamp) > CACHE_DURATION) {
    positionCache.clear();
    cacheTimestamp = now;
  }

  const visualArea = document.querySelector('.automation-flows');
  if (!visualArea) {
    return { x: 0, y: 0 };
  }

  const visualRect = visualArea.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  const position = {
    x: elementRect.left - visualRect.left + elementRect.width / 2,
    y: elementRect.top - visualRect.top + elementRect.height / 2,
  };

  positionCache.set(cacheKey, position);
  return position;
};

// Ángulo (radianes) del vector que va de fromNode → toNode.
export const calculateAngle = (fromNode: HTMLElement, toNode: HTMLElement): number => {
  const fromPos = getNodePosition(fromNode);
  const toPos = getNodePosition(toNode);

  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;

  return Math.atan2(dy, dx);
};
