import { useEffect, useRef, useState } from 'react';
import { Camera, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@wayontop/ui/components/ui/button';

export function CameraView({ stampName, onClose }: { stampName: string; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    
    async function setupCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' } // Prefer back camera
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError("Unable to access camera. Please check permissions.");
      }
    }

    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
        <h2 className="text-white font-semibold text-lg drop-shadow-md">Testing: {stampName}</h2>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full" onClick={onClose}>
          <X className="w-6 h-6" />
        </Button>
      </div>

      {error ? (
        <div className="flex-1 flex items-center justify-center text-white p-6 text-center">
          <p>{error}</p>
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden bg-slate-900">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover"
          />
          
          {/* AR Overlay Simulation */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {captured ? (
              <div className="animate-in zoom-in duration-300 bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 flex flex-col items-center shadow-2xl">
                <CheckCircle2 className="w-16 h-16 text-green-400 mb-3" />
                <h3 className="text-xl font-bold text-white">Stamp Collected!</h3>
                <p className="text-white/80 mt-1">{stampName}</p>
              </div>
            ) : (
              <div className="w-48 h-48 border-4 border-dashed border-white/50 rounded-full flex items-center justify-center animate-[pulse_2s_ease-in-out_infinite]">
                <span className="text-white/70 font-semibold uppercase tracking-widest text-sm bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">Drop Here</span>
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center bg-gradient-to-t from-black/80 to-transparent">
            {!captured ? (
              <button 
                onClick={() => setCaptured(true)}
                className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform shadow-2xl"
              >
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
                  <Camera className="w-6 h-6 text-slate-900" />
                </div>
              </button>
            ) : (
              <Button onClick={onClose} size="lg" className="rounded-full bg-white text-slate-900 hover:bg-slate-100 font-bold px-8">
                Finish Testing
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
