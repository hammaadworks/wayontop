import React, {useEffect, useRef, useState} from 'react';
import {Gem, Share2, X} from 'lucide-react';
import type {Stamp} from '@wayontop/ui/lib/types';
import {ViralSharing} from '../lib/sharing';
import {useTranslation} from 'react-i18next';

interface StampRevealProps {
    stamp: Stamp;
    onClose: () => void;
    initialScratched?: boolean;
}

export function StampReveal({stamp, onClose, initialScratched = false}: StampRevealProps) {
    const {t} = useTranslation();
    const [isScratched, setIsScratched] = useState(initialScratched);
    const [isScrolledUp, setIsScrolledUp] = useState(initialScratched);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Default image if none provided
    const imageUrl = stamp.image_url || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=2727&auto=format&fit=crop';

    useEffect(() => {
        if (initialScratched) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Handle high DPI displays
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.scale(dpr, dpr);

        // Fill with silver/gray foil color
        const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
        gradient.addColorStop(0, '#e5e7eb');
        gradient.addColorStop(0.5, '#d1d5db');
        gradient.addColorStop(1, '#9ca3af');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, rect.width, rect.height);

        // Draw scratch text
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'center';
        ctx.fillText('SCRATCH TO REVEAL', rect.width / 2, rect.height / 2);

        let isDrawing = false;
        let animationFrame: number;

        const getMousePos = (e: any) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        };

        const scratch = (e: any) => {
            if (!isDrawing) return;
            e.preventDefault(); // prevent scroll
            const pos = getMousePos(e);

            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 40, 0, Math.PI * 2);
            ctx.fill();

            // Debounce check
            cancelAnimationFrame(animationFrame);
            animationFrame = requestAnimationFrame(checkScratched);
        };

        const checkScratched = () => {
            if (isScratched) return;
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            let transparentPixels = 0;
            const data = imageData.data;
            for (let i = 3; i < data.length; i += 4) {
                if (data[i] === 0) {
                    transparentPixels++;
                }
            }
            const totalPixels = canvas.width * canvas.height;
            if (transparentPixels / totalPixels > 0.4) {
                setIsScratched(true);
            }
        };

        const startDrawing = (e: any) => {
            isDrawing = true;
            scratch(e);
        };
        const stopDrawing = () => {
            isDrawing = false;
        };

        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', scratch);
        window.addEventListener('mouseup', stopDrawing);

        canvas.addEventListener('touchstart', startDrawing, {passive: false});
        canvas.addEventListener('touchmove', scratch, {passive: false});
        window.addEventListener('touchend', stopDrawing);

        return () => {
            canvas.removeEventListener('mousedown', startDrawing);
            canvas.removeEventListener('mousemove', scratch);
            window.removeEventListener('mouseup', stopDrawing);
            canvas.removeEventListener('touchstart', startDrawing);
            canvas.removeEventListener('touchmove', scratch);
            window.removeEventListener('touchend', stopDrawing);
            cancelAnimationFrame(animationFrame);
        };
    }, [isScratched, initialScratched]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md overflow-hidden sm:p-6 animate-in fade-in duration-500">
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-12 right-6 z-[110] bg-black/40 backdrop-blur-md rounded-full p-3 text-white hover:bg-black/60 transition-colors shadow-lg"
            >
                <X className="w-6 h-6"/>
            </button>

            {/* Main Card Container */}
            <div
                className={`relative w-full max-w-md bg-[#f4f4f5] sm:rounded-[36px] rounded-t-[36px] overflow-hidden shadow-2xl transition-all duration-700 ease-in-out flex flex-col ${isScrolledUp ? 'h-[90vh]' : 'h-[75vh]'}`}
            >
                {/* Image Section - Sticky at top */}
                <div
                    className={`relative w-full transition-all duration-700 ease-in-out ${isScrolledUp ? 'h-[45%]' : 'h-[80%]'}`}>
                    <img
                        src={imageUrl}
                        alt={stamp.name}
                        className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* Gradient overlay for text readability */}
                    <div
                        className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none"/>

                    {/* Floating Rarity Badge */}
                    <div className="absolute top-6 left-6 flex gap-2">
                        <div
                            className="bg-white/20 backdrop-blur-xl border border-white/30 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full shadow-lg">
                            {stamp.rarity}
                        </div>
                    </div>

                    {/* Image Title */}
                    <div className="absolute bottom-8 left-6 right-6">
                        <h2 className="text-4xl font-extrabold text-white tracking-tight leading-none drop-shadow-lg font-serif">
                            {t(stamp.name)}
                        </h2>
                    </div>

                    {/* Scratch Card Overlay */}
                    {!initialScratched && (
                        <canvas
                            ref={canvasRef}
                            className={`absolute inset-0 w-full h-full touch-none transition-opacity duration-1000 ${isScratched ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                            style={{zIndex: 20}}
                        />
                    )}
                </div>

                {/* Info Section - Scrollable */}
                <div
                    className="flex-1 bg-[#f4f4f5] relative flex flex-col overflow-hidden rounded-t-[32px] -mt-6 z-30"
                    onClick={() => {
                        if (isScratched && !isScrolledUp) setIsScrolledUp(true)
                    }}
                >
                    {/* Handle for dragging/clicking */}
                    <div className="w-full flex justify-center pt-4 pb-2 cursor-pointer z-10 bg-[#f4f4f5]">
                        <div className="w-12 h-1.5 bg-slate-300 rounded-full"/>
                    </div>

                    {/* Scrollable Content */}
                    <div className="p-6 pt-2 overflow-y-auto flex-1">
                        {!isScratched ? (
                            <div
                                className="flex flex-col items-center justify-center h-full text-center space-y-4 text-slate-500">
                                <Gem className="w-12 h-12 text-slate-300 animate-pulse"/>
                                <p className="font-medium text-lg">Scratch the card to reveal!</p>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
                                <div>
                                    <h3 className="text-slate-900 text-xl font-bold mb-3">{t('about_discovery', 'About this Discovery')}</h3>
                                    <p className="text-slate-600 leading-relaxed text-[16px]">
                                        {t(stamp.description || `You discovered the incredible ${t(stamp.name)}. This is a rare find in Lalbagh Botanical Garden. Keep exploring to collect more unique stamps!`)}
                                    </p>
                                </div>

                                <button
                                    onClick={() => ViralSharing.shareAchievement(stamp.name)}
                                    className="w-full flex items-center justify-center gap-3 bg-[#1C1C1E] hover:bg-black text-white font-bold py-4 px-8 rounded-full active:scale-95 transition-all duration-300 shadow-xl"
                                >
                                    <Share2 className="w-5 h-5"/>
                                    <span>Share Discovery</span>
                                </button>

                                <button
                                    onClick={onClose}
                                    className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-bold py-4 px-8 rounded-full active:scale-95 transition-all duration-300 shadow-sm"
                                >
                                    Continue Journey
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
