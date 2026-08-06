import type {ReactNode} from 'react';
import {useCallback, useEffect, useState} from 'react';
import {Camera, CheckCircle2, Compass, MapPin, RefreshCw, Settings} from 'lucide-react';

interface PermissionGateProps {
    children: ReactNode;
    isProducerApp?: boolean;
}

export type PermState = 'unknown' | 'granted' | 'denied' | 'blocked' | 'unsupported';

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
            (err: GeolocationPositionError) => resolve(err.code === err.PERMISSION_DENIED ? 'denied' : 'blocked'),
            {enableHighAccuracy: true, timeout: 10000}
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
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    if (/android/i.test(ua)) return 'android';
    return 'other';
}

function getBrowser() {
    if (typeof window === 'undefined') return 'unknown';
    const ua = navigator.userAgent;
    if (/CriOS/.test(ua)) return 'chrome'; // Chrome on iOS
    if (/Chrome/.test(ua)) return 'chrome'; // Chrome on Android/Desktop
    if (/Safari/.test(ua)) return 'safari'; // Safari on iOS/Mac
    return 'other';
}

export function PermissionGate({children, isProducerApp}: Readonly<PermissionGateProps>) {
    const [gateState, setGateState] = useState<GateState>({
        camera: 'unknown',
        location: 'unknown',
        compass: 'unknown'
    });

    const [isProcessing, setIsProcessing] = useState(false);
    const [retryFeedback, setRetryFeedback] = useState<string | null>(null);

    const applyPatch = useCallback((patch: Partial<GateState>) => {
        setGateState(prev => ({...prev, ...patch}));
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
        if (gateState.compass === 'denied' && gateState.location === 'granted' && gateState.camera !== 'unknown') {
            window.location.reload();
            return;
        }

        setIsProcessing(true);
        setRetryFeedback(null);

        // We MUST invoke requestCompass immediately (synchronously) inside the click handler.
        // Awaiting anything else first will lose the transient user activation in iOS Safari,
        // causing DeviceOrientationEvent.requestPermission to fail.
        const compassPromise = requestCompass();
        const cameraPromise = requestCamera();
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

    const isPrimaryGranted =
        gateState.location === 'granted' &&
        (gateState.compass === 'granted' || gateState.compass === 'unsupported');

    const canProceed = (isPrimaryGranted && gateState.camera !== 'unknown') || isTouchupBypass;

    if (canProceed) {
        return <>{children}</>;
    }

    const isPrimaryDenied =
        ['denied', 'blocked'].includes(gateState.location) ||
        ['denied', 'blocked'].includes(gateState.compass);


    const os = getDeviceOS();
    const browser = getBrowser();

    const renderCameraInstructions = () => {
        if (gateState.camera === 'blocked') {
            return <p>Uff, camera is busy elsewhere! 📸 Close that and try again.</p>;
        }

        if (os === 'ios') {
            if (browser === 'safari') {
                return (
                    <ul className="list-disc list-inside space-y-2 mt-2">
                        <li>Tap the{" "}<strong>puzzle piece or icon</strong> in your search bar (prob at the
                            bottom) &gt;{" "}
                            <strong>Website Settings</strong> &gt; Allow Camera.
                        </li>
                        <li>If that's a vibe killer, just head to your iPhone{" "}<strong>Settings
                            ⚙️ &gt; Safari</strong> and flip the Camera switch! ✨
                        </li>
                    </ul>
                );
            } else {
                return (
                    <ul className="list-disc list-inside space-y-2 mt-2">
                        <li>Head to your iPhone{" "}<strong>Settings
                            ⚙️ &gt; {browser === 'chrome' ? 'Chrome' : 'Browser'}</strong>, and toggle that Camera on!
                            📸
                        </li>
                    </ul>
                );
            }
        }

        if (os === 'android') {
            return (
                <ul className="list-disc list-inside space-y-2 mt-2">
                    <li>Tap the{" "}<strong>lock 🔒 or settings icon</strong> up in the address bar &gt;{" "}
                        <strong>Permissions</strong> &gt; Allow Camera.
                    </li>
                    <li>Or go the long way: phone{" "}<strong>Settings
                        ⚙️ &gt; Apps &gt; {browser === 'chrome' ? 'Chrome' : 'Browser'}</strong> and grant access! 🚀
                    </li>
                </ul>
            );
        }

        return (
            <ul className="list-disc list-inside space-y-2 mt-2">
                <li>Click the little{" "}<strong>lock 🔒 icon</strong> next to the website address and allow the Camera!
                    Easy
                    peasy. ✨
                </li>
            </ul>
        );
    };

    const renderLocationInstructions = () => {
        if (gateState.location === 'blocked') {
            return <p>We're lost! 🗺️ Make sure your phone's actual GPS/Location is turned on so we can find you.</p>;
        }

        if (os === 'ios') {
            if (browser === 'safari') {
                return (
                    <ul className="list-disc list-inside space-y-2 mt-2">
                        <li>Tap the{" "}<strong>puzzle piece or icon</strong> in your search bar &gt;{" "}<strong>Website
                            Settings</strong> &gt; Allow Location.
                        </li>
                        <li>Too much work? Head to your iPhone{" "}<strong>Settings
                            ⚙️ &gt; Safari &gt; Location</strong> and allow it! 📍
                        </li>
                    </ul>
                );
            } else {
                return (
                    <ul className="list-disc list-inside space-y-2 mt-2">
                        <li>Open your iPhone{" "}<strong>Settings
                            ⚙️ &gt; {browser === 'chrome' ? 'Chrome' : 'Browser'} &gt; Location</strong>, and
                            choose{" "}<strong>While Using the App</strong>! 📍
                        </li>
                    </ul>
                );
            }
        }

        if (os === 'android') {
            return (
                <ul className="list-disc list-inside space-y-2 mt-2">
                    <li>Tap the{" "}<strong>lock 🔒 or settings icon</strong> in the address bar &gt;{" "}
                        <strong>Permissions</strong> &gt; Allow Location.
                    </li>
                    <li>Or just head to your phone{" "}<strong>Settings
                        ⚙️ &gt; Apps &gt; {browser === 'chrome' ? 'Chrome' : 'Browser'}</strong> &gt; Permissions &gt; Location!
                        🚀
                    </li>
                </ul>
            );
        }

        return (
            <ul className="list-disc list-inside space-y-2 mt-2">
                <li>Click the{" "}<strong>lock 🔒 icon</strong> up top and allow Location! Boom, done. 🗺️</li>
            </ul>
        );
    };

    return (
        <div
            className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6 overflow-hidden">
            {/* Prismatic Zen Background Glows */}
            <div className="absolute inset-0 bg-mesh-dark opacity-80 pointer-events-none -z-10"></div>

            <div
                className="relative w-full max-w-md p-5 sm:p-8 glass-panel animate-in zoom-in-95 duration-500 max-h-screen overflow-y-auto flex flex-col">

                {/* FOMO Visual Reward */}
                <div
                    className="w-full h-40 sm:h-48 rounded-[20px] overflow-hidden mb-5 relative border-[0.5px] border-white/30 shadow-[0_10px_30px] shadow-primary/20 shrink-0">
                    <video
                        src="/parkgif.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover scale-105"
                    />
                    {/* Subtle gradient overlay to make text pop */}
                    <div
                        className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent flex flex-col justify-end p-4">
                        <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span
                    className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary shadow-[0_0_8px] shadow-primary"></span>
              </span>
                            <p className="text-[11px] font-bold text-white uppercase tracking-[0.2em] drop-shadow-md">Live
                                AR Mode</p>
                        </div>
                    </div>
                </div>

                {/* Social Proof Badge */}
                <div className="flex justify-center mb-4 shrink-0">
                    <div
                        className="bg-black/20 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-inner">
                        <div className="flex -space-x-2">
                            <div className="w-4 h-4 rounded-full bg-primary border border-white/20 shadow-sm"></div>
                            <div className="w-4 h-4 rounded-full bg-secondary border border-white/20 shadow-sm"></div>
                            <div className="w-4 h-4 rounded-full bg-accent border border-white/20 shadow-sm"></div>
                        </div>
                        <span className="text-[11px] sm:text-xs text-white/90 font-medium tracking-wide">Touch Lalbagh grass, the AR way 🌿</span>
                    </div>
                </div>

                <div className="shrink-0">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white text-center mb-1.5 tracking-tight flex items-center justify-center gap-2">
                        {isPrimaryDenied ? 'We Need You Back 🥺' : 'Unlock the Magic ✨'}
                    </h2>
                    <p className="text-white/70 text-center mb-5 text-[13px] sm:text-sm leading-relaxed font-medium px-2">
                        {isPrimaryDenied
                            ? "Your Lalbagh journey is paused! We need these permissions to guide you through the historic gardens in AR."
                            : "To project magical crystal trails across Lalbagh Botanical Garden, we need a few permissions."}
                    </p>
                </div>

                <div className="space-y-2.5 sm:space-y-3 mb-6">
                    <PermissionRow
                        icon={<MapPin className="w-5 h-5"/>}
                        title="Location"
                        description="To find your position in the park"
                        status={gateState.location}
                    />
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
                </div>

                {isPrimaryDenied && (
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-6 space-y-4 select-text">
                        <h4 className="text-amber-400 font-bold flex items-center gap-2">
                            <Settings className="w-4 h-4"/> How to Fix
                        </h4>

                        {['denied', 'blocked'].includes(gateState.location) && (
                            <div className="text-sm text-slate-300">
                                <p className="font-bold text-white mb-1">Location {gateState.location === 'blocked' ? '(Unavailable)' : '(Denied)'}</p>
                                {renderLocationInstructions()}
                            </div>
                        )}

                        {['denied', 'blocked'].includes(gateState.camera) && (
                            <div className="text-sm text-slate-300">
                                <p className="font-bold text-white mb-1">Camera {gateState.camera === 'blocked' ? '(Busy)' : '(Denied)'}</p>
                                {renderCameraInstructions()}
                            </div>
                        )}

                        {gateState.compass === 'denied' && (
                            <div className="text-sm text-slate-300">
                                <p className="font-bold text-white mb-1">Compass (Denied)</p>
                                <p className="mb-3">Safari blocked the prompt because it was previously denied. We need
                                    to reload the page to ask again.</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl border border-white/20 transition-all flex items-center justify-center gap-2 w-full"
                                >
                                    <RefreshCw className="w-4 h-4"/>
                                    Reload Page to Retry
                                </button>
                                <p className="mt-3 text-xs opacity-70 leading-relaxed">If it still fails after
                                    reloading, you may need to clear Safari Website Data in your Settings.</p>
                            </div>
                        )}
                    </div>
                )}

                {retryFeedback && (
                    <div
                        className="mb-4 bg-red-500/20 border border-red-500/50 text-red-200 text-sm font-bold p-3 rounded-xl text-center animate-in fade-in slide-in-from-bottom-2">
                        {retryFeedback}
                    </div>
                )}

                <div className="pt-2 shrink-0">
                    <button
                        onClick={onGrantTap}
                        disabled={isProcessing}
                        className="w-full relative overflow-hidden group bg-white/10 hover:bg-white/20 border border-white/20 disabled:opacity-50 text-white font-bold py-3.5 sm:py-4 px-8 rounded-[20px] shadow-[0_10px_40px_rgba(255,255,255,0.1)] active:scale-95 transition-all duration-300 text-base sm:text-lg flex items-center justify-center gap-2"
                    >
                        {/* Animated gradient sheen */}
                        <div
                            className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-linear-to-r from-transparent via-white/20 to-transparent"></div>

                        {(() => {
                            if (isProcessing) {
                                return <RefreshCw className="w-5 h-5 animate-spin text-primary"/>;
                            }
                            if (isPrimaryDenied) {
                                if (gateState.compass === 'denied' && gateState.location === 'granted' && gateState.camera !== 'unknown') {
                                    return 'Reload to Fix Compass 🔄';
                                }
                                return 'Fix Permissions 🛠️';
                            }
                            return 'Unlock AR Map 🚀';
                        })()}
                    </button>
                </div>
            </div>
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
            className={`flex items-center gap-3.5 p-3.5 sm:p-4 rounded-[20px] border transition-all duration-300 ${isResolved ? 'bg-primary/10 border-primary/20 shadow-[0_0_20px] shadow-primary/10' : 'bg-white/5 border-white/10'}`}>
            <div
                className={`p-2.5 rounded-[14px] ${isResolved ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white/50'}`}>
                {icon}
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-white text-[15px] sm:text-base leading-tight">{title}</h3>
                <p className="text-white/50 text-xs sm:text-sm mt-0.5">{description}</p>
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
