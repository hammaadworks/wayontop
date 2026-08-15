import { useEffect, useState } from 'react';
import { Navigation } from 'lucide-react';

interface SplashScreenProps {
    isLoading: boolean;
    onFinish: () => void;
}

export function SplashScreen({ isLoading, onFinish }: SplashScreenProps) {
    const [show, setShow] = useState(true);
    const [isFadingOut, setIsFadingOut] = useState(false);
    
    useEffect(() => {
        const minimumTime = 2500; // 2.5 seconds minimum splash screen time
        const startTime = Date.now();
        
        const checkLoading = setInterval(() => {
            if (!isLoading) {
                const elapsed = Date.now() - startTime;
                if (elapsed >= minimumTime) {
                    clearInterval(checkLoading);
                    setIsFadingOut(true);
                    setTimeout(() => {
                        setShow(false);
                        onFinish();
                    }, 800); // 800ms fade out duration
                }
            }
        }, 100);
        
        return () => clearInterval(checkLoading);
    }, [isLoading, onFinish]);

    if (!show) return null;

    return (
        <div className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#1C1C1E] transition-opacity duration-1000 ease-in-out ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="relative flex items-center justify-center">
                {/* Glowing background behind logo */}
                <div className="absolute w-28 h-28 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
                
                {/* Main Logo Container */}
                <div className="relative flex flex-col items-center">
                    <div className="w-20 h-20 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-3xl p-[1px] shadow-[0_0_40px_rgba(52,211,153,0.2)]">
                        <div className="w-full h-full bg-[#1C1C1E] rounded-[23px] flex items-center justify-center backdrop-blur-xl">
                            <Navigation className="w-9 h-9 text-emerald-400 -ml-1 mt-1 transform -rotate-45" />
                        </div>
                    </div>
                    
                    {/* Typography */}
                    <div className="mt-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                        <h1 className="text-3xl font-black tracking-tighter text-white">
                            WayOn<span className="text-emerald-400">Top</span>
                        </h1>
                        <p className="text-white/40 text-[10px] font-bold tracking-[0.3em] uppercase mt-2">
                            AR Explorer
                        </p>
                    </div>
                </div>
            </div>
            
            {/* Minimalist loading bar at bottom */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full animate-[loading_2s_ease-in-out_infinite] origin-left"></div>
            </div>

            <style>{`
                @keyframes loading {
                    0% { transform: scaleX(0); opacity: 0.5; }
                    50% { transform: scaleX(1); opacity: 1; }
                    100% { transform: scaleX(0); opacity: 0.5; transform-origin: right; }
                }
            `}</style>
        </div>
    );
}
