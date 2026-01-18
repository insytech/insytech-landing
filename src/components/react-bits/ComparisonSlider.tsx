import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import CountUp from './CountUp';
import ShinyText from './ShinyText';
import { cn } from '@utils/cn';

interface Metric {
    label: string;
    number?: number;
    value?: string;
    prefix?: string;
    suffix?: string;
}

interface ComparisonSliderProps {
    beforeImage: string;
    afterImage: string;
    beforeLabel?: string;
    afterLabel?: string;
    beforeMetrics: Metric[];
    afterMetrics: Metric[];
    className?: string;
}

const ComparisonSlider: React.FC<ComparisonSliderProps> = ({
    beforeImage,
    afterImage,
    beforeLabel = 'Manual',
    afterLabel = 'Insytech Vision',
    beforeMetrics,
    afterMetrics,
    className
}) => {
    const [sliderPos, setSliderPos] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMove = (clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percentage = (x / rect.width) * 100;
        setSliderPos(Math.max(0, Math.min(100, percentage)));
    };

    const handleInteract = (e: React.MouseEvent | React.TouchEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        handleMove(clientX);
    };

    return (
        <div
            ref={containerRef}
            className={cn("relative w-full aspect-[16/9] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-xl select-none group", className)}
            onMouseMove={(e) => e.buttons === 1 && handleInteract(e)}
            onTouchMove={handleInteract}
            onClick={handleInteract}
            style={{ cursor: 'ew-resize' }}
        >
            {/* After Image (Base) */}
            <div className="absolute inset-0">
                <img
                    src={afterImage}
                    alt={afterLabel}
                    className="w-full h-full object-cover pointer-events-none"
                />

                {/* Vision Metrics Overlay */}
                <div className="absolute bottom-6 right-6 flex flex-col gap-2 items-end z-20">
                    {afterMetrics.map((metric, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * i }}
                            className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg cursor-target min-w-[140px]"
                        >
                            <div className="text-xl font-bold text-[#00B5E2] flex items-baseline gap-0.5">
                                <span className="text-sm font-semibold">{metric.prefix}</span>
                                {metric.number !== undefined ? (
                                    <CountUp to={metric.number} duration={2} />
                                ) : (
                                    metric.value
                                )}
                                <span className="text-sm font-semibold">{metric.suffix}</span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                {metric.label}
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="absolute top-6 right-6 z-20">
                    <div className="bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-[0.1em] shadow-lg flex items-center justify-center min-w-[110px] h-7">
                        <ShinyText text={afterLabel} disabled={false} speed={3} className="text-white" color="#ffffff" />
                    </div>
                </div>
            </div>

            {/* Before Image (Overlay) */}
            <div
                className="absolute inset-0 z-10 overflow-hidden border-r border-white/20"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
                <img
                    src={beforeImage}
                    alt={beforeLabel}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{ width: containerRef.current?.offsetWidth || '100%' }}
                />
                <div className="absolute inset-0 bg-black/20 pointer-events-none" />

                {/* Manual Metrics Overlay */}
                <div className="absolute bottom-6 left-6 flex flex-col gap-2 z-20">
                    {beforeMetrics.map((metric, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * i }}
                            className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg cursor-target min-w-[140px]"
                        >
                            <div className="text-xl font-bold text-orange-500 flex items-baseline gap-0.5">
                                <span className="text-sm font-semibold">{metric.prefix}</span>
                                {metric.number !== undefined ? (
                                    <CountUp to={metric.number} duration={2} />
                                ) : (
                                    metric.value
                                )}
                                <span className="text-sm font-semibold">{metric.suffix}</span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                {metric.label}
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="absolute top-6 left-6 z-20">
                    <div className="bg-gray-800 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-[0.1em] shadow-lg flex items-center justify-center min-w-[80px] h-7">
                        {beforeLabel}
                    </div>
                </div>
            </div>

            {/* Handle */}
            <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/50 z-30 cursor-target group-hover:bg-white transition-colors -translate-x-1/2"
                style={{ left: `${sliderPos}%` }}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-2xl flex items-center justify-center border-[6px] border-white/10 group-active:scale-95 transition-transform">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                        stroke="currentColor"
                        className="w-5 h-5 text-gray-800"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
                        />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default ComparisonSlider;
