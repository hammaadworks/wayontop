import React, { useState, useEffect, ReactNode } from 'react';
import { Camera, MapPin, Compass, Settings, AlertTriangle, ShieldCheck } from 'lucide-react';

interface PermissionGateProps {
  children: ReactNode;
}

type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'unsupported';

export function PermissionGate({ children }: PermissionGateProps) {
  const [cameraStatus, setCameraStatus] = useState<PermissionStatus>('prompt');
  const [locationStatus, setLocationStatus] = useState<PermissionStatus>('prompt');
  const [compassStatus, setCompassStatus] = useState<PermissionStatus>('prompt');
  
  const [showModal, setShowModal] = useState(true);
  const [isDeniedState, setIsDeniedState] = useState(false);

  const checkPermissions = async () => {
    let cam: PermissionStatus = 'prompt';
    let loc: PermissionStatus = 'prompt';
    
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const camPerm = await navigator.permissions.query({ name: 'camera' as PermissionName }).catch(() => null);
        if (camPerm) cam = camPerm.state as PermissionStatus;
        
        const locPerm = await navigator.permissions.query({ name: 'geolocation' as PermissionName }).catch(() => null);
        if (locPerm) loc = locPerm.state as PermissionStatus;
      }
    } catch (e) {
      // Fallback
    }

    let comp: PermissionStatus = 'prompt';
    if (!window.DeviceOrientationEvent) {
      comp = 'unsupported';
    } else if (typeof (DeviceOrientationEvent as any).requestPermission !== 'function') {
      comp = 'granted'; // Android / standard browsers usually grant it with location/automatically
    } else {
      comp = localStorage.getItem('compass_granted') === 'true' ? 'granted' : 'prompt';
    }

    setCameraStatus(cam);
    setLocationStatus(loc);
    setCompassStatus(comp);

    const anyDenied = cam === 'denied' || loc === 'denied' || comp === 'denied';
    const allGranted = cam === 'granted' && loc === 'granted' && (comp === 'granted' || comp === 'unsupported');
    
    setIsDeniedState(anyDenied);
    
    if (allGranted) {
      setShowModal(false);
    } else {
      setShowModal(true);
    }
  };

  useEffect(() => {
    checkPermissions();
    const interval = setInterval(checkPermissions, 2000);
    return () => clearInterval(interval);
  }, []);

  const requestPermissions = async () => {
    try {
      let camSuccess = false;
      let locSuccess = false;

      // Request Camera
      if (cameraStatus !== 'granted' && cameraStatus !== 'denied') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(t => t.stop());
          camSuccess = true;
          setCameraStatus('granted');
        } catch (e: any) {
          if (e.name === 'NotAllowedError') setCameraStatus('denied');
        }
      } else if (cameraStatus === 'granted') {
        camSuccess = true;
      }

      // Request Location
      if (locationStatus !== 'granted' && locationStatus !== 'denied') {
        try {
          await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          locSuccess = true;
          setLocationStatus('granted');
        } catch (e: any) {
          if (e.code === e.PERMISSION_DENIED) setLocationStatus('denied');
        }
      } else if (locationStatus === 'granted') {
        locSuccess = true;
      }

      // Request Compass (iOS Safari requires user gesture)
      if (compassStatus !== 'granted' && compassStatus !== 'denied' && compassStatus !== 'unsupported') {
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
          try {
            const permission = await (DeviceOrientationEvent as any).requestPermission();
            if (permission === 'granted') {
              localStorage.setItem('compass_granted', 'true');
              setCompassStatus('granted');
            } else {
              setCompassStatus('denied');
            }
          } catch (e) {
            // Handled
          }
        }
      }
      
      // Recheck after requests to sync with native permission API if available
      setTimeout(checkPermissions, 500);
    } catch (err) {
      console.error(err);
    }
  };

  if (!showModal) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 p-6 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950 to-slate-950"></div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px]"></div>

      <div className="relative w-full max-w-md glass-panel p-8 rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/10 animate-in zoom-in-95 duration-500">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            {isDeniedState ? <AlertTriangle className="w-10 h-10 text-white" /> : <ShieldCheck className="w-10 h-10 text-white" />}
          </div>
        </div>
        
        <h2 className="text-3xl font-extrabold text-white text-center mb-2 tracking-tight">
          {isDeniedState ? 'Permissions Needed' : 'Ready to Explore?'}
        </h2>
        <p className="text-slate-400 text-center mb-8 leading-relaxed">
          {isDeniedState 
            ? "Lalbagh AR requires access to your camera and location to function. Please enable them in your browser settings to continue."
            : "To guide you through Lalbagh Botanical Garden in Augmented Reality, we need a few permissions."}
        </p>

        <div className="space-y-4 mb-8">
          <PermissionRow 
            icon={<Camera className="w-5 h-5" />}
            title="Camera"
            description="To show the AR route overlays"
            status={cameraStatus}
          />
          <PermissionRow 
            icon={<MapPin className="w-5 h-5" />}
            title="Location"
            description="To find your position in the park"
            status={locationStatus}
          />
          {compassStatus !== 'unsupported' && (
            <PermissionRow 
              icon={<Compass className="w-5 h-5" />}
              title="Compass"
              description="To orient the map correctly"
              status={compassStatus}
            />
          )}
        </div>

        {isDeniedState ? (
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-6">
            <h4 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4" /> How to Enable
            </h4>
            <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
              <li>Tap the <strong>Aa</strong> or <strong>lock icon</strong> in your browser's address bar.</li>
              <li>Select <strong>Website Settings</strong> or <strong>Permissions</strong>.</li>
              <li>Allow access to Camera and Location.</li>
              <li>Reload this page.</li>
            </ol>
          </div>
        ) : (
          <button 
            onClick={requestPermissions}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-4 px-8 rounded-full shadow-[0_10px_20px_rgba(16,185,129,0.3)] active:scale-95 transition-all duration-300 text-lg flex items-center justify-center gap-2"
          >
            Grant Permissions
          </button>
        )}
      </div>
    </div>
  );
}

function PermissionRow({ icon, title, description, status }: { icon: ReactNode, title: string, description: string, status: PermissionStatus }) {
  const getStatusColor = () => {
    switch(status) {
      case 'granted': return 'text-emerald-400';
      case 'denied': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusText = () => {
    switch(status) {
      case 'granted': return 'Granted';
      case 'denied': return 'Denied';
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
