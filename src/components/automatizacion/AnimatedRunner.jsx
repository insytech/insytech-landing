import React, { useEffect, useState, useRef } from 'react';

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

// NUEVO: Sistema de pooling para trails para evitar crear/destruir elementos
const trailPool = [];
const MAX_TRAIL_POOL = 3;

// NUEVO: Cache de posiciones para evitar recálculos
const positionCache = new Map();
let cacheTimestamp = 0;
const CACHE_DURATION = 1000; // 1 segundo

// NUEVO: Detector de rendimiento mejorado
const detectPerformanceLevel = () => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isSmallScreen = window.innerWidth < 768;
  const isSlowDevice = navigator.hardwareConcurrency < 4;
  const hasLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;
  
  // Detección más agresiva para dispositivos lentos
  if ((isMobile && isSmallScreen) || isSafari || isSlowDevice || hasLowMemory) return 'low';
  if (isMobile || isSmallScreen) return 'medium';
  return 'high';
};

const AnimatedRunner = () => {
  const containerRef = useRef(null);
  const [nodes, setNodes] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [performanceLevel, setPerformanceLevel] = useState('high');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  
  // ARREGLADO: Añadir estados faltantes
  const [frameSkipCounter, setFrameSkipCounter] = useState(0);
  
  // Inicializar
  useEffect(() => {
    const level = detectPerformanceLevel();
    setPerformanceLevel(level);
    
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
        // ARREGLO: Establecer nodes e isInitialized ANTES de posicionar el runner
        setNodes(nodeElements);
        console.log('✅ Nodos establecidos en state');
        
        // Posicionar runner inicial
        const firstNodeId = flowPath[0];
        const firstNode = nodeElements[firstNodeId];
        if (firstNode) {
          const position = getNodePosition(firstNode);
          
          console.log(`🎯 Posicionando runner en: x=${position.x}, y=${position.y}`);
          
          // Posicionar runner inicial
          const runnerElement = document.getElementById('runner');
          if (runnerElement) {
            // Remover estilos de debugging primero
            runnerElement.style.background = '';
            
            runnerElement.style.left = `${position.x}px`;
            runnerElement.style.top = `${position.y}px`;
            runnerElement.style.opacity = '1';
            runnerElement.style.visibility = 'visible';
            runnerElement.style.setProperty('--rotation', '0rad');
            
            console.log('🤖 Runner posicionado y visible');
            
            // ARREGLO: Establecer isInitialized después de posicionar el runner
            setIsInitialized(true);
            console.log('🎯 isInitialized establecido a true');
            
            // Presionar primer nodo y empezar el recorrido
            setTimeout(() => {
              console.log('🎬 Iniciando secuencia de movimiento...');
              
              // ARREGLO: Usar los nodos locales en lugar del state que puede no estar actualizado
              const nodeForPress = nodeElements[firstNodeId];
              if (nodeForPress) {
                nodeForPress.classList.add("pressed");
                setTimeout(() => {
                  nodeForPress.classList.remove("pressed");
                  console.log('👆 Primer nodo presionado');
                  
                  // ARREGLO: Llamar startRunner con índice 0 explícitamente
                  setTimeout(() => {
                    console.log('🚀 Iniciando recorrido...');
                    startRunnerWithNodes(nodeElements, 0);
                  }, 500);
                }, performanceLevel === 'low' ? 200 : 300);
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
      if (isInitialized && Object.keys(nodes).length > 0) {
        const currentNodeId = flowPath[currentIndex];
        const currentNode = nodes[currentNodeId];
        if (currentNode) {
          const position = getNodePosition(currentNode);
          const runnerElement = document.getElementById('runner');
          if (runnerElement) {
            runnerElement.style.left = `${position.x}px`;
            runnerElement.style.top = `${position.y}px`;
          }
        }
      }
    }, 250);
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Función debounce
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };
  
  // Obtener posición de un nodo relativa al contenedor visual
  const getNodePosition = (element) => {
    const now = Date.now();
    const cacheKey = element.id;
    
    // Usar cache si está disponible y válido
    if (positionCache.has(cacheKey) && (now - cacheTimestamp) < CACHE_DURATION) {
      return positionCache.get(cacheKey);
    }
    
    // Invalidar cache si es muy viejo
    if ((now - cacheTimestamp) > CACHE_DURATION) {
      positionCache.clear();
      cacheTimestamp = now;
    }
    
    const possibleContainers = [".automation-flows"];
    const visualArea = document.querySelector(possibleContainers[0]);
    
    if (!visualArea) {
      return { x: 0, y: 0 };
    }
    
    const visualRect = visualArea.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    const position = {
      x: elementRect.left - visualRect.left + elementRect.width / 2,
      y: elementRect.top - visualRect.top + elementRect.height / 2
    };
    
    // Guardar en cache
    positionCache.set(cacheKey, position);
    return position;
  };
  
  // Animar el botón de presionar
  const pressNode = async (nodeId) => {
    const node = nodes[nodeId];
    if (!node) return;
    
    console.log(`Presionando nodo: ${nodeId}`);
    node.classList.add("pressed");
    await new Promise(resolve => 
      setTimeout(resolve, performanceLevel === 'low' ? 200 : 300)
    );
    node.classList.remove("pressed");
  };
  
  // Calcular ángulo entre dos nodos para rotación
  const calculateAngle = (fromNode, toNode) => {
    const fromPos = getNodePosition(fromNode);
    const toPos = getNodePosition(toNode);
    
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    
    return Math.atan2(dy, dx);
  };
  
  // OPTIMIZADO: Rotación usando transform directamente
  const rotateRunner = (targetAngle, duration = 300) => {
    return new Promise((resolve) => {
      const runnerElement = document.getElementById('runner');
      if (!runnerElement) return resolve();
      
      if (performanceLevel === 'low') {
        // Rotación instantánea para dispositivos lentos
        runnerElement.style.setProperty('--rotation', `${targetAngle}rad`);
        setCurrentRotation(targetAngle);
        return resolve();
      }
      
      // OPTIMIZADO: Usar requestAnimationFrame con throttling
      const startRotation = currentRotation;
      const angleDiff = targetAngle - startRotation;
      const startTime = performance.now();
      
      const animateRotation = (currentTime) => {
        // NUEVO: Frame skipping para dispositivos lentos
        if (performanceLevel === 'medium' && frameSkipCounter % 2 !== 0) {
          setFrameSkipCounter(prev => prev + 1);
          requestAnimationFrame(animateRotation);
          return;
        }
        
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentAngle = startRotation + angleDiff * progress;
        runnerElement.style.setProperty('--rotation', `${currentAngle}rad`);
        setCurrentRotation(currentAngle);
        
        if (progress < 1) {
          requestAnimationFrame(animateRotation);
        } else {
          resolve();
        }
        
        setFrameSkipCounter(prev => prev + 1);
      };
      
      requestAnimationFrame(animateRotation);
    });
  };
  
  // OPTIMIZADO: Trail con pooling
  const createMovementTrail = (fromPos, toPos, angle) => {
    if (performanceLevel === 'low') return null;
    
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const distance = Math.sqrt(dx*dx + dy*dy);
    
    if (distance < 30) return null; // Umbral aumentado
    
    const runnerContainer = document.getElementById('runner-container');
    if (!runnerContainer) return null;
    
    // NUEVO: Usar pool de trails
    let trail = trailPool.pop();
    if (!trail) {
      trail = document.createElement('div');
      trail.className = 'movement-trail';
    }
    
    // Configurar trail reutilizado
    trail.style.left = `${fromPos.x}px`;
    trail.style.top = `${fromPos.y}px`;
    trail.style.width = `${distance}px`;
    trail.style.transform = `rotate(${angle * 180 / Math.PI}deg)`;
    trail.style.opacity = '0';
    
    runnerContainer.appendChild(trail);
    
    // OPTIMIZADO: Usar timeout en lugar de requestAnimationFrame
    setTimeout(() => {
      trail.style.opacity = '0.7';
    }, 16);
    
    return trail;
  };
  
  // OPTIMIZADO: Movimiento usando transform
  const moveRunner = (fromPos, toPos, duration) => {
    return new Promise((resolve) => {
      const runnerElement = document.getElementById('runner');
      if (!runnerElement) return resolve();
      
      if (performanceLevel === 'low') {
        // Movimiento instantáneo para dispositivos muy lentos
        runnerElement.style.left = `${toPos.x}px`;
        runnerElement.style.top = `${toPos.y}px`;
        setTimeout(resolve, 100);
        return;
      }
      
      // OPTIMIZADO: Usar transform en lugar de left/top
      const startTime = performance.now();
      const deltaX = toPos.x - fromPos.x;
      const deltaY = toPos.y - fromPos.y;
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing suave
        const easeProgress = 1 - (1 - progress)**3;
        
        const currentX = fromPos.x + deltaX * easeProgress;
        const currentY = fromPos.y + deltaY * easeProgress;
        
        runnerElement.style.left = `${currentX}px`;
        runnerElement.style.top = `${currentY}px`;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  };
  
  // ARREGLO: Nueva función para iniciar el runner con nodos específicos
  const startRunnerWithNodes = (localNodes, fromIndex = 0) => {
    console.log(`🎯 startRunnerWithNodes llamado con índice: ${fromIndex}`);
    moveToNextNodeWithNodes(localNodes, fromIndex);
  };
  
  // OPTIMIZADO: Función de movimiento principal
  const moveToNextNodeWithNodes = async (localNodes, fromIndex = currentIndex) => {
    if (isAnimating) {
      console.log('⏸️ Movimiento bloqueado - isAnimating:', isAnimating);
      return;
    }
    
    setIsAnimating(true);
    console.log('🎬 Iniciando nuevo movimiento...');
    
    const toIndex = (fromIndex + 1) % flowPath.length;
    const fromNodeId = flowPath[fromIndex];
    const toNodeId = flowPath[toIndex];
    
    const fromNode = localNodes[fromNodeId];
    const toNode = localNodes[toNodeId];
    
    console.log(`🚀 Moviendo de "${fromNodeId}" (índice ${fromIndex}) a "${toNodeId}" (índice ${toIndex})`);
    
    if (!fromNode || !toNode) {
      console.log('❌ Nodo no encontrado:', { fromNode: !!fromNode, toNode: !!toNode });
      setIsAnimating(false);
      setTimeout(() => startRunnerWithNodes(localNodes, fromIndex), 1000);
      return;
    }
    
    // OPTIMIZADO: Batch de operaciones DOM
    const fromPos = getNodePosition(fromNode);
    const toPos = getNodePosition(toNode);
    
    console.log(`📏 Posiciones: desde (${fromPos.x}, ${fromPos.y}) hasta (${toPos.x}, ${toPos.y})`);
    
    if (fromPos.x === 0 && fromPos.y === 0 && toPos.x === 0 && toPos.y === 0) {
      console.log('❌ Posiciones inválidas, saltando movimiento');
      setIsAnimating(false);
      setTimeout(() => startRunnerWithNodes(localNodes, fromIndex), 1000);
      return;
    }
    
    const runnerElement = document.getElementById('runner');
    
    // OPTIMIZADO: Reducir cálculos de ángulo solo si necesario
    let trail = null;
    if (performanceLevel !== 'low') {
      const angle = calculateAngle(fromNode, toNode);
      console.log(`🔄 Rotando runner con ángulo: ${angle}`);
      await rotateRunner(angle, performanceLevel === 'medium' ? 100 : 200);
      trail = createMovementTrail(fromPos, toPos, angle);
    }
    
    // OPTIMIZADO: Estados visuales agrupados
    if (runnerElement) {
      runnerElement.classList.add('moving');
      console.log('💨 Estado "moving" activado');
    }
    
    // OPTIMIZADO: Duración adaptativa más agresiva
    const distance = Math.sqrt((toPos.x - fromPos.x)**2 + (toPos.y - fromPos.y)**2);
    const duration = performanceLevel === 'low' ? 200 :
                    performanceLevel === 'medium' ? Math.min(400, distance * 0.8) :
                    Math.min(800, distance * 1.2);
    
    console.log(`⚡ Movimiento: distancia=${distance.toFixed(2)}px, duración=${duration}ms`);
    
    await moveRunner(fromPos, toPos, duration);
    console.log('✅ Movimiento completado');
    
    // OPTIMIZADO: Cleanup agrupado
    if (runnerElement) {
      runnerElement.classList.remove('moving');
      console.log('🛑 Estado "moving" desactivado');
    }
    
    if (performanceLevel !== 'low') {
      console.log('🔄 Volviendo a rotación original...');
      await rotateRunner(0, 200);
    }
    
    // OPTIMIZADO: Trail cleanup con pooling
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
    
    // OPTIMIZADO: Press node más eficiente
    console.log(`👆 Presionando nodo destino: ${toNodeId}`);
    await pressNodeLocal(toNodeId, localNodes);
    
    // ARREGLADO: Actualizar el currentIndex en el state Y usar el nuevo índice para la siguiente iteración
    setCurrentIndex(toIndex);
    setIsAnimating(false);
    
    console.log(`✅ Movimiento completado. Nuevo índice: ${toIndex}`);
    
    // OPTIMIZADO: Pausa adaptativa
    const pauseDuration = performanceLevel === 'low' ? 300 :
                         performanceLevel === 'medium' ? 500 : 800;
    
    console.log(`⏱️ Pausa de ${pauseDuration}ms antes del siguiente movimiento`);
    
    // ARREGLO: Pasar el nuevo índice directamente en lugar de depender del state
    setTimeout(() => startRunnerWithNodes(localNodes, toIndex), pauseDuration);
  };
  
  // NUEVO: Función para presionar nodos usando nodos locales
  const pressNodeLocal = async (nodeId, localNodes) => {
    const node = localNodes[nodeId];
    if (!node) return;
    
    console.log(`👆 Presionando nodo: ${nodeId}`);
    node.classList.add("pressed");
    await new Promise(resolve => 
      setTimeout(resolve, performanceLevel === 'low' ? 200 : 300)
    );
    node.classList.remove("pressed");
  };
  
  // Función original como fallback (usando state nodes)
  const moveToNextNode = async () => {
    if (isAnimating || !isInitialized) {
      console.log('⏸️ Movimiento bloqueado - isAnimating:', isAnimating, 'isInitialized:', isInitialized);
      return;
    }
    
    setIsAnimating(true);
    console.log('🎬 Iniciando nuevo movimiento...');
    
    const fromIndex = currentIndex;
    const toIndex = (currentIndex + 1) % flowPath.length;
    
    const fromNodeId = flowPath[fromIndex];
    const toNodeId = flowPath[toIndex];
    
    const fromNode = nodes[fromNodeId];
    const toNode = nodes[toNodeId];
    
    console.log(`🚀 Moviendo de "${fromNodeId}" (índice ${fromIndex}) a "${toNodeId}" (índice ${toIndex})`);
    
    if (!fromNode || !toNode) {
      console.log('❌ Nodo no encontrado:', { fromNode: !!fromNode, toNode: !!toNode });
      setIsAnimating(false);
      setTimeout(() => startRunner(), 1000);
      return;
    }
    
    // Obtener posiciones
    const fromPos = getNodePosition(fromNode);
    const toPos = getNodePosition(toNode);
    
    console.log(`📏 Posiciones: desde (${fromPos.x}, ${fromPos.y}) hasta (${toPos.x}, ${toPos.y})`);
    
    // Verificar que las posiciones sean válidas
    if (fromPos.x === 0 && fromPos.y === 0 && toPos.x === 0 && toPos.y === 0) {
      console.log('❌ Posiciones inválidas, saltando movimiento');
      setIsAnimating(false);
      setTimeout(() => startRunner(), 1000);
      return;
    }
    
    // Calcular ángulo para rotación
    const angle = calculateAngle(fromNode, toNode);
    console.log(`🔄 Ángulo de rotación: ${angle} rad (${angle * 180 / Math.PI}°)`);
    
    // Crear trail de movimiento
    const trail = createMovementTrail(fromPos, toPos, angle);
    
    const runnerElement = document.getElementById('runner');
    
    // Rotar hacia la dirección de movimiento
    console.log('🔄 Rotando runner...');
    await rotateRunner(angle, 200);
    
    // Activar estado "moving"
    if (runnerElement) {
      runnerElement.classList.add('moving');
      console.log('💨 Estado "moving" activado');
    }
    
    // Velocidad de movimiento según nivel de rendimiento y distancia
    const distance = Math.sqrt((toPos.x - fromPos.x)**2 + (toPos.y - fromPos.y)**2);
    const baseSpeed = performanceLevel === 'low' ? 400 : 600;
    const duration = Math.max(400, Math.min(1500, distance / baseSpeed * 1000));
    
    console.log(`⚡ Movimiento: distancia=${distance.toFixed(2)}px, duración=${duration}ms`);
    
    // Mover runner al siguiente nodo
    await moveRunner(fromPos, toPos, duration);
    console.log('✅ Movimiento completado');
    
    // Quitar estado "moving"
    if (runnerElement) {
      runnerElement.classList.remove('moving');
      console.log('🛑 Estado "moving" desactivado');
    }
    
    // Volver a rotación original
    console.log('🔄 Volviendo a rotación original...');
    await rotateRunner(0, 300);
    
    // Eliminar trail
    if (trail) {
      trail.classList.remove('active');
      setTimeout(() => {
        if (trail.parentNode) {
          trail.parentNode.removeChild(trail);
        }
      }, 300);
    }
    
    // Presionar el nodo destino
    console.log(`👆 Presionando nodo destino: ${toNodeId}`);
    await pressNode(toNodeId);
    
    // Avanzar al siguiente nodo
    setCurrentIndex(toIndex);
    setIsAnimating(false);
    
    console.log(`✅ Movimiento completado. Nuevo índice: ${toIndex}`);
    
    // Pausa entre movimientos
    const pauseDuration = performanceLevel === 'low' ? 800 : 1000;
    console.log(`⏱️ Pausa de ${pauseDuration}ms antes del siguiente movimiento`);
    setTimeout(() => startRunner(), pauseDuration);
  };
  
  // Iniciar/continuar el flujo de animación (función original como fallback)
  const startRunner = () => {
    console.log('🎯 startRunner llamado', { isAnimating, isInitialized });
    if (!isAnimating && isInitialized) {
      moveToNextNode();
    } else {
      console.log('⏸️ startRunner bloqueado');
    }
  };
  
  // Este componente solo maneja la lógica, no renderiza elementos visuales
  return null;
};

export default AnimatedRunner;
