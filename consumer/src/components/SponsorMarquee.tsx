import {useEffect, useState} from 'react';
import type {GraphData, SponsorZone} from '@wayontop/ui/lib/types';
import {distanceInMeters} from '@wayontop/ui/lib/routing';
import {X} from 'lucide-react';

interface SponsorMarqueeProps {
    sponsors?: SponsorZone[];
    graph?: GraphData | null;
    location?: { lat: number; lng: number } | null;
    className?: string;
}

export function SponsorMarquee({
                                   sponsors = [],
                                   graph,
                                   location,
                                   className = "absolute bottom-28 left-4 right-4"
                               }: SponsorMarqueeProps) {
    const [currentZoneSponsor, setCurrentZoneSponsor] = useState<SponsorZone | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        if (!location || !graph || !sponsors.length) return;

        // Find the first sponsor zone the user is currently inside
        let foundSponsor: SponsorZone | null = null;
        for (const sponsor of sponsors) {
            const poi = graph.nodes.find(n => n.id === sponsor.poi_id);
            if (poi) {
                const dist = distanceInMeters(location.lat, location.lng, poi.lat, poi.lng);
                if (dist <= sponsor.radius_m) {
                    foundSponsor = sponsor;
                    break;
                }
            }
        }
        setCurrentZoneSponsor(foundSponsor);
    }, [location, graph, sponsors]);

    // Keep the activeSponsor locked while modal is open
    const [activeSponsor, setActiveSponsor] = useState<SponsorZone | null>(null);

    useEffect(() => {
        if (!modalOpen) {
            setActiveSponsor(currentZoneSponsor);
        }
    }, [currentZoneSponsor, modalOpen]);

    // If no sponsor, we could show a default ad, but for now we'll just hide or show a generic message
    // PRD: "If the user is in an area with no sponsor zone coverage, it will fallback to playing a default ad (provided in the DB)."
    // For MVP, if no active sponsor, we can show a placeholder or nothing. Let's show a default ad.

    const displaySponsor = activeSponsor || {
        id: 'default',
        name: 'wayon.top',
        poi_id: '',
        radius_m: 0,
        banner_asset: '',
        video_asset: ''
    };

    const adText = activeSponsor
        ? `Welcome to the ${activeSponsor.name} zone! Tap to see special offers.`
        : 'Feeling lost? Tap here to learn about wayon.top';

    const isVideo = (url?: string) => {
        if (!url) return false;
        const lower = url.toLowerCase();
        return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm');
    };

    return (
        <>
            <div
                onClick={() => setModalOpen(true)}
                className={`${className} overflow-hidden bg-black/50 backdrop-blur-2xl p-1.5 pr-4 rounded-full flex items-center gap-3 z-40 cursor-pointer pointer-events-auto transform transition-all duration-300 hover:scale-105 active:scale-95 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] mx-auto w-[90%] max-w-[340px]`}
            >
                {activeSponsor?.logo_asset ? (
                    <img src={activeSponsor.logo_asset} alt="Logo"
                         className="w-10 h-10 rounded-full object-cover shadow-inner relative z-10 border border-white/10"/>
                ) : (
                    <div
                        className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shrink-0 shadow-inner relative z-10">
                        <span
                            className="font-bold text-amber-950 text-[10px] tracking-wider">{displaySponsor.name.substring(0, 3).toUpperCase()}</span>
                    </div>
                )}
                <div className="flex-1 overflow-hidden relative z-10 flex flex-col justify-center">
                    <p className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase mb-0.5">{displaySponsor.name}</p>
                    <div className="animate-marquee whitespace-nowrap">
                        <p className="text-[13px] font-medium text-white/90 inline-block tracking-tight drop-shadow-md">{adText}</p>
                    </div>
                </div>
            </div>

            {modalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black pointer-events-auto animate-in fade-in duration-300">
                    {/* Full-screen Reels Container */}
                    <div
                        className="w-full h-full sm:max-w-md sm:h-[90vh] sm:rounded-[2rem] sm:border sm:border-white/20 relative overflow-hidden bg-zinc-900 flex flex-col shadow-2xl">

                        {/* Background Media */}
                        <div className="absolute inset-0 z-0">
                            {activeSponsor?.creative_asset ? (
                                isVideo(activeSponsor.creative_asset) ? (
                                    <video
                                        src={activeSponsor.creative_asset}
                                        autoPlay loop muted playsInline
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <img
                                        src={activeSponsor.creative_asset}
                                        alt="Sponsor Creative"
                                        className="w-full h-full object-cover"
                                    />
                                )
                            ) : (
                                <div
                                    className="w-full h-full bg-mesh-dark object-cover flex flex-col items-center justify-center border-amber-500/20">
                                    <div
                                        className="w-20 h-20 bg-black/40 backdrop-blur-md rounded-3xl flex items-center justify-center mb-4 border border-white/10">
                                        <span className="text-4xl text-amber-500">✨</span>
                                    </div>
                                    <p className="text-white/50 text-sm font-medium px-8 text-center">9:16 Vertical
                                        Creative Space</p>
                                </div>
                            )}
                        </div>

                        {/* Gradient Overlay for bottom text legibility */}
                        <div
                            className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90 z-10 pointer-events-none"></div>

                        {/* Close Button */}
                        <button
                            onClick={() => setModalOpen(false)}
                            className="absolute top-12 right-4 z-20 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 transition-colors active:scale-90"
                        >
                            <X className="w-6 h-6"/>
                        </button>

                        {/* Bottom Content Area (Instagram Style) */}
                        <div className="absolute bottom-0 left-0 right-0 p-5 pb-12 z-20">
                            <div className="flex items-center gap-3 mb-3">
                                {activeSponsor?.logo_asset ? (
                                    <img src={activeSponsor.logo_asset} alt="Logo"
                                         className="w-10 h-10 rounded-full border border-white/20 object-cover shadow-lg"/>
                                ) : (
                                    <div
                                        className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center border border-white/20 shadow-lg">
                                        <span
                                            className="font-bold text-amber-950 text-[10px] tracking-wider">{displaySponsor.name.substring(0, 3).toUpperCase()}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <span
                                        className="font-bold text-white text-[17px] tracking-tight drop-shadow-md">{displaySponsor.name}</span>
                                    <button
                                        className="px-3 py-1 bg-transparent border border-white/40 rounded-full text-white text-xs font-semibold hover:bg-white/10 active:bg-white/20 transition-colors shadow-sm ml-1">
                                        Visit
                                    </button>
                                </div>
                            </div>

                            <div
                                className="text-white/95 text-[15px] font-medium max-w-[85%] leading-snug drop-shadow-md">
                                {activeSponsor?.tagline || (activeSponsor
                                    ? "Grab a quick bite or enjoy special offers available right here in this zone."
                                    : "We build navigation for the real world. Get your venue mapped today and unlock spatial intelligence.")}
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
}
