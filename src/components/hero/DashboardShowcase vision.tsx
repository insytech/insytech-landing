import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function DashboardShowcase() {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !sceneRef.current) return;

        const scene = sceneRef.current;
        const container = containerRef.current;

        // --- GSAP Entrance Animation ---
        gsap.set(scene, {
            rotationX: 10,
            rotationZ: 0,
            rotationY: 40,
            y: 20,
            opacity: 0,
            scale: 0.9
        });

        gsap.to(scene, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1.5,
            ease: "expo.out",
            delay: 0.5
        });

        // --- Interactive Tilt Effect ---
        const handleMouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;

            // Normalize mouse position (-1 to 1)
            const x = (clientX / innerWidth - 0.5) * 2;
            const y = (clientY / innerHeight - 0.5) * 2;

            // Subtle rotation adjustments based on mouse
            gsap.to(scene, {
                rotationX: 10 + (y * 5),
                rotationZ: 0 + (x * 2),
                duration: 0.8,
                ease: "power2.out"
            });
        };

        window.addEventListener('mousemove', handleMouseMove);

        // --- Floating Animation for modules ---
        const panels = scene.querySelectorAll('.dashboard-panel');
        panels.forEach((panel, i) => {
            gsap.to(panel, {
                z: 10 + (i * 5),
                yoyo: true,
                repeat: -1,
                duration: 2 + i,
                ease: "sine.inOut",
                delay: i * 0.2
            });
        });

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full flex items-center justify-center perspective-[2000px] overflow-visible"
        >
            {/* The 3D Scene */}
            <div
                ref={sceneRef}
                style={{ transformStyle: 'preserve-3d' }}
                className="relative w-[500px] h-[350px] sm:w-[700px] sm:h-[450px] transition-transform duration-100 ease-out"
            >
                {/* Main Base Plate */}
                <div
                    className="absolute inset-0 bg-white/20 backdrop-blur-md border border-white/40 rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.1)] overflow-hidden"
                    style={{ transform: 'translateZ(-20px)' }}
                >
                    {/* Interior "Grid" background */}
                    <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                </div>

                {/* --- VISION AI MONITOR (Top Left) --- */}
                <div
                    className="dashboard-panel absolute top-[10%] left-[10%] w-[55%] h-[50%] bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl shadow-2xl p-4 overflow-hidden"
                    style={{ transform: 'translateZ(30px)' }}
                >
                    {/* Simulated Vision AI Feed */}
                    <div className="relative w-full h-full bg-[#001529] rounded-xl overflow-hidden group cursor-pointer">
                        {/* Static Grid lines for "AI feed" */}
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,#4CC9F0_1px,transparent_1px)] bg-[size:20px_20px]"></div>

                        {/* Animated Scanning Line */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#4CC9F0]/20 to-transparent h-20 animate-scan pointer-events-none"></div>

                        {/* Interactive Detection Boxes */}
                        <div className="absolute top-[20%] left-[30%] w-24 h-24 border-2 border-cyan-400/80 rounded animate-pulse">
                            <span className="absolute -top-6 left-0 text-[10px] font-bold text-cyan-400 bg-cyan-900/50 px-1 rounded uppercase">Turbine_01 : Optimal</span>
                        </div>
                        <div className="absolute bottom-[10%] right-[15%] w-32 h-20 border-2 border-blue-400/80 rounded animate-pulse [animation-delay:0.5s]">
                            <span className="absolute -top-6 left-0 text-[10px] font-bold text-blue-400 bg-blue-900/50 px-1 rounded uppercase">Conveyor_B : Running</span>
                        </div>

                        {/* UI Elements */}
                        <div className="absolute top-2 right-2 flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></div>
                            <span className="text-[8px] font-mono text-white/70">REC // LIVE</span>
                        </div>
                    </div>
                </div>

                {/* --- LIVE ANALYTICS (Bottom Left) --- */}
                <div
                    className="dashboard-panel absolute bottom-[10%] left-[10%] w-[35%] h-[25%] bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-xl p-3"
                    style={{ transform: 'translateZ(50px)' }}
                >
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-[10px] font-bold text-[#002B49] uppercase tracking-wider">Market Flow</h4>
                        <span className="text-[10px] font-mono font-bold text-green-500">+12.4%</span>
                    </div>
                    {/* Simplified SVG Chart */}
                    <div className="w-full h-12 flex items-end justify-between gap-1 overflow-hidden">
                        {[40, 70, 45, 90, 65, 80, 50, 85].map((h, i) => (
                            <div
                                key={i}
                                className="w-full bg-gradient-to-t from-[#005EB8] to-[#4CC9F0] rounded-t-sm transition-all duration-500 hover:scale-y-110"
                                style={{ height: `${h}%` }}
                            ></div>
                        ))}
                    </div>
                </div>

                {/* --- CONTROL STATUS (Right Side) --- */}
                <div
                    className="dashboard-panel absolute top-[10%] right-[10%] w-[22%] h-[80%] bg-[#002B49] rounded-2xl shadow-2xl p-4 flex flex-col gap-4 text-white overflow-hidden"
                    style={{ transform: 'translateZ(15px)' }}
                >
                    {/* Header */}
                    <div className="border-b border-white/10 pb-2">
                        <h3 className="text-[10px] font-bold text-blue-400 uppercase">Core Status</h3>
                    </div>

                    {/* Progress Rings simulated */}
                    <div className="space-y-4">
                        {[
                            { label: 'System Load', val: 78, color: 'text-cyan-400' },
                            { label: 'Security', val: 100, color: 'text-green-400' },
                            { label: 'Sync Rate', val: 92, color: 'text-blue-400' }
                        ].map((item, i) => (
                            <div key={i} className="space-y-1">
                                <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-white/50">
                                    <span>{item.label}</span>
                                    <span className={item.color}>{item.val}%</span>
                                </div>
                                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className={`h-full bg-current rounded-full ${item.color}`} style={{ width: `${item.val}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Mini Map area */}
                    <div className="mt-auto h-24 bg-white/5 rounded-xl border border-white/10 p-2 overflow-hidden">
                        <div className="relative w-full h-full opacity-30">
                            {/* Dots representing network nodes */}
                            <div className="absolute top-[20%] left-[20%] w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                            <div className="absolute top-[60%] left-[50%] w-2 h-2 rounded-full bg-white animate-pulse [animation-delay:0.3s]"></div>
                            <div className="absolute bottom-[20%] right-[30%] w-1.5 h-1.5 rounded-full bg-white animate-pulse [animation-delay:0.6s]"></div>
                        </div>
                        <p className="text-[7px] font-mono text-blue-300 mt-1 uppercase tracking-tighter">Network Active // OK</p>
                    </div>
                </div>

                {/* --- FLOATING MODALS --- */}
                <div
                    className="dashboard-panel absolute top-[50%] left-[60%] bg-white border border-white/50 rounded-xl shadow-lg px-3 py-2 flex items-center gap-2 group cursor-crosshair z-20"
                    style={{ transform: 'translateZ(80px)' }}
                >
                    <div className="p-1 bg-blue-50 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    </div>
                    <div>
                        <p className="text-[8px] font-bold text-[#002B49] leading-none">AUTO_MODE</p>
                        <p className="text-[6px] text-[#002B49]/60 leading-none mt-1">AI_CORE_ACTIVE</p>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(400%); }
                }
                .animate-scan {
                    animation: scan 3s linear infinite;
                }
            `}</style>
        </div>
    );
}
