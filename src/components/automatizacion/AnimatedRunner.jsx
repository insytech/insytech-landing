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

    // Esperar a que los nodos estén disponibles
    const initializeRunner = () => {
      console.log('🔍 Buscando nodos...');

      const nodeElements = {};
      let foundNodes = 0;

      flowPath.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
          nodeElements[id] = element;
          foundNodes++;
          console.log(`✅ Encontrado nodo: ${id}`);
        } else {
          console.log(`❌ No encontrado nodo: ${id}`);
        }
      });

      console.log(`📊 Encontrados ${foundNodes} nodos de ${flowPath.length} totales`);

      // Verificar que tengamos suficientes nodos para comenzar
      if (foundNodes >= 4) {
        nodesRef.current = nodeElements;
        console.log('✅ Nodos establecidos en ref');

        // Posicionar runner inicial
        const firstNodeId = flowPath[0];
        const firstNode = nodeElements[firstNodeId];
        if (firstNode) {
          const position = getNodePosition(firstNode);

          console.log(`🎯 Posicionando runner en: x=${position.x}, y=${position.y}`);

          // Posicionar runner inicial
          const runnerElement = document.getElementById('runner');
          if (runnerElement) {
            // Batch de writes para evitar reflows múltiples
            Object.assign(runnerElement.style, {
              background: '',
              left: `${position.x}px`,
              top: `${position.y}px`,
              opacity: '1',
              visibility: 'visible',
            });
            runnerElement.style.setProperty('--rotation', '0rad');

            console.log('🤖 Runner posicionado y visible');

            isInitializedRef.current = true;
            console.log('🎯 isInitialized establecido a true');

            // Presionar primer nodo y empezar el recorrido
            setTimeout(() => {
              console.log('🎬 Iniciando secuencia de movimiento...');

              const nodeForPress = nodeElements[firstNodeId];
              if (nodeForPress) {
                nodeForPress.classList.add("pressed");
                setTimeout(() => {
                  nodeForPress.classList.remove("pressed");
                  console.log('👆 Primer nodo presionado');

                  setTimeout(() => {
                    console.log('🚀 Iniciando recorrido...');
                    startRunnerWithNodes(nodeElements, 0);
                  }, 500);
                }, performanceLevelRef.current === 'low' ? 200 : 300);
              }
            }, 1000);
          } else {
            console.log('❌ No se encontró el elemento runner');
          }
        }
      } else {
        console.log('⏳ Reintentando encontrar nodos...');
        // Reintentar si no hay suficientes nodos
        setTimeout(initializeRunner, 500);
      }
    };

    // Inicializar después de que el componente esté montado
    setTimeout(() => {
      console.log('🚀 Iniciando AnimatedRunner...');
      initializeRunner();
    }, 2000); // Aumenté el delay para asegurar que todo esté cargado

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
    return () => window.removeEventListener('resize', handleResize);
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
    console.log(`🎯 startRunnerWithNodes llamado con índice: ${fromIndex}`);
    moveToNextNodeWithNodes(localNodes, fromIndex);
  };

  // Función de movimiento principal
  const moveToNextNodeWithNodes = async (localNodes, fromIndex = currentIndexRef.current) => {
    if (isAnimatingRef.current) {
      console.log('⏸️ Movimiento bloqueado - isAnimating:', isAnimatingRef.current);
      return;
    }

    isAnimatingRef.current = true;
    console.log('🎬 Iniciando nuevo movimiento...');

    const toIndex = (fromIndex + 1) % flowPath.length;
    const fromNodeId = flowPath[fromIndex];
    const toNodeId = flowPath[toIndex];

    const fromNode = localNodes[fromNodeId];
    const toNode = localNodes[toNodeId];

    console.log(`🚀 Moviendo de "${fromNodeId}" (índice ${fromIndex}) a "${toNodeId}" (índice ${toIndex})`);

    if (!fromNode || !toNode) {
      console.log('❌ Nodo no encontrado:', { fromNode: !!fromNode, toNode: !!toNode });
      isAnimatingRef.current = false;
      setTimeout(() => startRunnerWithNodes(localNodes, fromIndex), 1000);
      return;
    }

    const fromPos = getNodePosition(fromNode);
    const toPos = getNodePosition(toNode);

    console.log(`📏 Posiciones: desde (${fromPos.x}, ${fromPos.y}) hasta (${toPos.x}, ${toPos.y})`);

    if (fromPos.x === 0 && fromPos.y === 0 && toPos.x === 0 && toPos.y === 0) {
      console.log('❌ Posiciones inválidas, saltando movimiento');
      isAnimatingRef.current = false;
      setTimeout(() => startRunnerWithNodes(localNodes, fromIndex), 1000);
      return;
    }

    const runnerElement = document.getElementById('runner');

    // Reducir cálculos de ángulo solo si necesario
    let trail = null;
    if (performanceLevelRef.current !== 'low') {
      const angle = calculateAngle(fromNode, toNode);
      console.log(`🔄 Rotando runner con ángulo: ${angle}`);
      await rotateRunner(angle, performanceLevelRef.current === 'medium' ? 100 : 200);
      trail = createMovementTrail(fromPos, toPos, angle);
    }

    if (runnerElement) {
      runnerElement.classList.add('moving');
      console.log('💨 Estado "moving" activado');
    }

    // Duración adaptativa
    const distance = Math.sqrt((toPos.x - fromPos.x) ** 2 + (toPos.y - fromPos.y) ** 2);
    const duration = performanceLevelRef.current === 'low' ? 200 :
      performanceLevelRef.current === 'medium' ? Math.min(400, distance * 0.8) :
        Math.min(800, distance * 1.2);

    console.log(`⚡ Movimiento: distancia=${distance.toFixed(2)}px, duración=${duration}ms`);

    await moveRunner(fromPos, toPos, duration);
    console.log('✅ Movimiento completado');

    if (runnerElement) {
      runnerElement.classList.remove('moving');
      console.log('🛑 Estado "moving" desactivado');
    }

    if (performanceLevelRef.current !== 'low') {
      console.log('🔄 Volviendo a rotación original...');
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

    console.log(`👆 Presionando nodo destino: ${toNodeId}`);
    await pressNodeLocal(toNodeId, localNodes);

    currentIndexRef.current = toIndex;
    isAnimatingRef.current = false;

    console.log(`✅ Movimiento completado. Nuevo índice: ${toIndex}`);

    const pauseDuration = performanceLevelRef.current === 'low' ? 300 :
      performanceLevelRef.current === 'medium' ? 500 : 800;

    console.log(`⏱️ Pausa de ${pauseDuration}ms antes del siguiente movimiento`);

    setTimeout(() => startRunnerWithNodes(localNodes, toIndex), pauseDuration);
  };

  // Función para presionar nodos usando nodos locales
  const pressNodeLocal = async (nodeId, localNodes) => {
    const node = localNodes[nodeId];
    if (!node) return;

    console.log(`👆 Presionando nodo: ${nodeId}`);
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
