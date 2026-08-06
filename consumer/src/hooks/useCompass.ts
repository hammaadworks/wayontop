import { useState, useEffect, useRef } from 'react';

export function useCompass() {
  const [heading, setHeading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsPermission, setNeedsPermission] = useState<boolean>(false);

  useEffect(() => {
    // Check if device orientation is supported
    if (!window.DeviceOrientationEvent) {
      setError('Device orientation not supported');
      return;
    }

    // Check if we need to request permission (iOS 13+)
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      setNeedsPermission(true);
      // Auto-request on mount. If PermissionGate already got permission, this resolves to 'granted' instantly without needing a user gesture.
      requestPermission();
    } else {
      startListening();
    }

    return () => {
      stopListening();
    };
  }, []);

  const startListening = () => {
    // Android Chrome specific event for true north
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handleOrientation as any, true);
    } 
    // Standard event (iOS uses this with webkitCompassHeading)
    window.addEventListener('deviceorientation', handleOrientation, true);
  };

  const stopListening = () => {
    if ('ondeviceorientationabsolute' in window) {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as any, true);
    }
    window.removeEventListener('deviceorientation', handleOrientation, true);
  };

  const requestPermission = async () => {
    try {
      const permission = await (DeviceOrientationEvent as any).requestPermission();
      if (permission === 'granted') {
        setNeedsPermission(false);
        startListening();
      } else {
        setError('Permission to access device orientation was denied');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request permission');
    }
  };

  const frameRef = useRef<number | null>(null);

  const handleOrientation = (event: DeviceOrientationEvent) => {
    if (frameRef.current) return; // Drop frame if still processing

    frameRef.current = requestAnimationFrame(() => {
      let compassHeading = null;
      let alpha = event.alpha;

    if ((event as any).webkitCompassHeading !== undefined) {
      // iOS Safari
      compassHeading = (event as any).webkitCompassHeading;
    } else if ((event as any).absolute === true || 'ondeviceorientationabsolute' in window) {
      // Android Chrome with absolute orientation
      // Calculate true north from alpha, beta, gamma if absolute is true
      if (alpha !== null) {
         // Convert alpha to compass heading (0 = North)
         compassHeading = 360 - alpha; 
      }
    } else {
      // Relative orientation (cannot determine true north reliably without GPS fusion)
      // We'll use alpha as a fallback but note it's likely inaccurate relative to true north
      if (alpha !== null) {
         compassHeading = 360 - alpha;
      }
    }

      if (compassHeading !== null) {
        setHeading(compassHeading);
      }
      
      frameRef.current = null;
    });
  };

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return { heading, error, needsPermission, requestPermission };
}
