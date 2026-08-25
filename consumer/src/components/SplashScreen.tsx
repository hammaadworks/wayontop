import { useEffect, useState, useCallback } from 'react';
import { MapPin, Target, Users, Compass, Navigation } from 'lucide-react';

const INITIAL_SCREENS = [
  { quote: 'EXPLORE THE 3,000-MILLION-YEAR-OLD LALBAGH ROCK IN AR.', label: 'AR MODE', id: 'NO. 01', icon: MapPin },
  { quote: 'COLLECT AR STAMPS & UNLOCK EXCLUSIVE REWARDS.', label: 'GAMIFICATION', id: 'NO. 02', icon: Target },
  { quote: 'DISCOVER THE SECRETS OF THE HISTORIC GLASS HOUSE.', label: 'SPONSOR ZONES', id: 'NO. 03', icon: Users },
  { quote: 'CALIBRATING AUGMENTED REALITY COMPASS...', label: 'CALIBRATING', id: 'NO. 04', icon: Compass },
];

interface SplashScreenProps {
    isLoading: boolean;
    onFinish: () => void;
}

export function SplashScreen({ isLoading, onFinish }: SplashScreenProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [animatingOut, setAnimatingOut] = useState(false);
    
    const triggerExit = useCallback(() => {
        setAnimatingOut(true);
        setTimeout(() => {
            setIsVisible(false);
            onFinish();
        }, 800); // 800ms fade out duration
    }, [onFinish]);

    useEffect(() => {
        if (!isVisible) return;
        
        const minimumTimePerScreen = 1500; 

        if (currentIndex < INITIAL_SCREENS.length - 1) {
            const timer = setTimeout(() => {
                setCurrentIndex((prev) => prev + 1);
            }, minimumTimePerScreen);
            return () => clearTimeout(timer);
        } else {
            // Last screen: wait for isLoading to be false
            if (!isLoading) {
                const timer = setTimeout(triggerExit, 1000); // Wait a tiny bit on the last screen before exiting
                return () => clearTimeout(timer);
            }
        }
    }, [isVisible, currentIndex, isLoading, triggerExit]);

    if (!isVisible) return null;

    const currentScreen = INITIAL_SCREENS[currentIndex];

    // Smooth rotations instead of brutalist rotations
    const rotations = ['rotate-1', '-rotate-1', 'rotate-0', 'rotate-1'];
    const currentRotation = rotations[currentIndex % rotations.length];

    return (
        <div className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#1C1C1E] overflow-hidden transition-opacity duration-1000 ease-in-out font-sans ${animatingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            
            {/* Prismatic Zen Background Glows (App Style) */}
            <div className="absolute inset-0 bg-mesh-dark opacity-80 pointer-events-none z-0"></div>
            
            {/* Glowing orb background */}
            <div className="absolute w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] animate-pulse pointer-events-none z-0"></div>

            {/* Header (App Style: Sleek and Minimal) */}
            <div className="absolute top-0 left-0 w-full border-b border-white/10 bg-[#1C1C1E]/80 backdrop-blur-md flex justify-between items-center p-4 sm:px-6 z-20">
                <div className="flex items-center gap-3">
                    <div className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-white">
                        LALBAGH<span className="text-emerald-400">.TOP</span>
                    </div>
                    <div className="bg-emerald-500/20 text-emerald-400 px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold tracking-widest border border-emerald-500/30 uppercase flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        {currentScreen.label}
                    </div>
                </div>
                <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">
                    {currentScreen.id}
                </div>
            </div>

            {/* Centered Content Group */}
            <div className="relative z-10 flex flex-col items-center justify-center gap-6 sm:gap-10 w-full max-w-[90vw] sm:max-w-md px-4 mt-8">
                
                {/* Logo Container (Glassmorphic) */}
                <div 
                    key={`logo-${currentIndex}`}
                    className={`relative flex items-center justify-center p-6 sm:p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] ${currentRotation} transition-all duration-700`}
                    style={{ animation: 'appFadeInScale 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
                >
                    <div className="w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-3xl p-[1px] shadow-[0_0_40px_rgba(52,211,153,0.3)]">
                        <div className="w-full h-full bg-[#1C1C1E] rounded-[23px] flex items-center justify-center backdrop-blur-xl">
                            <Navigation className="w-9 h-9 sm:w-12 sm:h-12 text-emerald-400 -ml-1 mt-1 transform -rotate-45" />
                        </div>
                    </div>
                </div>

                {/* Route/Feature Badge */}
                <div 
                    key={`badge-${currentIndex}`}
                    className="flex items-center gap-2.5 bg-black/40 backdrop-blur-md text-emerald-400 px-5 py-2.5 rounded-full border border-white/10 shadow-lg font-bold uppercase tracking-widest text-xs sm:text-sm z-20"
                    style={{ animation: 'appFadeInScale 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards', animationDelay: '0.1s', opacity: 0 }}
                >
                    <currentScreen.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{currentScreen.label}</span>
                </div>

                {/* Quote Container */}
                <div className="flex items-center justify-center text-center w-full mt-2">
                    <h1 
                        key={`quote-${currentIndex}`}
                        className="text-[17px] sm:text-xl md:text-2xl font-black text-white uppercase tracking-tight leading-snug p-5 rounded-[20px] border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.3)] w-full"
                        style={{ animation: 'appSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
                    >
                        {currentScreen.quote}
                    </h1>
                </div>
            </div>

            {/* Minimalist loading bar at bottom */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-48 h-1 bg-white/10 rounded-full overflow-hidden z-20">
                <div className="h-full bg-emerald-400 rounded-full animate-[loading_2s_ease-in-out_infinite] origin-left"></div>
            </div>
            
            <style>{`
                @keyframes appFadeInScale {
                    from { opacity: 0; transform: scale(0.9) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes appSlideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes loading {
                    0% { transform: scaleX(0); opacity: 0.5; }
                    50% { transform: scaleX(1); opacity: 1; }
                    100% { transform: scaleX(0); opacity: 0.5; transform-origin: right; }
                }
            `}</style>
        </div>
    );
}
