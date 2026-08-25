import {useState} from 'react';
import {
    Activity,
    MessageCircle,
    Navigation,
    Search,
    Camera
} from 'lucide-react';
import {SponsorMarquee} from './SponsorMarquee';
import {Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger} from '@wayontop/ui/components/ui/drawer';
import type {GraphData, GraphNode} from '@wayontop/ui/lib/types';
import {GlobalNodeSearch} from '@wayontop/ui/components/GlobalNodeSearch';
import {Analytics} from '../lib/analytics';

interface ConsumerBottomProps {
    graph: GraphData | null;
    location: any;
    isCapturing: boolean;
    handleCapture: () => void;
    endWalk: () => void; // This will now open the summary instead of actually ending
    setShowReportModal: (val: boolean) => void;
    handlePOISelect: (poi: GraphNode) => void;
    onSponsorModalChange: (isOpen: boolean) => void;
    onOpenNavigation: () => void;
    collectedStampIds?: number[];
}

export function ConsumerBottom({
                                   graph,
                                   location,
                                   isCapturing,
                                   handleCapture,
                                   endWalk,
                                   setShowReportModal,
                                   handlePOISelect,
                                   onSponsorModalChange,
                                   onOpenNavigation,
                                   collectedStampIds = []
                               }: ConsumerBottomProps) {
    const [sheetOpen, setSheetOpen] = useState(false);

    return (
        <div
            className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3 w-full max-w-[420px] pointer-events-none"
            data-html2canvas-ignore={isCapturing}>

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
            <div
                className="pointer-events-auto bg-[#1C1C1E]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-2 px-3 flex items-center justify-between w-[92%] shadow-[0_20px_60px_rgba(0,0,0,0.6)]">

                {/* Activity Summary / Controls (Run) */}
                <button
                    className="flex flex-col items-center justify-center w-[52px] h-[52px] rounded-full active:bg-white/10 hover:bg-white/5 transition-all cursor-pointer"
                    onClick={endWalk}
                >
                    <Activity className="w-[22px] h-[22px] text-white stroke-[1.5] mb-0.5"/>
                    <span className="text-[10px] text-white/70 font-medium tracking-wide">Run</span>
                </button>

                {/* Contact Button */}
                <button
                    className="flex flex-col items-center justify-center w-[52px] h-[52px] rounded-full active:bg-white/10 hover:bg-white/5 transition-all cursor-pointer"
                    onClick={() => setShowReportModal(true)}>
                    <MessageCircle className="w-[22px] h-[22px] text-white stroke-[1.5] mb-0.5"/>
                    <span className="text-[10px] text-white/70 font-medium tracking-wide">Contact</span>
                </button>

                {/* Capture Button (Center, Prominent) */}
                <button
                    className="relative flex flex-col items-center justify-center w-14 h-14 rounded-full border-[3px] border-emerald-400 bg-emerald-500/20 active:scale-95 transition-transform shadow-[0_0_15px_rgba(52,211,153,0.3)] shrink-0 z-10"
                    onClick={handleCapture}
                >
                    <Camera className="w-6 h-6 text-emerald-400"/>
                </button>

                {/* Search Drawer */}
                <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
                    <DrawerTrigger aria-label="Explore"
                                   className="flex flex-col items-center justify-center w-[52px] h-[52px] rounded-full active:bg-white/10 hover:bg-white/5 transition-all cursor-pointer">
                        <Search className="w-[22px] h-[22px] text-white stroke-[1.5] mb-0.5"/>
                        <span className="text-[10px] text-white/70 font-medium tracking-wide">Explore</span>
                    </DrawerTrigger>

                    <DrawerContent
                        className="!h-[90svh] bg-[#1C1C1E]/95 backdrop-blur-3xl border-0 p-0 text-white !shadow-none z-[100] flex flex-col rounded-t-[32px]">
                        
                        <DrawerHeader className="p-0 border-b border-white/10 shrink-0 relative">
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-white/20 rounded-full z-10"></div>
                            <DrawerTitle className="sr-only">Search Places</DrawerTitle>
                        </DrawerHeader>

                        <div className="flex-1 overflow-hidden mt-6">
                            <GlobalNodeSearch 
                                graph={graph} 
                                userLocation={location} 
                                onSelectNode={handlePOISelect}
                                onClose={() => setSheetOpen(false)}
                                collectedStampIds={collectedStampIds}
                                onSearchEvent={(query) => {
                                    Analytics.logEvent('search_performed', { query });
                                }}
                            />
                        </div>
                    </DrawerContent>
                </Drawer>

                {/* Navigate */}
                <button
                    className="flex flex-col items-center justify-center w-[52px] h-[52px] rounded-full active:bg-white/10 hover:bg-white/5 transition-all cursor-pointer"
                    onClick={onOpenNavigation}>
                    <Navigation className="w-[22px] h-[22px] text-white stroke-[1.5] mb-0.5"/>
                    <span className="text-[10px] text-white/70 font-medium tracking-wide">Navigate</span>
                </button>

            </div>
        </div>
    );
}
