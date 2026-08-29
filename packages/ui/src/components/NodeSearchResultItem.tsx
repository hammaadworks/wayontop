import React from 'react';
import { getPOIStyle } from '../lib/poiStyles';
import { Badge } from './ui/badge';
import { getNodeCategoryName } from '../lib/utils';

interface NodeSearchResultItemProps {
    poi: any;
    onClick: () => void;
    onPointerDown?: (e: React.PointerEvent) => void;
    t: (key: string) => string;
    isUndiscoveredStamp?: boolean;
    isSelectedEvent?: boolean;
    onSelectEvent?: (event: any) => void;
    event?: any;
    language?: string;
}

export function NodeSearchResultItem({
    poi,
    onClick,
    onPointerDown,
    t,
    isUndiscoveredStamp = false,
    onSelectEvent,
    event,
    language = 'en'
}: Readonly<NodeSearchResultItemProps>) {
    const {icon: Icon, bgClass, textClass} = getPOIStyle(poi);
    
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onPointerDown={onPointerDown}
            className="bg-transparent hover:bg-white/5 active:bg-white/10 px-4 py-3.5 transition-all cursor-pointer flex items-center justify-between border-b border-white/5 last:border-0"
        >
            <div className="flex items-center gap-4 w-full text-left">
                {/* Avatar / Icon */}
                <div className="relative shrink-0">
                    {poi.image_url && !isUndiscoveredStamp ? (
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 shadow-md">
                            <img src={poi.image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className={`w-12 h-12 rounded-full ${bgClass} flex items-center justify-center border border-white/10 shrink-0`}>
                            {isUndiscoveredStamp ? (
                                <span className="text-white/80 font-black text-xl">?</span>
                            ) : (
                                <Icon className={`${textClass} w-6 h-6`}/>
                            )}
                        </div>
                    )}
                </div>
            
            <div className="flex flex-col min-w-0 flex-1 text-left">
                {/* Title Row */}
                <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-medium text-[16px] tracking-tight truncate ${poi.status === 'construction' ? 'line-through text-white/50' : 'text-white'}`}>
                        {t(poi.searchName)}
                    </h4>
                    
                    {/* Badges */}
                    {event && event.badge_name && (
                        <Badge 
                            variant="secondary" 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onSelectEvent) onSelectEvent(event);
                            }}
                            className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 px-1.5 py-0 text-[9px] uppercase tracking-widest shrink-0 cursor-pointer transition-colors"
                        >
                            ⭐ {event.badge_name}
                        </Badge>
                    )}
                    {poi.is_paid && (
                        <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0 text-[9px] uppercase tracking-widest shrink-0">
                            $ Paid
                        </Badge>
                    )}
                    {poi.status === 'construction' && (
                        <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0 text-[9px] uppercase tracking-widest shrink-0">
                            🚧 Closed
                        </Badge>
                    )}
                    {isUndiscoveredStamp && (
                        <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0 text-[9px] uppercase tracking-widest shrink-0">
                            ✨ Undiscovered
                        </Badge>
                    )}
                    {poi.category?.base_type === 'stamp' && !isUndiscoveredStamp && (
                        <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0 text-[9px] uppercase tracking-widest shrink-0">
                            🏆 Collected
                        </Badge>
                    )}
                </div>
                
                {/* Subtitle Row */}
                <div className="flex items-center gap-1.5 truncate text-white/60 text-[13px]">
                    {poi.distance !== undefined && (
                        <span className="text-emerald-400/90 font-medium shrink-0">
                            {Math.round(poi.distance)}m away
                        </span>
                    )}
                    {isUndiscoveredStamp && (
                        <>
                            <span className="text-white/20">•</span>
                            <span className="truncate">Go there to reveal and collect!</span>
                        </>
                    )}
                    {poi.category?.base_type === 'stamp' && !isUndiscoveredStamp && (
                        <>
                            <span className="text-white/20">•</span>
                            <span className="truncate">View in your collection</span>
                        </>
                    )}
                    {!isUndiscoveredStamp && poi.category?.base_type !== 'stamp' && poi.anchorName && (
                        <>
                            <span className="text-white/20 shrink-0">•</span>
                            <span className="truncate">near {t(poi.anchorName)}</span>
                        </>
                    )}
                    {!isUndiscoveredStamp && poi.category?.base_type !== 'stamp' && !poi.anchorName && getNodeCategoryName(poi.category, language) && (
                        <>
                            <span className="text-white/20 shrink-0">•</span>
                            <span className="truncate capitalize">{getNodeCategoryName(poi.category, language)}</span>
                        </>
                    )}
                </div>
            </div>
            </div>
        </div>
    );
}
