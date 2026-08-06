import {useState} from 'react';
import {createPortal} from 'react-dom';
import {Megaphone, Pencil, Plus, Trash2, X} from 'lucide-react';
import {Button} from '@wayontop/ui/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@wayontop/ui/components/ui/card';
import {Input} from '@wayontop/ui/components/ui/input';
import {Label} from '@wayontop/ui/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@wayontop/ui/components/ui/select';
import {toast} from 'sonner';
import type {GraphData, SponsorZone} from '@wayontop/ui/lib/types';

interface SponsorManagerProps {
    data: GraphData;
    setData: React.Dispatch<React.SetStateAction<GraphData>>;
}

export function SponsorManager({data, setData}: Readonly<SponsorManagerProps>) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);
    const [sponsorForm, setSponsorForm] = useState<Partial<SponsorZone>>({});
    const [showSponsorForm, setShowSponsorForm] = useState(false);

    const saveSponsor = () => {
        if (!sponsorForm.poi_id || !sponsorForm.name || sponsorForm.radius_m === undefined || sponsorForm.radius_m <= 0) {
            toast.error('Name, Location, and a valid Radius are required.');
            return;
        }

        if (editingSponsorId) {
            setData(prev => ({
                ...prev,
                sponsors: prev.sponsors.map(s => s.id === editingSponsorId ? {...s, ...sponsorForm} as SponsorZone : s)
            }));
        } else {
            setData(prev => ({
                ...prev,
                sponsors: [...prev.sponsors, {id: `s_${Date.now()}`, ...sponsorForm} as SponsorZone]
            }));
        }
        setEditingSponsorId(null);
        setSponsorForm({});
        setShowSponsorForm(false);
    };

    const deleteSponsor = (id: string) => {
        setData(prev => ({
            ...prev,
            sponsors: prev.sponsors.filter(s => s.id !== id)
        }));
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="rounded-[1.5rem] w-full flex flex-col items-center justify-center gap-1 h-16 text-white hover:bg-white/10 cursor-pointer outline-none bg-transparent border-0"
            >
                <Megaphone className="w-5 h-5"/>
                <span className="text-[10px] font-bold">Sponsor</span>
            </button>

            {isOpen && createPortal(
                <div
                    className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-3xl text-white overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
                    style={{pointerEvents: 'auto'}}>
                    <div
                        className="p-4 sm:p-6 pb-2 border-b border-white/10 flex justify-between items-center sticky top-0 bg-black/95 backdrop-blur-3xl z-10">
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                <Megaphone className="w-5 h-5 text-emerald-400"/> Sponsor Zones
                            </h2>
                            <p className="text-sm text-slate-400 mt-1">Manage geofenced sponsor activations.</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}
                                className="rounded-full hover:bg-white/10">
                            <X className="w-6 h-6"/>
                        </Button>
                    </div>
                    <div className="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto w-full">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-300">Active Sponsors
                                ({data.sponsors.length})</h3>
                            <Button size="sm"
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-md border-0"
                                    onClick={() => {
                                        setEditingSponsorId(null);
                                        setSponsorForm({});
                                        setShowSponsorForm(true);
                                    }}>
                                <Plus className="w-4 h-4 mr-1"/> Add
                            </Button>
                        </div>

                        {showSponsorForm && (
                            <Card className="bg-black/60 border-emerald-500/30 shadow-inner">
                                <CardHeader className="pb-3">
                                    <CardTitle
                                        className="text-base text-white">{editingSponsorId ? 'Edit Sponsor' : 'New Sponsor'}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Sponsor Name</Label>
                                        <Input className="bg-black/50 border-white/20 text-white"
                                               value={sponsorForm.name || ''}
                                               onChange={e => setSponsorForm(s => ({...s, name: e.target.value}))}/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Center Node (Zone Origin)</Label>
                                        <Select value={sponsorForm.poi_id}
                                                onValueChange={v => setSponsorForm(s => ({
                                                    ...s,
                                                    poi_id: v || undefined
                                                }))}>
                                            <SelectTrigger
                                                className="bg-black/50 border-white/20 text-white font-medium">
                                                <SelectValue placeholder="Select a Node"/>
                                            </SelectTrigger>
                                            <SelectContent
                                                className="bg-black/90 border-white/20 text-white max-h-60 z-[10000]">
                                                {data.nodes.filter(n => n.type !== 'track' || (n.type === 'track' && n.name && n.name.trim() !== '')).map(n => (
                                                    <SelectItem key={n.id} value={n.id} className="hover:bg-white/10">
                                                        {n.name || `Unnamed Node`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Radius (meters)</Label>
                                        <Input type="number" value={sponsorForm.radius_m || ''}
                                               onChange={e => setSponsorForm(s => ({
                                                   ...s,
                                                   radius_m: Number(e.target.value)
                                               }))} className="bg-black/50 border-white/20 text-white"/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Tagline / Message</Label>
                                        <Input value={sponsorForm.tagline || ''}
                                               onChange={e => setSponsorForm(s => ({...s, tagline: e.target.value}))}
                                               className="bg-black/50 border-white/20 text-white"/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Logo Asset URL (1:1)</Label>
                                        <Input value={sponsorForm.logo_asset || ''}
                                               onChange={e => setSponsorForm(s => ({...s, logo_asset: e.target.value}))}
                                               className="bg-black/50 border-white/20 text-white"
                                               placeholder="e.g. https://.../logo.png"/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Creative Asset URL (9:16 Media)</Label>
                                        <Input value={sponsorForm.creative_asset || ''}
                                               onChange={e => setSponsorForm(s => ({
                                                   ...s,
                                                   creative_asset: e.target.value
                                               }))}
                                               className="bg-black/50 border-white/20 text-white"
                                               placeholder="e.g. video.mp4 or poster.jpg"/>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <Button onClick={saveSponsor}
                                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">Save
                                            Zone</Button>
                                        <Button variant="outline"
                                                className="border-white/20 text-white hover:bg-white/10"
                                                onClick={() => {
                                                    setEditingSponsorId(null);
                                                    setSponsorForm({});
                                                    setShowSponsorForm(false);
                                                }}>Cancel</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <div className="space-y-3">
                            {(() => {
                                const typeColors: Record<string, string> = {
                                    poi: 'text-amber-400',
                                    stamp: 'text-fuchsia-400',
                                    gate: 'text-emerald-400',
                                    facility: 'text-rose-400',
                                    track: 'text-blue-400',
                                    unknown: 'text-slate-400'
                                };
                                const typeBorders: Record<string, string> = {
                                    poi: 'border-amber-500/30',
                                    stamp: 'border-fuchsia-500/30',
                                    gate: 'border-emerald-500/30',
                                    facility: 'border-rose-500/30',
                                    track: 'border-blue-500/30',
                                    unknown: 'border-slate-500/30'
                                };
                                const typeBGs: Record<string, string> = {
                                    poi: 'bg-amber-500/20',
                                    stamp: 'bg-fuchsia-500/20',
                                    gate: 'bg-emerald-500/20',
                                    facility: 'bg-rose-500/20',
                                    track: 'bg-blue-500/20',
                                    unknown: 'bg-slate-500/20'
                                };

                                const sponsors = data.sponsors || [];
                                const grouped = sponsors.reduce((acc, sponsor) => {
                                    const node = (data.nodes || []).find(n => n.id === sponsor.poi_id);
                                    const type = node?.type || 'unknown';
                                    if (!acc[type]) acc[type] = [];
                                    acc[type].push(sponsor);
                                    return acc;
                                }, {} as Record<string, typeof sponsors>);

                                const sortedTypes = Object.keys(grouped).sort();

                                return sortedTypes.map(type => (
                                    <div key={type} className="mb-6 space-y-3">
                                        <h4 className={`text-xs font-bold uppercase tracking-widest ${typeColors[type] || typeColors.unknown}`}>
                                            {type} Nodes
                                        </h4>
                                        {grouped[type].map(sponsor => {
                                            const isFilled = !!(sponsor.logo_asset || sponsor.creative_asset || sponsor.tagline);
                                            const borderColor = typeBorders[type] || typeBorders.unknown;
                                            const textColor = typeColors[type] || typeColors.unknown;
                                            const bgColor = typeBGs[type] || typeBGs.unknown;

                                            return (
                                                <div key={sponsor.id}
                                                     className={`bg-black/40 border rounded-xl p-3 flex flex-col gap-2 ${borderColor}`}>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <p className={`font-bold ${textColor}`}>{sponsor.name || 'Unnamed Slot'}</p>
                                                                {isFilled ? (
                                                                    <span
                                                                        className={`px-1.5 py-0.5 rounded text-[9px] font-black ${bgColor} ${textColor} border ${borderColor} uppercase tracking-wider`}>Filled</span>
                                                                ) : (
                                                                    <span
                                                                        className="px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-500/20 text-slate-400 border border-slate-500/30 uppercase tracking-wider">Open</span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-400">Zone: {sponsor.radius_m}m
                                                                around {(data.nodes || []).find(n => n.id === sponsor.poi_id)?.name || 'Unknown'}</p>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <Button variant="ghost" size="icon" onClick={() => {
                                                                setEditingSponsorId(sponsor.id);
                                                                setSponsorForm(sponsor);
                                                                setShowSponsorForm(true);
                                                            }}>
                                                                <Pencil className="w-4 h-4 text-slate-300"/>
                                                            </Button>
                                                            <Button variant="ghost" size="icon"
                                                                    className="text-red-500 hover:text-red-700 hover:bg-red-500/20"
                                                                    onClick={() => deleteSponsor(sponsor.id)}>
                                                                <Trash2 className="w-4 h-4"/>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    {isFilled && sponsor.tagline &&
                                                        <p className={`text-sm italic ${textColor} opacity-80`}>"{sponsor.tagline}"</p>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ));
                            })()}

                            {(data.sponsors || []).length === 0 && !showSponsorForm && (
                                <div className="text-center py-8 text-slate-500 text-sm">
                                    No sponsor zones defined yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                , document.body)}
        </>
    );
}
