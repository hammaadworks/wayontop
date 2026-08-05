import {useState} from 'react';
import {Check, Gem, X} from 'lucide-react';
import {Button} from '@wayontop/ui/components/ui/button';
import {CameraFeed} from '@wayontop/ui/components/CameraFeed';

export function CameraView({stampName, onClose}: { stampName: string; onClose: () => void }) {
    const [captured, setCaptured] = useState(false);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            <div
                className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
                <h2 className="text-white font-semibold text-lg drop-shadow-md">Testing: {stampName}</h2>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full"
                        onClick={onClose}>
                    <X className="w-6 h-6"/>
                </Button>
            </div>

            <div className="flex-1 relative overflow-hidden bg-slate-900">
                <CameraFeed onClose={onClose}/>

                {/* Simulated AR Overlay (Pokemon Go Style) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {!captured ? (
                        <div
                            className="absolute bottom-40 z-30 flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700 pointer-events-auto">
                            <div
                                onClick={() => setCaptured(true)}
                                className="group cursor-pointer active:scale-95 active:rotate-[15deg] transition-all duration-500"
                                style={{perspective: '1200px'}}
                            >
                                {/* The 3D Card */}
                                <div
                                    className="w-[200px] h-[280px] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-4 border-amber-300 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 overflow-hidden transform-gpu transition-all duration-500 hover:-translate-y-4 hover:scale-105 group-hover:shadow-[0_0_40px_rgba(251,191,36,0.6)] group-active:rotate-y-180 relative flex flex-col">
                                    {/* Holographic overlay */}
                                    <div
                                        className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none group-hover:translate-x-full transition-transform duration-1000"></div>

                                    <div className="p-4 flex flex-col h-full text-center z-10">
                                        <div className="flex-1 flex items-center justify-center relative">
                                            <div
                                                className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-full"></div>
                                            <Gem
                                                className="w-16 h-16 text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,1)] animate-pulse"/>
                                        </div>

                                        <div
                                            className="bg-black/60 backdrop-blur-md rounded-xl p-3 border border-white/20 mt-auto shadow-inner relative overflow-hidden">
                                            <div
                                                className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                                            <p className="text-[10px] uppercase font-black text-amber-400 tracking-widest mb-1 relative z-10">TAP
                                                TO CLAIM</p>
                                            <h4 className="text-lg font-bold tracking-tight text-white leading-tight relative z-10">{stampName}</h4>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-500 pointer-events-auto p-6">
                            <div
                                className="w-full max-w-[340px] rounded-3xl border border-emerald-500/30 p-10 text-center animate-in zoom-in-90 duration-700 bg-black/40 backdrop-blur-xl relative overflow-hidden shadow-2xl">
                                <div
                                    className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-900/40"></div>

                                <div
                                    className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(16,185,129,0.6)] relative z-10">
                                    <Check className="w-12 h-12 text-white drop-shadow-md" strokeWidth={3}/>
                                </div>

                                <h3 className="text-4xl tracking-tight font-extrabold text-white mb-3 relative z-10">Claimed!</h3>
                                <p className="text-emerald-200 mb-10 font-medium text-lg relative z-10">{stampName}</p>

                                <div className="space-y-4 relative z-10">
                                    <button
                                        onClick={onClose}
                                        className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-full border border-white/20 active:scale-95 transition-all duration-300 text-lg backdrop-blur-md"
                                    >
                                        Finish Testing
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
