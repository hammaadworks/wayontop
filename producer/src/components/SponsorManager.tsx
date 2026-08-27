import {useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Loader2, Megaphone, Pencil, Plus, Trash2, X} from 'lucide-react';
import {Button} from '@wayontop/ui/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@wayontop/ui/components/ui/card';
import {Input} from '@wayontop/ui/components/ui/input';
import {Label} from '@wayontop/ui/components/ui/label';
import {Checkbox} from '@wayontop/ui/components/ui/checkbox';
import {ScrollArea} from '@wayontop/ui/components/ui/scroll-area';
import {toast} from 'sonner';
import type {GraphData, Sponsor, SponsorZone} from '@wayontop/ui/lib/types';
import {supabase} from '@wayontop/ui/lib/supabase';

interface SponsorManagerProps {
    data: GraphData;
    setData: React.Dispatch<React.SetStateAction<GraphData>>;
    venueKey: string;
}

export function SponsorManager({data, setData, venueKey}: Readonly<SponsorManagerProps>) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'zones' | 'sponsors'>('zones');

    // Zone Form
    const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
    const [zoneForm, setZoneForm] = useState<Partial<SponsorZone>>({});
    const [showZoneForm, setShowZoneForm] = useState(false);

    // Sponsor Form
    const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);
    const [sponsorForm, setSponsorForm] = useState<Partial<Sponsor>>({});
    const [showSponsorForm, setShowSponsorForm] = useState(false);

    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingCreative, setUploadingCreative] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        type: 'zone' | 'sponsor';
        id: string;
        name: string
    } | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const creativeInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (file: File, type: 'logo' | 'creative') => {
        if (type === 'logo') {
            if (!file.type.startsWith('image/')) {
                toast.error('Logo must be an image file.');
                if (logoInputRef.current) logoInputRef.current.value = '';
                return;
            }
        } else {
            if (file.type !== 'video/mp4' && file.type !== 'video/quicktime') {
                toast.error('Creative must be an MP4 or MOV video.');
                if (creativeInputRef.current) creativeInputRef.current.value = '';
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                toast.error('Creative video size must be less than 10MB.');
                if (creativeInputRef.current) creativeInputRef.current.value = '';
                return;
            }
        }

        const setter = type === 'logo' ? setUploadingLogo : setUploadingCreative;
        setter(true);

        try {
            const ext = file.name.split('.').pop();
            const originalName = file.name.split('.').slice(0, -1).join('.');
            const baseName = sponsorForm.name || originalName || 'sponsor';
            const sponsorNameSafe = baseName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `${sponsorNameSafe}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
            const filePath = `${type}s/${fileName}`;

            const {error} = await supabase.storage
                .from('sponsors')
                .upload(filePath, file);

            if (error) throw error;

            const {data: publicUrlData} = supabase.storage
                .from('sponsors')
                .getPublicUrl(filePath);

            const url = publicUrlData.publicUrl;

            if (type === 'logo') setSponsorForm(s => ({...s, logo_asset: url}));
            else setSponsorForm(s => ({...s, creative_asset: url}));

            toast.success(`${type === 'logo' ? 'Logo' : 'Creative'} uploaded successfully!`);
        } catch (err: any) {
            console.error('Upload error:', err);
            toast.error(`Failed to upload ${type}: ${err.message}`);
            // Clear the input so the user doesn't think it succeeded
            if (type === 'logo' && logoInputRef.current) logoInputRef.current.value = '';
            if (type === 'creative' && creativeInputRef.current) creativeInputRef.current.value = '';
        } finally {
            setter(false);
        }
    };

    const saveZone = async () => {
        if (!zoneForm.poi_ids?.length || !zoneForm.name || zoneForm.radius_m === undefined || zoneForm.radius_m <= 0) {
            toast.error('Name, at least one Center Node, and a valid Radius are required.');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                id: editingZoneId || `sz_${Date.now()}`,
                venue_key: venueKey,
                name: zoneForm.name,
                poi_ids: zoneForm.poi_ids,
                radius_m: zoneForm.radius_m
            };

            const {error} = await supabase.from('sponsor_zones').upsert(payload);
            if (error) throw error;

            if (editingZoneId) {
                setData(prev => ({
                    ...prev,
                    sponsorZones: (prev.sponsorZones || []).map(z => z.id === editingZoneId ? {...z, ...zoneForm} as SponsorZone : z)
                }));
                toast.success('Zone updated successfully');
            } else {
                setData(prev => ({
                    ...prev,
                    sponsorZones: [...(prev.sponsorZones || []), payload as unknown as SponsorZone]
                }));
                toast.success('Zone created successfully');
            }
            setEditingZoneId(null);
            setZoneForm({});
            setShowZoneForm(false);
        } catch (err: any) {
            toast.error(err.message || 'Failed to save zone');
        } finally {
            setIsSaving(false);
        }
    };

    const deleteZone = (id: string, name: string) => {
        setDeleteConfirm({isOpen: true, type: 'zone', id, name});
    };

    const confirmDelete = async () => {
        if (!deleteConfirm) return;
        
        try {
            if (deleteConfirm.type === 'zone') {
                const {error} = await supabase.from('sponsor_zones').delete().eq('id', deleteConfirm.id);
                if (error) throw error;
                
                setData(prev => ({
                    ...prev,
                    sponsorZones: (prev.sponsorZones || []).filter(z => z.id !== deleteConfirm.id),
                    sponsors: (prev.sponsors || []).map(s => ({
                        ...s,
                        zone_ids: s.zone_ids?.filter(zid => zid !== deleteConfirm.id) || []
                    }))
                }));
                toast.success(`Zone deleted`);
            } else {
                const {error} = await supabase.from('sponsors').delete().eq('id', deleteConfirm.id);
                if (error) throw error;
                
                setData(prev => ({
                    ...prev,
                    sponsors: (prev.sponsors || []).filter(s => s.id !== deleteConfirm.id)
                }));
                toast.success(`Sponsor deleted`);
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete');
        } finally {
            setDeleteConfirm(null);
        }
    };

    const saveSponsor = async () => {
        if (!sponsorForm.name) {
            toast.error('Sponsor name is required.');
            return;
        }

        if (!sponsorForm.logo_asset) {
            toast.error('Sponsor logo is required.');
            return;
        }

        if (!sponsorForm.creative_asset && !sponsorForm.tagline) {
            toast.error('Sponsor content (creative or tagline) is required.');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                id: editingSponsorId || `sp_${Date.now()}`,
                venue_key: venueKey,
                name: sponsorForm.name,
                tagline: sponsorForm.tagline || null,
                cta_link: sponsorForm.cta_link || null,
                logo_asset: sponsorForm.logo_asset,
                creative_asset: sponsorForm.creative_asset || null,
                is_default_ad: sponsorForm.is_default_ad || false,
                zone_ids: sponsorForm.zone_ids || []
            };

            const {error} = await supabase.from('sponsors').upsert(payload);
            if (error) throw error;

            if (editingSponsorId) {
                setData(prev => ({
                    ...prev,
                    sponsors: (prev.sponsors || []).map(s => s.id === editingSponsorId ? {...s, ...sponsorForm} as Sponsor : s)
                }));
                toast.success('Sponsor updated successfully');
            } else {
                setData(prev => ({
                    ...prev,
                    sponsors: [...(prev.sponsors || []), payload as unknown as Sponsor]
                }));
                toast.success('Sponsor created successfully');
            }
            setEditingSponsorId(null);
            setSponsorForm({});
            setShowSponsorForm(false);
        } catch (err: any) {
            toast.error(err.message || 'Failed to save sponsor');
        } finally {
            setIsSaving(false);
        }
    };

    const deleteSponsor = (id: string, name: string) => {
        setDeleteConfirm({isOpen: true, type: 'sponsor', id, name});
    };

    const sponsorZones = data.sponsorZones || [];
    const sponsors = data.sponsors || [];

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
                        className="pt-4 sm:pt-6 border-b border-white/10 sticky top-0 bg-black/95 backdrop-blur-3xl z-10">
                        <div className="px-4 sm:px-6 pb-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                    <Megaphone className="w-5 h-5 text-emerald-400"/> Sponsors & Zones
                                </h2>
                                <p className="text-sm text-slate-400 mt-1">Manage geofenced sponsor zones and map
                                    sponsors to them.</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}
                                    className="rounded-full hover:bg-white/10">
                                <X className="w-6 h-6"/>
                            </Button>
                        </div>
                        <div className="flex gap-6 px-4 sm:px-6">
                            <button
                                onClick={() => setActiveTab('zones')}
                                className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'zones' ? 'border-emerald-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>
                                Sponsor Zones
                            </button>
                            <button
                                onClick={() => setActiveTab('sponsors')}
                                className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'sponsors' ? 'border-emerald-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>
                                Sponsors & Default Ads
                            </button>
                        </div>
                    </div>
                    <div className="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto w-full">
                        {activeTab === 'zones' ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-slate-300">Active Zones
                                        ({sponsorZones.length})</h3>
                                    <Button size="sm"
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-md border-0"
                                            onClick={() => {
                                                setEditingZoneId(null);
                                                setZoneForm({});
                                                setShowZoneForm(true);
                                            }}>
                                        <Plus className="w-4 h-4 mr-1"/> Create Zone
                                    </Button>
                                </div>

                                {showZoneForm && (
                                    <Card className="bg-black/60 border-emerald-500/30 shadow-inner">
                                        <CardHeader className="pb-3">
                                            <CardTitle
                                                className="text-base text-white">{editingZoneId ? 'Edit Zone' : 'New Sponsor Zone'}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Zone Name (Internal)</Label>
                                                <Input className="bg-black/50 border-white/20 text-white"
                                                       value={zoneForm.name || ''}
                                                       onChange={e => setZoneForm(s => ({
                                                           ...s,
                                                           name: e.target.value
                                                       }))}/>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Center Nodes (Select multiple)</Label>
                                                <ScrollArea
                                                    className="h-40 bg-black/50 border border-white/10 rounded-md p-2">
                                                    <div className="space-y-2">
                                                        {(() => {
                                                            const assignedNodeIds = new Set(
                                                                (data.sponsorZones || [])
                                                                    .filter(z => z.id !== editingZoneId)
                                                                    .flatMap(z => z.poi_ids || [])
                                                            );
                                                            const availableNodes = data.nodes.filter(n => {
                                                                const isTrack = n.category?.base_type === 'intersection';
                                                                const hasName = n.name && typeof n.name === 'object' && Object.values(n.name).some(v => v.trim() !== '');
                                                                return !isTrack || (isTrack && hasName);
                                                            });
                                                            const unassignedNodes = availableNodes.filter(n => !assignedNodeIds.has(n.id));
                                                            const assignedNodes = availableNodes.filter(n => assignedNodeIds.has(n.id));

                                                            return [...unassignedNodes, ...assignedNodes].map(n => {
                                                                const isAssigned = assignedNodeIds.has(n.id);
                                                                const fallbackName = n.name && typeof n.name === 'object' ? Object.values(n.name).find(v => v) : undefined;
                                                                return (
                                                                    <label key={n.id}
                                                                           className={`flex items-center gap-2 py-1 rounded px-2 ${isAssigned ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/5'}`}>
                                                                        <Checkbox
                                                                            checked={zoneForm.poi_ids?.includes(n.id) || false}
                                                                            disabled={isAssigned}
                                                                            onCheckedChange={(checked) => {
                                                                                if (isAssigned) return;
                                                                                setZoneForm(s => {
                                                                                    const current = s.poi_ids || [];
                                                                                    return {
                                                                                        ...s,
                                                                                        poi_ids: checked ? [...current, n.id] : current.filter(id => id !== n.id)
                                                                                    };
                                                                                });
                                                                            }}
                                                                            className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                                                        />
                                                                        <span className="text-sm text-slate-300">
                                                                            {fallbackName || 'Unnamed Node'} {isAssigned &&
                                                                            <span
                                                                                className="text-[10px] text-slate-500 ml-1">(Assigned)</span>}
                                                                        </span>
                                                                    </label>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Radius (meters)</Label>
                                                <Input type="number" value={zoneForm.radius_m || ''}
                                                       onChange={e => setZoneForm(s => ({
                                                           ...s,
                                                           radius_m: Number(e.target.value)
                                                       }))}
                                                       className="bg-black/50 border-white/20 text-white"/>
                                            </div>

                                            <div className="flex gap-2 pt-2">
                                                <Button onClick={saveZone} disabled={isSaving}
                                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                                                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Save Zone
                                                </Button>
                                                <Button variant="outline"
                                                        className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                                                        onClick={() => {
                                                            setEditingZoneId(null);
                                                            setZoneForm({});
                                                            setShowZoneForm(false);
                                                        }}>Cancel</Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                <div className="space-y-3">
                                    {sponsorZones.map(zone => {
                                        const mappedSponsors = sponsors.filter(s => s.zone_ids?.includes(zone.id));
                                        const nodeNames = (zone.poi_ids || []).map(id => data.nodes.find(n => n.id === id)?.name || 'Unknown Node');
                                        return (
                                            <div key={zone.id}
                                                 className="bg-black/40 border border-slate-500/30 rounded-xl p-3 flex flex-col gap-2">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1 pr-2">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="font-bold text-emerald-400">{zone.name}</p>
                                                            {mappedSponsors.length > 0 ? (
                                                                <span
                                                                    className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                                                                    {mappedSponsors.length} Allocated
                                                                </span>
                                                            ) : (
                                                                <span
                                                                    className="px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-500/20 text-slate-400 border border-slate-500/30 uppercase tracking-wider">
                                                                    Open
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-400">Radius: {zone.radius_m}m
                                                            around {nodeNames.join(', ')}</p>
                                                        {mappedSponsors.length > 0 && (
                                                            <div
                                                                className="text-xs text-emerald-300 mt-2 flex flex-col gap-1">
                                                                <span
                                                                    className="text-[10px] uppercase text-emerald-500/70 font-bold tracking-wider">Sponsors</span>
                                                                {mappedSponsors.map(sp => (
                                                                    <p key={sp.id}
                                                                       className="flex items-center gap-1">↳ {sp.name}</p>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1 shrink-0">
                                                        <Button variant="ghost" size="icon" onClick={() => {
                                                            setEditingZoneId(zone.id);
                                                            setZoneForm({
                                                                ...zone,
                                                                poi_ids: zone.poi_ids || (zone.poi_id ? [zone.poi_id] : [])
                                                            });
                                                            setShowZoneForm(true);
                                                        }}>
                                                            <Pencil className="w-4 h-4 text-slate-300"/>
                                                        </Button>
                                                        <Button variant="ghost" size="icon"
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-500/20"
                                                                onClick={() => deleteZone(zone.id, zone.name)}>
                                                            <Trash2 className="w-4 h-4"/>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {sponsorZones.length === 0 && !showZoneForm && (
                                        <div className="text-center py-8 text-slate-500 text-sm">
                                            No sponsor zones defined yet.
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-slate-300">Sponsors & Ads
                                        ({sponsors.length})</h3>
                                    <Button size="sm"
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-md border-0"
                                            onClick={() => {
                                                setEditingSponsorId(null);
                                                setSponsorForm({});
                                                setShowSponsorForm(true);
                                            }}>
                                        <Plus className="w-4 h-4 mr-1"/> Create Sponsor
                                    </Button>
                                </div>

                                {showSponsorForm && (
                                    <Card className="bg-black/60 border-emerald-500/30 shadow-inner mb-6">
                                        <CardHeader className="pb-3">
                                            <CardTitle
                                                className="text-base text-white">{editingSponsorId ? 'Edit Sponsor' : 'New Sponsor / Ad'}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Sponsor/Brand Name</Label>
                                                <Input className="bg-black/50 border-white/20 text-white"
                                                       value={sponsorForm.name || ''}
                                                       onChange={e => setSponsorForm(s => ({
                                                           ...s,
                                                           name: e.target.value
                                                       }))}/>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Tagline / Message</Label>
                                                <Input value={sponsorForm.tagline || ''}
                                                       onChange={e => setSponsorForm(s => ({
                                                           ...s,
                                                           tagline: e.target.value
                                                       }))}
                                                       className="bg-black/50 border-white/20 text-white"/>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">CTA Link (URL)</Label>
                                                <Input type="url" placeholder="https://..."
                                                       value={sponsorForm.cta_link || ''}
                                                       onChange={e => setSponsorForm(s => ({
                                                           ...s,
                                                           cta_link: e.target.value
                                                       }))}
                                                       className="bg-black/50 border-white/20 text-white"/>
                                                <p className="text-[10px] text-slate-400">Customers will be routed here.
                                                    Clicks are logged to analytics.</p>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <input type="checkbox" id="is_default_ad"
                                                       checked={sponsorForm.is_default_ad || false}
                                                       onChange={e => setSponsorForm(s => ({
                                                           ...s,
                                                           is_default_ad: e.target.checked
                                                       }))}
                                                       className="rounded bg-black/50 border-white/20 text-emerald-500 focus:ring-emerald-500"/>
                                                <Label htmlFor="is_default_ad" className="text-slate-300">This is a
                                                    Default Ad (fallback for open zones)</Label>
                                            </div>

                                            <div className="space-y-2 pt-2">
                                                <Label className="text-slate-300">Logo Asset (1:1 Image)</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input type="file" accept="image/*" ref={logoInputRef}
                                                           onChange={e => {
                                                               const file = e.target.files?.[0];
                                                               if (file) handleFileUpload(file, 'logo');
                                                           }} className="bg-black/50 border-white/20 text-white flex-1"
                                                           disabled={uploadingLogo}/>
                                                    {uploadingLogo &&
                                                        <Loader2 className="w-5 h-5 animate-spin text-emerald-400"/>}
                                                </div>
                                                {sponsorForm.logo_asset &&
                                                    <p className="text-xs text-emerald-400 truncate mt-1">Uploaded: <a
                                                        href={sponsorForm.logo_asset} target="_blank" rel="noreferrer"
                                                        className="underline hover:text-emerald-300">{sponsorForm.logo_asset}</a>
                                                    </p>}
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Creative Asset
                                                    (MP4/MOV, &lt; 10MB)</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input type="file" accept="video/mp4,video/quicktime"
                                                           ref={creativeInputRef} onChange={e => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleFileUpload(file, 'creative');
                                                    }} className="bg-black/50 border-white/20 text-white flex-1"
                                                           disabled={uploadingCreative}/>
                                                    {uploadingCreative &&
                                                        <Loader2 className="w-5 h-5 animate-spin text-emerald-400"/>}
                                                </div>
                                                {sponsorForm.creative_asset &&
                                                    <p className="text-xs text-emerald-400 truncate mt-1">Uploaded: <a
                                                        href={sponsorForm.creative_asset} target="_blank"
                                                        rel="noreferrer"
                                                        className="underline hover:text-emerald-300">{sponsorForm.creative_asset}</a>
                                                    </p>}
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Map to Zones (Select multiple)</Label>
                                                <ScrollArea className="h-40 bg-black/50 border border-white/10 rounded-md p-2">
                                                    <div className="space-y-2">
                                                        {sponsorZones.map(zone => (
                                                            <label key={zone.id} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-white/5 rounded px-2">
                                                                <Checkbox
                                                                    checked={sponsorForm.zone_ids?.includes(zone.id) || false}
                                                                    onCheckedChange={(checked) => {
                                                                        setSponsorForm(s => {
                                                                            const current = s.zone_ids || [];
                                                                            return {
                                                                                ...s,
                                                                                zone_ids: checked ? [...current, zone.id] : current.filter(id => id !== zone.id)
                                                                            };
                                                                        });
                                                                    }}
                                                                    className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                                                />
                                                                <span className="text-sm text-slate-300">
                                                                    {zone.name}
                                                                </span>
                                                            </label>
                                                        ))}
                                                        {sponsorZones.length === 0 && (
                                                            <p className="text-xs text-slate-500 italic p-2">No zones created yet.</p>
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                <Button onClick={saveSponsor} disabled={isSaving}
                                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                                                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} Save Sponsor
                                                </Button>
                                                <Button variant="outline"
                                                        className="border-red-500/50 text-red-500 hover:bg-red-500/10"
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
                                    {sponsors.map(sp => (
                                        <div key={sp.id}
                                             className="bg-black/40 border border-slate-500/30 rounded-xl p-3 flex flex-col gap-2">
                                            <div className="flex justify-between items-start">
                                                <div className="flex gap-3">
                                                    {sp.logo_asset && (
                                                        <div
                                                            className="w-10 h-10 rounded-full overflow-hidden border border-white/20 shrink-0">
                                                            <img src={sp.logo_asset}
                                                                 className="w-full h-full object-cover" alt="Logo"/>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-amber-400 flex items-center gap-2">
                                                            {sp.name}
                                                            {sp.is_default_ad && <span
                                                                className="text-[9px] bg-slate-700 text-white px-1.5 py-0.5 rounded uppercase tracking-wider">Default Ad</span>}
                                                        </p>
                                                        {sp.tagline &&
                                                            <p className="text-xs text-slate-300 opacity-90 mt-0.5">"{sp.tagline}"</p>}
                                                        {sp.cta_link &&
                                                            <p className="text-[10px] text-blue-400 mt-1 truncate max-w-[200px]">{sp.cta_link}</p>}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 shrink-0">
                                                    <Button variant="ghost" size="icon" onClick={() => {
                                                        setEditingSponsorId(sp.id);
                                                        setSponsorForm(sp);
                                                        setShowSponsorForm(true);
                                                    }}>
                                                        <Pencil className="w-4 h-4 text-slate-300"/>
                                                    </Button>
                                                    <Button variant="ghost" size="icon"
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-500/20"
                                                            onClick={() => deleteSponsor(sp.id, sp.name)}>
                                                        <Trash2 className="w-4 h-4"/>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {sponsors.length === 0 && !showSponsorForm && (
                                        <div className="text-center py-8 text-slate-500 text-sm">
                                            No sponsors or default ads created yet.
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
                , document.body)}

            {deleteConfirm && createPortal(
                <div
                    className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4">
                    <Card className="w-full max-w-sm bg-[#1C1C1E] border-white/10 shadow-2xl">
                        <CardHeader>
                            <CardTitle
                                className="text-white">Delete {deleteConfirm.type === 'zone' ? 'Zone' : 'Sponsor'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-300 text-sm mb-6">
                                Are you sure you want to delete <span
                                className="font-bold text-white">"{deleteConfirm.name}"</span>? This action cannot be
                                undone.
                            </p>
                            <div className="flex gap-3">
                                <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                        onClick={confirmDelete}>
                                    Yes, Delete
                                </Button>
                                <Button className="flex-1 bg-white/10 hover:bg-white/20 text-white border-0"
                                        onClick={() => setDeleteConfirm(null)}>
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>,
                document.body
            )}
        </>
    );
}
