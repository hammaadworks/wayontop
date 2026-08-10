import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import type {GraphData, SponsorZone, Sponsor, GraphNode} from '@wayontop/ui/lib/types';
import {distanceInMeters} from '@wayontop/ui/lib/routing';
import {X} from 'lucide-react';
import {supabase} from '@wayontop/ui/lib/supabase';

interface SponsorMarqueeProps {
    sponsorZones?: SponsorZone[];
    graph?: GraphData | null;
    location?: { lat: number; lng: number } | null;
    className?: string;
    onModalChange?: (isOpen: boolean) => void;
}

export function SponsorMarquee({
                                   sponsorZones = [],
                                   graph,
                                   location,
                                   className = "absolute bottom-28 left-4 right-4",
                                   onModalChange
                               }: SponsorMarqueeProps) {
    const [currentZone, setCurrentZone] = useState<SponsorZone | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        if (onModalChange) {
            onModalChange(modalOpen);
        }
    }, [modalOpen, onModalChange]);

    useEffect(() => {
        if (!location || !graph || !sponsorZones.length) return;

        let foundZone: SponsorZone | null = null;
        for (const zone of sponsorZones) {
            const pois = (zone.poi_ids || []).map(id => graph.nodes.find(n => n.id === id)).filter((n): n is GraphNode => Boolean(n));
            let inside = false;
            for (const poi of pois) {
                const dist = distanceInMeters(location.lat, location.lng, poi.lat, poi.lng);
                if (dist <= zone.radius_m) {
                    inside = true;
                    break;
                }
            }
            if (inside) {
                foundZone = zone;
                break;
            }
        }
        setCurrentZone(foundZone);
    }, [location, graph, sponsorZones]);

    const [slideIndex, setSlideIndex] = useState(0);

    const defaultSponsor: Sponsor = {
        id: 'default',
        name: 'wayon.top',
        tagline: 'We build navigation for the real world. Get your venue mapped today and unlock spatial intelligence.'
    };

    // Construct the slides. Only consider zones with mapped sponsors OR default ads.
    const allMappedSponsors = sponsorZones
        .flatMap(z => (z.sponsor_ids || []).map(id => graph?.sponsors?.find(s => s.id === id)))
        .filter(Boolean) as Sponsor[];
    
    // Make unique
    const mappedSponsors = Array.from(new Map(allMappedSponsors.map(s => [s.id, s])).values());
    
    const defaultAds = (graph?.sponsors || []).filter(s => s.is_default_ad);

    // If there are no sponsors at all, show the default wayon.top sponsor
    let slideItems = mappedSponsors.length > 0 ? mappedSponsors : defaultAds.length > 0 ? defaultAds : [defaultSponsor];

    const currentZoneSponsors = currentZone?.sponsor_ids?.length 
        ? currentZone.sponsor_ids.map(id => graph?.sponsors?.find(s => s.id === id)).filter(Boolean) as Sponsor[]
        : [];

    const currentZoneSponsor = currentZoneSponsors.length > 0
        ? currentZoneSponsors[0]
        : (defaultAds[Math.floor(Math.random() * defaultAds.length)] || defaultSponsor); // Random default ad for open zones

    useEffect(() => {
        if (modalOpen && currentZoneSponsor) {
            const idx = slideItems.findIndex(s => s.id === currentZoneSponsor.id);
            setSlideIndex(idx >= 0 ? idx : 0);
        }
    }, [modalOpen, currentZoneSponsor, slideItems]);

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSlideIndex(prev => (prev + 1) % slideItems.length);
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSlideIndex(prev => (prev - 1 + slideItems.length) % slideItems.length);
    };

    const handleCTAClick = async (sponsor: Sponsor) => {
        if (!sponsor.cta_link) return;
        
        try {
            await supabase.from('analytics_events').insert({
                event_type: 'sponsor_cta_click',
                metadata: {
                    sponsor_id: sponsor.id,
                    sponsor_name: sponsor.name,
                    cta_link: sponsor.cta_link
                }
            });
        } catch (e) {
            console.error('Failed to log CTA click', e);
        }

        window.open(sponsor.cta_link, '_blank', 'noopener,noreferrer');
    };

    const displaySponsor = currentZoneSponsor || defaultSponsor;
    const currentSlide = slideItems[slideIndex];

    const adText = currentZone?.sponsor_ids?.length
        ? `Welcome to the ${currentZone.name} zone! Tap to see special offers.`
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
                {displaySponsor.logo_asset ? (
                    <img src={displaySponsor.logo_asset} alt="Logo"
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

            {modalOpen && createPortal(
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black pointer-events-auto animate-in fade-in duration-300 touch-none overscroll-none"
                    style={{ overscrollBehavior: 'none' }}
                >
                    {/* Full-screen Reels Container */}
                    <div
                        className="w-full h-full sm:max-w-md sm:h-[90vh] sm:rounded-[2rem] sm:border sm:border-white/20 relative overflow-hidden bg-zinc-900 flex flex-col shadow-2xl"
                    >
                        {/* Navigation Click Areas */}
                        <div className="absolute inset-0 z-30 flex">
                            <div className="w-[30%] h-full" onClick={handlePrev}></div>
                            <div className="w-[70%] h-full" onClick={handleNext}></div>
                        </div>

                        {/* Background Media */}
                        <div className="absolute inset-0 z-0">
                            {currentSlide?.creative_asset ? (
                                isVideo(currentSlide.creative_asset) ? (
                                    <video
                                        key={currentSlide.id}
                                        src={currentSlide.creative_asset}
                                        autoPlay loop muted playsInline
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <img
                                        key={currentSlide.id}
                                        src={currentSlide.creative_asset}
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
                            onClick={(e) => {
                                e.stopPropagation();
                                setModalOpen(false);
                            }}
                            className="absolute top-12 right-4 z-40 w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 transition-colors active:scale-90"
                        >
                            <X className="w-8 h-8"/>
                        </button>

                        {/* Progress Bars (Instagram style) */}
                        <div className="absolute top-8 left-4 right-16 z-40 flex gap-1.5 pointer-events-none">
                            {slideItems.map((_, i) => (
                                <div key={i} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                                    <div className={`h-full bg-white transition-all duration-300 ${i === slideIndex ? 'w-full' : i < slideIndex ? 'w-full' : 'w-0'}`} />
                                </div>
                            ))}
                        </div>

                        {/* Bottom Content Area (Instagram Style) */}
                        <div className="absolute bottom-0 left-0 right-0 p-5 pb-12 z-40 pointer-events-none">
                            <div className="flex items-center gap-3 mb-3">
                                {currentSlide?.logo_asset ? (
                                    <img src={currentSlide.logo_asset} alt="Logo"
                                         className="w-10 h-10 rounded-full border border-white/20 object-cover shadow-lg"/>
                                ) : (
                                    <div
                                        className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center border border-white/20 shadow-lg">
                                        <span
                                            className="font-bold text-amber-950 text-[10px] tracking-wider">{currentSlide.name.substring(0, 3).toUpperCase()}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <span
                                        className="font-bold text-white text-[17px] tracking-tight drop-shadow-md">{currentSlide.name}</span>
                                    {currentSlide.cta_link && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCTAClick(currentSlide);
                                            }}
                                            className="px-3 py-1 bg-emerald-500/80 border border-emerald-400/50 rounded-full text-white text-xs font-bold hover:bg-emerald-500 active:bg-emerald-600 transition-colors shadow-sm ml-1 pointer-events-auto flex items-center gap-1 backdrop-blur-sm">
                                            Visit
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div
                                className="text-white/95 text-[15px] font-medium max-w-[85%] leading-snug drop-shadow-md">
                                {currentSlide?.tagline || (currentSlide.id === 'default'
                                    ? "We build navigation for the real world. Get your venue mapped today and unlock spatial intelligence."
                                    : "Grab a quick bite or enjoy special offers available right here in this zone.")}
                            </div>
                        </div>

                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
