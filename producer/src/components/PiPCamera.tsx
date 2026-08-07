import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import { Button } from '@wayontop/ui/components/ui/button';

export function PiPCamera() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const [position, setPosition] = useState({ x: 16, y: 16 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    useEffect(() => {
        let stream: MediaStream | null = null;
        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
            }
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [facingMode]);

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        setDragStart({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        
        // Ensure it stays within screen bounds roughly
        const newX = Math.max(0, Math.min(window.innerWidth - 120, e.clientX - dragStart.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 160, e.clientY - dragStart.y));
        
        setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const toggleCamera = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    };

    return (
        <div 
            className={`fixed z-50 overflow-hidden rounded-xl shadow-2xl border-2 border-white/20 bg-black touch-none transition-transform ${isDragging ? 'scale-105' : 'scale-100'}`}
            style={{ 
                left: `${position.x}px`, 
                top: `${position.y}px`,
                width: '100px',
                height: '140px',
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            
            <Button 
                variant="ghost" 
                size="icon"
                onClick={toggleCamera}
                className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-black/50 text-white hover:bg-black/80 backdrop-blur-md"
            >
                <RefreshCw className="w-3.5 h-3.5" />
            </Button>
        </div>
    );
}
