import React, { useState, useEffect, ReactNode, useCallback } from 'react';
import { MapPin, Settings, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';

interface PermissionGateProps {
  children: ReactNode;
}

export type PermState = 'unknown' | 'granted' | 'denied' | 'blocked' | 'unsupported';

// ---- PASSIVE: mount + visibilitychange only. Never fires a native prompt. ----
async function passiveCheck(): Promise<PermState> {
  if (navigator.permissions?.query) {
    try {
      const geo = await navigator.permissions.query({ name: 'geolocation' });
      return geo.state as PermState;
    } catch { return 'unknown'; }
  }
  return 'unknown';
}

// ---- ACTIVE: only ever called from a click handler ----
function requestLocation(): Promise<PermState> {
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      () => resolve('granted'),
      (err: GeolocationPositionError) => resolve(err.code === err.PERMISSION_DENIED ? 'denied' : 'blocked'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export function PermissionGate({ children }: PermissionGateProps) {
  const [locationStatus, setLocationStatus] = useState<PermState>('unknown');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    // Initial passive check
    passiveCheck().then(status => {
      if (mounted) setLocationStatus(status);
    });

    // Replaces polling entirely
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        passiveCheck().then(setLocationStatus);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Chrome/desktop: reactive updates, zero polling
    const attachChangeListeners = async () => {
      if (!navigator.permissions?.query) return;
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        status.onchange = () => {
           passiveCheck().then(setLocationStatus);
        };
      } catch {}
    };
    attachChangeListeners();

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const onGrantTap = async () => {
    setIsProcessing(true);
    const locRes = await requestLocation();
    setLocationStatus(locRes);
    setIsProcessing(false);
  };

  if (locationStatus === 'granted') {
    return <>{children}</>;
  }

  const isDeniedOrBlocked = ['denied', 'blocked'].includes(locationStatus);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 p-6 overflow-hidden">
      {/* Background decorations - Amber theme for producer */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950"></div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>

      <div className="relative w-full max-w-md glass-panel p-8 rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/10 animate-in zoom-in-95 duration-500 max-h-screen overflow-y-auto">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.3)]">
            {isDeniedOrBlocked ? <AlertTriangle className="w-10 h-10 text-white" /> : <ShieldCheck className="w-10 h-10 text-white" />}
          </div>
        </div>
        
        <h2 className="text-3xl font-extrabold text-white text-center mb-2 tracking-tight">
          {isDeniedOrBlocked ? 'Location Required' : 'Ready to Map?'}
        </h2>
        <p className="text-slate-400 text-center mb-8 leading-relaxed">
          {isDeniedOrBlocked 
            ? "The Producer App needs precise location to plot nodes, record paths, and set up AR zones. Please resolve the issue below."
            : "To build the Lalbagh AR experience, we need access to your precise location."}
        </p>

        <div className="space-y-4 mb-8">
          <PermissionRow 
            icon={<MapPin className="w-5 h-5" />}
            title="Location"
            description="To map the physical world"
            status={locationStatus}
          />
        </div>

        {isDeniedOrBlocked && (
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-6 space-y-4">
            <h4 className="text-amber-400 font-bold flex items-center gap-2">
              <Settings className="w-4 h-4" /> How to Fix
            </h4>
            
            <div className="text-sm text-slate-300">
              <p className="font-bold text-white mb-1">Location {locationStatus === 'blocked' ? '(Unavailable)' : '(Denied)'}</p>
              {locationStatus === 'blocked' ? (
                <p>Unable to determine location. Ensure your device GPS is on.</p>
              ) : (
                <ul className="list-disc list-inside space-y-1">
                  <li>iOS: Tap the <strong>aA</strong> icon → Location → Allow</li>
                  <li>Android: Tap the lock icon → Permissions → Location → Allow</li>
                </ul>
              )}
            </div>
          </div>
        )}
        
        <button 
          onClick={onGrantTap}
          disabled={isProcessing}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-white font-bold py-4 px-8 rounded-full shadow-[0_10px_20px_rgba(245,158,11,0.3)] active:scale-95 transition-all duration-300 text-lg flex items-center justify-center gap-2"
        >
          {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : null}
          {isDeniedOrBlocked ? 'Retry Permissions' : 'Grant Permission'}
        </button>
      </div>
    </div>
  );
}

function PermissionRow({ icon, title, description, status }: { icon: ReactNode, title: string, description: string, status: PermState }) {
  const getStatusColor = () => {
    switch(status) {
      case 'granted': return 'text-amber-400';
      case 'denied': 
      case 'blocked': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusText = () => {
    switch(status) {
      case 'granted': return 'Granted';
      case 'denied': return 'Denied';
      case 'blocked': return 'Blocked/Unavailable';
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
