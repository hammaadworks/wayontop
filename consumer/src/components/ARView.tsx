import React from 'react';
import {Check, Gem, Navigation, Share2, X} from 'lucide-react';
import {CameraFeed} from '@wayontop/ui/components/CameraFeed';
import {useCompass} from '../hooks/useCompass';
import type {LocationData} from '../hooks/useLocation';
import {distanceInMeters, getBearing} from '@wayontop/ui/lib/routing';
import type {GraphNode, Stamp} from '@wayontop/ui/lib/types';
import {Gamification} from '../lib/gamification';
import {ViralSharing} from '../lib/sharing';
import {useTranslation} from 'react-i18next';

interface ARViewProps {
    targetNode?: GraphNode;
    targetCoordinate?: Readonly<{lat: number; lng: number}>;
    location: LocationData | null;
    stamps?: Stamp[];
}

export function ARView({targetNode, targetCoordinate, location, stamps = []}: ARViewProps) {
    const {t} = useTranslation();
    const {heading} = useCompass();
    const [collectedStampIds, setCollectedStampIds] = React.useState<number[]>([]);
    const [justClaimedStamp, setJustClaimedStamp] = React.useState<Stamp | null>(null);
    const [infoStamp, setInfoStamp] = React.useState<Stamp | null>(null);

    React.useEffect(() => {
        setCollectedStampIds(Gamification.getCollectedStamps());
    }, []);

    let targetBearing = 0;
    const navigationTarget = targetCoordinate || targetNode;
    if (location && navigationTarget) {
        targetBearing = getBearing(location.lat, location.lng, navigationTarget.lat, navigationTarget.lng);
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

    const stampBearing = React.useMemo(() => {
        if (!location || !nearbyStamp) return 0;
        return getBearing(location.lat, location.lng, nearbyStamp.lat, nearbyStamp.lng);
    }, [location, nearbyStamp]);

    const isFacingStamp = React.useMemo(() => {
        if (heading === null || !nearbyStamp) return false;
        let diff = Math.abs(heading - stampBearing);
        if (diff > 180) diff = 360 - diff;
        return diff < 30; // 30 degree window
    }, [heading, stampBearing, nearbyStamp]);

    const handleClaimStamp = async () => {
        if (!nearbyStamp) return;

        Gamification.claimStamp(nearbyStamp.id);

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
        <div
            className="absolute inset-0 h-full w-full bg-black flex flex-col items-center justify-center overflow-hidden">
            <CameraFeed className="absolute inset-0 w-full h-full"/>

            {/* AR Overlay (3D Perspective) - Only show if navigating */}
            {navigationTarget ? (
                <div
                    className="absolute bottom-[25%] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center pointer-events-none"
                    style={{perspective: '800px'}}>
                    <div className="relative flex items-center justify-center h-64 w-64">
                        {/* Floor glow */}
                        <div
                            className="absolute bg-emerald-500/20 rounded-full blur-[40px] animate-pulse-ring w-48 h-48"
                            style={{transform: 'rotateX(70deg)'}}
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
                                        <stop offset="0%" stopColor="rgba(52,211,153,1)"/>
                                        <stop offset="100%" stopColor="rgba(4,120,87,0.4)"/>
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Figure 8 Calibration Tooltip */}
            <div
                className="absolute top-32 left-1/2 -translate-x-1/2 glass-pill px-5 py-2.5 pointer-events-none flex items-center z-10 animate-pulse">
                <span
                    className="text-[11px] font-medium tracking-widest uppercase text-white/80">{t('move_8_calibrate')}</span>
            </div>

            {/* Stamp Claim UI Overlay (Pokemon Go Card Style) */}
            {nearbyStamp && !justClaimedStamp && !infoStamp && (
                <>
                    {!isFacingStamp ? (
                        <div
                            className="absolute bottom-40 z-30 flex flex-col items-center animate-pulse pointer-events-none">
                            <div
                                className="glass-panel px-6 py-3 bg-amber-500/20 border-amber-500/50 rounded-full shadow-[0_0_20px_rgba(251,191,36,0.3)] flex items-center gap-2">
                                <Gem className="w-5 h-5 text-amber-400"/>
                                <p className="text-amber-400 font-bold text-sm tracking-wide">
                                    {t('stamp_nearby_hint', 'Stamp nearby! Look around in AR to find it.')}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="absolute bottom-40 z-30 flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700 pointer-events-auto">
                            <div
                                onClick={handleClaimStamp}
                                className="group cursor-pointer active:scale-95 active:rotate-[15deg] transition-all duration-500"
                                style={{perspective: '1200px'}}
                            >
                                {/* The 3D Card */}
                                <div
                                    className="w-[200px] h-[280px] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-4 border-amber-300 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 overflow-hidden transform-gpu transition-all duration-500 hover:-translate-y-4 hover:scale-105 group-hover:shadow-[0_0_40px_rgba(251,191,36,0.6)] group-active:rotate-y-180 relative flex flex-col">
                                    {/* Holographic overlay */}
                                    <div
                                        className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none group-hover:translate-x-full transition-transform duration-1000"></div>

                                    <div className="p-4 flex flex-col h-full text-center z-10">
                                        <div className="flex-1 flex items-center justify-center relative">
                                            <div
                                                className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-full"></div>
                                            <Gem
                                                className="w-16 h-16 text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,1)] animate-pulse"/>
                                        </div>

                                        <div
                                            className="bg-black/60 backdrop-blur-md rounded-xl p-3 border border-white/20 mt-auto shadow-inner relative overflow-hidden">
                                            <div
                                                className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                                            <p className="text-[10px] uppercase font-black text-amber-400 tracking-widest mb-1 relative z-10">{t('stamp_nearby', 'TAP TO CLAIM')}</p>
                                            <h4 className="text-lg font-bold tracking-tight text-white leading-tight relative z-10">{nearbyStamp.name}</h4>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Celebration UI */}
            {justClaimedStamp && (
                <div
                    className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-500 pointer-events-auto">
                    <div
                        className="glass-panel p-10 text-center max-w-[340px] animate-in zoom-in-90 duration-700 spring-bounce border-emerald-500/30 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-900/40"></div>

                        <div
                            className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(16,185,129,0.6)] relative z-10">
                            <Check className="w-12 h-12 text-white drop-shadow-md" strokeWidth={3}/>
                        </div>

                        <h3 className="text-4xl tracking-tight font-extrabold text-white mb-3 relative z-10">{t('claimed')}</h3>
                        <p className="text-emerald-200 mb-10 font-medium text-lg relative z-10">{t(justClaimedStamp.name)}</p>

                        <div className="space-y-4 relative z-10">
                            <button
                                onClick={() => {
                                    setInfoStamp(justClaimedStamp);
                                    setJustClaimedStamp(null);
                                }}
                                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 font-bold py-4 px-8 rounded-full shadow-[0_10px_30px_rgba(251,191,36,0.4)] active:scale-95 transition-all duration-300 text-lg"
                            >
                                {t('view_details', 'View Details')}
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
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-auto p-6">
                    <div
                        className="w-full max-w-sm bg-slate-900 rounded-[28px] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.9)] border border-slate-700 animate-in zoom-in-95 duration-500 flex flex-col">
                        {/* Header image area */}
                        <div
                            className="h-48 bg-gradient-to-br from-indigo-800 to-purple-900 relative flex flex-col justify-end p-6">
                            <button
                                onClick={() => setInfoStamp(null)}
                                className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 rounded-full p-2 text-white transition-colors"
                            >
                                <X className="w-5 h-5"/>
                            </button>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <Gem className="w-24 h-24 text-white/20" strokeWidth={1}/>
                            </div>
                            <div className="relative z-10">
                                <div
                                    className="inline-block bg-purple-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2 shadow-lg">
                                    {infoStamp.rarity} Stamp
                                </div>
                                <h2 className="text-3xl font-extrabold text-white tracking-tight leading-none drop-shadow-md">
                                    {t(infoStamp.name)}
                                </h2>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 bg-slate-900 flex-1 overflow-y-auto max-h-[40vh]">
                            <p className="text-slate-300 leading-relaxed text-[15px] mb-8">
                                {t(infoStamp.description || `You discovered the incredible ${t(infoStamp.name)}. Keep exploring to collect more stamps around Lalbagh!`)}
                            </p>

                            <button
                                onClick={() => ViralSharing.shareAchievement(t(infoStamp.name))}
                                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-200 text-slate-900 font-bold py-4 px-8 rounded-full active:scale-95 transition-all duration-300 text-lg shadow-[0_5px_15px_rgba(255,255,255,0.1)]"
                            >
                                <Share2 className="w-5 h-5"/> {t('share_discovery', 'Share Discovery')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
