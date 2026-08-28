import {useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {CameraOff, Map, Settings} from 'lucide-react';

interface CameraFeedProps {
    className?: string;
    onClose?: () => void;
}

export function CameraFeed({className = '', onClose}: CameraFeedProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const trackRef = useRef<MediaStreamTrack | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;
        let isMounted = true;

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
                    if (!isMounted) return; // Prevent secondary request if already unmounted
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {facingMode: 'environment'}
                    });
                }

                if (!isMounted) {
                    if (stream) {
                        stream.getTracks().forEach(track => track.stop());
                    }
                    return;
                }

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.setAttribute('playsinline', 'true');
                    await videoRef.current.play();
                }

                const track = stream.getVideoTracks()[0];
                trackRef.current = track;

                // Check hardware zoom capabilities and force widest lens
                if (typeof track.getCapabilities === 'function') {
                    const capabilities = track.getCapabilities() as any;
                    if (capabilities && capabilities.zoom) {
                        try {
                            await track.applyConstraints({
                                advanced: [{zoom: capabilities.zoom.min} as any]
                            });
                        } catch (e) {
                            console.warn("Failed to apply minimum zoom constraint", e);
                        }
                    }
                }
            } catch (err: any) {
                if (!isMounted) return;
                console.error("Error accessing camera:", err);
                setError('Unable to access camera. Please check permissions.');
            }
        }

        void startCamera();

        return () => {
            isMounted = false;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    if (error) {
        const errorContent = (
            <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black p-4 sm:p-6 overflow-hidden">
                <div className="absolute inset-0 bg-mesh-dark opacity-60 pointer-events-none -z-10"></div>
                
                <div className="relative w-full max-w-[340px] p-6 glass-panel animate-in zoom-in-95 duration-500 flex flex-col rounded-3xl">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5 shrink-0 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                        <CameraOff className="w-8 h-8 text-red-400"/>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-extrabold text-white text-center mb-2 tracking-tight">Camera Unavailable</h3>
                    <p className="text-white/70 text-center text-[13px] leading-relaxed font-medium mb-6">
                        We couldn't access your camera. You can still navigate Lalbagh using the Map view, or check your settings.
                    </p>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left w-full mb-6">
                        <h4 className="text-amber-400 font-bold text-sm mb-3 flex items-center gap-2">
                            <Settings className="w-4 h-4"/> How to fix access
                        </h4>

                        <div className="space-y-3 text-xs text-slate-300">
                            <div>
                                <p className="font-bold text-white mb-1">1. Browser Level</p>
                                <p className="opacity-80">Tap the lock or aA icon near the URL bar, and Allow Camera access.</p>
                            </div>
                            <div>
                                <p className="font-bold text-white mb-1">2. Device Level</p>
                                <p className="opacity-80">Open your phone Settings, find your browser app, and Allow Camera.</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            if (onClose) onClose();
                            else window.dispatchEvent(new CustomEvent('switch-view', {detail: {view: 'map'}}));
                        }}
                        className="w-full relative overflow-hidden group bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-3 px-6 rounded-2xl shadow-[0_10px_40px_rgba(255,255,255,0.1)] active:scale-95 transition-all duration-300 text-sm flex items-center justify-center gap-2"
                    >
                        {onClose ? (
                            <>Close</>
                        ) : (
                            <><Map className="w-4 h-4"/> Switch to Map View</>
                        )}
                    </button>
                </div>
            </div>
        );
        return createPortal(errorContent, document.body);
    }

    // Visual zoom scale if no hardware zoom is available? User said "make sure hardware supports it".
    // So we only enable zoom UI if hardware supports it.

    return (
        <div className={`absolute inset-0 w-full h-full overflow-hidden ${className}`}>
            <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full min-w-full min-h-full object-cover"
                autoPlay
                playsInline
                muted
            />

        </div>
    );
}
