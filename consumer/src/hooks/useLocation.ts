import { useState, useEffect } from 'react';

export interface LocationData {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [routeTrack, setRouteTrack] = useState<{lat: number, lng: number}[]>([]);
  const [startTime] = useState<Date>(new Date());
  const [distanceWalked, setDistanceWalked] = useState(0);

  useEffect(() => {
    if (!navigator.geolocation) {
      if (import.meta.env.DEV) {
        // Fallback for dev mode
        setLocation({ lat: 12.9507, lng: 77.5848, accuracy: 5, heading: 0, speed: 0 });
        return;
      }
      setError('Geolocation is not supported by your browser');
      return;
    }

    // Moving average buffer
    let history: {lat: number, lng: number}[] = [];
    const MAX_HISTORY = 3;
    let lastValidLocation: {lat: number, lng: number} | null = null;
    let cumulativeDistance = 0;

    // Helper to calculate distance in meters (haversine)
    const calcDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3;
      const p1 = (lat1 * Math.PI) / 180, p2 = (lat2 * Math.PI) / 180;
      const dp = ((lat2 - lat1) * Math.PI) / 180, dl = ((lon2 - lon1) * Math.PI) / 180;
      const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
      return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    };

    // Request Wake Lock
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
        
        // Add to history
        history.push({ lat: latitude, lng: longitude });
        if (history.length > MAX_HISTORY) {
          history.shift();
        }

        // Calculate moving average
        const avgLat = history.reduce((sum, loc) => sum + loc.lat, 0) / history.length;
        const avgLng = history.reduce((sum, loc) => sum + loc.lng, 0) / history.length;

        // Update route tracking if moved more than 2 meters
        if (lastValidLocation) {
          const dist = calcDist(lastValidLocation.lat, lastValidLocation.lng, avgLat, avgLng);
          if (dist > 2 && dist < 100) { // filter out massive jumps
            cumulativeDistance += dist;
            setDistanceWalked(cumulativeDistance);
            setRouteTrack(prev => [...prev, {lat: avgLat, lng: avgLng}]);
            lastValidLocation = {lat: avgLat, lng: avgLng};
          }
        } else {
          lastValidLocation = {lat: avgLat, lng: avgLng};
          setRouteTrack([{lat: avgLat, lng: avgLng}]);
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
           console.warn('Geolocation failed in DEV, using mock location.', err);
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
  }, []);

  return { location, error, routeTrack, startTime, distanceWalked };
}
