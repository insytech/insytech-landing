import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

// Conexiones predefinidas COMPLETAS para evitar cálculos en tiempo real
const connectionDefinitions = [
  // CONEXIONES PRINCIPALES (las que faltaban)
  {
    from: "node-trigger",
    to: "node-ai",
    type: "line",
    importance: "primary",
  },
  {
    from: "node-ai",
    to: "node-action",
    type: "line",
    importance: "primary",
  },
  {
    from: "node-action",
    to: "node-notify",
    type: "line",
    importance: "primary",
  },
  // CONEXIONES SECUNDARIAS
  {
    from: "node-action",
    to: "node-pipeline",
    type: "curve",
    importance: "secondary",
  },
  {
    from: "node-pipeline",
    to: "node-email",
    type: "curve",
    importance: "secondary",
  },
  {
    from: "node-pipeline",
    to: "node-chat",
    type: "curve",
    importance: "secondary",
  },
  {
    from: "node-action",
    to: "node-whatsapp",
    type: "curve",
    importance: "secondary",
  },
  {
    from: "node-action",
    to: "node-targeting",
    type: "curve",
    importance: "secondary",
  },
  // CONEXIONES TERCIARIAS
  {
    from: "node-whatsapp",
    to: "node-api",
    type: "curve",
    importance: "tertiary",
  },
  {
    from: "node-api",
    to: "node-crm",
    type: "line",
    importance: "tertiary",
  },
  {
    from: "node-targeting",
    to: "node-forms",
    type: "curve",
    importance: "tertiary",
  },
  
];

const colors = {
  primary: ["#06ffa5", "#00b5e2", "#0066ff"], // Añadido tercer color para más riqueza
  secondary: ["#00b5e2", "#0066ff", "#8b5cf6"],
  tertiary: ["#a78bfa", "#8b5cf6", "#6366f1"]
};

// Detectar nivel de rendimiento del dispositivo
const detectPerformanceLevel = () => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isSmallScreen = window.innerWidth < 768;
  
  let level = 'high';
  if ((isMobile && isSmallScreen) || isSafari) {
    level = 'low';
  } else if (isMobile || isSmallScreen) {
    level = 'medium';
  }
  
  return level;
};

// NUEVO: Throttling para resize
let resizeTimeout;
const RESIZE_DELAY = 300;

const AnimatedFlowConnections = () => {
  const svgRef = useRef(null);
  const [connections, setConnections] = useState([]);
  const [performanceLevel, setPerformanceLevel] = useState('high');
  
  // Cálculo inicial de conexiones
  useEffect(() => {
    const performance = detectPerformanceLevel();
    setPerformanceLevel(performance);
    
    // OPTIMIZADO: Límites más agresivos según rendimiento
    const connectionLimit = 
      performance === 'low' ? 6 :      // Reducido de 10
      performance === 'medium' ? 10 :  // Reducido de 14
      Math.min(connectionDefinitions.length, 12); // Máximo absoluto
    
    const sortedConnections = [...connectionDefinitions]
      .sort((a, b) => {
        const importanceOrder = { primary: 3, secondary: 2, tertiary: 1 };
        return importanceOrder[b.importance] - importanceOrder[a.importance];
      })
      .slice(0, connectionLimit);
      
    const initializeConnections = () => {
      const firstNode = document.getElementById('node-trigger');
      if (firstNode) {
        calculateConnections(sortedConnections);
      } else {
        setTimeout(initializeConnections, 200); // Aumentado delay
      }
    };
    
    initializeConnections();
    
    // OPTIMIZADO: Resize con throttling más agresivo
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        calculateConnections(sortedConnections);
      }, RESIZE_DELAY);
    };
    
    window.addEventListener('resize', handleResize, { passive: true });
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);
  
  // Función debounce para limitar eventos de resize
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
  
  // OPTIMIZADO: Cálculo de conexiones más eficiente
  const calculateConnections = (connectionsToCalc) => {
    // NUEVO: RequestIdleCallback para no bloquear el hilo principal
    const performCalculation = () => {
      const flowsContainer = document.querySelector(".automation-flows");
      if (!flowsContainer) return;
      
      const flowsRect = flowsContainer.getBoundingClientRect();
      
      // OPTIMIZADO: Batch DOM reads
      const nodeData = new Map();
      connectionsToCalc.forEach(conn => {
        if (!nodeData.has(conn.from)) {
          const fromNode = document.getElementById(conn.from);
          if (fromNode) {
            nodeData.set(conn.from, {
              element: fromNode,
              rect: fromNode.getBoundingClientRect()
            });
          }
        }
        if (!nodeData.has(conn.to)) {
          const toNode = document.getElementById(conn.to);
          if (toNode) {
            nodeData.set(conn.to, {
              element: toNode,
              rect: toNode.getBoundingClientRect()
            });
          }
        }
      });
      
      const calculatedConnections = connectionsToCalc.map((conn, index) => {
        const fromData = nodeData.get(conn.from);
        const toData = nodeData.get(conn.to);
        
        if (!fromData || !toData) return null;
        
        // OPTIMIZADO: Cálculos simplificados para dispositivos lentos
        if (performanceLevel === 'low') {
          const fromX = ((fromData.rect.left - flowsRect.left + fromData.rect.width/2) / flowsRect.width) * 100;
          const fromY = ((fromData.rect.top - flowsRect.top + fromData.rect.height/2) / flowsRect.height) * 100;
          const toX = ((toData.rect.left - flowsRect.left + toData.rect.width/2) / flowsRect.width) * 100;
          const toY = ((toData.rect.top - flowsRect.top + toData.rect.height/2) / flowsRect.height) * 100;
          
          return {
            id: `path-${index}`,
            pathData: `M ${fromX.toFixed(1)} ${fromY.toFixed(1)} L ${toX.toFixed(1)} ${toY.toFixed(1)}`,
            importance: conn.importance,
            type: conn.type
          };
        }
        
        // Cálculos completos para dispositivos rápidos
        const fromNode = document.getElementById(conn.from);
        const toNode = document.getElementById(conn.to);
        
        if (!fromNode || !toNode) return null;
        
        const fromRect = fromNode.getBoundingClientRect();
        const toRect = toNode.getBoundingClientRect();
        
        // Calcular posiciones relativas
        const fromCenterX = ((fromRect.left - flowsRect.left + fromRect.width/2) / flowsRect.width) * 100;
        const fromCenterY = ((fromRect.top - flowsRect.top + fromRect.height/2) / flowsRect.height) * 100;
        const toCenterX = ((toRect.left - flowsRect.left + toRect.width/2) / flowsRect.width) * 100;
        const toCenterY = ((toRect.top - flowsRect.top + toRect.height/2) / flowsRect.height) * 100;
        
        // Calcular tamaños relativos
        const fromWidthPercent = (fromRect.width / flowsRect.width) * 100;
        const fromHeightPercent = (fromRect.height / flowsRect.height) * 100;
        const toWidthPercent = (toRect.width / flowsRect.width) * 100;
        const toHeightPercent = (toRect.height / flowsRect.height) * 100;
        
        // Simplificar cálculos
        const dx = toCenterX - fromCenterX;
        const dy = toCenterY - fromCenterY;
        const angle = Math.atan2(dy, dx);
        
        // MEJORADO: Determinar puntos de conexión en bordes de nodos con mejor precisión
        let fromX;
        let fromY;
        let toX;
        let toY;
        
        // Para líneas principales, usar conexiones más precisas
        if (conn.importance === 'primary') {
          // Conexiones horizontales directas para líneas principales
          if (Math.abs(dx) > Math.abs(dy)) {
            fromX = fromCenterX + Math.sign(dx) * (fromWidthPercent / 2);
            fromY = fromCenterY;
            toX = toCenterX - Math.sign(dx) * (toWidthPercent / 2);
            toY = toCenterY;
          } else {
            fromX = fromCenterX;
            fromY = fromCenterY + Math.sign(dy) * (fromHeightPercent / 2);
            toX = toCenterX;
            toY = toCenterY - Math.sign(dy) * (toHeightPercent / 2);
          }
        } else {
          // Para conexiones secundarias y terciarias, usar el método original
          if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
            fromX = fromCenterX + Math.sign(dx) * fromWidthPercent/2;
            fromY = fromCenterY + Math.tan(angle) * Math.sign(dx) * fromWidthPercent/2;
            toX = toCenterX - Math.sign(dx) * toWidthPercent/2;
            toY = toCenterY - Math.tan(angle) * Math.sign(dx) * toWidthPercent/2;
          } else {
            fromY = fromCenterY + Math.sign(dy) * fromHeightPercent/2;
            fromX = fromCenterX + (Math.sign(dy) * fromHeightPercent/2) / Math.tan(angle);
            toY = toCenterY - Math.sign(dy) * toHeightPercent/2;
            toX = toCenterX - (Math.sign(dy) * toHeightPercent/2) / Math.tan(angle);
          }
        }
        
        // Prevenir NaN
        if (isNaN(fromX) || isNaN(fromY) || isNaN(toX) || isNaN(toY)) {
          fromX = fromCenterX;
          fromY = fromCenterY;
          toX = toCenterX;
          toY = toCenterY;
        }
        
        // NUEVO: Generar path data con curvatura sutil para líneas tipo "line"
        let pathData;
        if (conn.type === "curve" && performanceLevel !== 'low') {
          // Curvas normales para conexiones secundarias y terciarias
          const distance = Math.sqrt(dx*dx + dy*dy);
          const curveFactor = conn.importance === 'primary' ? 
            Math.min(Math.max(distance * 0.1, 3), 15) : 
            Math.min(Math.max(distance * 0.15, 5), 20);
          
          const controlX1 = fromX + (toX - fromX) * 0.3;
          const controlY1 = fromCenterY > toCenterY ? 
            fromY - curveFactor : fromY + curveFactor;
          
          const controlX2 = fromX + (toX - fromX) * 0.7;
          const controlY2 = fromCenterY > toCenterY ?
            toY - curveFactor : toY + curveFactor;
          
          pathData = `M ${fromX.toFixed(2)} ${fromY.toFixed(2)} C ${controlX1.toFixed(2)} ${controlY1.toFixed(2)}, ${controlX2.toFixed(2)} ${controlY2.toFixed(2)}, ${toX.toFixed(2)} ${toY.toFixed(2)}`;
        } else if (conn.type === "line") {
          // NUEVO: Líneas con curvatura sutil hacia arriba
          const midX = (fromX + toX) / 2;
          const midY = (fromY + toY) / 2;
          
          // Calcular curvatura sutil hacia arriba (2-4 píxeles en coordenadas del viewBox)
          const distance = Math.sqrt(dx*dx + dy*dy);
          const curvature = Math.min(distance * 0.02, 2); // Muy sutil, máximo 2 unidades
          const curveY = midY - curvature; // Hacia arriba
          
          // Usar curva cuadrática para la curvatura sutil
          pathData = `M ${fromX.toFixed(2)} ${fromY.toFixed(2)} Q ${midX.toFixed(2)} ${curveY.toFixed(2)} ${toX.toFixed(2)} ${toY.toFixed(2)}`;
        } else {
          // Línea recta como fallback
          pathData = `M ${fromX.toFixed(2)} ${fromY.toFixed(2)} L ${toX.toFixed(2)} ${toY.toFixed(2)}`;
        }
        
        return {
          id: `path-${index}`,
          pathData,
          importance: conn.importance,
          type: conn.type
        };
      }).filter(Boolean);
      
      setConnections(calculatedConnections);
    };
    
    // NUEVO: Usar requestIdleCallback si está disponible
    if (window.requestIdleCallback && performanceLevel !== 'high') {
      requestIdleCallback(performCalculation, { timeout: 100 });
    } else {
      performCalculation();
    }
  };
  
  // Variantes de animación mejoradas para los paths
  const pathVariants = {
    initial: { 
      pathLength: 0,
      opacity: 0 
    },
    animate: importance => ({ 
      pathLength: 1,
      opacity: importance === 'primary' ? 0.9 : 
              importance === 'secondary' ? 0.7 : 0.5,
      transition: { 
        pathLength: { 
          type: "spring", 
          duration: importance === 'primary' ? 1.2 : 
                   importance === 'secondary' ? 1.5 : 1.8,
          bounce: 0 
        },
        opacity: { duration: 0.4, delay: 0.2 }
      }
    })
  };
  
  // Variantes de animación mejoradas para las partículas
  const particleVariants = {
    initial: { opacity: 0, scale: 0 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        opacity: { duration: 0.3, delay: 1 },
        scale: { duration: 0.3, delay: 1 }
      }
    }
  };

  // Variantes para el movimiento de partículas
  const particleMotionVariants = {
    animate: {
      offsetDistance: ['0%', '100%'],
      transition: {
        duration: performanceLevel === 'high' ? 4 : 6,
        ease: "linear",
        repeat: Infinity,
        repeatType: "loop",
        delay: Math.random() * 2
      }
    }
  };
  
  return (
    <svg
      ref={svgRef}
      className={`dynamic-connections-overlay performance-${performanceLevel}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 4,
        overflow: 'visible'
      }}
    >
      <defs>
        {performanceLevel !== 'low' && connections.map((conn, index) => {
          if (performanceLevel === 'medium' && conn.importance === 'tertiary') {
            return null;
          }
          
          return (
            <linearGradient
              key={`gradient-${index}`}
              id={`lineGradient-${index}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor={colors[conn.importance][0]} stopOpacity="0.9" />
              <stop offset="50%" stopColor={colors[conn.importance][1]} stopOpacity="1" />
              <stop offset="100%" stopColor={colors[conn.importance][2]} stopOpacity="0.8" />
            </linearGradient>
          );
        })}

        {/* NUEVO: Gradientes especiales para líneas tipo "line" */}
        {connections.map((conn, index) => {
          if (conn.type !== 'line' || performanceLevel === 'low') return null;
          
          return (
            <linearGradient
              key={`line-gradient-${index}`}
              id={`lineSpecialGradient-${index}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor={colors[conn.importance][0]} stopOpacity="0.3" />
              <stop offset="20%" stopColor={colors[conn.importance][0]} stopOpacity="0.8" />
              <stop offset="50%" stopColor={colors[conn.importance][1]} stopOpacity="1" />
              <stop offset="80%" stopColor={colors[conn.importance][2]} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colors[conn.importance][2]} stopOpacity="0.3" />
            </linearGradient>
          );
        })}
      </defs>
      
      {connections.map((conn, index) => {
        // MEJORADO: Anchos más delgados y elegantes
        const strokeWidth = 
          conn.importance === 'primary' ? 
            (performanceLevel === 'low' ? 1.4 : 1.8) : // Reducido de 2.2 a 1.8
          conn.importance === 'secondary' ? 
            (performanceLevel === 'low' ? 1 : 1.2) : // Reducido de 1.5 a 1.2
            (performanceLevel === 'low' ? 0.7 : 0.9);

        // MEJORADO: Opacidades más balanceadas
        const baseOpacity = 
          conn.importance === 'primary' ? 0.95 :
          conn.importance === 'secondary' ? 0.8 :
          0.65;

        // NUEVO: Gradientes especiales para líneas tipo "line"
        const strokeColor = conn.type === 'line' ? 
          (performanceLevel === 'low' ? colors[conn.importance][1] : `url(#lineSpecialGradient-${index})`) : 
          (performanceLevel === 'low' ? colors[conn.importance][0] : `url(#lineGradient-${index})`);
            
        return (
          <g key={conn.id} className={`path-group ${conn.importance}-connection`}>
            {/* NUEVO: Capa de sombra más sutil para líneas principales */}
            {(conn.importance === 'primary' && performanceLevel === 'high') && (
              <motion.path
                d={conn.pathData}
                stroke={colors[conn.importance][0]}
                strokeWidth={strokeWidth + 0.5} // Reducido de 0.8 a 0.5
                fill="none"
                strokeLinecap="round"
                opacity="0.1" // Reducido de 0.15 a 0.1
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ 
                  pathLength: 1, 
                  opacity: 0.1,
                  transition: { 
                    pathLength: { duration: 1.2, ease: "easeOut" },
                    opacity: { duration: 0.4, delay: 0.3 }
                  }
                }}
              />
            )}
            
            {/* Línea principal - MEJORADA */}
            <motion.path
              id={conn.id}
              d={conn.pathData}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={performanceLevel === 'low' ? 'none' : 
                              conn.importance === 'primary' ? 'none' : 
                              conn.importance === 'secondary' ? '5 2' : '3 2'}
              opacity={baseOpacity}
              initial="initial"
              animate="animate"
              custom={conn.importance}
              variants={pathVariants}
              style={{
                // MEJORADO: Efectos más sutiles
                filter: conn.importance === 'primary' ? 
                  'drop-shadow(0 0 1px rgba(6, 255, 165, 0.3))' : 
                  conn.importance === 'secondary' ?
                  'drop-shadow(0 0 0.5px rgba(0, 181, 226, 0.2))' : 'none'
              }}
            />
            
            {/* NUEVO: Brillo interno más sutil para líneas principales */}
            {(conn.importance === 'primary' && performanceLevel === 'high') && (
              <motion.path
                d={conn.pathData}
                stroke="rgba(255, 255, 255, 0.4)" // Reducido de 0.6 a 0.4
                strokeWidth={strokeWidth * 0.25} // Reducido de 0.3 a 0.25
                fill="none"
                strokeLinecap="round"
                opacity="0.6" // Reducido de 0.8 a 0.6
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ 
                  pathLength: 1, 
                  opacity: 0.6,
                  transition: { 
                    pathLength: { duration: 1.5, ease: "easeOut", delay: 0.2 },
                    opacity: { duration: 0.3, delay: 0.8 }
                  }
                }}
              />
            )}
            
            {/* Partículas de movimiento - MEJORADAS */}
            {(conn.importance !== 'tertiary' && performanceLevel !== 'low') && (
              <motion.circle
                cx="0"
                cy="0"
                r={conn.importance === 'primary' ? "0.9" : "0.7"}
                fill={conn.importance === 'primary' ? "#06ffa5" : "#00b5e2"}
                initial="initial"
                animate="animate"
                variants={particleVariants}
                style={{
                  filter: 'drop-shadow(0 0 3px currentColor)',
                  opacity: 0.9
                }}
              >
                <motion.animateMotion
                  dur={`${performanceLevel === 'high' ? 3 + Math.random() * 2 : 5}s`}
                  repeatCount="indefinite"
                  begin={`${index * 0.3}s`}
                  calcMode="linear"
                >
                  <mpath href={`#${conn.id}`} />
                </motion.animateMotion>
              </motion.circle>
            )}
            
            {/* Partícula secundaria más elegante */}
            {(conn.importance === 'primary' && performanceLevel === 'high') && (
              <motion.circle
                cx="0"
                cy="0"
                r="0.4"
                fill="rgba(255, 255, 255, 0.8)"
                initial="initial"
                animate="animate"
                variants={particleVariants}
                style={{
                  filter: 'drop-shadow(0 0 2px rgba(6, 255, 165, 0.6))'
                }}
              >
                <motion.animateMotion
                  dur={`${6 + Math.random() * 2}s`}
                  repeatCount="indefinite"
                  begin={`${index * 0.3 + 3}s`}
                  calcMode="linear"
                >
                  <mpath href={`#${conn.id}`} />
                </motion.animateMotion>
              </motion.circle>
            )}
          </g>
        );
      })}
    </svg>
  );
};

export default AnimatedFlowConnections;

