import React from 'react';
import { Navigation } from 'lucide-react';
import { CameraFeed } from './CameraFeed';
import { useCompass } from '../hooks/useCompass';
import { useLocation } from '../hooks/useLocation';
import { getBearing, distanceInMeters } from '@wayontop/ui/lib/routing';
import type { GraphNode, Stamp } from '@wayontop/ui/lib/types';
import { Gamification } from '../lib/gamification';
import { ViralSharing } from '../lib/sharing';
import { Sparkles, Share2, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { showAlert } from '../lib/events';

interface ARViewProps {
  targetNode?: GraphNode;
  stamps?: Stamp[];
}

export function ARView({ targetNode, stamps = [] }: ARViewProps) {
  const { t } = useTranslation();
  const { heading } = useCompass();
  const { location } = useLocation();
  const [collectedStampIds, setCollectedStampIds] = React.useState<string[]>([]);
  const [justClaimedStamp, setJustClaimedStamp] = React.useState<Stamp | null>(null);
  const [infoStamp, setInfoStamp] = React.useState<Stamp | null>(null);

  React.useEffect(() => {
    setCollectedStampIds(Gamification.getCollectedStamps());
  }, []);

  let targetBearing = 0;
  if (location && targetNode) {
    targetBearing = getBearing(location.lat, location.lng, targetNode.lat, targetNode.lng);
  }
  
  // Nearby stamp detection
  const nearbyStamp = React.useMemo(() => {
    if (!location || !stamps.length) return null;
    for (const stamp of stamps) {
      if (collectedStampIds.includes(stamp.id)) continue;
      const dist = distanceInMeters(location.lat, location.lng, stamp.lat, stamp.lng);
      if (dist <= 30) { // 30 meters radius
        return stamp;
      }
    }
    return null;
  }, [location, stamps, collectedStampIds]);

  const handleClaimStamp = async () => {
    if (!nearbyStamp) return;
    
    if (nearbyStamp.id.startsWith('golden')) {
      try {
        await Gamification.claimGoldenStamp(nearbyStamp.id, location?.lat || 0, location?.lng || 0);
      } catch (e: any) {
        showAlert(e.message || "Failed to claim golden stamp");
        // Remove it so we don't try again
        setCollectedStampIds(prev => [...prev, nearbyStamp.id]);
        return;
      }
    } else {
      Gamification.claimStamp(nearbyStamp.id);
    }

    setCollectedStampIds(prev => [...prev, nearbyStamp.id]);
    setJustClaimedStamp(nearbyStamp);
  };
  
  // Calculate relative rotation for the arrow
  const rawRotation = heading !== null ? (targetBearing - heading) : 0;
  
  // Smooth rotation logic to prevent 360 wrap-around spinning
  const [rotation, setRotation] = React.useState(0);
  const prevRawRef = React.useRef(0);
  
  React.useEffect(() => {
    let delta = rawRotation - prevRawRef.current;
    
    // Normalize delta to be between -180 and 180
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    
    setRotation(prev => prev + delta);
    prevRawRef.current = rawRotation;
  }, [rawRotation]);

  return (
    <div className="absolute inset-0 h-full w-full bg-black flex flex-col items-center justify-center overflow-hidden">
      <CameraFeed className="absolute inset-0 w-full h-full" />
      
      {/* AR Overlay (3D Perspective) */}
      <div className="z-10 flex flex-col items-center pointer-events-none mt-20" style={{ perspective: '800px' }}>
        <div className="relative flex items-center justify-center h-64 w-64">
          {/* Floor glow */}
          <div 
             className="absolute bg-emerald-500/20 rounded-full blur-[40px] animate-pulse-ring w-48 h-48"
             style={{ transform: 'rotateX(70deg)' }}
          ></div>
          
          <div 
            className="transition-transform duration-[400ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] relative z-10"
            style={{ 
              transformStyle: 'preserve-3d',
              transform: `rotateX(65deg) rotateZ(${rotation}deg)` 
            }}
          >
            {/* 3D Arrow Layering */}
            <Navigation 
              className="w-48 h-48 text-emerald-400 opacity-90 drop-shadow-[0_20px_30px_rgba(16,185,129,0.8)]" 
              strokeWidth={1.5} 
              fill="url(#emerald-gradient)"
            />
            {/* SVG Gradient Definition */}
            <svg width="0" height="0" className="absolute">
              <defs>
                <linearGradient id="emerald-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(52,211,153,1)" />
                  <stop offset="100%" stopColor="rgba(4,120,87,0.4)" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
        
        <div className="mt-4 flex flex-col items-center">
          <p className="font-extrabold text-[40px] tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,1)]">
            {heading !== null ? `${Math.round(heading)}°` : t('calibrating')}
          </p>
          <div className="mt-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full px-5 py-2 flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)] animate-pulse"></span>
            <span className="text-sm font-semibold text-white/90 tracking-wide">
              {location ? t('accuracy', { acc: Math.round(location.accuracy) }) : t('connecting_gps')}
            </span>
          </div>
        </div>
      </div>
      
      {/* Stamp Counter UI */}
      <div className="absolute top-24 left-4 z-40 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-inner shadow-white/40">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-white tracking-wide">
            {collectedStampIds.length} <span className="text-white/60 text-sm font-medium ml-1">Stamps</span>
          </span>
        </div>
      </div>

      {/* Figure 8 Calibration Tooltip */}
      <div className="absolute top-32 left-1/2 -translate-x-1/2 glass-pill px-5 py-2.5 pointer-events-none flex items-center z-10 animate-pulse">
        <span className="text-[11px] font-medium tracking-widest uppercase text-white/80">{t('move_8_calibrate')}</span>
      </div>

      {/* Stamp Claim UI Overlay (Pokemon Go Card Style) */}
      {nearbyStamp && !justClaimedStamp && !infoStamp && (
        <div className="absolute bottom-32 z-30 flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700 pointer-events-auto">
          <div 
            onClick={handleClaimStamp}
            className="group cursor-pointer" style={{ perspective: '1200px' }}
          >
            {/* The 3D Card */}
            <div className="w-[200px] h-[280px] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-4 border-amber-300 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 overflow-hidden transform-gpu transition-all duration-300 hover:-translate-y-4 hover:scale-105 group-hover:shadow-[0_0_40px_rgba(251,191,36,0.6)] relative">
              {/* Holographic overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none group-hover:translate-x-full transition-transform duration-1000"></div>
              
              <div className="p-4 flex flex-col h-full text-center">
                <div className="flex-1 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-full"></div>
                  <Sparkles className="w-16 h-16 text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,1)] animate-pulse" />
                </div>
                
                <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3 border border-white/10 mt-auto">
                  <p className="text-[10px] uppercase font-bold text-amber-400 tracking-widest mb-1">{t('stamp_nearby')}</p>
                  <h4 className="text-lg font-bold tracking-tight text-white leading-tight">{nearbyStamp.name}</h4>
                </div>
              </div>
            </div>
            
            <button className="mt-6 w-full bg-gradient-to-b from-amber-300 to-amber-500 hover:to-amber-400 text-amber-950 font-black tracking-widest uppercase py-3 px-8 rounded-full shadow-[0_10px_30px_rgba(251,191,36,0.6)] active:scale-95 transition-all duration-300">
              {t('claim_stamp')}
            </button>
          </div>
        </div>
      )}

      {/* Celebration UI */}
      {justClaimedStamp && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-500 pointer-events-auto">
          <div className="glass-panel p-10 text-center max-w-[340px] animate-in zoom-in-90 duration-700 spring-bounce border-emerald-500/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-900/40"></div>
            
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(16,185,129,0.6)] relative z-10">
              <Check className="w-12 h-12 text-white drop-shadow-md" strokeWidth={3} />
            </div>
            
            <h3 className="text-4xl tracking-tight font-extrabold text-white mb-3 relative z-10">{t('claimed')}</h3>
            <p className="text-emerald-200 mb-10 font-medium text-lg relative z-10">{justClaimedStamp.name}</p>
            
            <div className="space-y-4 relative z-10">
              <button 
                onClick={() => { setInfoStamp(justClaimedStamp); setJustClaimedStamp(null); }}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 font-bold py-4 px-8 rounded-full shadow-[0_10px_30px_rgba(251,191,36,0.4)] active:scale-95 transition-all duration-300 text-lg"
              >
                View Details
              </button>
              <button 
                onClick={() => setJustClaimedStamp(null)}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold py-4 px-8 rounded-full border border-white/10 active:scale-95 transition-all duration-300 text-lg backdrop-blur-md"
              >
                {t('continue_journey')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Card UI (Pokedex Style) */}
      {infoStamp && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-auto p-6">
          <div className="w-full max-w-sm bg-slate-900 rounded-[28px] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.9)] border border-slate-700 animate-in zoom-in-95 duration-500 flex flex-col">
            {/* Header image area */}
            <div className="h-48 bg-gradient-to-br from-indigo-800 to-purple-900 relative flex flex-col justify-end p-6">
              <button 
                onClick={() => setInfoStamp(null)}
                className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 rounded-full p-2 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Sparkles className="w-24 h-24 text-white/20" strokeWidth={1} />
              </div>
              <div className="relative z-10">
                <div className="inline-block bg-purple-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2 shadow-lg">
                  {infoStamp.rarity} Stamp
                </div>
                <h2 className="text-3xl font-extrabold text-white tracking-tight leading-none drop-shadow-md">
                  {infoStamp.name}
                </h2>
              </div>
            </div>
            
            {/* Body */}
            <div className="p-6 bg-slate-900 flex-1 overflow-y-auto max-h-[40vh]">
              <p className="text-slate-300 leading-relaxed text-[15px] mb-8">
                {infoStamp.description || `You discovered the incredible ${infoStamp.name}. Keep exploring to collect more stamps around Lalbagh!`}
              </p>
              
              <button 
                onClick={() => ViralSharing.shareAchievement(infoStamp.name)}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-200 text-slate-900 font-bold py-4 px-8 rounded-full active:scale-95 transition-all duration-300 text-lg shadow-[0_5px_15px_rgba(255,255,255,0.1)]"
              >
                <Share2 className="w-5 h-5" /> Share Discovery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
