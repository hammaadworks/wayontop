import { useState, useEffect, useCallback, useRef } from 'react';

export interface LocationData {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
}

export type TrackingStatus = 'idle' | 'recording' | 'paused' | 'ended';

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Tracking state
  const [status, setStatus] = useState<TrackingStatus>('idle');
  const [routeTrack, setRouteTrack] = useState<{lat: number, lng: number}[]>([]);
  const [distanceWalked, setDistanceWalked] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds

  // Use refs for mutable values we don't want to trigger re-renders for every tiny ping
  const cumulativeDistanceRef = useRef(0);
  const lastValidLocationRef = useRef<{lat: number, lng: number, timestamp: number} | null>(null);
  const historyRef = useRef<{lat: number, lng: number}[]>([]);

  // Timer for elapsed time
  useEffect(() => {
    let interval: any;
    if (status === 'recording') {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const startTracking = useCallback(() => {
    setStatus('recording');
    setStartTime(new Date());
    setRouteTrack([]);
    setDistanceWalked(0);
    setElapsedTime(0);
    cumulativeDistanceRef.current = 0;
    lastValidLocationRef.current = null;
    historyRef.current = [];
  }, []);

  const pauseTracking = useCallback(() => {
    setStatus('paused');
  }, []);

  const resumeTracking = useCallback(() => {
    setStatus('recording');
    // We keep lastValidLocation to prevent a massive jump on resume
  }, []);

  const endTracking = useCallback(() => {
    setStatus('ended');
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      if (import.meta.env.DEV) {
        setLocation({ lat: 12.9507, lng: 77.5848, accuracy: 5, heading: 0, speed: 0 });
        return;
      }
      setError('Geolocation is not supported by your browser');
      return;
    }

    const MAX_HISTORY = 3;

    const calcDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3;
      const p1 = (lat1 * Math.PI) / 180, p2 = (lat2 * Math.PI) / 180;
      const dp = ((lat2 - lat1) * Math.PI) / 180, dl = ((lon2 - lon1) * Math.PI) / 180;
      const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
      return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    };

    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock error:', err);
      }
    };
    requestWakeLock();

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading, speed } = position.coords;
        const currentTimestamp = position.timestamp || Date.now();
        
        historyRef.current.push({ lat: latitude, lng: longitude });
        if (historyRef.current.length > MAX_HISTORY) {
          historyRef.current.shift();
        }

        const avgLat = historyRef.current.reduce((sum, loc) => sum + loc.lat, 0) / historyRef.current.length;
        const avgLng = historyRef.current.reduce((sum, loc) => sum + loc.lng, 0) / historyRef.current.length;

        // Only accumulate distance if we are actively recording
        if (status === 'recording') {
          if (lastValidLocationRef.current) {
            const dist = calcDist(lastValidLocationRef.current.lat, lastValidLocationRef.current.lng, avgLat, avgLng);
            const timeDiffSecs = (currentTimestamp - lastValidLocationRef.current.timestamp) / 1000;
            
            // Calculate speed of the jump in m/s
            const jumpSpeed = timeDiffSecs > 0 ? dist / timeDiffSecs : 0;

            // Fix screen-lock time warp:
            // Allow jumps > 100m ONLY if the speed is less than 10 m/s (36 km/h)
            // This allows valid distance tracking after a phone wakes up, but prevents driving/teleportation.
            if (dist > 2 && jumpSpeed < 10) { 
              cumulativeDistanceRef.current += dist;
              setDistanceWalked(cumulativeDistanceRef.current);
              setRouteTrack(prev => [...prev, {lat: avgLat, lng: avgLng}]);
              lastValidLocationRef.current = {lat: avgLat, lng: avgLng, timestamp: currentTimestamp};
            } else if (jumpSpeed >= 10) {
              // Discard teleportation/driving, but reset valid location to current so we don't get stuck
              lastValidLocationRef.current = {lat: avgLat, lng: avgLng, timestamp: currentTimestamp};
            }
          } else {
            lastValidLocationRef.current = {lat: avgLat, lng: avgLng, timestamp: currentTimestamp};
            setRouteTrack([{lat: avgLat, lng: avgLng}]);
          }
        } else if (status === 'paused' || status === 'idle') {
           // Continually update the last valid location so that when we resume, we don't jump from where we paused
           lastValidLocationRef.current = {lat: avgLat, lng: avgLng, timestamp: currentTimestamp};
        }

        setLocation({
          lat: avgLat,
          lng: avgLng,
          accuracy,
          heading,
          speed
        });
      },
      (err) => {
        if (import.meta.env.DEV) {
           setLocation({ lat: 12.9507, lng: 77.5848, accuracy: 5, heading: 0, speed: 0 });
        } else {
           setError(`Location error: ${err.message}`);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (wakeLock) {
        wakeLock.release().catch(console.warn);
      }
    };
  }, [status]);

  return { 
    location, error, routeTrack, startTime, elapsedTime, distanceWalked, status, 
    startTracking, pauseTracking, resumeTracking, endTracking 
  };
}

