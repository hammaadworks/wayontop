import {useState, useEffect} from 'react';
import {Input} from '@wayontop/ui/components/ui/input';
import {Button} from '@wayontop/ui/components/ui/button';
import {AtSign} from 'lucide-react';

export function IgHandlePrompt() {
    const [isOpen, setIsOpen] = useState(false);
    const [handle, setHandle] = useState('');

    useEffect(() => {
        const existing = localStorage.getItem('wayontop_ig_handle');
        if (!existing) {
            // Small delay so it doesn't pop up instantly over loading states
            const timer = setTimeout(() => setIsOpen(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const saveHandle = () => {
        if (!handle.trim()) return;
        const formatted = handle.startsWith('@') ? handle : `@${handle}`;
        localStorage.setItem('wayontop_ig_handle', formatted);
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto px-4">
            <div className="bg-[#1C1C1E] border border-white/10 rounded-[2rem] p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-amber-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
                    <AtSign className="w-8 h-8 text-white"/>
                </div>
                <h3 className="text-white text-xl font-black tracking-tight mb-2">Claim Your Spot</h3>
                <p className="text-white/60 text-sm mb-6">Enter your Instagram handle to show off your rank on the live leaderboard.</p>
                
                <div className="relative w-full mb-4">
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"/>
                    <Input 
                        value={handle}
                        onChange={e => setHandle(e.target.value)}
                        placeholder="yourhandle"
                        className="w-full bg-black/50 border border-white/10 text-white pl-10 rounded-xl h-12 focus-visible:ring-emerald-500"
                        autoFocus
                    />
                </div>
                
                <Button onClick={saveHandle} className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base">
                    Join Leaderboard
                </Button>
                
                <button onClick={() => setIsOpen(false)} className="mt-4 text-white/40 text-xs font-semibold hover:text-white transition-colors">
                    Skip for now
                </button>
            </div>
        </div>
    );
}
