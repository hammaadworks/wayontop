import {useEffect, useMemo, useRef, useState} from 'react';
import {Flame, Footprints, Layers, Share2, Timer, X} from 'lucide-react';
import {ViralSharing} from '../lib/sharing';
import {Gamification} from '../lib/gamification';
import {useTranslation} from 'react-i18next';
import html2canvas from 'html2canvas';

interface RouteSummaryProps {
    onClose: () => void;
    routeTrack: { lat: number; lng: number }[];
    distanceWalked: number; // in meters
    startTime: Date;
}

export function RouteSummary({onClose, distanceWalked, startTime, routeTrack}: RouteSummaryProps) {
    const {t} = useTranslation();
    const [stampsCount, setStampsCount] = useState(0);
    const [isCapturing, setIsCapturing] = useState(false);
    const [bgType, setBgType] = useState<'map' | 'satellite'>('satellite');
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setStampsCount(Gamification.getCollectedStamps().length);
    }, []);

    const durationMs = new Date().getTime() - startTime.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const steps = Math.floor(distanceWalked / 1.3);
    const calories = Math.floor(steps * 0.04);
    const distKm = (distanceWalked / 1000).toFixed(2);

    // SVG MiniMap calculations covering the full card
    const mapData = useMemo(() => {
        if (!routeTrack || routeTrack.length < 2) return null;

        let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
        routeTrack.forEach(p => {
            if (p.lat < minLat) minLat = p.lat;
            if (p.lat > maxLat) maxLat = p.lat;
            if (p.lng < minLng) minLng = p.lng;
            if (p.lng > maxLng) maxLng = p.lng;
        });

        const padding = 0.0002;
        minLat -= padding;
        maxLat += padding;
        minLng -= padding;
        maxLng += padding;

        const latDiff = maxLat - minLat;
        const lngDiff = maxLng - minLng;

        // Use a fixed viewBox aspect to match our card
        // Card is roughly 340x600, so 340 width by 600 height.
        const width = 340;
        const height = 600;

        // We need to scale the path to fit inside the viewBox while preserving aspect ratio
        const scaleX = width / lngDiff;
        const scaleY = height / latDiff;
        const scale = Math.min(scaleX, scaleY) * 0.7; // 0.7 to leave some padding

        const xOffset = (width - (lngDiff * scale)) / 2;
        const yOffset = (height - (latDiff * scale)) / 2;

        const getX = (lng: number) => ((lng - minLng) * scale) + xOffset;
        const getY = (lat: number) => ((maxLat - lat) * scale) + yOffset;

        const pathData = routeTrack.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.lng)} ${getY(p.lat)}`).join(' ');

        return {width, height, pathData, start: routeTrack[0], end: routeTrack[routeTrack.length - 1], getX, getY};
    }, [routeTrack]);

    const handleShare = async () => {
        if (!cardRef.current) return;
        setIsCapturing(true);

        try {
            await new Promise(r => setTimeout(r, 100));

            const canvas = await html2canvas(cardRef.current, {
                scale: 3, // Ultra high res
                useCORS: true,
                logging: false,
                backgroundColor: bgType === 'map' ? '#1e293b' : '#064e3b'
            });

            canvas.toBlob(async (blob) => {
                if (blob) {
                    await ViralSharing.shareImage(blob, 'My Lalbagh Explorer Route');
                }
                setIsCapturing(false);
            }, 'image/jpeg', 0.95);
        } catch (e) {
            console.error('Share capture failed', e);
            ViralSharing.shareText(
                'Lalbagh Explorer',
                `I just explored Lalbagh Botanical Garden! 🌳✨\n🚶 ${distKm}km walked\n⏱️ ${formattedTime}\n🏅 ${stampsCount} stamps found!`
            );
            setIsCapturing(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-3xl p-4 animate-in fade-in duration-500 font-sans">

            {/* Background Toggle (Hidden during capture) */}
            {!isCapturing && (
                <div
                    className="absolute top-8 left-1/2 -translate-x-1/2 z-50 flex bg-white/10 backdrop-blur-xl rounded-full p-1 border border-white/10">
                    <button
                        onClick={() => setBgType('map')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${bgType === 'map' ? 'bg-white text-black shadow-md' : 'text-white/60 hover:text-white'}`}
                    >
                        Map
                    </button>
                    <button
                        onClick={() => setBgType('satellite')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${bgType === 'satellite' ? 'bg-white text-black shadow-md' : 'text-white/60 hover:text-white'}`}
                    >
                        Satellite
                    </button>
                </div>
            )}

            {!isCapturing && (
                <button
                    onClick={onClose}
                    className="absolute top-8 right-5 z-50 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5"/>
                </button>
            )}

            {/* Share Card - Pacer/Strava Style */}
            <div className="flex flex-col items-center w-full max-w-[340px]">
                <div
                    ref={cardRef}
                    className={`w-full h-[600px] overflow-hidden shadow-2xl relative rounded-3xl ${
                        bgType === 'map' ? 'bg-slate-800' : 'bg-emerald-950'
                    }`}
                >
                    {/* Background Images / Textures */}
                    {bgType === 'map' ? (
                        <div
                            className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:15px_15px]"></div>
                    ) : (
                        <div
                            className="absolute inset-0 bg-cover bg-center opacity-80 mix-blend-luminosity"
                            style={{backgroundImage: "url('https://images.unsplash.com/photo-1574249118001-c8541e2a0f8b?q=80&w=800&auto=format&fit=crop')"}}
                        >
                            <div className="absolute inset-0 bg-black/40"></div>
                        </div>
                    )}

                    {/* SVG Map Overlay */}
                    {mapData && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <svg viewBox={`0 0 ${mapData.width} ${mapData.height}`}
                                 className="w-full h-full drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                                <path
                                    d={mapData.pathData}
                                    fill="none"
                                    stroke={bgType === 'map' ? '#3b82f6' : '#ffffff'}
                                    strokeWidth={bgType === 'map' ? "6" : "3"}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />

                                {/* Start Point */}
                                <circle cx={mapData.getX(mapData.start.lng)} cy={mapData.getY(mapData.start.lat)}
                                        r={bgType === 'map' ? "6" : "4"} fill="#10b981" stroke="#fff" strokeWidth="2"/>

                                {/* End Point */}
                                <circle cx={mapData.getX(mapData.end.lng)} cy={mapData.getY(mapData.end.lat)}
                                        r={bgType === 'map' ? "6" : "4"} fill="#ef4444" stroke="#fff" strokeWidth="2"/>
                            </svg>
                        </div>
                    )}

                    {/* Top Info (Distance & App Name) */}
                    <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-10">
                        <div className="flex flex-col">
                            <span
                                className="text-[42px] font-bold text-white leading-none tracking-tighter drop-shadow-lg">{distKm}
                                <span className="text-xl text-white/80">KM</span></span>
                            <span
                                className="text-white/70 text-xs font-semibold tracking-widest uppercase mt-1 drop-shadow-md">WayOnTop</span>
                        </div>

                        {isCapturing && (
                            <div
                                className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                                <Layers className="w-3 h-3 text-emerald-400"/>
                                <span
                                    className="text-white text-[10px] font-bold tracking-widest uppercase">Lalbagh AR</span>
                            </div>
                        )}
                    </div>

                    {/* Bottom Stats Overlay (Pacer style) */}
                    <div
                        className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-20">
                        <div className="flex justify-between items-end border-t border-white/20 pt-4">
                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1 mb-1 opacity-70">
                                    <Timer className="w-3.5 h-3.5 text-white"/>
                                </div>
                                <span className="text-white font-semibold text-sm tracking-wide">{formattedTime}</span>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1 mb-1 opacity-70">
                                    <Flame className="w-3.5 h-3.5 text-white"/>
                                </div>
                                <span className="text-white font-semibold text-sm tracking-wide">{calories}</span>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1 mb-1 opacity-70">
                                    <Footprints className="w-3.5 h-3.5 text-white"/>
                                </div>
                                <span className="text-white font-semibold text-sm tracking-wide">{steps}</span>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1 mb-1 opacity-70">
                                    <span
                                        className="text-[10px] text-white font-bold tracking-widest uppercase">Stamps</span>
                                </div>
                                <span className="text-emerald-400 font-bold text-sm tracking-wide">{stampsCount}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                {!isCapturing && (
                    <button
                        onClick={handleShare}
                        className="mt-6 w-full flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold py-4 px-6 rounded-full active:scale-95 transition-all duration-300 shadow-[0_10px_30px_rgba(59,130,246,0.3)] text-[15px]"
                    >
                        <Share2 className="w-4 h-4"/> SHARE
                    </button>
                )}
            </div>
        </div>
    );
}
