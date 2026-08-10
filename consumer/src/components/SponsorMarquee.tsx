import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import type {GraphData, SponsorZone, Sponsor, GraphNode} from '@wayontop/ui/lib/types';
import {distanceInMeters} from '@wayontop/ui/lib/routing';
import {X} from 'lucide-react';
import {supabase} from '@wayontop/ui/lib/supabase';
import {SponsorReelsModal} from '@wayontop/ui/components/SponsorReelsModal';

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

            <SponsorReelsModal 
                isOpen={modalOpen} 
                onClose={() => setModalOpen(false)} 
                slideItems={slideItems} 
                initialSlideIndex={slideIndex} 
            />
        </>
    );
}
