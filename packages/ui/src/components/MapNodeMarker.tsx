import {Coins} from 'lucide-react';
import {cn} from '../lib/utils';
import {getPOIStyle} from '../lib/poiStyles';
import type {NodeBaseType, NodeCategory} from '../lib/types';

interface MapNodeMarkerProps {
    type: NodeBaseType | string;
    category?: NodeCategory;
    name?: string;
    isZoomedIn: boolean;
    isSelected?: boolean;
    isLabelVisible?: boolean;
    opacity?: string;
    isPaid?: boolean;
}

export function MapNodeMarker({
                                  type,
                                  category,
                                  name,
                                  isZoomedIn,
                                  isSelected = false,
                                  isLabelVisible = true,
                                  opacity = 'opacity-100',
                                  isPaid = false
                              }: Readonly<MapNodeMarkerProps>) {
    const isNamed = name && name.trim() !== '';

    if (type === 'intersection' || (!isNamed && type === 'track')) {
        // Subtle breadcrumb dot for intersections
        return (
            <div className={cn("relative flex flex-col items-center justify-center w-4 h-4 cursor-pointer", opacity)}>
                <div className={cn(
                    "w-1.5 h-1.5 rounded-full bg-white/40 backdrop-blur-sm transition-all duration-300",
                    isSelected && "scale-150 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                )}></div>
            </div>
        );
    }

    const {
        icon: Icon,
        iconColor: iconColorClass,
        glowColor: glowColorClass,
        ringColor: ringColorClass,
        activeGlow: activeGlowClass
    } = getPOIStyle({category});

    const showLabel = isZoomedIn && name && isLabelVisible;
    const labelScale = showLabel ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-2 pointer-events-none';

    return (
        <div className={cn("relative flex flex-col items-center justify-end -mt-8 z-10 group", opacity)}>

            {/* Floating Glass Label */}
            <div
                className={cn(
                    "absolute bottom-full mb-3 flex items-center px-3 py-1.5 rounded-full z-50",
                    "bg-[#1C1C1E]/90 backdrop-blur-2xl border border-white/10 shadow-2xl",
                    "transition-all duration-500 origin-bottom whitespace-nowrap",
                    labelScale,
                    isSelected && "bg-black/95 border-white/20 -translate-y-1"
                )}
            >
                <span className={cn("text-[10px] font-black tracking-widest uppercase drop-shadow-md", iconColorClass)}>
                  {name || 'Unnamed'}
                </span>
            </div>

            {/* Marker Pin Base */}
            <div className={cn(
                "relative flex flex-col items-center justify-center cursor-pointer transition-all duration-500",
                isSelected ? 'scale-125 -translate-y-2' : 'scale-100 hover:scale-110'
            )}>

                {/* Strava/Pokemon Go style pulsing radar ring (only when selected) */}
                {isSelected && (
                    <>
                        <div
                            className={cn("absolute inset-0 rounded-full animate-ping opacity-20", glowColorClass)}></div>
                        <div
                            className={cn("absolute -inset-4 rounded-full border opacity-50 animate-[spin_4s_linear_infinite] border-dashed", ringColorClass)}></div>
                    </>
                )}

                {/* Main Glass Circle */}
                <div className={cn(
                    "relative flex items-center justify-center rounded-full overflow-hidden transition-all duration-300",
                    "bg-[#1C1C1E]/80 backdrop-blur-xl border-[1.5px] border-white/10",
                    isSelected ? cn("w-10 h-10 border-white/30", activeGlowClass) : "w-8 h-8 shadow-[0_8px_16px_rgba(0,0,0,0.6)]",
                    isSelected && type === 'stamp' && "animate-bounce"
                )}>
                    {/* Inner Colored Glow */}
                    <div className={cn("absolute inset-0 blur-xl opacity-50 mix-blend-screen", glowColorClass)}></div>

                    {/* Premium Icon */}
                    <Icon className={cn(
                        "relative z-10 transition-all duration-300 drop-shadow-[0_0_8px_currentColor]",
                        iconColorClass,
                        isSelected ? "w-5 h-5" : "w-4 h-4"
                    )} strokeWidth={2.5}/>
                </div>

                {/* Paid Superscript Indicator */}
                {isPaid && (
                    <div
                        className="absolute -top-1 -right-1 z-20 flex items-center justify-center w-4 h-4 bg-amber-400 rounded-full border border-black/50 shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                        <Coins className="w-2.5 h-2.5 text-black" strokeWidth={3}/>
                    </div>
                )}

                {/* Minimalist Pin Stem */}
                <div className={cn(
                    "w-[1.5px] bg-gradient-to-b from-white/30 to-transparent transition-all duration-300",
                    isSelected ? "opacity-100 h-4" : "opacity-0 h-0"
                )}></div>

                {/* Base Shadow */}
                <div className={cn(
                    "w-4 h-1.5 bg-black/80 blur-[2px] rounded-[100%] transition-all duration-500",
                    isSelected ? "scale-125 opacity-40 mt-1" : "scale-100 opacity-60 mt-1"
                )}></div>
            </div>
        </div>
    );
}
