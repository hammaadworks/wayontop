import {useCallback, useEffect, useRef, useState} from 'react';
import {CameraOff, Map, Settings, ZoomIn, ZoomOut} from 'lucide-react';

interface CameraFeedProps {
    className?: string;
}

export function CameraFeed({className = ''}: CameraFeedProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const trackRef = useRef<MediaStreamTrack | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Zoom state
    const [zoom, setZoom] = useState<number>(1);
    const [zoomCaps, setZoomCaps] = useState<{ min: number, max: number, step: number } | null>(null);

    // Pinch tracking
    const pinchStartDistRef = useRef<number | null>(null);
    const pinchStartZoomRef = useRef<number>(1);

    useEffect(() => {
        let stream: MediaStream | null = null;

        async function startCamera() {
            try {
                // Try with zoom constraint first (required on Android Chrome for zoom access)
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {facingMode: 'environment', zoom: true} as any
                    });
                } catch (initialErr: any) {
                    // If zoom constraint is not supported (e.g. Safari or Firefox), fallback to standard
                    console.warn("Zoom constraint not supported, falling back to standard video", initialErr);
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {facingMode: 'environment'}
                    });
                }

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.setAttribute('playsinline', 'true');
                    await videoRef.current.play();
                }

                const track = stream.getVideoTracks()[0];
                trackRef.current = track;

                // Check hardware zoom capabilities
                const capabilities = track.getCapabilities() as any;
                if (capabilities.zoom) {
                    const settings = track.getSettings() as any;
                    setZoom(settings.zoom || capabilities.zoom.min);
                    setZoomCaps({
                        min: capabilities.zoom.min,
                        max: capabilities.zoom.max,
                        step: capabilities.zoom.step || 0.1
                    });
                }
            } catch (err: any) {
                console.error("Error accessing camera:", err);
                setError('Unable to access camera. Please check permissions.');
            }
        }

        void startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleZoomChange = useCallback(async (newZoom: number) => {
        if (!trackRef.current || !zoomCaps) return;

        // Clamp zoom value
        const clampedZoom = Math.min(Math.max(newZoom, zoomCaps.min), zoomCaps.max);

        try {
            await trackRef.current.applyConstraints({
                advanced: [{zoom: clampedZoom} as any]
            });
            setZoom(clampedZoom);
        } catch (err) {
            console.warn("Failed to apply zoom constraints", err);
        }
    }, [zoomCaps]);

    // Touch handlers for pinch-to-zoom
    const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && zoomCaps) {
      pinchStartDistRef.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartZoomRef.current = zoom;
    }
  };

    const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null && zoomCaps) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      const scale = currentDist / pinchStartDistRef.current;
      const newZoom = pinchStartZoomRef.current * scale;
      
      // Debounce or directly apply if smooth enough. Let's try directly applying:
      void handleZoomChange(newZoom);
    }
  };

    const onTouchEnd = () => {
        pinchStartDistRef.current = null;
    };

    if (error) {
        return (
            <div
                className={`flex flex-col items-center justify-center bg-slate-900 text-white p-8 pb-32 text-center ${className} z-50`}>
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <CameraOff className="w-10 h-10 text-slate-400"/>
                </div>

                <h3 className="text-2xl font-bold mb-3 tracking-tight">Camera Unavailable</h3>
                <p className="text-slate-400 mb-8 max-w-sm">
                    You can still navigate Lalbagh without AR! Use the Map view, or follow the steps below to enable the
                    camera.
                </p>

                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 text-left max-w-md w-full mb-8">
                    <h4 className="text-amber-400 font-bold mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5"/> How to Enable Camera
                    </h4>

                    <div className="space-y-4 text-sm text-slate-300">
                        <div>
                            <p className="font-bold text-white mb-1">1. Browser Level (Site Settings)</p>
                            <ul className="list-disc list-inside ml-1 opacity-90 space-y-1">
                                <li><span className="text-white">iOS:</span> Tap the <strong>aA</strong> icon in the
                                    address bar → Website Settings → Camera → Allow
                                </li>
                                <li><span className="text-white">Android:</span> Tap the lock icon near the URL →
                                    Permissions → Camera → Allow
                                </li>
                            </ul>
                        </div>

                        <div>
                            <p className="font-bold text-white mb-1">2. OS Level (Device Settings)</p>
                            <ul className="list-disc list-inside ml-1 opacity-90 space-y-1">
                                <li><span className="text-white">iOS:</span> Settings → Safari/Chrome → Camera → Allow
                                </li>
                                <li><span className="text-white">Android:</span> Settings → Apps → Chrome → Permissions
                                    → Camera → Allow
                                </li>
                            </ul>
                        </div>
                    </div>

                    <p className="mt-5 text-xs text-slate-500">After changing settings, refresh the page.</p>
                </div>

                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('switch-view', {detail: {view: 'map'}}))}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 px-8 rounded-full shadow-lg flex items-center gap-2 active:scale-95 transition-all"
                >
                    <Map className="w-5 h-5"/> Switch to Map View
                </button>
            </div>
        );
    }

    // Visual zoom scale if no hardware zoom is available? User said "make sure hardware supports it".
    // So we only enable zoom UI if hardware supports it.

    return (
        <div
            className={`absolute inset-0 w-full h-full overflow-hidden ${className}`}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full min-w-full min-h-full object-cover"
                autoPlay
                playsInline
                muted
            />

            {/* Zoom UI Overlay */}
            {zoomCaps && (
                <div
                    className="absolute bottom-48 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 z-20 pointer-events-auto shadow-lg">
                    <button
                        className="text-white/80 active:text-white active:scale-90 transition-all p-2"
                        onClick={() => handleZoomChange(zoomCaps.min)} // Max zoom out
                    >
                        <ZoomOut className="w-5 h-5"/>
                    </button>

                    <div className="w-32 relative flex items-center">
                        <input
                            type="range"
                            min={zoomCaps.min}
                            max={zoomCaps.max}
                            step={zoomCaps.step}
                            value={zoom}
                            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                        />
                    </div>

                    <button
                        className="text-white/80 active:text-white active:scale-90 transition-all p-2"
                        onClick={() => handleZoomChange(Math.min(zoomCaps.max, zoom + 1))} // Zoom in a bit
                    >
                        <ZoomIn className="w-5 h-5"/>
                    </button>

                    <div
                        className="text-white/90 text-[11px] font-bold tracking-widest tabular-nums w-8 text-center bg-black/30 rounded-md py-1 ml-2">
                        {zoom.toFixed(1)}x
                    </div>
                </div>
            )}
        </div>
    );
}
