import { useState } from 'react';
import { Search, MessageCircle, Activity, Navigation, ChevronLeft, X, Camera, Droplets, Coffee, Coins } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SponsorMarquee } from './SponsorMarquee';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@wayontop/ui/components/ui/sheet';
import { Input } from '@wayontop/ui/components/ui/input';
import { showAlert } from '../lib/events';
import type { GraphData, GraphNode } from '@wayontop/ui/lib/types';
import { getPOIStyle } from '@wayontop/ui/lib/poiStyles';

interface ConsumerBottomProps {
    graph: GraphData | null;
    location: any;
    isCapturing: boolean;
    handleCapture: () => void;
    endWalk: () => void; // This will now open the summary instead of actually ending
    setShowReportModal: (val: boolean) => void;
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    searchResults: any[];
    handlePOISelect: (poi: GraphNode) => void;
    onSponsorModalChange: (isOpen: boolean) => void;
    onOpenNavigation: () => void;
}

export function ConsumerBottom({
    graph,
    location,
    isCapturing,
    handleCapture,
    endWalk,
    setShowReportModal,
    searchQuery,
    setSearchQuery,
    searchResults,
    handlePOISelect,
    onSponsorModalChange,
    onOpenNavigation
}: ConsumerBottomProps) {
    const { t } = useTranslation();
    const [sheetOpen, setSheetOpen] = useState(false);

    return (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3 w-full max-w-[420px] pointer-events-none" data-html2canvas-ignore={isCapturing}>
            
            {/* Sponsor Marquee - narrower than bottom bar */}
            <div className="pointer-events-auto w-[85%] max-w-[360px]">
                <SponsorMarquee
                    className="w-full relative"
                    sponsorZones={graph?.sponsorZones}
                    graph={graph}
                    location={location}
                    onModalChange={onSponsorModalChange}
                />
            </div>

            {/* Bottom Bar */}
            <div className="pointer-events-auto bg-[#1C1C1E]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-2 px-3 flex items-center justify-between w-[92%] shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                
                {/* Search Sheet */}
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                    <SheetTrigger aria-label="Search" className="flex flex-col items-center justify-center w-[52px] h-[52px] rounded-full active:bg-white/10 hover:bg-white/5 transition-all cursor-pointer">
                        <Search className="w-[22px] h-[22px] text-white stroke-[1.5] mb-0.5"/>
                        <span className="text-[10px] text-white/70 font-medium tracking-wide">Search</span>
                    </SheetTrigger>

                    <SheetContent side="bottom" className="h-[95dvh] bg-transparent border-0 p-0 text-white !shadow-none z-[100] flex flex-col">
                        <div className="h-full w-full bg-[#1C1C1E]/95 backdrop-blur-3xl border-t border-white/10 rounded-t-[32px] flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.5)]">
                            <SheetHeader className="p-6 pb-4 relative border-b border-white/10">
                                <div className="w-10 h-1.5 bg-white/20 rounded-full mx-auto mb-4"></div>
                                <SheetTitle className="sr-only">Search Places</SheetTitle>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setSheetOpen(false)} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer">
                                        <ChevronLeft className="w-6 h-6 text-white"/>
                                    </button>
                                    <div className="relative flex-1">
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={t('search_placeholder', 'Search here')}
                                        className="w-full bg-white/5 border border-white/10 pl-4 pr-10 py-6 text-[17px] rounded-full text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-emerald-500 shadow-inner"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer">
                                            <X className="w-5 h-5 text-white/40 hover:text-white transition-colors" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Quick Filters - Google Maps Style */}
                            <div className="flex items-center gap-4 mt-5 px-1 overflow-x-auto pb-2 scrollbar-hide">
                                <button onClick={() => setSearchQuery('photo')} className="shrink-0 flex items-center gap-2 bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 rounded-full px-4 py-2 transition-all cursor-pointer">
                                    <Camera className="w-4 h-4 text-emerald-400"/>
                                    <span className="text-[13px] font-medium text-white">Photo Spots</span>
                                </button>
                                <button onClick={() => setSearchQuery('restroom')} className="shrink-0 flex items-center gap-2 bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 rounded-full px-4 py-2 transition-all cursor-pointer">
                                    <Droplets className="w-4 h-4 text-cyan-400"/>
                                    <span className="text-[13px] font-medium text-white">Restrooms</span>
                                </button>
                                <button onClick={() => setSearchQuery('food')} className="shrink-0 flex items-center gap-2 bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 rounded-full px-4 py-2 transition-all cursor-pointer">
                                    <Coffee className="w-4 h-4 text-orange-400"/>
                                    <span className="text-[13px] font-medium text-white">Food & Drink</span>
                                </button>
                            </div>
                        </SheetHeader>

                        <div className="flex-1 overflow-y-auto bg-transparent">
                            <div className="pb-8 pt-2">
                                {searchResults.map((poi: GraphNode) => {
                                    const { icon: Icon, bgClass, textClass } = getPOIStyle(poi);

                                    return (
                                        <div
                                            key={poi.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => {
                                                handlePOISelect(poi);
                                                setSheetOpen(false);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    handlePOISelect(poi);
                                                    setSheetOpen(false);
                                                }
                                            }}
                                            className="bg-transparent hover:bg-white/5 active:bg-white/10 px-4 py-3.5 transition-all cursor-pointer flex items-center justify-between border-b border-white/5 last:border-0"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="relative shrink-0">
                                                    <div className={`w-10 h-10 rounded-full ${bgClass} flex items-center justify-center`}>
                                                        <Icon className={`${textClass} w-5 h-5`}/>
                                                    </div>
                                                    {poi.tags?.includes('paid') && (
                                                        <div className="absolute -top-1 -right-1 z-20 flex items-center justify-center w-4 h-4 bg-amber-400 rounded-full border border-black/50 shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                                            <Coins className="w-2.5 h-2.5 text-black" strokeWidth={3} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <h4 className="font-medium text-[16px] text-white tracking-tight">{t(poi.name)}</h4>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-[12px] text-white/50">{poi.type === 'stamp' ? 'AR Collectible' : poi.type === 'gate' ? 'Entrance' : 'Point of Interest'}</span>
                                                        {(poi as any).distance && (
                                                            <>
                                                                <span className="text-[10px] text-white/20">•</span>
                                                                <span className="text-[12px] text-emerald-400/80 font-medium">{Math.round((poi as any).distance)}m away</span>
                                                            </>
                                                        )}
                                                        {poi.tags?.includes('paid') && (
                                                            <>
                                                                <span className="text-[10px] text-white/20">•</span>
                                                                <span className="text-[11px] font-bold text-amber-400">₹ Paid</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {searchResults.length === 0 && (
                                    <div className="text-center text-white/40 mt-16 py-8 flex flex-col items-center">
                                        <Search className="w-10 h-10 mb-3 opacity-20"/>
                                        <p className="text-[15px] font-medium">{t('search_no_results', {query: searchQuery})}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Explore Sheet is already above, rendered as SheetTrigger */}

                {/* Activity Summary / Controls */}
                <button
                    className="flex flex-col items-center justify-center w-[52px] h-[52px] rounded-full active:bg-white/10 hover:bg-white/5 transition-all cursor-pointer"
                    onClick={endWalk}
                >
                    <Activity className="w-[22px] h-[22px] text-white stroke-[1.5] mb-0.5" />
                    <span className="text-[10px] text-white/70 font-medium tracking-wide">Run</span>
                </button>

                {/* Capture Button (Center, Prominent) */}
                <button
                    className="relative flex flex-col items-center justify-center w-14 h-14 rounded-full border-[3px] border-emerald-400 bg-emerald-500/20 active:scale-95 transition-transform shadow-[0_0_15px_rgba(52,211,153,0.3)] shrink-0 z-10"
                    onClick={handleCapture}
                >
                    <Camera className="w-6 h-6 text-emerald-400" />
                </button>

                {/* Contact Button */}
                <button
                    className="flex flex-col items-center justify-center w-[52px] h-[52px] rounded-full active:bg-white/10 hover:bg-white/5 transition-all cursor-pointer"
                    onClick={() => setShowReportModal(true)}>
                    <MessageCircle className="w-[22px] h-[22px] text-white stroke-[1.5] mb-0.5"/>
                    <span className="text-[10px] text-white/70 font-medium tracking-wide">Contact</span>
                </button>

                {/* Navigate */}
                <button
                    className="flex flex-col items-center justify-center w-[52px] h-[52px] rounded-full active:bg-white/10 hover:bg-white/5 transition-all cursor-pointer"
                    onClick={onOpenNavigation}>
                    <Navigation className="w-[22px] h-[22px] text-white stroke-[1.5] mb-0.5"/>
                    <span className="text-[10px] text-white/70 font-medium tracking-wide">Directions</span>
                </button>

            </div>
        </div>
    );
}
