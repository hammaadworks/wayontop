import {useState} from 'react';
import {Camera, Trash2, X, ChevronRight, ChevronLeft, MapPin} from 'lucide-react';
import {Button} from '@wayontop/ui/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@wayontop/ui/components/ui/card';
import {Input} from '@wayontop/ui/components/ui/input';
import {Switch} from '@wayontop/ui/components/ui/switch';
import {BaseModal} from '@wayontop/ui/components/BaseModal';
import {toast} from 'sonner';
import {supabase} from '@wayontop/ui/lib/supabase';
import type {GraphNode, NodeCategory, LocalizedText} from '@wayontop/ui/lib/types';
import * as LucideIcons from 'lucide-react';

interface NodeWizardProps {
    node: GraphNode;
    updateNode: (id: number, updates: Partial<GraphNode>) => void;
    deleteNode: (id: number) => void;
    setTestingStamp: (node: GraphNode) => void;
    availableTags?: string[];
    categories: NodeCategory[];
    onClose: () => void;
}

export function NodeWizard({
    node,
    updateNode,
    deleteNode,
    setTestingStamp,
    availableTags = [],
    categories,
    onClose
}: Readonly<NodeWizardProps>) {
    const [step, setStep] = useState(1);
    const [lang, setLang] = useState<'en' | 'kn' | 'es'>('en');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [tagInput, setTagInput] = useState('');

    const safeName = node.name || {en: '', kn: '', es: ''};

    return (
        <Card className="shadow-2xl glass-panel border-white/20 bg-[#09090b]/90 backdrop-blur-3xl text-white flex flex-col rounded-2xl overflow-hidden w-full max-w-sm">
            <CardHeader className="py-2 px-3 flex flex-row items-center justify-between border-b border-white/10 shrink-0 bg-white/5">
                <CardTitle className="text-xs font-bold flex items-center text-white drop-shadow-md tracking-tight">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-emerald-400"/> Edit Node - Step {step}/3
                </CardTitle>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setIsDeleteDialogOpen(true)} className="h-6 w-6 text-red-500 hover:bg-red-500/20">
                        <Trash2 className="w-3.5 h-3.5"/>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 text-slate-400 hover:bg-white/10 hover:text-white">
                        <X className="w-3.5 h-3.5"/>
                    </Button>
                    <BaseModal
                        open={isDeleteDialogOpen}
                        onOpenChange={setIsDeleteDialogOpen}
                        title="Delete Node"
                        description={<>Are you sure you want to delete this node? This action cannot be undone.</>}
                        onConfirm={() => {
                            deleteNode(node.id);
                            setIsDeleteDialogOpen(false);
                            onClose();
                        }}
                        onCancel={() => setIsDeleteDialogOpen(false)}
                        confirmText="Delete"
                        cancelText="Cancel"
                        confirmClassName="bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                    />
                </div>
            </CardHeader>

            <CardContent className="p-3 flex-1 flex flex-col gap-2 justify-center relative min-h-[220px]">
                {step === 1 && (
                    <div className="flex flex-col gap-2 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="flex bg-black/40 rounded-md p-1 border border-white/10 w-fit">
                            {(['en', 'kn', 'es'] as const).map(l => (
                                <button key={l} onClick={() => setLang(l)} className={`px-3 py-0.5 text-[10px] font-bold rounded-sm uppercase ${lang === l ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}>
                                    {l}
                                </button>
                            ))}
                        </div>
                        <Input 
                            value={safeName[lang] || ''}
                            onChange={e => updateNode(node.id, {name: {...safeName, [lang]: e.target.value}})}
                            placeholder={`Node Name (${lang.toUpperCase()})...`}
                            className="h-8 text-xs font-bold bg-black/60 border-white/10 text-white focus:border-emerald-500/50 shadow-inner px-2.5"
                        />
                        
                        <div className="flex flex-col gap-1 mt-1">
                            <span className="text-[10px] font-bold text-slate-300 uppercase">Category</span>
                            <div className="relative">
                                <select
                                    value={node.category_id || 0}
                                    onChange={e => {
                                        const catId = parseInt(e.target.value);
                                        const cat = categories.find(c => c.id === catId);
                                        if (cat) {
                                            updateNode(node.id, {category_id: catId, category: cat});
                                        }
                                    }}
                                    className="w-full h-8 rounded-md border border-white/10 bg-black/60 px-2.5 text-xs font-bold text-emerald-400 appearance-none focus:outline-none focus:border-emerald-500/50"
                                >
                                    <option value="0" disabled>Select a Category...</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name?.en || c.code} ({c.base_type})
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronRight className="w-4 h-4 rotate-90"/>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-black/40 border border-white/10 h-8 rounded-md px-2.5 mt-1">
                            <span className="text-[10px] font-bold text-slate-300">CONTAINS STAMP?</span>
                            <Switch className="scale-[0.7] origin-right" checked={!!node.has_stamp} onCheckedChange={(c) => updateNode(node.id, {has_stamp: c})}/>
                        </div>

                        <div className="flex items-center justify-between bg-black/40 border border-white/10 h-8 rounded-md px-2.5">
                            <span className="text-[10px] font-bold text-slate-300">PAID ACCESS?</span>
                            <Switch className="scale-[0.7] origin-right" checked={!!node.is_paid} onCheckedChange={(c) => updateNode(node.id, {is_paid: c})}/>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="flex flex-col gap-2 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-300">PROMO IMAGE</span>
                            {node.image_url ? (
                                <div className="relative group rounded-md overflow-hidden border border-white/10 h-24">
                                    <img src={node.image_url} alt="Promo" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button variant="destructive" size="sm" className="h-6 text-[10px] font-bold" onClick={() => updateNode(node.id, {image_url: undefined})}>
                                            <Trash2 className="w-3 h-3 mr-1"/> Remove
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={node.image_url || ''}
                                        onChange={e => updateNode(node.id, {image_url: e.target.value})}
                                        placeholder="Image URL..."
                                        className="h-8 text-xs flex-1 bg-black/60 border-white/10 text-white focus:border-emerald-500/50"
                                    />
                                    <label className="shrink-0 h-8 px-3 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold rounded-md flex items-center justify-center cursor-pointer transition-colors border border-white/10">
                                        <span>UPLOAD</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            toast.loading('Uploading...', { id: 'img-upload' });
                                            try {
                                                const ext = file.name.split('.').pop();
                                                const fileName = `node_${node.id}_${Date.now()}.${ext}`;
                                                const { error } = await supabase.storage.from('assets').upload(fileName, file);
                                                if (error) throw error;
                                                const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(fileName);
                                                updateNode(node.id, { image_url: publicUrl });
                                                toast.success('Uploaded successfully', { id: 'img-upload' });
                                            } catch (err: any) {
                                                toast.error('Upload failed: ' + err.message, { id: 'img-upload' });
                                            }
                                        }}/>
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-300">EXTRA INFO</span>
                            <textarea
                                value={typeof node.extra_info === 'string' ? node.extra_info : (node.extra_info?.en || '')}
                                onChange={e => {
                                    // Storing as JSONB for consistency with 'name', defaulting to EN for now
                                    const current = typeof node.extra_info === 'object' && node.extra_info !== null ? node.extra_info : {en: '', kn: '', es: ''};
                                    updateNode(node.id, {extra_info: {...current, en: e.target.value}});
                                }}
                                placeholder="Details for promo card..."
                                className="text-xs bg-black/60 border border-white/10 text-white focus:border-emerald-500/50 rounded-md p-2 h-16 resize-none shadow-inner"
                            />
                        </div>

                        <div className="flex gap-2">
                            <div className="flex-1 flex flex-col bg-black/40 border border-white/10 rounded-md p-1.5">
                                <span className="text-[9px] font-bold text-slate-400">ACTIVE FROM</span>
                                <Input type="date" value={node.active_from ? node.active_from.split('T')[0] : ''} onChange={e => updateNode(node.id, {active_from: e.target.value ? new Date(e.target.value).toISOString() : undefined})} className="h-6 text-[10px] font-bold bg-transparent border-0 p-0 text-white [&::-webkit-calendar-picker-indicator]:invert" />
                            </div>
                            <div className="flex-1 flex flex-col bg-black/40 border border-white/10 rounded-md p-1.5">
                                <span className="text-[9px] font-bold text-slate-400">ACTIVE TO</span>
                                <Input type="date" value={node.active_to ? node.active_to.split('T')[0] : ''} onChange={e => updateNode(node.id, {active_to: e.target.value ? new Date(e.target.value).toISOString() : undefined})} className="h-6 text-[10px] font-bold bg-transparent border-0 p-0 text-white [&::-webkit-calendar-picker-indicator]:invert" />
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="flex flex-col gap-2 animate-in slide-in-from-right-4 fade-in duration-300 flex-1">
                        <span className="text-[10px] font-bold text-slate-300">TAGS</span>
                        <div className="flex flex-wrap gap-1.5 min-h-6">
                            {(node.tags || []).map((t: string) => (
                                <div key={t} className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 text-[10px] font-bold">
                                    {t}
                                    <button className="hover:text-white" onClick={() => updateNode(node.id, {tags: (node.tags || []).filter(tag => tag !== t)})}>
                                        <X className="w-3 h-3"/>
                                    </button>
                                </div>
                            ))}
                            {(!node.tags || node.tags.length === 0) && (
                                <span className="text-xs text-slate-500 italic">No tags added</span>
                            )}
                        </div>
                        
                        <div className="flex flex-col gap-1 mt-auto pb-2">
                            <Input
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                placeholder="Type tag and press Enter..."
                                className="h-8 text-xs font-bold bg-black/60 border-white/10 text-white focus:border-emerald-500/50 shadow-inner px-2.5"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const newTag = tagInput.trim().toLowerCase();
                                        if (newTag) {
                                            const currentTags = node.tags || [];
                                            if (!currentTags.includes(newTag)) {
                                                updateNode(node.id, {tags: [...currentTags, newTag]});
                                            }
                                            setTagInput('');
                                        }
                                    }
                                }}
                            />
                            {availableTags && availableTags.length > 0 && (
                                <div className="flex w-full overflow-x-auto gap-1.5 pb-1 mt-1 snap-x touch-pan-x [&::-webkit-scrollbar]:hidden">
                                    {availableTags
                                        .filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !(node.tags || []).includes(t))
                                        .map(t => (
                                            <button key={t} onClick={() => {
                                                    updateNode(node.id, {tags: [...(node.tags || []), t]});
                                                    setTagInput('');
                                                }}
                                                className="snap-start shrink-0 bg-white/5 hover:bg-white/10 text-slate-300 px-2.5 py-1 rounded-full text-[10px] font-bold border border-white/10 transition-colors">
                                                + {t}
                                            </button>
                                        ))}
                                </div>
                            )}
                        </div>

                        {(node.has_stamp || node.category?.base_type === 'stamp') && (
                            <Button className="w-full bg-linear-to-r from-pink-500 to-emerald-500 text-white text-[11px] font-black tracking-widest h-8 border-0 shadow-[0_0_10px_rgba(16,185,129,0.3)] rounded-md mt-2" onClick={() => setTestingStamp(node)}>
                                <Camera className="w-3.5 h-3.5 mr-1.5"/> TEST AR DROP
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
            
            <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-t border-white/10">
                <Button variant="ghost" size="sm" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="h-7 px-2 text-xs text-slate-300 hover:text-white">
                    <ChevronLeft className="w-3 h-3 mr-1"/> Back
                </Button>
                <div className="flex gap-1">
                    {[1,2,3].map(s => (
                        <div key={s} className={`w-1.5 h-1.5 rounded-full ${s === step ? 'bg-emerald-400' : 'bg-white/20'}`} />
                    ))}
                </div>
                {step < 3 ? (
                    <Button variant="ghost" size="sm" onClick={() => setStep(s => Math.min(3, s + 1))} className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30">
                        Next <ChevronRight className="w-3 h-3 ml-1"/>
                    </Button>
                ) : (
                    <Button size="sm" onClick={onClose} className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
                        Apply & Close
                    </Button>
                )}
            </div>
        </Card>
    );
}
