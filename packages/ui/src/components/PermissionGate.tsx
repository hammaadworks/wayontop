import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Camera, MapPin, Compass, Settings, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';

interface PermissionGateProps {
  children: ReactNode;
}

export type PermState = 'unknown' | 'granted' | 'denied' | 'blocked' | 'unsupported';
export interface GateState { camera: PermState; location: PermState; compass: PermState; }

// ---- PASSIVE: mount + visibilitychange only. Never fires a native prompt. ----
async function passiveCheck(): Promise<Partial<GateState>> {
  const result: Partial<GateState> = { compass: 'unknown' }; // no passive check exists for this, anywhere

  if (navigator.permissions?.query) {
    try {
      const cam = await navigator.permissions.query({ name: 'camera' as PermissionName });
      result.camera = cam.state as PermState; // hint on Safari, not ground truth
    } catch { result.camera = 'unknown'; }

    try {
      const geo = await navigator.permissions.query({ name: 'geolocation' });
      result.location = geo.state as PermState;
    } catch { result.location = 'unknown'; }
  }
  return result;
}

// ---- ACTIVE: only ever called from a click handler ----
let activeStream: MediaStream | null = null;

async function requestCamera(): Promise<PermState> {
  activeStream?.getTracks().forEach(t => t.stop()); // release before re-requesting — fixes "unable to access camera"
  try {
    activeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
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
      { enableHighAccuracy: true, timeout: 10000 }
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
  } catch { return 'unknown'; } // called without a fresh gesture — shouldn't happen if wired correctly
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

export function PermissionGate({ children }: PermissionGateProps) {
  const [gateState, setGateState] = useState<GateState>({
    camera: 'unknown',
    location: 'unknown',
    compass: 'unknown'
  });
  
  const [isProcessing, setIsProcessing] = useState(false);

  const applyPatch = useCallback((patch: Partial<GateState>) => {
    setGateState(prev => ({ ...prev, ...patch }));
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
          const status = await navigator.permissions.query({ name: name as PermissionName });
          status.onchange = () => {
             passiveCheck().then(applyPatch);
          };
        } catch {}
      }
    };
    attachChangeListeners();

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [applyPatch]);

  // ---- The one tap that does everything ----
  const onGrantTap = async () => {
    setIsProcessing(true);
    
    // We MUST invoke requestCompass immediately (synchronously) inside the click handler.
    // Awaiting anything else first will lose the transient user activation in iOS Safari,
    // causing DeviceOrientationEvent.requestPermission to fail.
    const compassPromise = requestCompass();
    const cameraPromise = requestCamera();
    const locationPromise = requestLocation();

    // Apply patches individually as they resolve so the UI updates step-by-step
    compassPromise.then(res => applyPatch({ compass: res }));
    cameraPromise.then(res => applyPatch({ camera: res }));
    locationPromise.then(res => applyPatch({ location: res }));

    await Promise.all([compassPromise, cameraPromise, locationPromise]);

    setIsProcessing(false);
  };

  const essentialsGranted = 
    gateState.location === 'granted' && 
    (gateState.compass === 'granted' || gateState.compass === 'unsupported');

  const canProceed = essentialsGranted && gateState.camera !== 'unknown';

  if (canProceed) {
    return <>{children}</>;
  }

  const isEssentialDenied = 
    ['denied', 'blocked'].includes(gateState.location) ||
    ['denied', 'blocked'].includes(gateState.compass);
    
  const hasDeniedOrBlocked = 
    ['denied', 'blocked'].includes(gateState.camera) || isEssentialDenied;

  const os = getDeviceOS();
  const browser = getBrowser();

  const renderCameraInstructions = () => {
    if (gateState.camera === 'blocked') {
      return <p>Oops! Another app is using your camera. Please close it and try again! 📸</p>;
    }

    const tryFirstText = <p className="mb-2 font-semibold text-emerald-400">Try #1 first! If it still doesn't work, try #2!</p>;

    if (os === 'ios') {
      if (browser === 'safari') {
        return (
          <>
            {tryFirstText}
            <ul className="list-decimal list-inside space-y-2">
              <li>Tap the little <strong>aA</strong> icon at the top of your screen, tap <strong>Website Settings</strong>, and choose <strong>Allow</strong> for the Camera!</li>
              <li>Open your iPhone/iPad <strong>Settings ⚙️</strong> app, find <strong>Safari</strong>, and turn on the Camera!</li>
            </ul>
          </>
        );
      } else {
         return (
          <ul className="list-decimal list-inside space-y-2 mt-2">
            <li>Open your iPhone/iPad <strong>Settings ⚙️</strong> app, find <strong>Chrome</strong> (or your browser), and turn on the Camera!</li>
          </ul>
        );
      }
    }

    if (os === 'android') {
      return (
        <>
          {tryFirstText}
          <ul className="list-decimal list-inside space-y-2">
            <li>Tap the little <strong>lock 🔒 or settings icon</strong> next to the website address at the top, tap <strong>Permissions</strong>, and allow the Camera!</li>
            <li>Open your phone's <strong>Settings ⚙️</strong> app, find <strong>Apps</strong>, tap <strong>{browser === 'chrome' ? 'Chrome' : 'Browser'}</strong>, and allow the Camera!</li>
          </ul>
        </>
      );
    }

    return (
        <ul className="list-decimal list-inside space-y-2 mt-2">
          <li>Look for a little <strong>lock 🔒 icon</strong> at the top of your screen and allow the Camera!</li>
          <li>Check your computer's privacy settings to turn on the Camera!</li>
        </ul>
    );
  };

  const renderLocationInstructions = () => {
    if (gateState.location === 'blocked') {
      return <p>Oops! We can't find you. Please make sure your phone's GPS or Location is turned on! 🗺️</p>;
    }

    const tryFirstText = <p className="mb-2 font-semibold text-emerald-400">Try #1 first! If it still doesn't work, try #2!</p>;

    if (os === 'ios') {
      if (browser === 'safari') {
        return (
          <>
            {tryFirstText}
            <ul className="list-decimal list-inside space-y-2">
              <li>Tap the little <strong>aA</strong> icon at the top of your screen, tap <strong>Website Settings</strong>, and choose <strong>Allow</strong> for Location!</li>
              <li>Open your iPhone/iPad <strong>Settings ⚙️</strong> app, go to <strong>Privacy & Security</strong>, tap <strong>Location Services</strong>, find Safari, and allow it!</li>
            </ul>
          </>
        );
      } else {
         return (
          <ul className="list-decimal list-inside space-y-2 mt-2">
            <li>Open your iPhone/iPad <strong>Settings ⚙️</strong> app, go to <strong>Privacy & Security</strong>, tap <strong>Location Services</strong>, find Chrome, and allow it!</li>
          </ul>
        );
      }
    }

    if (os === 'android') {
      return (
        <>
          {tryFirstText}
          <ul className="list-decimal list-inside space-y-2">
            <li>Tap the little <strong>lock 🔒 or settings icon</strong> next to the website address at the top, tap <strong>Permissions</strong>, and allow Location!</li>
            <li>Open your phone's <strong>Settings ⚙️</strong> app, find <strong>Apps</strong>, tap <strong>{browser === 'chrome' ? 'Chrome' : 'Browser'}</strong>, tap <strong>Permissions</strong>, and allow Location!</li>
          </ul>
        </>
      );
    }

    return (
        <ul className="list-decimal list-inside space-y-2 mt-2">
          <li>Look for a little <strong>lock 🔒 icon</strong> at the top of your screen and allow Location!</li>
          <li>Check your computer's privacy settings to turn on Location!</li>
        </ul>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 p-6 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950 to-slate-950"></div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px]"></div>

      <div className="relative w-full max-w-md glass-panel p-8 rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/10 animate-in zoom-in-95 duration-500 max-h-screen overflow-y-auto">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            {hasDeniedOrBlocked ? <AlertTriangle className="w-10 h-10 text-white" /> : <ShieldCheck className="w-10 h-10 text-white" />}
          </div>
        </div>
        
        <h2 className="text-3xl font-extrabold text-white text-center mb-2 tracking-tight">
          {isEssentialDenied ? 'Permissions Needed' : 'Ready to Explore?'}
        </h2>
        <p className="text-slate-400 text-center mb-8 leading-relaxed">
          {isEssentialDenied 
            ? "Lalbagh AR requires access to your location and compass to function. Please resolve the issues below."
            : "To guide you through Lalbagh Botanical Garden, we need a few permissions."}
        </p>

        <div className="space-y-4 mb-8">
          <PermissionRow 
            icon={<Camera className="w-5 h-5" />}
            title="Camera"
            description="To show the AR route overlays"
            status={gateState.camera}
          />
          <PermissionRow 
            icon={<MapPin className="w-5 h-5" />}
            title="Location"
            description="To find your position in the park"
            status={gateState.location}
          />
          {gateState.compass !== 'unsupported' && (
            <PermissionRow 
              icon={<Compass className="w-5 h-5" />}
              title="Compass"
              description="To orient the map correctly"
              status={gateState.compass}
            />
          )}
        </div>

        {isEssentialDenied && (
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-6 space-y-4">
            <h4 className="text-amber-400 font-bold flex items-center gap-2">
              <Settings className="w-4 h-4" /> How to Fix
            </h4>
            
            {['denied', 'blocked'].includes(gateState.camera) && (
              <div className="text-sm text-slate-300">
                <p className="font-bold text-white mb-1">Camera {gateState.camera === 'blocked' ? '(Busy)' : '(Denied)'}</p>
                {renderCameraInstructions()}
              </div>
            )}
            
            {['denied', 'blocked'].includes(gateState.location) && (
              <div className="text-sm text-slate-300">
                <p className="font-bold text-white mb-1">Location {gateState.location === 'blocked' ? '(Unavailable)' : '(Denied)'}</p>
                {renderLocationInstructions()}
              </div>
            )}

            {gateState.compass === 'denied' && (
              <div className="text-sm text-slate-300">
                <p className="font-bold text-white mb-1">Compass (Denied)</p>
                <p>No settings screen exists for this. Tap Retry below, then tap <strong>Allow</strong> on the prompt.</p>
              </div>
            )}
          </div>
        )}
        
        <button 
          onClick={onGrantTap}
          disabled={isProcessing}
          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 text-white font-bold py-4 px-8 rounded-full shadow-[0_10px_20px_rgba(16,185,129,0.3)] active:scale-95 transition-all duration-300 text-lg flex items-center justify-center gap-2"
        >
          {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : null}
          {isEssentialDenied ? 'Retry Permissions' : 'Grant Permissions'}
        </button>
      </div>
    </div>
  );
}

function PermissionRow({ icon, title, description, status }: { icon: ReactNode, title: string, description: string, status: PermState }) {
  const getStatusColor = () => {
    switch(status) {
      case 'granted': return 'text-emerald-400';
      case 'denied': 
      case 'blocked': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusText = () => {
    switch(status) {
      case 'granted': return 'Granted';
      case 'denied': return 'Denied';
      case 'blocked': return 'Blocked/Busy';
      case 'unsupported': return 'N/A';
      default: return 'Required';
    }
  };

  return (
    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
      <div className={`p-2 rounded-lg bg-white/10 ${getStatusColor()}`}>
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-white leading-none mb-1">{title}</h4>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <div className={`text-xs font-bold uppercase tracking-wider ${getStatusColor()}`}>
        {getStatusText()}
      </div>
    </div>
  );
}
