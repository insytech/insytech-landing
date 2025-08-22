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
  primary: ["#06ffa5", "#00b5e2"],
  secondary: ["#00b5e2", "#0066ff"],
  tertiary: ["#a78bfa", "#8b5cf6"]
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

const AnimatedFlowConnections = () => {
  const svgRef = useRef(null);
  const [connections, setConnections] = useState([]);
  const [performanceLevel, setPerformanceLevel] = useState('high');
  
  // Cálculo inicial de conexiones
  useEffect(() => {
    const performance = detectPerformanceLevel();
    setPerformanceLevel(performance);
    
    // Número de conexiones según rendimiento - AUMENTADO para mostrar más conexiones
    const connectionLimit = 
      performance === 'low' ? 10 :
      performance === 'medium' ? 14 : 
      connectionDefinitions.length;
    
    // Ordenar por importancia y limitar cantidad
    const sortedConnections = [...connectionDefinitions]
      .sort((a, b) => {
        const importanceOrder = { primary: 3, secondary: 2, tertiary: 1 };
        return importanceOrder[b.importance] - importanceOrder[a.importance];
      })
      .slice(0, connectionLimit);
      
    // Esperar a que los nodos estén renderizados
    const initializeConnections = () => {
      const firstNode = document.getElementById('node-trigger');
      if (firstNode) {
        calculateConnections(sortedConnections);
      } else {
        // Reintentar después de un breve delay
        setTimeout(initializeConnections, 100);
      }
    };
    
    initializeConnections();
    
    // Agregar listener de resize con debounce
    const handleResize = debounce(() => {
      calculateConnections(sortedConnections);
    }, 200);
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
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
  
  // Calcula las conexiones una sola vez (no en cada frame)
  const calculateConnections = (connectionsToCalc) => {
    const flowsContainer = document.querySelector(".automation-flows");
    if (!flowsContainer) return;
    
    const flowsRect = flowsContainer.getBoundingClientRect();
    
    const calculatedConnections = connectionsToCalc.map((conn, index) => {
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
      
      // Generar path data según tipo - convertir porcentajes a coordenadas del viewBox
      let pathData;
      if (conn.type === "curve" && performanceLevel !== 'low') {
        // MEJORADO: Curvas más suaves para conexiones principales
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
      } else {
        // Línea recta para conexiones principales y rendimiento bajo
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
              <stop offset="0%" stopColor={colors[conn.importance][0]} />
              <stop offset="100%" stopColor={colors[conn.importance][1]} />
            </linearGradient>
          );
        })}
        
        {/* Filtros de glow mejorados */}
        {performanceLevel === 'high' && (
          <>
            <filter id="glow-primary" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="glow-secondary" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </>
        )}
      </defs>
      
      {connections.map((conn, index) => {
        // MEJORADO: Mejor grosor para líneas principales
        const strokeWidth = 
          conn.importance === 'primary' ? 
            (performanceLevel === 'low' ? 1.5 : 2) :
          conn.importance === 'secondary' ? 
            (performanceLevel === 'low' ? 0.8 : 1) :
            (performanceLevel === 'low' ? 0.5 : 0.7);
            
        return (
          <g key={conn.id} className={`path-group ${conn.importance}-connection`}>
            <motion.path
              id={conn.id}
              d={conn.pathData}
              stroke={performanceLevel === 'low' ? colors[conn.importance][0] : `url(#lineGradient-${index})`}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={performanceLevel === 'low' ? 'none' : 
                              conn.importance === 'primary' ? '15 5' : 
                              conn.importance === 'secondary' ? '10 4' : '6 3'}
              filter={performanceLevel === 'high' && conn.importance !== 'tertiary' ? 
                     `url(#glow-${conn.importance})` : 'none'}
              initial="initial"
              animate="animate"
              custom={conn.importance}
              variants={pathVariants}
            />
            
            {(conn.importance !== 'tertiary' && performanceLevel !== 'low') && (
              <motion.circle
                cx="0"
                cy="0"
                r={conn.importance === 'primary' ? "0.8" : "0.6"}
                fill={conn.importance === 'primary' ? "#06ffa5" : "#00b5e2"}
                initial="initial"
                animate="animate"
                variants={particleVariants}
              >
                <motion.animateMotion
                  dur={`${performanceLevel === 'high' ? 3 + Math.random() * 2 : 5}s`}
                  repeatCount="indefinite"
                  begin={`${index * 0.2}s`}
                  calcMode="linear"
                >
                  <mpath href={`#${conn.id}`} />
                </motion.animateMotion>
              </motion.circle>
            )}
            
            {(conn.importance === 'primary' && performanceLevel === 'high') && (
              <motion.circle
                cx="0"
                cy="0"
                r="0.8"
                fill="#06ffa5"
                fillOpacity="0.6"
                initial="initial"
                animate="animate"
                variants={particleVariants}
              >
                <motion.animateMotion
                  dur={`${4 + Math.random() * 2}s`}
                  repeatCount="indefinite"
                  begin={`${index * 0.2 + 1.5}s`}
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
