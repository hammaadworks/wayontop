import {useEffect, useState, useRef} from 'react';
import {createPortal} from 'react-dom';
import type {Sponsor} from '@wayontop/ui/lib/types';
import {X, Volume2, VolumeX} from 'lucide-react';
import {supabase} from '@wayontop/ui/lib/supabase';

interface SponsorReelsModalProps {
    isOpen: boolean;
    onClose: () => void;
    slideItems: Sponsor[];
    initialSlideIndex?: number;
    onCTAClick?: (sponsor: Sponsor) => void;
}

export function SponsorReelsModal({
    isOpen,
    onClose,
    slideItems,
    initialSlideIndex = 0,
    onCTAClick
}: SponsorReelsModalProps) {
    const [slideIndex, setSlideIndex] = useState(initialSlideIndex);
    const [isMuted, setIsMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (videoRef.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, x / rect.width));
            videoRef.current.currentTime = percentage * videoRef.current.duration;
            setProgress(percentage * 100);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setSlideIndex(initialSlideIndex);
        }
    }, [isOpen, initialSlideIndex]);

    if (!isOpen) return null;

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setProgress(0);
        setSlideIndex(prev => (prev + 1) % slideItems.length);
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setProgress(0);
        setSlideIndex(prev => (prev - 1 + slideItems.length) % slideItems.length);
    };

    const handleCTAClickEvent = async (sponsor: Sponsor) => {
        if (!sponsor.cta_link) return;
        
        if (onCTAClick) {
            onCTAClick(sponsor);
        }

        window.open(sponsor.cta_link, '_blank', 'noopener,noreferrer');
    };

    const currentSlide = slideItems[slideIndex];
    if (!currentSlide) return null;

    const isVideo = (url?: string) => {
        if (!url) return false;
        const lower = url.toLowerCase();
        return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm');
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black pointer-events-auto animate-in fade-in duration-300 touch-none overscroll-none"
            style={{ overscrollBehavior: 'none' }}
        >
            {/* Full-screen Reels Container */}
            <div
                className="w-full h-full sm:max-w-md sm:h-[90vh] sm:rounded-[2rem] sm:border sm:border-white/20 relative overflow-hidden bg-zinc-900 flex flex-col shadow-2xl"
            >
                {/* Navigation Click Areas */}
                <div className="absolute inset-0 z-30 flex">
                    <div className="w-[30%] h-full" onClick={handlePrev}></div>
                    <div className="w-[70%] h-full" onClick={handleNext}></div>
                </div>

                {/* Background Media */}
                <div className="absolute inset-0 z-0 bg-black">
                    {currentSlide?.creative_asset ? (
                        <>
                            {/* Blurred background layer */}
                            {isVideo(currentSlide.creative_asset) ? (
                                <video src={currentSlide.creative_asset} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl scale-110 pointer-events-none" />
                            ) : (
                                <img src={currentSlide.creative_asset} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl scale-110 pointer-events-none" />
                            )}
                            
                            {/* Foreground content layer */}
                            {isVideo(currentSlide.creative_asset) ? (
                                    <video
                                        key={currentSlide.id}
                                        ref={videoRef}
                                        src={currentSlide.creative_asset}
                                        autoPlay loop muted={isMuted} playsInline
                                        onTimeUpdate={handleTimeUpdate}
                                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                                    />
                            ) : (
                                <img
                                    key={currentSlide.id}
                                    src={currentSlide.creative_asset}
                                    alt="Sponsor Creative"
                                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                                />
                            )}
                        </>
                    ) : (
                        <div
                            className="w-full h-full bg-mesh-dark object-cover flex flex-col items-center justify-center border-amber-500/20">
                            <div
                                className="w-20 h-20 bg-black/40 backdrop-blur-md rounded-3xl flex items-center justify-center mb-4 border border-white/10">
                                <span className="text-4xl text-amber-500">✨</span>
                            </div>
                            <p className="text-white/50 text-sm font-medium px-8 text-center">9:16 Vertical
                                Creative Space</p>
                        </div>
                    )}
                </div>

                {/* Gradient Overlay for bottom text legibility */}
                <div
                    className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90 z-10 pointer-events-none"></div>

                {/* Close Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="absolute top-12 right-4 z-40 w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 transition-colors active:scale-90"
                >
                    <X className="w-6 h-6"/>
                </button>

                {/* Volume Toggle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsMuted(!isMuted);
                    }}
                    className="absolute top-[6.5rem] right-4 z-40 w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 transition-colors active:scale-90"
                >
                    {isMuted ? <VolumeX className="w-6 h-6"/> : <Volume2 className="w-6 h-6"/>}
                </button>

                {/* Progress Bars (Instagram style) */}
                <div className="absolute top-8 left-4 right-16 z-40 flex gap-1.5 pointer-events-none">
                    {slideItems.map((_, i) => (
                        <div key={i} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                            <div className={`h-full bg-white transition-all duration-300 ${i === slideIndex ? 'w-full' : i < slideIndex ? 'w-full' : 'w-0'}`} />
                        </div>
                    ))}
                </div>

                {/* Bottom Content Area (Instagram Style) */}
                <div className="absolute bottom-0 left-0 right-0 p-5 pb-12 z-40 pointer-events-none">
                    <div className="flex items-center gap-3 mb-3">
                        {currentSlide?.logo_asset ? (
                            <img src={currentSlide.logo_asset} alt="Logo"
                                 className="w-10 h-10 rounded-full border border-white/20 object-cover shadow-lg"/>
                        ) : (
                            <div
                                className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center border border-white/20 shadow-lg">
                                <span
                                    className="font-bold text-amber-950 text-[10px] tracking-wider">{currentSlide.name.substring(0, 3).toUpperCase()}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <span
                                className="font-bold text-white text-[17px] tracking-tight drop-shadow-md">{currentSlide.name}</span>
                            {currentSlide.cta_link && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCTAClickEvent(currentSlide);
                                    }}
                                    className="px-3 py-1 bg-emerald-500/80 border border-emerald-400/50 rounded-full text-white text-xs font-bold hover:bg-emerald-500 active:bg-emerald-600 transition-colors shadow-sm ml-1 pointer-events-auto flex items-center gap-1 backdrop-blur-sm">
                                    Visit
                                </button>
                            )}
                        </div>
                    </div>

                    <div
                        className="text-white/95 text-[15px] font-medium max-w-[85%] leading-snug drop-shadow-md">
                        {currentSlide?.tagline || (currentSlide.is_default_ad
                            ? "We build navigation for the real world. Get your venue mapped today and unlock spatial intelligence."
                            : "Grab a quick bite or enjoy special offers available right here in this zone.")}
                    </div>
                </div>

                {/* Custom Interactive Seek Bar */}
                {isVideo(currentSlide?.creative_asset) && (
                    <div 
                        className="absolute bottom-0 left-0 right-0 h-6 z-50 cursor-pointer flex items-end group pb-2" 
                        onClick={handleSeek}
                    >
                        <div className="w-full h-1.5 bg-white/30 backdrop-blur-md group-hover:h-2 transition-all duration-300">
                            <div 
                                className="h-full bg-emerald-500 transition-all duration-75 relative" 
                                style={{width: `${progress}%`}}
                            >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full scale-0 group-hover:scale-100 transition-transform duration-200 shadow-[0_0_10px_rgba(0,0,0,0.5)] translate-x-1/2"></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
