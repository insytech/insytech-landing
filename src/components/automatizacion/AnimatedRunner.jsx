import { useEffect, useRef } from 'react';
import {
  calculateAngle,
  debounce,
  detectPerformanceLevel,
  getNodePosition,
} from '../../utils/animatedRunner';

// Ruta COMPLETA del runner para evitar cálculos continuos
const flowPath = [
  "node-trigger",
  "node-ai",
  "node-action",
  "node-pipeline",
  "node-email",
  "node-pipeline",
  "node-chat",
  "node-action",
  "node-whatsapp",
  "node-api",
  "node-crm",
  "node-action",
  "node-targeting",
  "node-forms",
  "node-action",
  "node-notify",
];

// Sistema de pooling para trails para evitar crear/destruir elementos
const trailPool = [];
const MAX_TRAIL_POOL = 3;

const AnimatedRunner = () => {
  // Refs en lugar de state: este componente solo manipula el DOM y devuelve null,
  // por lo que un re-render no aporta nada — useRef evita re-renders innecesarios.
  const nodesRef = useRef({});
  const currentIndexRef = useRef(0);
  const performanceLevelRef = useRef('high');
  const isAnimatingRef = useRef(false);
  const isInitializedRef = useRef(false);
  const currentRotationRef = useRef(0);
  const frameSkipCounterRef = useRef(0);

  // Inicializar
  useEffect(() => {
    performanceLevelRef.current = detectPerformanceLevel();

    let rafId = 0;
    let retries = 0;
    // ~1s de reintentos a 60fps como red de seguridad; en la práctica los nodos
    // (renderizados por Astro) ya existen en el primer frame tras la hidratación.
    const MAX_RETRIES = 60;

    const pressHold = () => (performanceLevelRef.current === 'low' ? 200 : 300);

    // Posicionar el runner, presionar el primer nodo y arrancar el recorrido.
    const positionAndStart = (nodeElements) => {
      nodesRef.current = nodeElements;

      const firstNodeId = flowPath[0];
      const firstNode = nodeElements[firstNodeId];
      if (!firstNode) return;

      const position = getNodePosition(firstNode);
      const runnerElement = document.getElementById('runner');
      if (!runnerElement) return;

      // Batch de writes para evitar reflows múltiples
      Object.assign(runnerElement.style, {
        background: '',
        left: `${position.x}px`,
        top: `${position.y}px`,
        opacity: '1',
        visibility: 'visible',
      });
      runnerElement.style.setProperty('--rotation', '0rad');
      isInitializedRef.current = true;

      // Presionar primer nodo y empezar el recorrido (arranque rápido).
      firstNode.classList.add('pressed');
      setTimeout(() => {
        firstNode.classList.remove('pressed');
        setTimeout(() => startRunnerWithNodes(nodeElements, 0), 150);
      }, pressHold());
    };

    // Buscar nodos; reintenta en el siguiente frame si aún no están en el DOM.
    const initializeRunner = () => {
      const nodeElements = {};
      let foundNodes = 0;

      flowPath.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
          nodeElements[id] = element;
          foundNodes++;
        }
      });

      if (foundNodes >= 4) {
        positionAndStart(nodeElements);
      } else if (retries < MAX_RETRIES) {
        retries += 1;
        rafId = requestAnimationFrame(initializeRunner);
      }
    };

    // Arrancar en el siguiente frame para que el DOM del flujo ya esté maquetado.
    rafId = requestAnimationFrame(initializeRunner);

    // Manejar resize con debounce
    const handleResize = debounce(() => {
      if (isInitializedRef.current && Object.keys(nodesRef.current).length > 0) {
        const currentNodeId = flowPath[currentIndexRef.current];
        const currentNode = nodesRef.current[currentNodeId];
        if (currentNode) {
          const position = getNodePosition(currentNode);
          const runnerElement = document.getElementById('runner');
          if (runnerElement) {
            Object.assign(runnerElement.style, {
              left: `${position.x}px`,
              top: `${position.y}px`,
            });
          }
        }
      }
    }, 250);

    window.addEventListener('resize', handleResize);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Rotación usando transform directamente
  const rotateRunner = (targetAngle, duration = 300) => {
    return new Promise((resolve) => {
      const runnerElement = document.getElementById('runner');
      if (!runnerElement) return resolve();

      if (performanceLevelRef.current === 'low') {
        // Rotación instantánea para dispositivos lentos
        runnerElement.style.setProperty('--rotation', `${targetAngle}rad`);
        currentRotationRef.current = targetAngle;
        return resolve();
      }

      const startRotation = currentRotationRef.current;
      const angleDiff = targetAngle - startRotation;
      const startTime = performance.now();

      const animateRotation = (currentTime) => {
        // Frame skipping para dispositivos lentos
        if (performanceLevelRef.current === 'medium' && frameSkipCounterRef.current % 2 !== 0) {
          frameSkipCounterRef.current += 1;
          requestAnimationFrame(animateRotation);
          return;
        }

        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const currentAngle = startRotation + angleDiff * progress;
        runnerElement.style.setProperty('--rotation', `${currentAngle}rad`);
        currentRotationRef.current = currentAngle;

        if (progress < 1) {
          requestAnimationFrame(animateRotation);
        } else {
          resolve();
        }

        frameSkipCounterRef.current += 1;
      };

      requestAnimationFrame(animateRotation);
    });
  };

  // Trail con pooling
  const createMovementTrail = (fromPos, toPos, angle) => {
    if (performanceLevelRef.current === 'low') return null;

    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 30) return null; // Umbral aumentado

    const runnerContainer = document.getElementById('runner-container');
    if (!runnerContainer) return null;

    // Usar pool de trails
    let trail = trailPool.pop();
    if (!trail) {
      trail = document.createElement('div');
      trail.className = 'movement-trail';
    }

    // Configurar trail reutilizado (batch de writes)
    Object.assign(trail.style, {
      left: `${fromPos.x}px`,
      top: `${fromPos.y}px`,
      width: `${distance}px`,
      transform: `rotate(${angle * 180 / Math.PI}deg)`,
      opacity: '0',
    });

    runnerContainer.appendChild(trail);

    setTimeout(() => {
      trail.style.opacity = '0.7';
    }, 16);

    return trail;
  };

  // Movimiento usando transform
  const moveRunner = (fromPos, toPos, duration) => {
    return new Promise((resolve) => {
      const runnerElement = document.getElementById('runner');
      if (!runnerElement) return resolve();

      if (performanceLevelRef.current === 'low') {
        // Movimiento instantáneo para dispositivos muy lentos
        Object.assign(runnerElement.style, {
          left: `${toPos.x}px`,
          top: `${toPos.y}px`,
        });
        setTimeout(resolve, 100);
        return;
      }

      const startTime = performance.now();
      const deltaX = toPos.x - fromPos.x;
      const deltaY = toPos.y - fromPos.y;

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing suave
        const easeProgress = 1 - (1 - progress) ** 3;

        const currentX = fromPos.x + deltaX * easeProgress;
        const currentY = fromPos.y + deltaY * easeProgress;

        Object.assign(runnerElement.style, {
          left: `${currentX}px`,
          top: `${currentY}px`,
        });

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  };

  // Iniciar el runner con nodos específicos
  const startRunnerWithNodes = (localNodes, fromIndex = 0) => {
    moveToNextNodeWithNodes(localNodes, fromIndex);
  };

  // Función de movimiento principal
  const moveToNextNodeWithNodes = async (localNodes, fromIndex = currentIndexRef.current) => {
    if (isAnimatingRef.current) {
      return;
    }

    isAnimatingRef.current = true;

    const toIndex = (fromIndex + 1) % flowPath.length;
    const fromNodeId = flowPath[fromIndex];
    const toNodeId = flowPath[toIndex];

    const fromNode = localNodes[fromNodeId];
    const toNode = localNodes[toNodeId];

    if (!fromNode || !toNode) {
      isAnimatingRef.current = false;
      setTimeout(() => startRunnerWithNodes(localNodes, fromIndex), 1000);
      return;
    }

    const fromPos = getNodePosition(fromNode);
    const toPos = getNodePosition(toNode);

    if (fromPos.x === 0 && fromPos.y === 0 && toPos.x === 0 && toPos.y === 0) {
      isAnimatingRef.current = false;
      setTimeout(() => startRunnerWithNodes(localNodes, fromIndex), 1000);
      return;
    }

    const runnerElement = document.getElementById('runner');

    // Reducir cálculos de ángulo solo si necesario
    let trail = null;
    if (performanceLevelRef.current !== 'low') {
      const angle = calculateAngle(fromNode, toNode);
      await rotateRunner(angle, performanceLevelRef.current === 'medium' ? 100 : 200);
      trail = createMovementTrail(fromPos, toPos, angle);
    }

    if (runnerElement) {
      runnerElement.classList.add('moving');
    }

    // Duración adaptativa
    const distance = Math.sqrt((toPos.x - fromPos.x) ** 2 + (toPos.y - fromPos.y) ** 2);
    const duration = performanceLevelRef.current === 'low' ? 200 :
      performanceLevelRef.current === 'medium' ? Math.min(400, distance * 0.8) :
        Math.min(800, distance * 1.2);

    await moveRunner(fromPos, toPos, duration);

    if (runnerElement) {
      runnerElement.classList.remove('moving');
    }

    if (performanceLevelRef.current !== 'low') {
      await rotateRunner(0, 200);
    }

    // Trail cleanup con pooling
    if (trail) {
      trail.style.opacity = '0';
      setTimeout(() => {
        if (trail.parentNode) {
          trail.parentNode.removeChild(trail);
        }
        // Devolver al pool si no está lleno
        if (trailPool.length < MAX_TRAIL_POOL) {
          trailPool.push(trail);
        }
      }, 200);
    }

    await pressNodeLocal(toNodeId, localNodes);

    currentIndexRef.current = toIndex;
    isAnimatingRef.current = false;

    const pauseDuration = performanceLevelRef.current === 'low' ? 300 :
      performanceLevelRef.current === 'medium' ? 500 : 800;

    setTimeout(() => startRunnerWithNodes(localNodes, toIndex), pauseDuration);
  };

  // Función para presionar nodos usando nodos locales
  const pressNodeLocal = async (nodeId, localNodes) => {
    const node = localNodes[nodeId];
    if (!node) return;

    node.classList.add("pressed");
    await new Promise(resolve =>
      setTimeout(resolve, performanceLevelRef.current === 'low' ? 200 : 300)
    );
    node.classList.remove("pressed");
  };

  // Este componente solo maneja la lógica, no renderiza elementos visuales
  return null;
};

export default AnimatedRunner;
