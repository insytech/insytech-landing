import React, { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';

export default function DashboardShowcase() {
    const containerRef = useRef<HTMLDivElement>(null);
    const neuralRef = useRef<HTMLDivElement>(null);
    const analyticsRef = useRef<HTMLDivElement>(null);
    const automationRef = useRef<HTMLDivElement>(null);
    const sparklineRef = useRef<SVGPathElement>(null);

    // Living data states for brand identity (OEE, Nodes, Sync)
    const [stats, setStats] = useState({
        efficiency: 64.5, // Efficiency Gain - Starts higher as requested
        predictions: 98,  // AI Confidence
        uptime: 99.9      // System Uptime
    });

    useEffect(() => {
        // --- Data Pulse (Living UI) ---
        const interval = setInterval(() => {
            setStats(prev => ({
                efficiency: Math.min(Math.max(prev.efficiency + (Math.random() - 0.5) * 5, 45), 98), // Fluctuates between 45% and 98%
                predictions: Math.min(Math.max(prev.predictions + (Math.random() - 0.5), 95), 99.9),
                uptime: 99.9
            }));
        }, 1500);

        // --- GSAP Animations ---
        const ctx = gsap.context(() => {
            const panels = [neuralRef.current, analyticsRef.current, automationRef.current];

            // Initial state: hidden and slightly rotated
            gsap.set(panels, { opacity: 0, visibility: "visible" });

            // 1. Entrance Animation (Simulating AR lens acquisition)
            const tl = gsap.timeline({
                defaults: { ease: "expo.out", duration: 1.2 }
            });

            // Left Panels (Neural & Process) - Synced at 0.1s delay
            tl.fromTo([neuralRef.current, analyticsRef.current],
                { x: -120, opacity: 0, rotateY: -15 },
                { x: 0, opacity: 1, rotateY: 0, stagger: 0, delay: 0.1 }
            );

            // Right Panel (Automation)
            tl.fromTo(automationRef.current,
                { x: 150, opacity: 0, rotateY: 20 },
                { x: 0, opacity: 1, rotateY: 0, delay: -1.2 } // Snappier entry
            );

            // 2. Idle Floating Effect (Individual and asynchronous)
            gsap.to(neuralRef.current, {
                y: 10,
                duration: 4,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });

            gsap.to(analyticsRef.current, {
                y: -12,
                duration: 5,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
                delay: 1
            });

            gsap.to(automationRef.current, {
                y: 15,
                duration: 6,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
                delay: 2
            });
        }, containerRef);

        return () => {
            clearInterval(interval);
            ctx.revert();
        };
    }, []);

    // --- Refined Hover Animations for the Graph ---
    const handleGraphHover = () => {
        gsap.to(sparklineRef.current, {
            duration: 0.4,
            ease: "power2.out",
            strokeWidth: 1.8,
            filter: "drop-shadow(0 0 15px #00B5E2) brightness(1.2)",
            stroke: "#00B5E2"
        });
    };

    const handleGraphLeave = () => {
        gsap.killTweensOf(sparklineRef.current);
        gsap.to(sparklineRef.current, {
            strokeWidth: 1.5,
            stroke: "url(#lineGradient)",
            filter: "drop-shadow(0 0 0px transparent) brightness(1)",
            duration: 0.6,
            ease: "power2.inOut"
        });
    };

    // Common Glassmorphism Style from Hero Badges
    const glassStyle = "bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.2)]";

    return (
        <div ref={containerRef} className="relative w-full h-full overflow-hidden text-[#002B49] dark:text-white">
            {/* --- CORE STAGE Identity (Bottom Center) --- */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-1 z-0 text-center">
                <span className="text-[10px] font-black text-[#002B49]/30 dark:text-white/30 tracking-[0.3em] uppercase">INSYTECH OS // V.20</span>
            </div>

            {/* --- NEURAL CORE: AI & STRATEGY (Docked Top Left) --- */}
            <div
                ref={neuralRef}
                className={`absolute top-[5%] left-0 w-[26%] h-[40%] ${glassStyle} border-l-0 rounded-r-[1rem] p-6 flex flex-col z-20 origin-left scale-100`}
            >
                <div className="flex justify-between items-start mb-5 relative z-10">
                    <div>
                        <h4 className="text-[14px] font-black text-[#002B49] dark:text-white leading-none tracking-tighter">NEURAL</h4>
                        <h4 className="text-[14px] font-black text-[#002B49] dark:text-white leading-none tracking-tighter">CORE</h4>
                        <p className="text-[10px] text-[#002B49]/60 dark:text-white/60 font-bold uppercase mt-1">Predictive Strategy</p>
                    </div>
                    <div className="flex w-9 h-9 rounded-xl bg-[#005EB8] items-center justify-center text-white shadow-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    </div>
                </div>

                <div className="mt-auto space-y-3 relative z-10">
                    <div className="flex justify-between text-[12px] font-black text-[#002B49] dark:text-white uppercase transition-colors">
                        <span>CONFIDENCE</span>
                        <span className="font-mono text-[#005EB8] dark:text-cyan-400 text-[16px] font-black transition-colors">{stats.predictions.toFixed(1)}%</span>
                    </div>

                    {/* Sparkline / Trend Graph instead of Progress Bar */}
                    <div
                        className="h-8 w-full flex items-end cursor-default group/graph"
                        onMouseEnter={handleGraphHover}
                        onMouseLeave={handleGraphLeave}
                    >
                        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 20">
                            <defs>
                                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#005EB8" stopOpacity="0.2" />
                                    <stop offset="50%" stopColor="#00B5E2" />
                                    <stop offset="100%" stopColor="#00B5E2" />
                                </linearGradient>
                            </defs>
                            <path
                                ref={sparklineRef}
                                d="M 0,15 Q 10,5 20,12 T 40,8 T 60,15 T 80,5 T 100,10"
                                fill="none"
                                stroke="url(#lineGradient)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                className="animate-[dash_3s_ease-in-out_infinite]"
                                style={{ strokeDasharray: 200, strokeDashoffset: 0 }}
                            />
                            {/* Points for tech look */}
                            <circle cx="100" cy="10" r="1.5" fill="#00B5E2" className="animate-pulse" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* --- LEFT WING: DATA & IOT (Docked Left) --- */}
            <div
                ref={analyticsRef}
                className={`absolute top-[60%] left-0 w-[26%] h-[35%] ${glassStyle} border-l-0 rounded-r-[1rem] p-6 flex flex-col z-10 origin-left scale-100`}
            >
                <div className="flex justify-between items-start mb-5">
                    <div>
                        <h4 className="text-[14px] font-black text-[#002B49] dark:text-white leading-none tracking-tight">PROCESS</h4>
                        <h4 className="text-[14px] font-black text-[#002B49] dark:text-white leading-none tracking-tight">ANALYTICS</h4>
                        <p className="text-[10px] text-[#002B49]/60 dark:text-white/60 font-bold uppercase mt-1">Real-Time Optimization</p>
                    </div>
                    <div className="flex w-9 h-9 rounded-xl bg-[#005EB8] items-center justify-center text-white shadow-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                    </div>
                </div>

                <div className="mt-auto space-y-3">
                    <div className="flex justify-between text-[12px] font-black text-[#002B49] dark:text-white uppercase transition-colors">
                        <span>EFFICIENCY</span>
                        <span className="font-mono text-[#005EB8] dark:text-cyan-400 text-[16px] font-black">+{stats.efficiency.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-[#002B49]/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-[#005EB8] to-[#00B5E2] shadow-[0_0_12px_rgba(0,181,226,0.5)] transition-all duration-500 ease-out"
                            style={{ width: `${stats.efficiency}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* --- RIGHT WING: AUTOMATION (Docked Right) --- */}
            <div
                ref={automationRef}
                className={`absolute top-[5%] right-0 w-[30%] h-[50%] ${glassStyle} border-r-0 rounded-l-[1rem] p-6 flex flex-col z-10 origin-right scale-100`}
            >
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h4 className="text-[14px] font-black text-[#002B49] dark:text-white leading-none tracking-tighter">AI</h4>
                        <h4 className="text-[14px] font-black text-[#002B49] dark:text-white leading-none tracking-tighter">AUTOMATION</h4>
                        <p className="text-[10px] text-[#002B49]/60 dark:text-white/60 font-bold uppercase mt-1">Integrated Scaling</p>
                    </div>
                    <div className="flex w-8 h-8 rounded-lg bg-[#002B49] items-center justify-center text-white shadow-lg">
                        <svg className="w-4 h-4 text-[#00B5E2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 flex-1 content-center">
                    {[
                        { title: 'CRM_SYNC', icon: 'bg-[#00B5E2]' },
                        { title: 'MKT_FLOW', icon: 'bg-green-500' },
                        { title: 'LEAD_AI', icon: 'bg-[#005EB8]' },
                        { title: 'BI_INSIGHT', icon: 'bg-purple-500' }
                    ].map((bot, i) => (
                        <div key={i} className="w-[100px] aspect-video bg-white/50 dark:bg-white/5 rounded-xl flex flex-col items-center justify-center p-2 shadow-sm border border-[#002B49]/5 dark:border-white/5 group hover:bg-blue-50 dark:hover:bg-white/10 transition-all hover:scale-[1.02]">
                            <div className={`w-1.5 h-1.5 rounded-full ${bot.icon} mb-1.5 animate-pulse shadow-[0_0_8px_currentColor]`}></div>
                            <span className="text-[8px] font-black text-[#002B49]/70 dark:text-white/70 uppercase group-hover:text-[#002B49] dark:group-hover:text-white transition-colors">
                                {bot.title}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
