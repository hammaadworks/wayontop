import {useEffect, useMemo, useRef, useState} from 'react';
import {Flame, Footprints, Layers, Share2, Timer, X, Play, Pause, Square, ImagePlus, BatteryWarning} from 'lucide-react';
import {ViralSharing} from '../lib/sharing';
import {Gamification} from '../lib/gamification';
import {useTranslation} from 'react-i18next';
import html2canvas from 'html2canvas';
import type { TrackingStatus } from '../hooks/useLocation';

interface RouteSummaryProps {
    onClose: () => void;
    routeTrack: { lat: number; lng: number }[];
    distanceWalked: number; // in meters
    startTime: Date | null;
    elapsedTime: number; // in seconds
    status: TrackingStatus;
    onStart: () => void;
    onPause: () => void;
    onResume: () => void;
    onEnd: () => void;
}

export function RouteSummary({
    onClose, distanceWalked, startTime, routeTrack, 
    elapsedTime, status, onStart, onPause, onResume, onEnd
}: RouteSummaryProps) {
    const {t} = useTranslation();
    const [stampsCount, setStampsCount] = useState(0);
    const [isCapturing, setIsCapturing] = useState(false);
    const [bgType, setBgType] = useState<'map' | 'satellite' | 'custom'>('satellite');
    const [customImage, setCustomImage] = useState<string | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setStampsCount(Gamification.getCollectedStamps().length);
    }, []);

    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
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

        const width = 340;
        const height = 600;

        const scaleX = width / lngDiff;
        const scaleY = height / latDiff;
        const scale = Math.min(scaleX, scaleY) * 0.7; 

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
                scale: 3,
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
                `I just explored Lalbagh Botanical Garden! 🌳✨\n🚶 ~${distKm}km walked\n👟 ${steps} approx. steps\n🔥 ${calories} est. cals\n⏱️ ${formattedTime}\n🏅 ${stampsCount} stamps found!`
            );
            setIsCapturing(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setCustomImage(event.target?.result as string);
                setBgType('custom');
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-3xl p-4 animate-in fade-in duration-500 font-sans">
            
            {!isCapturing && (
                <button
                    onClick={onClose}
                    className="absolute top-8 right-5 z-50 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5"/>
                </button>
            )}

            {/* Background Toggle (Hidden during capture) */}
            {!isCapturing && (
                <div
                    className="mb-4 z-50 flex bg-white/10 backdrop-blur-xl rounded-full p-1 border border-white/10 overflow-hidden">
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
                    <button
                        onClick={() => {
                            if (customImage) {
                                setBgType('custom');
                            } else {
                                fileInputRef.current?.click();
                            }
                        }}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${bgType === 'custom' ? 'bg-white text-black shadow-md' : 'text-white/60 hover:text-white'}`}
                    >
                        <ImagePlus className="w-3.5 h-3.5" /> Photo
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        accept="image/*" 
                        className="hidden" 
                    />
                </div>
            )}

            {/* Share Card - Pacer/Strava Style */}
            <div className="flex flex-col items-center w-full max-w-[340px]">
                <div
                    ref={cardRef}
                    className={`w-full h-[580px] overflow-hidden shadow-2xl relative rounded-3xl ${
                        bgType === 'map' ? 'bg-slate-800' : 'bg-emerald-950'
                    }`}
                >
                    {/* Background Images / Textures */}
                    {bgType === 'map' && (
                        <div
                            className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:15px_15px]"></div>
                    )}
                    {bgType === 'satellite' && (
                        <div
                            className="absolute inset-0 bg-cover bg-center opacity-80 mix-blend-luminosity"
                            style={{backgroundImage: "url('/lalbagh-strava-sat-bg.png')"}}
                        >
                            <div className="absolute inset-0 bg-black/40"></div>
                        </div>
                    )}
                    {bgType === 'custom' && customImage && (
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{backgroundImage: `url(${customImage})`}}
                        >
                            <div className="absolute inset-0 bg-black/30"></div>
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

                        {/* Watermark Top Right */}
                        <div
                            className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                            <Layers className="w-3 h-3 text-emerald-400"/>
                            <span
                                className="text-white text-[10px] font-bold tracking-widest uppercase">@lalbagh.top</span>
                        </div>
                    </div>

                    {/* Bottom Stats Overlay */}
                    <div
                        className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-20">
                        <div className="flex justify-between items-end border-t border-white/20 pt-4">
                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1 mb-1 opacity-70">
                                    <Timer className="w-3.5 h-3.5 text-white"/>
                                </div>
                                <span className="text-white font-semibold text-sm tracking-wide">{formattedTime}</span>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1 mb-1 opacity-70">
                                    <Flame className="w-3 h-3 text-white"/>
                                    <span className="text-[9px] text-white font-bold tracking-widest uppercase">Est. Cals</span>
                                </div>
                                <span className="text-white font-semibold text-sm tracking-wide">{calories}</span>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1 mb-1 opacity-70">
                                    <Footprints className="w-3 h-3 text-white"/>
                                    <span className="text-[9px] text-white font-bold tracking-widest uppercase">~Steps</span>
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

                {/* Controls & Actions */}
                {!isCapturing && (
                    <div className="mt-6 w-full flex flex-col gap-4">
                        {/* Fitness Controls */}
                        <div className="flex items-center justify-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-2">
                            {status === 'idle' || status === 'ended' ? (
                                <button
                                    onClick={() => { onStart(); onClose(); }}
                                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all"
                                >
                                    <Play className="w-4 h-4"/> Start Walk
                                </button>
                            ) : (
                                <>
                                    {status === 'recording' ? (
                                        <button
                                            onClick={onPause}
                                            className="flex-1 flex items-center justify-center gap-2 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 font-bold py-3 rounded-xl transition-all"
                                        >
                                            <Pause className="w-4 h-4"/> Pause
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => { onResume(); onClose(); }}
                                            className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-bold py-3 rounded-xl transition-all"
                                        >
                                            <Play className="w-4 h-4"/> Resume
                                        </button>
                                    )}
                                    <button
                                        onClick={onEnd}
                                        className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 font-bold py-3 rounded-xl transition-all"
                                    >
                                        <Square className="w-4 h-4"/> Stop
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Share Button */}
                        <button
                            onClick={handleShare}
                            className="w-full flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold py-4 rounded-xl active:scale-95 transition-all duration-300 shadow-[0_10px_30px_rgba(59,130,246,0.3)] text-[15px]"
                        >
                            <Share2 className="w-4 h-4"/> Share Route
                        </button>
                        
                        {/* Battery Disclaimer */}
                        <div className="flex items-center gap-2 text-white/40 text-xs justify-center mt-2 px-4 text-center">
                            <BatteryWarning className="w-4 h-4 shrink-0" />
                            <span>GPS tracking and AR Wayfinding consumes significant battery. Ensure your device is charged!</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
