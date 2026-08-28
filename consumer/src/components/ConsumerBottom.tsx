import {useTranslation} from "react-i18next";
import {useState, useEffect} from 'react';
import {
    Activity,
    MessageCircle,
    Navigation,
    Search,
    Camera,
    Info,
    X,
    Settings
} from 'lucide-react';
import {SponsorMarquee} from './SponsorMarquee';
import {createPortal} from 'react-dom';

import type {GraphData, GraphNode} from '@wayontop/ui/lib/types';
import {GlobalNodeSearch} from '@wayontop/ui/components/GlobalNodeSearch';
import {Analytics} from '../lib/analytics';
import {ConsumerToast} from '@wayontop/ui/components/ui/ConsumerToast';

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
    onOpenSettings?: () => void;
    collectedStampIds?: number[];
    isExploreOpen?: boolean;
    onExploreOpenChange?: (open: boolean) => void;
    initialExploreQuery?: string;
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
                                   onOpenSettings,
                                   collectedStampIds = [],
                                   isExploreOpen,
                                   onExploreOpenChange,
                                   initialExploreQuery = ''
                               }: ConsumerBottomProps) {
    const {t, i18n} = useTranslation();
    const [internalSheetOpen, setInternalSheetOpen] = useState(false);
    const sheetOpen = isExploreOpen !== undefined ? isExploreOpen : internalSheetOpen;
    const setSheetOpen = onExploreOpenChange || setInternalSheetOpen;

    const [sponsorToast, setSponsorToast] = useState<{message: string, description?: string} | null>(null);

    useEffect(() => {
        const handler = (e: any) => {
            setSponsorToast(e.detail);
            if (e.detail && e.detail.duration) {
                setTimeout(() => setSponsorToast(null), e.detail.duration);
            } else if (e.detail) {
                setTimeout(() => setSponsorToast(null), 3000);
            }
        };
        window.addEventListener('sponsor-toast', handler);
        return () => window.removeEventListener('sponsor-toast', handler);
    }, []);

    return (
        <div
            className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 w-full max-w-[420px] pointer-events-none"
            data-html2canvas-ignore={isCapturing}>

            {/* Sponsor Marquee - narrower than bottom bar */}
            <div className="pointer-events-auto w-[85%] max-w-[360px] relative hide-on-permission">
                <SponsorMarquee
                    className="w-full relative"
                    sponsorZones={graph?.sponsorZones}
                    graph={graph}
                    location={location}
                    onModalChange={onSponsorModalChange}
                />
                <ConsumerToast
                    visible={!!sponsorToast}
                    message={sponsorToast?.message || ""}
                    description={sponsorToast?.description}
                    icon={<Info className="w-4 h-4" />}
                />
            </div>

            {/* Bottom Bar */}
            <div
                className="pointer-events-auto bg-[#1C1C1E]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-2 px-3 flex items-center justify-between w-[92%] shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative z-[50]">

                {/* Activity Summary / Controls (Run) */}
                <button
                    className="flex flex-col items-center justify-center w-[52px] h-[52px] rounded-full active:bg-white/10 hover:bg-white/5 transition-all cursor-pointer"
                    onClick={endWalk}
                >
                    <Activity className="w-[22px] h-[22px] text-white stroke-[1.5] mb-0.5"/>
                    <span className="text-[10px] text-white/70 font-medium tracking-wide">{t('run')}</span>
                </button>

                {/* Contact Button */}
                <button
                    className="flex flex-col items-center justify-center w-[52px] h-[52px] rounded-full active:bg-white/10 hover:bg-white/5 transition-all cursor-pointer"
                    onClick={() => setShowReportModal(true)}>
                    <MessageCircle className="w-[22px] h-[22px] text-white stroke-[1.5] mb-0.5"/>
                    <span className="text-[10px] text-white/70 font-medium tracking-wide">{t('contact')}</span>
                </button>

                {/* Navigate Button (Center, Prominent) */}
                <button
                    className="relative flex flex-col items-center justify-center w-14 h-14 rounded-full border-[3px] border-emerald-400 bg-emerald-500/20 active:scale-95 transition-transform shadow-[0_0_15px_rgba(52,211,153,0.3)] shrink-0 z-10"
                    onClick={onOpenNavigation}
                >
                    <Navigation className="w-6 h-6 text-emerald-400"/>
                </button>

                {/* Search Drawer Modal */}
                <button aria-label="Explore"
                                   onClick={() => setSheetOpen(true)}
                                   className="flex flex-col items-center justify-center w-[52px] h-[52px] rounded-full active:bg-white/10 hover:bg-white/5 transition-all cursor-pointer">
                    <Search className="w-[22px] h-[22px] text-white stroke-[1.5] mb-0.5"/>
                    <span className="text-[10px] text-white/70 font-medium tracking-wide">{t('explore')}</span>
                </button>

                {sheetOpen && createPortal(
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto">
                        <div className="w-full h-full max-h-[90dvh] max-w-md bg-[#1C1C1E] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
                            <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Search className="w-5 h-5 text-emerald-400" />
                                    Search Places
                                </h3>
                                <button onClick={() => setSheetOpen(false)} className="p-2 rounded-full hover:bg-white/10 text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-hidden">
                                <GlobalNodeSearch 
                                    graph={graph} 
                                    userLocation={location} 
                                    onSelectNode={handlePOISelect}
                                    onClose={() => setSheetOpen(false)}
                                    collectedStampIds={collectedStampIds}
                                    onSearchEvent={(query) => {
                                        Analytics.logEvent('search_performed', { query });
                                    }}
                                    initialQuery={initialExploreQuery} language={i18n.language}
                                />
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Settings Button */}
                <button
                    className="flex flex-col items-center justify-center w-[52px] h-[52px] rounded-full active:bg-white/10 hover:bg-white/5 transition-all cursor-pointer"
                    onClick={onOpenSettings}>
                    <Settings className="w-[22px] h-[22px] text-white stroke-[1.5] mb-0.5"/>
                    <span className="text-[10px] text-white/70 font-medium tracking-wide">{t('settings')}</span>
                </button>

            </div>
        </div>
    );
}
