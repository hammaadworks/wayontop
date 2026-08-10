import { useState } from 'react';
import { Search, List as ListIcon, Camera, HeartHandshake, MapPin, DoorClosed, Gem, MessageCircle, Activity, Navigation } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SponsorMarquee } from './SponsorMarquee';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@wayontop/ui/components/ui/sheet';
import { Input } from '@wayontop/ui/components/ui/input';
import { showAlert } from '../lib/events';
import type { GraphData, GraphNode } from '@wayontop/ui/lib/types';

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
                    <SheetTrigger aria-label="Explore" className="flex flex-col items-center justify-center w-[52px] h-[52px] rounded-full active:bg-white/10 hover:bg-white/5 transition-all cursor-pointer">
                        <Search className="w-[22px] h-[22px] text-white stroke-[1.5] mb-0.5"/>
                        <span className="text-[10px] text-white/70 font-medium tracking-wide">Explore</span>
                    </SheetTrigger>

                    <SheetContent side="bottom" className="h-[90vh] bg-transparent border-0 p-0 text-white !shadow-none z-[100]">
                        <div className="h-full w-full bg-[#1C1C1E]/95 backdrop-blur-3xl border-t border-white/10 rounded-t-[32px] overflow-hidden flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.5)]">
                            <SheetHeader className="p-6 pb-2 relative">
                                <div className="w-10 h-1.5 bg-white/20 rounded-full mx-auto mb-6"></div>
                                <SheetTitle className="text-white text-left sr-only">Search Places</SheetTitle>
                                <div className="relative">
                                    <Search className="w-5 h-5 text-white/40 absolute left-4 top-1/2 -translate-y-1/2"/>
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={t('search_placeholder', 'Search places...')}
                                        className="w-full bg-black/40 border-0 pl-12 py-6 text-[17px] rounded-[14px] text-white placeholder:text-white/40 focus-visible:ring-0 shadow-inner"
                                    />
                                </div>

                                {/* Quick Filters */}
                                <div className="flex items-center gap-3 mt-5">
                                    <button onClick={() => setSearchQuery('photo')} className="flex-1 bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 rounded-2xl py-3.5 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm">
                                        <Camera className="w-4 h-4 text-emerald-400"/>
                                        <span className="text-[13px] font-semibold text-white tracking-wide">Photo Spots</span>
                                    </button>
                                    <button onClick={() => setSearchQuery('facility')} className="flex-1 bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 rounded-2xl py-3.5 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm">
                                        <HeartHandshake className="w-4 h-4 text-blue-400"/>
                                        <span className="text-[13px] font-semibold text-white tracking-wide">Facilities</span>
                                    </button>
                                </div>
                            </SheetHeader>

                            <div className="flex-1 px-4 overflow-y-auto">
                                <div className="space-y-1 pb-8">
                                    {searchResults.map(poi => (
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
                                            className="bg-transparent hover:bg-white/5 active:bg-white/10 p-3 rounded-2xl transition-all cursor-pointer flex items-center justify-between border-b border-white/5 last:border-0"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                                    {poi.type === 'gate' ? <DoorClosed className="text-emerald-400 w-5 h-5"/> :
                                                     poi.type === 'facility' ? <HeartHandshake className="text-emerald-400 w-5 h-5"/> :
                                                     poi.type === 'stamp' ? <Gem className="text-emerald-400 w-5 h-5"/> :
                                                        <MapPin className="text-emerald-400 w-5 h-5"/>}
                                                </div>
                                                <div className="flex flex-col">
                                                    <h4 className="font-semibold text-[17px] text-white tracking-tight">{t(poi.name)}</h4>
                                                    <div className="flex gap-1.5 mt-0.5">
                                                        {poi.tags && poi.tags.map((tag: string) => (
                                                            <span key={tag} className="text-[12px] text-white/50 capitalize">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
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
                    <span className="text-[10px] text-white/70 font-medium tracking-wide">Stats</span>
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
