import type {ReactNode} from 'react';
import {useCallback, useEffect, useState} from 'react';
import {Camera, CheckCircle2, Compass, MapPin, RefreshCw, Settings, HelpCircle} from 'lucide-react';
import {PermissionTroubleshootGuide} from './PermissionTroubleshootGuide';

interface PermissionGateProps {
    children: ReactNode;
    isProducerApp?: boolean;
    requiredPermissions?: 'location' | 'all';
    className?: string;
}

export type PermState = 'unknown' | 'granted' | 'denied' | 'blocked' | 'unsupported';

const getBrowserName = () => {
    if (typeof window === 'undefined') return 'Safari';
    const ua = navigator.userAgent;
    if (ua.includes('CriOS') || ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('FxiOS') || ua.includes('Firefox')) return 'Firefox';
    return 'Safari';
};

export interface GateState {
    camera: PermState;
    location: PermState;
    compass: PermState;
}

// ---- PASSIVE: mount + visibilitychange only. Never fires a native prompt. ----
async function passiveCheck(): Promise<Partial<GateState>> {
    const result: Partial<GateState> = {};

    if (navigator.permissions?.query) {
        try {
            const cam = await navigator.permissions.query({name: 'camera' as PermissionName});
            result.camera = cam.state as PermState; // hint on Safari, not ground truth
        } catch {
            result.camera = 'unknown';
        }

        try {
            const geo = await navigator.permissions.query({name: 'geolocation'});
            result.location = geo.state as PermState;
        } catch {
            result.location = 'unknown';
        }
    }
    return result;
}

// ---- ACTIVE: only ever called from a click handler ----
let activeStream: MediaStream | null = null;

async function requestCamera(): Promise<PermState> {
    activeStream?.getTracks().forEach(t => t.stop()); // release before re-requesting — fixes "unable to access camera"
    try {
        activeStream = await navigator.mediaDevices.getUserMedia({video: {facingMode: 'environment'}});
        return 'granted';
    } catch (err: any) {
        if (err.name === 'NotAllowedError') return 'denied';
        if (err.name === 'NotReadableError') return 'blocked'; // busy, not a permission problem
        return 'denied';
    }
}

function requestLocation(): Promise<PermState> {
    return new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
            () => resolve('granted'),
            (err: GeolocationPositionError) => {
                // code 1: PERMISSION_DENIED
                // code 2: POSITION_UNAVAILABLE
                // code 3: TIMEOUT
                if (err.code === err.PERMISSION_DENIED) {
                    resolve('denied');
                } else {
                    // If we get timeout or unavailable, the user actually GRANTED permission,
                    // but the hardware failed to get a location. The gate should let them through.
                    resolve('granted');
                }
            },
            {enableHighAccuracy: true, timeout: 6000}
        );
    });
}

async function requestCompass(): Promise<PermState> {
    if (typeof window === 'undefined' || !window.DeviceOrientationEvent) return 'unsupported';
    const RPE = (DeviceOrientationEvent as any).requestPermission;
    if (typeof RPE !== 'function') return 'granted'; // not gated on this browser
    try {
        const res = await RPE();
        return res === 'granted' ? 'granted' : 'denied';
    } catch {
        return 'unknown';
    } // called without a fresh gesture — shouldn't happen if wired correctly
}

function getDeviceOS() {
    if (typeof window === 'undefined') return 'unknown';
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iOS';
    if (/android/i.test(ua)) return 'Android';
    return 'Other';
}

function getBrowser() {
    if (typeof window === 'undefined') return 'unknown';
    const ua = navigator.userAgent;
    if (/CriOS/.test(ua)) return 'chrome'; // Chrome on iOS
    if (/Chrome/.test(ua)) return 'chrome'; // Chrome on Android/Desktop
    if (/Safari/.test(ua)) return 'safari'; // Safari on iOS/Mac
    return 'other';
}

export function PermissionGate({children, isProducerApp, requiredPermissions = isProducerApp ? 'all' : 'location', className}: Readonly<PermissionGateProps>) {
    const [gateState, setGateState] = useState<GateState>({
        camera: 'unknown',
        location: 'unknown',
        compass: 'unknown'
    });

    const [isProcessing, setIsProcessing] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [retryFeedback, setRetryFeedback] = useState<string | null>(null);

    const applyPatch = useCallback((patch: Partial<GateState>) => {
        setGateState(prev => {
            const next = { ...prev };
            if (patch.camera !== undefined) {
                if (!(prev.camera === 'granted' && (patch.camera === 'unknown' || patch.camera === ('prompt' as any)))) {
                    next.camera = patch.camera;
                }
            }
            if (patch.location !== undefined) {
                if (!(prev.location === 'granted' && (patch.location === 'unknown' || patch.location === ('prompt' as any)))) {
                    next.location = patch.location;
                }
            }
            if (patch.compass !== undefined) {
                if (!(prev.compass === 'granted' && (patch.compass === 'unknown' || patch.compass === ('prompt' as any)))) {
                    next.compass = patch.compass;
                }
            }
            return next;
        });
    }, []);

    useEffect(() => {
        let mounted = true;

        // Initial passive check
        passiveCheck().then(patch => {
            if (mounted) applyPatch(patch);
        });

        // Replaces polling entirely
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                passiveCheck().then(applyPatch);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Chrome/desktop: reactive updates, zero polling
        const attachChangeListeners = async () => {
            if (!navigator.permissions?.query) return;
            for (const name of ['camera', 'geolocation'] as const) {
                try {
                    const status = await navigator.permissions.query({name: name as PermissionName});
                    status.onchange = () => {
                        passiveCheck().then(applyPatch);
                    };
                } catch {
                }
            }
        };
        void attachChangeListeners();

        return () => {
            mounted = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [applyPatch]);

    // ---- The one tap that does everything ----
    const onGrantTap = async () => {
        // If compass is the ONLY thing blocking us, Safari blocks retries without a reload.
        if (requiredPermissions === 'all' && gateState.compass === 'denied' && gateState.location === 'granted' && gateState.camera !== 'unknown') {
            window.location.reload();
            return;
        }

        setIsProcessing(true);
        setRetryFeedback(null);

        // We MUST invoke requestCompass immediately (synchronously) inside the click handler.
        // Awaiting anything else first will lose the transient user activation in iOS Safari,
        // causing DeviceOrientationEvent.requestPermission to fail.
        const compassPromise = requiredPermissions === 'all' ? requestCompass() : Promise.resolve('unsupported' as PermState);
        const cameraPromise = requiredPermissions === 'all' ? requestCamera() : Promise.resolve('unsupported' as PermState);
        const locationPromise = requestLocation();

        // Apply patches individually as they resolve so the UI updates step-by-step
        compassPromise.then(res => applyPatch({compass: res}));
        cameraPromise.then(res => applyPatch({camera: res}));
        locationPromise.then(res => applyPatch({location: res}));

        const [compassRes, cameraRes, locationRes] = await Promise.all([compassPromise, cameraPromise, locationPromise]);

        setIsProcessing(false);

        // If they were already denied, and we tried again but the OS instantly blocked us, show visual feedback.
        if (isPrimaryDenied && (cameraRes === 'denied' || locationRes === 'denied' || compassRes === 'denied' || cameraRes === 'blocked' || locationRes === 'blocked')) {
            setRetryFeedback("Still blocked by your browser. Please check settings!");
            setTimeout(() => setRetryFeedback(null), 4000);
        }
    };

    // Automatically bypass if URL has ?touchup=true
    const isTouchupBypass = typeof window !== 'undefined' &&
        window.location.search.includes('touchup=true');

    const isGranted = (requiredPermissions === 'all' 
        ? (gateState.location === 'granted' && (gateState.compass === 'granted' || gateState.compass === 'unsupported') && gateState.camera === 'granted') 
        : gateState.location === 'granted') || isTouchupBypass;

    useEffect(() => {
        if (!isGranted) {
            document.body.classList.add('permission-gate-active');
        } else {
            document.body.classList.remove('permission-gate-active');
        }
        return () => document.body.classList.remove('permission-gate-active');
    }, [isGranted]);

    if (isGranted) {
        return <>{children}</>;
    }

    const isPrimaryDenied = requiredPermissions === 'all'
        ? ['denied', 'blocked'].includes(gateState.location) || ['denied', 'blocked'].includes(gateState.compass) || ['denied', 'blocked'].includes(gateState.camera)
        : ['denied', 'blocked'].includes(gateState.location);


    const os = getDeviceOS();
    const browser = getBrowserName();
    const hasAttemptedReload = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('compass_reload_attempted') === 'true';

    const renderCameraInstructions = () => {
        if (gateState.camera === 'blocked') {
            return <p>Your camera is busy in another app right now! Close it out and let's try again.</p>;
        }

        if (os === 'iOS') {
            if (browser === 'Safari') {
                return (
                    <ul className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] mt-2">
                        <li>Tap the button left of the URL bar &gt; three dots ... &gt; Allow Camera</li>
                        <li>Still blocked? Open iPhone Settings &gt; Safari &gt; Allow Camera</li>
                    </ul>
                );
            } else {
                return (
                    <ul className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] mt-2">
                        <li>Tap the lock icon left of the URL bar &gt; Allow Camera</li>
                        <li>Still blocked? Open iPhone Settings &gt; {browser} &gt; Allow Camera</li>
                    </ul>
                );
            }
        }

        return (
            <ul className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] mt-2">
                <li>Tap the lock icon left of the URL bar &gt; Permissions &gt; Allow Camera</li>
                <li>Still blocked? Long press your browser app &gt; App info &gt; Allow Camera</li>
            </ul>
        );
    };

    const renderLocationInstructions = () => {
        if (gateState.location === 'blocked') {
            return <p>We're a bit lost! Make sure your phone's actual GPS is turned on so we can find you.</p>;
        }

        if (os === 'iOS') {
            if (browser === 'Safari') {
                return (
                    <ul className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] mt-2">
                        <li>Tap the button left of the URL bar &gt; three dots ... &gt; Allow Location</li>
                        <li>Still blocked? Open iPhone Settings &gt; Safari &gt; Allow Location</li>
                    </ul>
                );
            } else {
                return (
                    <ul className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] mt-2">
                        <li>Tap the lock icon left of the URL bar &gt; Allow Location</li>
                        <li>Still blocked? Open iPhone Settings &gt; {browser} &gt; Allow Location</li>
                    </ul>
                );
            }
        }

        return (
            <ul className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] mt-2">
                <li>Tap the lock icon left of the URL bar &gt; Permissions &gt; Allow Location</li>
                <li>Still blocked? Long press your browser app &gt; App info &gt; Allow Location</li>
            </ul>
        );
    };

    return (
        <div
            className={className || "fixed inset-0 z-9999 flex flex-col items-center justify-center bg-black p-4 sm:p-6 overflow-hidden"}>
            {/* Fullscreen Video Background */}
            <video
                src="/parkgif.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none -z-20 scale-105"
            />
            {/* Prismatic Zen Background Glows */}
            <div className="absolute inset-0 bg-mesh-dark opacity-60 pointer-events-none -z-10"></div>

            <div
                className="relative w-full max-w-[340px] p-5 glass-panel animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto flex flex-col rounded-3xl">

                {/* Social Proof Badge */}
                <div className="flex justify-center mb-4 shrink-0">
                    <div
                        className="bg-black/30 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-inner">
                        <div className="flex -space-x-2">
                            <div className="w-3.5 h-3.5 rounded-full bg-primary border border-white/20 shadow-sm"></div>
                            <div className="w-3.5 h-3.5 rounded-full bg-secondary border border-white/20 shadow-sm"></div>
                            <div className="w-3.5 h-3.5 rounded-full bg-accent border border-white/20 shadow-sm"></div>
                        </div>
                        <span className="text-[10px] text-white/90 font-medium tracking-wide">Touch Lalbagh grass, the AR way 🌿</span>
                    </div>
                </div>

                <div className="shrink-0 mb-6">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white text-center mb-1.5 tracking-tight flex items-center justify-center gap-2">
                        {isPrimaryDenied ? 'Permissions required' : (requiredPermissions === 'all' ? 'AR on lalbagh.top' : 'Experience lalbagh.top')}
                    </h2>
                    <p className="text-white/70 text-center text-xs sm:text-[13px] leading-relaxed font-medium px-2">
                        {isPrimaryDenied
                            ? (isProducerApp ? "Your mapping session is paused. Please enable these permissions." : "Your lalbagh.top journey is on pause. Please enable these permissions to continue.")
                            : (isProducerApp 
                                ? "To access the mapping tools, we need a few quick permissions." 
                                : (requiredPermissions === 'all' 
                                    ? "To project AR trails across Lalbagh and guide you through we need a few quick permissions." 
                                    : "To navigate you through Lalbagh we need a quick permission."))}
                    </p>
                </div>

                <div className="shrink-0 mb-4">
                    <button
                        onClick={onGrantTap}
                        disabled={isProcessing}
                        className="w-full relative overflow-hidden group bg-white/10 hover:bg-white/20 border border-white/20 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-2xl shadow-[0_10px_40px_rgba(255,255,255,0.1)] active:scale-95 transition-all duration-300 text-sm sm:text-base flex items-center justify-center gap-2"
                    >
                        {/* Animated gradient sheen */}
                        <div
                            className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-linear-to-r from-transparent via-white/20 to-transparent"></div>

                        {(() => {
                            if (isProcessing) {
                                return <RefreshCw className="w-5 h-5 animate-spin text-primary"/>;
                            }
                            if (isPrimaryDenied) {
                                if (requiredPermissions === 'all' && gateState.compass === 'denied' && gateState.location === 'granted' && gateState.camera !== 'unknown') {
                                    return hasAttemptedReload ? 'Compass Blocked' : 'Reload Page';
                                }
                                return 'Check Again';
                            }
                            return 'Grant Permissions';
                        })()}
                    </button>
                </div>

                {retryFeedback && (
                    <div
                        className="mb-4 bg-red-500/20 border border-red-500/50 text-red-200 text-sm font-bold p-3 rounded-xl text-center animate-in fade-in slide-in-from-bottom-2">
                        {retryFeedback}
                    </div>
                )}

                {isPrimaryDenied && (
                    <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/10 mb-4 space-y-3 select-text relative">
                        <h4 className="text-amber-400 font-bold text-sm flex items-center gap-2">
                            <Settings className="w-4 h-4"/> How to fix access
                        </h4>
                        {/* Carousel Button */}
                        <button 
                            onClick={() => setIsGuideOpen(true)}
                            className="absolute top-3 right-3 text-[10px] uppercase font-bold tracking-wider bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-md text-white transition-colors flex items-center gap-1.5"
                        >
                            <HelpCircle className="w-3 h-3" />
                            Guide
                        </button>

                        {['denied', 'blocked'].includes(gateState.location) && (
                            <div className="text-sm text-slate-300">
                                <p className="font-bold text-white mb-1">Location {gateState.location === 'blocked' ? '(Unavailable)' : '(Denied)'}</p>
                                {renderLocationInstructions()}
                            </div>
                        )}

                        {['denied', 'blocked'].includes(gateState.camera) && requiredPermissions === 'all' && (
                            <div className="text-sm text-slate-300">
                                <p className="font-bold text-white mb-1">Camera {gateState.camera === 'blocked' ? '(Busy)' : '(Denied)'}</p>
                                {renderCameraInstructions()}
                            </div>
                        )}

                        {gateState.compass === 'denied' && requiredPermissions === 'all' && (
                            <div className="text-xs text-slate-300">
                                <p className="font-bold text-white mb-1">Compass (Denied)</p>
                                {hasAttemptedReload ? (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                        <p className="mb-2 text-red-200 font-bold">Your browser permanently blocked compass access. You must clear Website Data to fix this:</p>
                                        <ul className="list-decimal list-inside space-y-1 mb-1 text-red-200/80">
                                            <li>Open iPhone Settings &gt; {browser}</li>
                                            <li>Tap Clear History and Website Data</li>
                                        </ul>
                                    </div>
                                ) : (
                                    <>
                                        <p className="mb-3">Your browser blocked the prompt. We just need to reload to ask again.</p>
                                        <button
                                            onClick={() => {
                                                if (typeof sessionStorage !== 'undefined') {
                                                    sessionStorage.setItem('compass_reload_attempted', 'true');
                                                }
                                                window.location.reload();
                                            }}
                                            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all flex items-center justify-center gap-2 w-full"
                                        >
                                            <RefreshCw className="w-3 h-3"/>
                                            Reload Page
                                        </button>
                                        <p className="mt-3 text-[10px] opacity-70 leading-relaxed">If it still fails, you might need to clear your browser's Website Data in Settings.</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-2.5 sm:space-y-3 shrink-0">
                    <PermissionRow
                        icon={<MapPin className="w-4 h-4"/>}
                        title="Location"
                        description="To navigate you through Lalbagh"
                        status={gateState.location}
                    />
                    {requiredPermissions === 'all' && (
                        <>
                            <PermissionRow
                                icon={<Camera className="w-5 h-5"/>}
                                title="Camera"
                                description="To show the AR route overlays"
                                status={gateState.camera}
                            />
                            {gateState.compass !== 'unsupported' && (
                                <PermissionRow
                                    icon={<Compass className="w-5 h-5"/>}
                                    title="Compass"
                                    description="To orient the map correctly"
                                    status={gateState.compass}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>

            <PermissionTroubleshootGuide 
                isOpen={isGuideOpen}
                setIsOpen={setIsGuideOpen}
                os={os}
                browser={browser}
            />
        </div>
    );
}

function PermissionRow({icon, title, description, status}: Readonly<{
    icon: ReactNode,
    title: string,
    description: string,
    status: PermState
}>) {
    const isResolved = status === 'granted';

    return (
        <div
            className={`flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all duration-300 ${isResolved ? 'bg-primary/10 border-primary/20 shadow-[0_0_20px] shadow-primary/10' : 'bg-white/5 border-white/10'}`}>
            <div
                className={`p-2 rounded-xl ${isResolved ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white/50'}`}>
                {icon}
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-white text-sm sm:text-[15px] leading-tight">{title}</h3>
                <p className="text-white/50 text-[11px] sm:text-xs mt-0.5">{description}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
                {isResolved ? (
                    <CheckCircle2 className="w-5 h-5 text-primary drop-shadow-[0_0_8px_var(--color-primary)]"/>
                ) : (
                    <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">Required</span>
                )}
            </div>
        </div>
    );
}
