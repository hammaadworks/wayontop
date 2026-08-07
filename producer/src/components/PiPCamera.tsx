import {useEffect, useRef, useState} from 'react';
import {Minimize2, RefreshCw} from 'lucide-react';
import {Button} from '@wayontop/ui/components/ui/button';

export function PiPCamera({isVisible = true}: { isVisible?: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const [position, setPosition] = useState({x: 16, y: 16});
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({x: 0, y: 0});
    const [isExpanded, setIsExpanded] = useState(false);

    // Pointer interaction states
    const pointerDownPos = useRef({x: 0, y: 0});
    const hasDragged = useRef(false);
    const lastTapTime = useRef(0);
    const tapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!isVisible) return;
        let stream: MediaStream | null = null;
        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {facingMode}
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
    }, [facingMode, isVisible]);

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        hasDragged.current = false;
        pointerDownPos.current = {x: e.clientX, y: e.clientY};
        setDragStart({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;

        // Detect drag
        const dx = Math.abs(e.clientX - pointerDownPos.current.x);
        const dy = Math.abs(e.clientY - pointerDownPos.current.y);
        if (dx > 5 || dy > 5) {
            hasDragged.current = true;
        }

        // Ensure it stays within screen bounds roughly
        const newX = Math.max(0, Math.min(window.innerWidth - 120, e.clientX - dragStart.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 160, e.clientY - dragStart.y));

        setPosition({x: newX, y: newY});
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);

        if (!hasDragged.current && !isExpanded) {
            const now = Date.now();
            if (now - lastTapTime.current < 300) {
                // Double Tap Detected
                if (tapTimeout.current) clearTimeout(tapTimeout.current);
                setIsExpanded(true);
                lastTapTime.current = 0; // reset
            } else {
                // Single Tap Detected (Debounce to wait for potential double tap)
                lastTapTime.current = now;
                if (tapTimeout.current) clearTimeout(tapTimeout.current);
                tapTimeout.current = setTimeout(() => {
                    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
                }, 250);
            }
        }
    };

    const toggleCamera = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    };

    const minimize = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(false);
    };

    if (!isVisible) return null;

    return (
        <div
            className={`fixed z-50 overflow-hidden shadow-2xl border-2 border-white/20 bg-black touch-none transition-all duration-300 ease-in-out ${
                isExpanded
                    ? 'inset-4 rounded-3xl' // Major full view with some padding
                    : `rounded-xl ${isDragging ? 'scale-105' : 'scale-100'}`
            }`}
            style={isExpanded ? {} : {
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: '100px',
                height: '140px',
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onPointerDown={isExpanded ? undefined : handlePointerDown}
            onPointerMove={isExpanded ? undefined : handlePointerMove}
            onPointerUp={isExpanded ? undefined : handlePointerUp}
            onPointerCancel={isExpanded ? undefined : handlePointerUp}
        >
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {isExpanded && (
                <div className="absolute bottom-6 right-6 flex gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={minimize}
                        className="w-12 h-12 rounded-full bg-black/50 text-white hover:bg-black/80 backdrop-blur-md z-10"
                    >
                        <Minimize2 className="w-5 h-5"/>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleCamera}
                        className="w-12 h-12 rounded-full bg-black/50 text-white hover:bg-black/80 backdrop-blur-md z-10"
                    >
                        <RefreshCw className="w-5 h-5"/>
                    </Button>
                </div>
            )}
        </div>
    );
}
