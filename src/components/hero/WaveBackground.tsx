import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface WaveBackgroundProps {
    className?: string;
    colors?: {
        dark?: string;
        brand?: string;
        cyan?: string;
        bright?: string;
        accent?: string;
    };
    timeOffset?: number;
    speed?: number;
}

export default function WaveBackground({
    className = '',
    colors = {},
    timeOffset = 0,
    speed = 0.0004
}: WaveBackgroundProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const animationRef = useRef<number>(0);

    // Default Brand Colors
    const defaultColors = {
        dark: '#00030f',
        brand: '#003b85',
        cyan: '#00a6e0',
        bright: '#66d9ff',
        accent: '#ff7a00'
    };

    const finalColors = { ...defaultColors, ...colors };

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene setup
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;

        // Renderer Optimization: Lower pixel ratio and disable antialias for background use
        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: false,
            powerPreference: 'high-performance'
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Full-screen quad geometry
        const geometry = new THREE.PlaneGeometry(2, 2);

        // Helper to convert hex to THREE.Color normalized vec3
        const parseColor = (hex: string) => new THREE.Color(hex);

        // Flowing silk/marble stripes shader
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: timeOffset },
                uResolution: { value: new THREE.Vector2(width, height) },
                uColorDark: { value: parseColor(finalColors.dark) },
                uColorBrand: { value: parseColor(finalColors.brand) },
                uColorCyan: { value: parseColor(finalColors.cyan) },
                uColorBright: { value: parseColor(finalColors.bright) },
                uColorAccent: { value: parseColor(finalColors.accent) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec2 uResolution;
                uniform vec3 uColorDark;
                uniform vec3 uColorBrand;
                uniform vec3 uColorCyan;
                uniform vec3 uColorBright;
                uniform vec3 uColorAccent;
                varying vec2 vUv;
                
                #define PI 3.14159265359
                
                // --- Noise Functions ---
                vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
                
                float snoise(vec2 v) {
                    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                    vec2 i = floor(v + dot(v, C.yy));
                    vec2 x0 = v - i + dot(i, C.xx);
                    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                    vec4 x12 = x0.xyxy + C.xxzz;
                    x12.xy -= i1;
                    i = mod289(i);
                    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
                    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                    m = m*m;
                    m = m*m;
                    vec3 x = 2.0 * fract(p * C.www) - 1.0;
                    vec3 h = abs(x) - 0.5;
                    vec3 ox = floor(x + 0.5);
                    vec3 a0 = x - ox;
                    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
                    vec3 g;
                    g.x = a0.x * x0.x + h.x * x0.y;
                    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                    return 130.0 * dot(m, g);
                }

                float fbm(vec2 p) {
                    float v = 0.0;
                    float a = 0.5;
                    for (int i = 0; i < 4; ++i) {
                        v += a * snoise(p);
                        p = p * 2.0 + vec2(100.0);
                        a *= 0.5;
                    }
                    return v;
                }

                // --- Glyph Drawing ---
                float drawGlyph(vec2 uv, float brightness) {
                    vec2 gUv = fract(uv);
                    if (brightness < 0.1) return 0.0;
                    
                    if (brightness < 0.3) {
                        return 1.0 - smoothstep(0.05, 0.12, length(gUv - 0.5));
                    } else if (brightness < 0.5) {
                        float l1 = step(0.45, gUv.x) * step(gUv.x, 0.55) * step(0.2, gUv.y) * step(gUv.y, 0.8);
                        float l2 = step(0.45, gUv.y) * step(gUv.y, 0.55) * step(0.2, gUv.x) * step(gUv.x, 0.8);
                        return max(l1, l2);
                    } else if (brightness < 0.75) {
                        float o = step(0.15, gUv.x) * step(gUv.x, 0.85) * step(0.15, gUv.y) * step(gUv.y, 0.85);
                        float i = step(0.3, gUv.x) * step(gUv.x, 0.7) * step(0.3, gUv.y) * step(gUv.y, 0.7);
                        return o - i;
                    } else {
                        float d1 = step(abs((gUv.x - 0.5) - (gUv.y - 0.5)), 0.1);
                        float d2 = step(abs((gUv.x - 0.5) + (gUv.y - 0.5)), 0.1);
                        return max(d1, d2) * step(length(gUv - 0.5), 0.45);
                    }
                }

                void main() {
                    float gridSize = 16.0;
                    vec2 gridUv = vUv * uResolution / gridSize;
                    vec2 cellId = floor(gridUv);
                    vec2 cellCenter = (cellId + 0.5) * gridSize / uResolution;

                    vec2 uv = cellCenter;
                    float aspectRatio = uResolution.x / uResolution.y;
                    vec2 p = vec2((uv.x - 0.5) * aspectRatio, uv.y - 0.5) * 0.05;
                    
                    float t = uTime;
                    
                    float sectionMask = snoise(p * 0.4 + t * 0.2);
                    sectionMask = smoothstep(-0.2, 0.2, sectionMask);
                    
                    vec2 p1 = p;
                    float d1 = fbm(p1 * 1.2 + vec2(t, t * 0.5));
                    vec2 q1 = vec2(fbm(p1 + d1 + t * 0.3), fbm(p1 + d1 - t * 0.1));
                    float noise1 = fbm(p1 + 1.5 * q1);
                    
                    vec2 p2 = p + vec2(10.0); 
                    float d2 = fbm(p2 * 0.8 - vec2(t * 0.4, t * 0.2));
                    vec2 q2 = vec2(fbm(p2 + d2 + t * 0.5), fbm(p2 + d2 + t * 0.4));
                    float noise2 = fbm(p2 + 2.0 * q2);
                    
                    float combinedNoise = mix(noise1, noise2, sectionMask);
                    
                    float pattern = sin(combinedNoise * 10.0 + t);
                    float ribbon = smoothstep(-0.3, 0.3, pattern);
                    
                    float detail = sin(combinedNoise * 20.0 - t * 2.0);
                    ribbon = mix(ribbon, ribbon * (0.8 + 0.2 * detail), 0.3);
                    
                    vec2 e = vec2(0.01, 0.0);
                    vec3 normal = normalize(vec3(
                        mix(fbm(p1 + e.xy), fbm(p2 + e.xy), sectionMask) - combinedNoise,
                        mix(fbm(p1 + e.yx), fbm(p2 + e.yx), sectionMask) - combinedNoise,
                        0.08
                    ));
                    vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
                    float spec = pow(max(dot(normal, lightDir), 0.0), 24.0);
                    
                    vec3 baseColor = mix(uColorDark, uColorBrand, smoothstep(-0.6, 0.1, combinedNoise));
                    baseColor = mix(baseColor, uColorCyan, smoothstep(0.1, 0.7, combinedNoise));
                    
                    float accentPattern = sin(combinedNoise * 15.0 - t * 0.5);
                    float accentMask = smoothstep(0.8, 0.95, accentPattern) * smoothstep(0.2, 0.8, combinedNoise);
                    baseColor = mix(baseColor, uColorAccent, accentMask * 0.4);
                    
                    vec3 color = mix(baseColor * 0.6, baseColor * 1.4, ribbon);
                    color += uColorBright * spec * 0.65;
                    color += uColorAccent * spec * 0.15;
                    
                    float edge = fwidth(sectionMask) * 5.0;
                    color += uColorCyan * edge * 0.2;

                    float brightness = (color.r + color.g + color.b) / 3.0;
                    float glyph = drawGlyph(gridUv, brightness);

                    gl_FragColor = vec4(color, glyph * (0.4 + brightness * 0.5));
                }
            `,
            side: THREE.DoubleSide,
            transparent: true
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // Animation
        let time = timeOffset;
        const animate = () => {
            time += (0.016 * speed) / 0.035; // Calibrate speed
            material.uniforms.uTime.value = time;

            renderer.render(scene, camera);
            animationRef.current = requestAnimationFrame(animate);
        };
        animate();

        // Handle resize
        const handleResize = () => {
            if (!containerRef.current) return;
            const newWidth = containerRef.current.clientWidth;
            const newHeight = containerRef.current.clientHeight;

            material.uniforms.uResolution.value.set(newWidth, newHeight);
            renderer.setSize(newWidth, newHeight);
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationRef.current);
            if (rendererRef.current && containerRef.current) {
                containerRef.current.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
            }
            geometry.dispose();
            material.dispose();
        };
    }, [colors, timeOffset, speed]);

    return (
        <div
            ref={containerRef}
            className={`absolute inset-0 ${className}`}
            style={{
                borderRadius: 'inherit',
                overflow: 'hidden'
            }}
        />
    );
}
