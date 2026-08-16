import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";
import { Card, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { useState } from "react";
import { ImageOff } from "lucide-react";

function MediaViewer({ mediaType, mediaSrc, title }: { mediaType: string, mediaSrc: string, title: string }) {
    const [hasError, setHasError] = useState(false);

    if (hasError) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-zinc-900/50">
                <ImageOff className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-[10px] font-medium uppercase tracking-wider">Media coming soon</span>
            </div>
        );
    }

    if (mediaType === 'video') {
        return (
            <video 
                src={mediaSrc} 
                autoPlay loop muted playsInline
                onError={() => setHasError(true)}
                className="w-full h-full object-cover"
            />
        );
    }
    return (
        <img 
            src={mediaSrc} alt={title}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover"
        />
    );
}

export function PermissionTroubleshootGuide({
    isOpen,
    setIsOpen,
    os,
    browser,
}: {
    isOpen: boolean;
    setIsOpen: (o: boolean) => void;
    os: string;
    browser: string;
}) {
    // The exact slides shown dynamically depend on the user's OS and Browser!
    const slides = [
        {
            title: "Browser Level Block",
            osBrowser: `${os} - ${browser}`,
            description: os === 'iOS' 
                ? (browser === 'Safari' ? "Tap the button on the left of the URL bar > ... > Allow Access." : "Tap the lock icon on the left of the URL bar > Allow Access.")
                : "Tap the lock icon in the URL bar > Permissions > Allow Access.",
            mediaType: "video", // Can be "image", "gif", or "video"
            mediaSrc: `/assets/permissions/${os.toLowerCase()}-${browser.toLowerCase()}-step1.mp4` // Uses mp4 for super smooth auto-playing video!
        },
        {
            title: "OS Level Block",
            osBrowser: `${os} Settings`,
            description: os === 'iOS'
                ? `Open iPhone Settings > ${browser} > Allow Location & Camera.`
                : `Long press the ${browser} app > App Info > Permissions > Allow Location & Camera.`,
            mediaType: "image",
            mediaSrc: `/assets/permissions/${os.toLowerCase()}-os-step2.jpg`
        }
    ];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-[340px] sm:max-w-md bg-black/90 backdrop-blur-3xl border-white/10 text-white p-0 overflow-hidden rounded-3xl">
                <DialogHeader className="p-6 pb-2 text-left">
                    <DialogTitle className="text-xl font-bold tracking-tight">How to Fix Access</DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs font-medium">
                        Follow these steps to unblock your permissions.
                    </DialogDescription>
                </DialogHeader>
                <div className="p-6 pt-0">
                    <Carousel className="w-full">
                        <CarouselContent>
                            {slides.map((slide, index) => (
                                <CarouselItem key={index}>
                                    <Card className="bg-white/5 border-white/10 shadow-none overflow-hidden rounded-2xl">
                                        {/* Media Section */}
                                        <div className="w-full aspect-[4/3] bg-black/50 relative flex items-center justify-center overflow-hidden border-b border-white/10">
                                            <MediaViewer 
                                                mediaType={slide.mediaType}
                                                mediaSrc={slide.mediaSrc}
                                                title={slide.title}
                                            />
                                        </div>
                                        {/* Content Section */}
                                        <CardHeader className="p-4 pb-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <CardTitle className="text-sm font-extrabold text-amber-400">{slide.title}</CardTitle>
                                                <span className="text-[9px] uppercase tracking-wider bg-white/10 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                                                    {slide.osBrowser}
                                                </span>
                                            </div>
                                            <CardDescription className="text-slate-200 text-xs font-medium leading-relaxed">
                                                {slide.description}
                                            </CardDescription>
                                        </CardHeader>
                                    </Card>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <div className="flex justify-center gap-3 mt-4 relative">
                            <CarouselPrevious className="static translate-y-0 h-9 w-9 bg-white/10 border-white/10 hover:bg-white/20 hover:text-white" />
                            <CarouselNext className="static translate-y-0 h-9 w-9 bg-white/10 border-white/10 hover:bg-white/20 hover:text-white" />
                        </div>
                    </Carousel>
                </div>
            </DialogContent>
        </Dialog>
    );
}
