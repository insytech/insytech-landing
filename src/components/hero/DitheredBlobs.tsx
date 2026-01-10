import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Blob {
    position: THREE.Vector2;
    size: number;
    color: THREE.Color;
    velocity: THREE.Vector2;
}

export default function DitheredBlobs() {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const frameRef = useRef<number>(0);

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
        renderer.setSize(width, height);
        renderer.setPixelRatio(1); // Keep it 1 for pixel-perfect dither
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const blobs: Blob[] = [
            {
                position: new THREE.Vector2(-1.2, 0.7), // Top Left
                velocity: new THREE.Vector2(0, 0),
                size: 1.2, // Larger
                color: new THREE.Color('#005EB8')
            },
            {
                position: new THREE.Vector2(1.2, 0.8), // Top Right
                velocity: new THREE.Vector2(0, 0),
                size: 1.0, // Larger
                color: new THREE.Color('#00B5E2')
            },
            {
                position: new THREE.Vector2(1.0, -0.2), // Mid Right (Orange)
                velocity: new THREE.Vector2(0, 0),
                size: 1.4, // Larger
                color: new THREE.Color('#f97316')
            }
        ];

        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uResolution: { value: new THREE.Vector2(width, height) },
                uBlob1: { value: blobs[0].position },
                uBlob2: { value: blobs[1].position },
                uBlob3: { value: blobs[2].position },
                uColor1: { value: blobs[0].color },
                uColor2: { value: blobs[1].color },
                uColor3: { value: blobs[2].color },
                uSize1: { value: blobs[0].size },
                uSize2: { value: blobs[1].size },
                uSize3: { value: blobs[2].size },
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
                uniform vec2 uBlob1;
                uniform vec2 uBlob2;
                uniform vec2 uBlob3;
                uniform vec3 uColor1;
                uniform vec3 uColor2;
                uniform vec3 uColor3;
                uniform float uSize1;
                uniform float uSize2;
                uniform float uSize3;
                varying vec2 vUv;

                float blob(vec2 p, vec2 pos, float size) {
                    return smoothstep(size, size * 0.1, length(p - pos));
                }

                float bayer8(vec2 uv) {
                    ivec2 p = ivec2(mod(uv, 8.0));
                    int x = p.x;
                    int y = p.y;
                    int m[64] = int[](
                        0, 32, 8, 40, 2, 34, 10, 42,
                        48, 16, 56, 24, 50, 18, 58, 26,
                        12, 44, 4, 36, 14, 46, 6, 38,
                        60, 28, 52, 20, 62, 30, 54, 22,
                        3, 35, 11, 43, 1, 33, 9, 41,
                        51, 19, 59, 27, 49, 17, 57, 25,
                        15, 47, 7, 39, 13, 45, 5, 37,
                        63, 31, 55, 23, 61, 29, 53, 21
                    );
                    return float(m[y * 8 + x]) / 64.0;
                }

                void main() {
                    vec2 p = (vUv * 2.0 - 1.0);
                    p.x *= uResolution.x / uResolution.y;

                    float b1 = blob(p, uBlob1, uSize1);
                    float b2 = blob(p, uBlob2, uSize2);
                    float b3 = blob(p, uBlob3, uSize3);

                    vec3 color = uColor1 * b1 + uColor2 * b2 + uColor3 * b3;
                    float alpha = max(max(b1, b2), b3);

                    float dither = bayer8(gl_FragCoord.xy);
                    vec3 finalColor = step(vec3(dither), color);
                    float finalAlpha = step(dither, alpha) * 0.4;

                    gl_FragColor = vec4(finalColor, finalAlpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        const animate = (time: number) => {
            const t = time * 0.001;
            material.uniforms.uTime.value = t;

            // Pulse sizes
            material.uniforms.uSize1.value = blobs[0].size + Math.sin(t * 0.5) * 0.2;
            material.uniforms.uSize2.value = blobs[1].size + Math.sin(t * 0.7 + 1.0) * 0.15;
            material.uniforms.uSize3.value = blobs[2].size + Math.sin(t * 0.4 + 2.0) * 0.25;

            renderer.render(scene, camera);
            frameRef.current = requestAnimationFrame(animate);
        };




        const handleResize = () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            renderer.setSize(w, h);
            material.uniforms.uResolution.value.set(w, h);
        };

        window.addEventListener('resize', handleResize);
        frameRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(frameRef.current);
            renderer.dispose();
            geometry.dispose();
            material.dispose();
        };
    }, []);

    return <div ref={containerRef} className="absolute inset-0 pointer-events-none" />;
}
