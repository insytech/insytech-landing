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

// Detectar nivel de rendimiento del dispositivo
const detectPerformanceLevel = () => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isSmallScreen = window.innerWidth < 768;
  
  if ((isMobile && isSmallScreen) || isSafari) return 'low';
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
    // Buscar diferentes contenedores posibles
    const possibleContainers = [
      ".hero-visual-area",
      ".automation-flows", 
      ".automation-hero",
      "body"
    ];
    
    let visualArea = null;
    for (const selector of possibleContainers) {
      visualArea = document.querySelector(selector);
      if (visualArea) {
        console.log(`📦 Usando contenedor: ${selector}`);
        break;
      }
    }
    
    if (!visualArea) {
      console.log('❌ No se encontró contenedor válido');
      return { x: 0, y: 0 };
    }
    
    const visualRect = visualArea.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    const position = {
      x: elementRect.left - visualRect.left + elementRect.width / 2,
      y: elementRect.top - visualRect.top + elementRect.height / 2
    };
    
    console.log(`📍 Posición calculada: (${position.x}, ${position.y})`);
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
  
  // Función para rotar el runner suavemente
  const rotateRunner = (targetAngle, duration = 300) => {
    return new Promise((resolve) => {
      const runnerElement = document.getElementById('runner');
      if (!runnerElement) return resolve();
      
      if (performanceLevel === 'low') {
        // Rotación instantánea en dispositivos de bajo rendimiento
        setCurrentRotation(targetAngle);
        runnerElement.style.setProperty('--rotation', `${targetAngle}rad`);
        return resolve();
      }
      
      const startRotation = currentRotation;
      const angleDiff = targetAngle - startRotation;
      const startTime = performance.now();
      
      const animateRotation = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentAngle = startRotation + angleDiff * progress;
        setCurrentRotation(currentAngle);
        runnerElement.style.setProperty('--rotation', `${currentAngle}rad`);
        
        if (progress < 1) {
          requestAnimationFrame(animateRotation);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animateRotation);
    });
  };
  
  // Crear trail de movimiento
  const createMovementTrail = (fromPos, toPos, angle) => {
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const distance = Math.sqrt(dx*dx + dy*dy);
    
    // Solo crear trail en rendimiento medio/alto
    if (performanceLevel === 'low' || distance < 50) {
      return null;
    }
    
    const runnerContainer = document.getElementById('runner-container');
    if (!runnerContainer) return null;
    
    const trail = document.createElement('div');
    trail.className = 'movement-trail';
    trail.style.left = `${fromPos.x}px`;
    trail.style.top = `${fromPos.y}px`;
    trail.style.width = `${distance}px`;
    trail.style.transform = `rotate(${angle * 180 / Math.PI}deg)`;
    trail.style.transformOrigin = '0 50%';
    
    runnerContainer.appendChild(trail);
    
    // Activar trail
    requestAnimationFrame(() => {
      trail.classList.add('active');
    });
    
    return trail;
  };
  
  // Función para mover el runner usando CSS transitions
  const moveRunner = (fromPos, toPos, duration) => {
    return new Promise((resolve) => {
      const runnerElement = document.getElementById('runner');
      if (!runnerElement) return resolve();
      
      // Configurar transición CSS
      runnerElement.style.transition = `left ${duration}ms ease-in-out, top ${duration}ms ease-in-out`;
      
      // Aplicar nueva posición
      runnerElement.style.left = `${toPos.x}px`;
      runnerElement.style.top = `${toPos.y}px`;
      
      // Resolver cuando termine la transición
      setTimeout(() => {
        runnerElement.style.transition = '';
        resolve();
      }, duration);
    });
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
  
  // ARREGLO: Nueva función para iniciar el runner con nodos específicos
  const startRunnerWithNodes = (localNodes, fromIndex = 0) => {
    console.log(`🎯 startRunnerWithNodes llamado con índice: ${fromIndex}`);
    moveToNextNodeWithNodes(localNodes, fromIndex);
  };
  
  // ARREGLO: Nueva función que usa nodos locales y acepta índice específico
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
    
    // Obtener posiciones
    const fromPos = getNodePosition(fromNode);
    const toPos = getNodePosition(toNode);
    
    console.log(`📏 Posiciones: desde (${fromPos.x}, ${fromPos.y}) hasta (${toPos.x}, ${toPos.y})`);
    
    // Verificar que las posiciones sean válidas
    if (fromPos.x === 0 && fromPos.y === 0 && toPos.x === 0 && toPos.y === 0) {
      console.log('❌ Posiciones inválidas, saltando movimiento');
      setIsAnimating(false);
      setTimeout(() => startRunnerWithNodes(localNodes, fromIndex), 1000);
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
    await pressNodeLocal(toNodeId, localNodes);
    
    // ARREGLO: Actualizar el currentIndex en el state Y usar el nuevo índice para la siguiente iteración
    setCurrentIndex(toIndex);
    setIsAnimating(false);
    
    console.log(`✅ Movimiento completado. Nuevo índice: ${toIndex}`);
    
    // Pausa entre movimientos
    const pauseDuration = performanceLevel === 'low' ? 800 : 1000;
    console.log(`⏱️ Pausa de ${pauseDuration}ms antes del siguiente movimiento`);
    
    // ARREGLO: Pasar el nuevo índice directamente en lugar de depender del state
    setTimeout(() => startRunnerWithNodes(localNodes, toIndex), pauseDuration);
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
    const pauseDuration = performanceLevel === 'low' ? 800 : 1000; // Aumenté la pausa para ver mejor
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
