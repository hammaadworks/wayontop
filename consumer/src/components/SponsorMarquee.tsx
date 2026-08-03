import { useState, useEffect } from 'react';
import type { SponsorZone, GraphData } from '@wayontop/ui/lib/types';
import { distanceInMeters } from '@wayontop/ui/lib/routing';
import { X } from 'lucide-react';

interface SponsorMarqueeProps {
  sponsors?: SponsorZone[];
  graph?: GraphData | null;
  location?: { lat: number; lng: number } | null;
  className?: string;
}

export function SponsorMarquee({ sponsors = [], graph, location, className = "absolute bottom-28 left-4 right-4" }: SponsorMarqueeProps) {
  const [activeSponsor, setActiveSponsor] = useState<SponsorZone | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!location || !graph || !sponsors.length) return;

    // Find the first sponsor zone the user is currently inside
    let currentSponsor: SponsorZone | null = null;
    for (const sponsor of sponsors) {
      const poi = graph.nodes.find(n => n.id === sponsor.poi_id);
      if (poi) {
        const dist = distanceInMeters(location.lat, location.lng, poi.lat, poi.lng);
        if (dist <= sponsor.radius_m) {
          currentSponsor = sponsor;
          break;
        }
      }
    }
    setActiveSponsor(currentSponsor);
  }, [location, graph, sponsors]);

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

  return (
    <>
      <div 
        onClick={() => setModalOpen(true)}
        className={`${className} overflow-hidden bg-black/50 backdrop-blur-2xl p-1.5 pr-4 rounded-full flex items-center gap-3 z-40 cursor-pointer pointer-events-auto transform transition-all duration-300 hover:scale-105 active:scale-95 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] mx-auto w-[90%] max-w-[340px]`}
      >
        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shrink-0 shadow-inner relative z-10">
          <span className="font-bold text-amber-950 text-[10px] tracking-wider">{displaySponsor.name.substring(0, 3).toUpperCase()}</span>
        </div>
        <div className="flex-1 overflow-hidden relative z-10 flex flex-col justify-center">
          <p className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase mb-0.5">{displaySponsor.name}</p>
          <div className="animate-marquee whitespace-nowrap">
            <p className="text-[13px] font-medium text-white/90 inline-block tracking-tight drop-shadow-md">{adText}</p>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-5 pointer-events-auto animate-in fade-in duration-500">
          <div className="glass-panel w-full max-w-sm overflow-hidden relative shadow-[0_30px_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-500 spring-bounce border-amber-400/20">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-black/60"></div>
            
            <button 
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white/50 hover:text-white border border-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="h-56 relative overflow-hidden flex flex-col items-center justify-center border-b border-white/5">
              <div className="absolute inset-0 bg-mesh-dark opacity-80 mix-blend-screen"></div>
              {activeSponsor ? (
                 <span className="relative z-10 text-white/50 text-sm font-medium tracking-wide bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">Ad Creative ({activeSponsor.banner_asset})</span>
              ) : (
                 <span className="relative z-10 text-white/50 text-sm font-medium tracking-wide bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">Default Ad Creative</span>
              )}
            </div>
            
            <div className="p-8 relative z-10">
              <h3 className="text-3xl font-extrabold tracking-tight text-white mb-3">{displaySponsor.name}</h3>
              <p className="text-white/60 mb-8 leading-relaxed font-medium">
                {activeSponsor 
                  ? "Grab a quick bite or enjoy special offers available right here in this zone. Unlock rewards by visiting our store!"
                  : "We build navigation for the real world. Get your venue mapped today and unlock spatial intelligence."}
              </p>
              <button 
                onClick={() => setModalOpen(false)}
                className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 font-bold tracking-wide py-4 rounded-full shadow-[0_10px_30px_rgba(251,191,36,0.3)] active:scale-95 transition-all duration-300 text-lg"
              >
                Continue Exploring
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
