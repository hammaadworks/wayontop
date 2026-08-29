import {useEffect, useState, useMemo} from 'react';
import type {GraphData, SponsorZone, Sponsor, GraphNode} from '@wayontop/ui/lib/types';
import {distanceInMeters} from '@wayontop/ui/lib/routing';
import {SponsorReelsModal} from '@wayontop/ui/components/SponsorReelsModal';
import {Analytics} from '../lib/analytics';

interface SponsorMarqueeProps {
    sponsorZones?: SponsorZone[];
    graph?: GraphData | null;
    location?: { lat: number; lng: number } | null;
    className?: string;
    onModalChange?: (isOpen: boolean) => void;
}

const defaultSponsor: Sponsor = {
    id: "0",
    name: 'Lalbagh',
    tagline: 'Official Lalbagh Mass Communication',
    logo_asset: '/favicon.svg',
    creative_asset: '/attention.png'
};

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
        
        setCurrentZone(prevZone => {
            if (foundZone && prevZone?.id !== foundZone.id) {
                const mappedSponsors = (graph?.sponsors || []).filter(s => s.zone_ids?.includes(foundZone.id));
                Analytics.logEvent('sponsor_walk_in', {
                    zone_id: foundZone.id,
                    sponsor_ids: mappedSponsors.map(s => s.id)
                });
            }
            return foundZone;
        });
    }, [location, graph, sponsorZones]);



    const [slideIndex, setSlideIndex] = useState(0);
    const [displayIndex, setDisplayIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setDisplayIndex(prev => prev + 1);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Construct the slides.
    const defaultAds = useMemo(() => (graph?.sponsors || []).filter(s => s.is_default_ad), [graph?.sponsors]);

    const currentZoneSponsors = useMemo(() => {
        if (!currentZone) return [];
        return (graph?.sponsors || []).filter(s => s.zone_ids?.includes(currentZone.id));
    }, [currentZone, graph?.sponsors]);

    const slideItems = useMemo(() => {
        // Show current zone sponsors first, then default ads
        const items = [...currentZoneSponsors, ...defaultAds];
        // Make unique by ID
        const unique = Array.from(new Map(items.map(s => [s.id, s])).values());
        return unique.length > 0 ? unique : [defaultSponsor];
    }, [currentZoneSponsors, defaultAds]);

    const activeSponsors = currentZoneSponsors.length > 0 ? currentZoneSponsors : defaultAds.length > 0 ? defaultAds : [defaultSponsor];
    const displaySponsor = activeSponsors[displayIndex % activeSponsors.length] || defaultSponsor;

    useEffect(() => {
        if (displaySponsor) {
            Analytics.logEvent('sponsor_impression', {
                sponsor_id: displaySponsor.id,
                zone_id: currentZone?.id || 'default'
            });
        }
    }, [displaySponsor, currentZone]);

    useEffect(() => {
        if (modalOpen && displaySponsor) {
            const idx = slideItems.findIndex(s => s.id === displaySponsor.id);
            setSlideIndex(idx >= 0 ? idx : 0);
        }
    }, [modalOpen, displaySponsor, slideItems]);

    const adText = currentZoneSponsors.length > 0
        ? `Welcome to the ${currentZone?.name || 'Sponsor'} zone! Tap to see special offers.`
        : (displaySponsor.tagline || 'Official Lalbagh Mass Communication');

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

            <SponsorReelsModal 
                isOpen={modalOpen} 
                onClose={() => setModalOpen(false)} 
                slideItems={slideItems} 
                initialSlideIndex={slideIndex} 
                onCTAClick={(sponsor) => {
                    Analytics.logEvent('sponsor_cta_click', {
                        sponsor_id: sponsor.id,
                        sponsor_name: sponsor.name,
                        cta_link: sponsor.cta_link
                    });
                }}
            />
        </>
    );
}
