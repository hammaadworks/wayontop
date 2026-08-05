import React from 'react';
import {HeartHandshake, DoorClosed, MapPin, Gem} from 'lucide-react';
import {cn} from '../lib/utils';

interface MapNodeMarkerProps {
    type: 'poi' | 'stamp' | 'gate' | 'track' | 'facility' | (string & {});
    name?: string;
    isZoomedIn: boolean;
    isSelected?: boolean;
    opacity?: string;
}

export function MapNodeMarker({
                                  type,
                                  name,
                                  isZoomedIn,
                                  isSelected = false,
                                  opacity = 'opacity-100'
                              }: Readonly<MapNodeMarkerProps>) {
    if (type === 'track') {
        const showLabel = isZoomedIn && name && name.trim() !== '';
        const labelScale = showLabel ? 'scale-100 opacity-100' : 'scale-50 opacity-0 pointer-events-none';

        // Tracks are just tiny helper dots, but can show labels if explicitly named
        return (
            <div
                className={cn("relative flex items-center justify-center w-6 h-6 -ml-3 -mt-3 cursor-pointer", opacity)}>
                
                <div
                    className={cn(
                        "absolute bottom-full mb-1 flex items-center px-2 py-0.5 rounded-full",
                        "bg-black/60 backdrop-blur-md border border-white/10 shadow-[0_2px_10px_rgba(0,0,0,0.5)]",
                        "transition-all duration-500 origin-bottom whitespace-nowrap z-10",
                        labelScale,
                        isSelected && "border-white/30 bg-black/80 ring-1 ring-white/20"
                    )}
                >
                    <span className="text-[9px] font-black tracking-widest text-slate-300 uppercase drop-shadow-sm">
                        {name}
                    </span>
                </div>

                <div className="absolute inset-0 rounded-full bg-blue-500 opacity-20"></div>
                <div className={cn(
                    "relative w-2 h-2 rounded-full bg-blue-400 border border-white/50 shadow-sm transition-all duration-300",
                    isSelected && "scale-150 border-white bg-blue-300"
                )}></div>
            </div>
        );
    }

    // Determine Icon and Colors based on type
    let Icon = MapPin;
    let colorClass = 'bg-amber-500';
    let shadowClass = 'shadow-amber-500/50';
    let gradientClass = 'from-amber-400 to-amber-600';
    let iconColor = 'text-amber-400';

    if (type === 'stamp') {
        Icon = Gem;
        colorClass = 'bg-purple-500';
        shadowClass = 'shadow-purple-500/50';
        gradientClass = 'from-purple-400 to-purple-700';
        iconColor = 'text-purple-400';
    } else if (type === 'gate') {
        Icon = DoorClosed;
        colorClass = 'bg-emerald-500';
        shadowClass = 'shadow-emerald-500/50';
        gradientClass = 'from-emerald-400 to-emerald-600';
        iconColor = 'text-emerald-400';
    } else if (type === 'facility') {
        Icon = HeartHandshake;
        colorClass = 'bg-rose-500';
        shadowClass = 'shadow-rose-500/50';
        gradientClass = 'from-rose-400 to-rose-600';
        iconColor = 'text-rose-400';
    }

    const showLabel = isZoomedIn && name;
    const labelScale = showLabel ? 'scale-100 opacity-100' : 'scale-50 opacity-0 pointer-events-none';

    return (
        <div className={cn("relative flex flex-col items-center justify-end -mt-10", opacity)}>
            {/* Floating Label (Glassmorphic Pill) */}
            <div
                className={cn(
                    "absolute bottom-full mb-1 flex items-center gap-1.5 px-2.5 py-1 rounded-full",
                    "bg-black/60 backdrop-blur-md border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]",
                    "transition-all duration-500 origin-bottom whitespace-nowrap",
                    labelScale,
                    isSelected && "border-white/30 bg-black/80 ring-2 ring-white/20"
                )}
            >
                <Icon className={cn("w-3 h-3", iconColor)}/>
                <span className="text-[10px] font-black tracking-widest text-white/90 uppercase drop-shadow-sm">
          {name || 'Unnamed'}
        </span>
            </div>

            {/* Node Dot / Marker Body */}
            <div
                className={cn("relative flex items-center justify-center cursor-pointer transition-transform duration-300", isSelected ? 'scale-125' : 'scale-100')}>
                {/* Glow effect */}
                <div className={cn("absolute inset-0 rounded-full blur-md opacity-40", colorClass)}></div>

                {/* Core circle */}
                <div className={cn(
                    "relative flex items-center justify-center rounded-full shadow-lg border-2",
                    isSelected ? "w-8 h-8 border-white bg-linear-to-br" : "w-6 h-6 border-white/90 bg-linear-to-br",
                    gradientClass, shadowClass
                )}>
                    <Icon className={cn("stroke-white", isSelected ? "w-4 h-4" : "w-3 h-3")}
                          strokeWidth={isSelected ? 2.5 : 3}/>
                </div>
            </div>
        </div>
    );
}
