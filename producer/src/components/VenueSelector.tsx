import {useState} from 'react';
import {LocateFixed, MapPin, Pencil, Plus, Trash2} from 'lucide-react';
import {Button} from '@wayontop/ui/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@wayontop/ui/components/ui/card';
import {Input} from '@wayontop/ui/components/ui/input';
import {Label} from '@wayontop/ui/components/ui/label';
import {BaseModal} from '@wayontop/ui/components/BaseModal';
import {toast} from 'sonner';
import {supabase} from '@wayontop/ui/lib/supabase';
import type {Venue} from '../hooks/useVenues';

interface VenueSelectorProps {
    venues: Venue[];
    loadingVenues: boolean;
    onSelectVenue: (venue: Venue) => void;
    onCreateVenue: (venue: Partial<Venue>) => Promise<Venue | null>;
    onUpdateVenue: (venue: Partial<Venue>) => Promise<boolean>;
    onDeleteVenue: (venueId: string) => Promise<boolean>;
}

export function VenueSelector({
                                  venues,
                                  loadingVenues,
                                  onSelectVenue,
                                  onCreateVenue,
                                  onUpdateVenue,
                                  onDeleteVenue
                              }: Readonly<VenueSelectorProps>) {
    const [showNewVenue, setShowNewVenue] = useState(false);
    const [newVenueForm, setNewVenueForm] = useState<Partial<Venue>>({zoom: 16});
    const [venueToDelete, setVenueToDelete] = useState<string | null>(null);
    const [passkeyModalVenue, setPasskeyModalVenue] = useState<Venue | null>(null);
    const [passkeyInput, setPasskeyInput] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    const handleCreate = async () => {
        const created = await onCreateVenue(newVenueForm);
        if (created) {
            onSelectVenue(created);
            setShowNewVenue(false);
            setNewVenueForm({zoom: 16});
        }
    };

    const handleUpdate = async () => {
        const success = await onUpdateVenue(newVenueForm);
        if (success) {
            setShowNewVenue(false);
            setNewVenueForm({zoom: 16});
        }
    };

    const verifyAndEnter = async () => {
        if (!passkeyModalVenue || isVerifying || !passkeyInput) return;
        setIsVerifying(true);
        
        const { data, error } = await supabase
            .from('venues')
            .select('passkey')
            .eq('id', passkeyModalVenue.id)
            .single();
            
        if (error) {
            toast.error('Error verifying passkey');
            setIsVerifying(false);
            return;
        }
        
        if (data?.passkey !== passkeyInput) {
            toast.error('Invalid passkey');
            setIsVerifying(false);
            return;
        }
        
        setIsVerifying(false);
        onSelectVenue(passkeyModalVenue);
        setPasskeyModalVenue(null);
        setPasskeyInput('');
    };

    return (
        <div
            className="min-h-[100dvh] bg-[#09090b] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-[#09090b] to-[#09090b] flex items-center justify-center p-4 text-slate-100 font-sans selection:bg-emerald-500/30">
            <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500 slide-in-from-bottom-4">
                <div className="text-center mb-10">
                    <div
                        className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-400 mb-6 shadow-[0_0_40px_rgba(16,185,129,0.2)] border border-emerald-500/20 backdrop-blur-3xl relative">
                        <div
                            className="absolute inset-0 rounded-full border border-emerald-400/20 animate-[spin_10s_linear_infinite]"/>
                        <MapPin className="w-10 h-10 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]"/>
                    </div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50 tracking-tight drop-shadow-sm">Producer
                        UI</h1>
                    <p className="text-slate-400 mt-3 font-medium text-sm">Select a venue to begin mapping</p>
                </div>

                {showNewVenue ? (
                    <Card
                        className="shadow-2xl glass-panel border border-white/10 bg-black/40 backdrop-blur-3xl text-white rounded-[2rem] overflow-hidden">
                        <CardHeader className="border-b border-white/5 bg-white/5 p-6">
                            <CardTitle
                                className="text-xl font-bold text-white tracking-tight">{newVenueForm.id ? 'Edit Venue' : 'Create New Venue'}</CardTitle>
                            <CardDescription
                                className="text-slate-400 font-medium">{newVenueForm.id ? 'Update venue settings' : 'Setup a new park, mall, or event space'}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Venue
                                    Name</Label>
                                <Input
                                    className="bg-black/60 border-white/10 text-white h-12 rounded-xl focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600"
                                    placeholder="e.g. Central Park" value={newVenueForm.name || ''}
                                    onChange={e => setNewVenueForm(s => ({...s, name: e.target.value}))}/>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Venue
                                    Key</Label>
                                <Input
                                    className="bg-black/60 border-white/10 text-white h-12 rounded-xl focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600"
                                    placeholder="e.g. centralpark" value={newVenueForm.key || ''}
                                    onChange={e => setNewVenueForm(s => ({
                                        ...s,
                                        key: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')
                                    }))}/>
                            </div>

                            <div className="flex justify-between items-end pt-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Center
                                    Coordinates</Label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-lg text-xs font-bold border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 bg-transparent transition-colors"
                                    onClick={() => {
                                        navigator.geolocation.getCurrentPosition(
                                            pos => setNewVenueForm(s => ({
                                                ...s,
                                                lat: pos.coords.latitude,
                                                lng: pos.coords.longitude
                                            })),
                                            () => toast.error("Could not get location")
                                        );
                                    }}
                                >
                                    <LocateFixed className="w-3.5 h-3.5 mr-1.5"/> Use Current
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Latitude</Label>
                                    <Input
                                        className="bg-black/60 border-white/10 text-white h-11 rounded-xl focus:border-emerald-500/50 transition-all font-mono text-sm"
                                        type="number" step="any" placeholder="12.9500" value={newVenueForm.lat || ''}
                                        onChange={e => setNewVenueForm(s => ({...s, lat: Number(e.target.value)}))}/>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Longitude</Label>
                                    <Input
                                        className="bg-black/60 border-white/10 text-white h-11 rounded-xl focus:border-emerald-500/50 transition-all font-mono text-sm"
                                        type="number" step="any" placeholder="77.5850" value={newVenueForm.lng || ''}
                                        onChange={e => setNewVenueForm(s => ({...s, lng: Number(e.target.value)}))}/>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase">Initial Zoom
                                    Level</Label>
                                <Input
                                    className="bg-black/60 border-white/10 text-white h-11 rounded-xl focus:border-emerald-500/50 transition-all font-mono text-sm"
                                    type="number" placeholder="16" value={newVenueForm.zoom || ''}
                                    onChange={e => setNewVenueForm(s => ({...s, zoom: Number(e.target.value)}))}/>
                            </div>

                            <div className="flex gap-3 pt-6">
                                <Button size="lg"
                                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-black shadow-[0_0_20px_rgba(16,185,129,0.4)] rounded-xl h-12 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                        onClick={() => newVenueForm.id ? handleUpdate() : handleCreate()}>
                                    {newVenueForm.id ? 'Save Changes' : 'Create Venue'}
                                </Button>
                                <Button variant="ghost" size="lg"
                                        className="rounded-xl h-12 font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                                        onClick={() => {
                                            setShowNewVenue(false);
                                            setNewVenueForm({zoom: 16});
                                        }}>Cancel</Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card
                        className="shadow-2xl glass-panel border border-white/10 bg-black/40 backdrop-blur-3xl text-white rounded-[2rem] overflow-hidden">
                        <div className="p-3">
                            {loadingVenues ? (
                                <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                                    <div
                                        className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mb-4 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                                    <span className="font-medium tracking-wide">Loading venues...</span>
                                </div>
                            ) : venues.length === 0 ? (
                                <div className="p-12 text-center text-slate-500">
                                    <div
                                        className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                                        <MapPin className="w-8 h-8 text-slate-400"/>
                                    </div>
                                    <p className="font-medium">No venues found.</p>
                                    <p className="text-sm mt-1 text-slate-600">Create one to get started.</p>
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    {venues.map(v => (
                                        <div key={v.id}
                                             className="flex items-center justify-between p-4 rounded-[1.25rem] bg-white/5 hover:bg-white/10 transition-all duration-300 border border-transparent hover:border-emerald-500/30 group cursor-pointer shadow-sm relative overflow-hidden"
                                             onClick={() => setPasskeyModalVenue(v)}>
                                            <div
                                                className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/0 to-emerald-500/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500"/>
                                            <div className="flex-1 text-left relative z-10">
                                                <div
                                                    className="font-bold text-white group-hover:text-emerald-400 transition-colors text-lg tracking-tight">{v.name}</div>
                                                <div
                                                    className="flex items-center gap-2 text-xs font-medium text-slate-400 mt-1.5">
                                                    <span
                                                        className="bg-black/50 px-2 py-0.5 rounded text-slate-300 border border-white/10 uppercase tracking-wider text-[9px]">{v.key}</span>
                                                    <span className="opacity-50">•</span>
                                                    <span
                                                        className="font-mono opacity-80">{v.lat.toFixed(4)}, {v.lng.toFixed(4)}</span>
                                                </div>
                                            </div>
                                            <div
                                                className="relative z-10 flex items-center gap-1 opacity-100 transition-all">
                                                <Button variant="ghost" size="icon" onClick={(e) => {
                                                    e.stopPropagation();
                                                    setNewVenueForm(v);
                                                    setShowNewVenue(true);
                                                }}
                                                        className="w-10 h-10 rounded-full text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/20 transition-all">
                                                    <Pencil className="w-4 h-4"/>
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={(e) => {
                                                    e.stopPropagation();
                                                    setVenueToDelete(v.id);
                                                }}
                                                        className="w-10 h-10 rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/20 transition-all">
                                                    <Trash2 className="w-4 h-4"/>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-white/5 bg-black/40">
                            <Button variant="outline"
                                    className="w-full h-12 rounded-xl border-dashed border-2 border-white/20 hover:border-emerald-400/50 hover:bg-emerald-500/10 text-white bg-transparent font-bold tracking-wide transition-all group"
                                    onClick={() => {
                                        setNewVenueForm({zoom: 16});
                                        setShowNewVenue(true);
                                    }}>
                                <Plus
                                    className="w-5 h-5 mr-2 text-slate-400 group-hover:text-emerald-400 transition-colors"/> Create
                                New Venue
                            </Button>
                        </div>
                    </Card>
                )}

                <BaseModal
                    open={!!venueToDelete}
                    onOpenChange={(open: boolean) => !open && setVenueToDelete(null)}
                    title="Are you absolutely sure?"
                    description="This will permanently delete this venue and all its mapped nodes, edges, and sponsors. This action cannot be undone."
                    confirmText="Delete"
                    onConfirm={() => {
                        if (venueToDelete) onDeleteVenue(venueToDelete);
                        setVenueToDelete(null);
                    }}
                    onCancel={() => setVenueToDelete(null)}
                    confirmClassName="bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                />

                <BaseModal
                    open={!!passkeyModalVenue}
                    onOpenChange={(open: boolean) => !open && setPasskeyModalVenue(null)}
                    title="Venue Passkey"
                    description={`Please enter the passkey for ${passkeyModalVenue?.name} to continue.`}
                    confirmText={isVerifying ? 'Verifying...' : 'Enter'}
                    onConfirm={verifyAndEnter}
                    onCancel={() => setPasskeyModalVenue(null)}
                    confirmDisabled={isVerifying}
                >
                    <div className="py-2">
                        <Input
                            type="password"
                            placeholder="Enter passkey"
                            className="bg-black/60 border-white/10 text-white"
                            value={passkeyInput}
                            onChange={e => setPasskeyInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') verifyAndEnter();
                            }}
                        />
                    </div>
                </BaseModal>
            </div>
        </div>
    );
}
