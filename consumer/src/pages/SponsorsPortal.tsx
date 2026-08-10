import { useState } from 'react';
import { Navigation, Play, CheckCircle2, MapPin, Target, LineChart, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@wayontop/ui/components/ui/button';
import { Card } from '@wayontop/ui/components/ui/card';
import { ReportModal } from '../components/ReportModal';

export default function SponsorsPortal() {
  const [showContactModal, setShowContactModal] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500/30 font-sans overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-black fill-black" />
            </div>
            <span className="font-bold text-xl tracking-tight">WayOnTop <span className="text-emerald-400">For Brands</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => setShowContactModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full px-6 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section with Video Background */}
      <section className="relative pt-32 pb-32 px-6 flex items-center justify-center min-h-[90vh]">
        {/* Placeholder for Video Background */}
        <div className="absolute inset-0 w-full h-full overflow-hidden -z-20">
          <div className="absolute inset-0 bg-black/60 z-10" />
          <img 
            src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=2070&auto=format&fit=crop" 
            alt="Crowd at event" 
            className="w-full h-full object-cover opacity-50"
          />
        </div>
        
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/30 via-black/80 to-black -z-10" />
        
        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-700">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400 tracking-wide uppercase">The Future of Out-Of-Home Advertising</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[1.05] animate-in slide-in-from-bottom-8 duration-700 delay-100">
            Own the Map.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
              Capture the Footfall.
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/70 max-w-3xl mx-auto leading-relaxed animate-in slide-in-from-bottom-8 duration-700 delay-200">
            Traditional billboards are dead. Turn high-traffic zones in Lalbagh Botanical Garden into interactive AR storefronts. Track every impression, engagement, and walk-in.
          </p>
          
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4 animate-in slide-in-from-bottom-8 duration-700 delay-300">
            <Button 
              onClick={() => setShowContactModal(true)}
              className="h-14 px-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg w-full sm:w-auto shadow-[0_0_40px_rgba(16,185,129,0.4)]"
            >
              Secure Your Zone <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              variant="outline"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="h-14 px-8 rounded-full bg-white/5 hover:bg-white/10 text-white border-white/10 font-bold text-lg w-full sm:w-auto backdrop-blur-md"
            >
              See How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* The Problem / Solution Section */}
      <section className="py-32 px-6 border-t border-white/5 bg-black relative overflow-hidden">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full -z-10" />
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
              Physical Ads.<br/>
              <span className="text-white/40">Digital Accountability.</span>
            </h2>
            <p className="text-xl text-white/60 leading-relaxed">
              Stop guessing if your OOH marketing works. WayOnTop bridges the physical-digital divide by placing your brand in our AR navigation layer. When users navigate the park, they see, interact with, and walk to your zone.
            </p>
            <ul className="space-y-6">
              {[
                { icon: Target, title: 'Hyper-Local Targeting', desc: 'Reach users exactly when they are 50 meters away from your activation.' },
                { icon: LineChart, title: '100% Trackable ROI', desc: 'Track impressions, click-through rates, and physical walk-ins in real-time.' },
                { icon: MapPin, title: 'Premium Real Estate', desc: 'Claim exclusive zones like the Glass House or Main Gate Hub.' }
              ].map((item, i) => (
                <li key={i} className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">{item.title}</h4>
                    <p className="text-white/60 leading-relaxed">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Media Placeholder: Video/Image of AR interaction */}
          <div className="relative rounded-[2.5rem] border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-2xl overflow-hidden aspect-[4/5] lg:aspect-square flex flex-col justify-center items-center group">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1616423640778-28d1b53229bd?q=80&w=1974&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            <div className="relative z-10 text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 rounded-full flex items-center justify-center animate-pulse">
                <Play className="w-8 h-8 text-emerald-400 ml-1" />
              </div>
              <p className="font-bold text-lg tracking-widest uppercase text-emerald-400 drop-shadow-md">Play Demo Video</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (The Core Offer) */}
      <section id="pricing" className="py-32 px-6 border-t border-white/5 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 to-black -z-10" />
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-6xl font-black">Secure Your Zone</h2>
            <p className="text-xl text-emerald-400 font-bold uppercase tracking-widest">Season: Aug 2026 - Dec 2026 (5 Months)</p>
            <p className="text-white/60 max-w-2xl mx-auto">Lock in your premium real estate in Lalbagh Botanical Garden before the festive season rush.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Shared Zone */}
            <Card className="bg-black/50 border-white/10 rounded-[2rem] p-8 md:p-12 backdrop-blur-xl flex flex-col transition-all hover:border-white/20">
              <div className="mb-8">
                <span className="px-4 py-1.5 rounded-full bg-white/10 text-white/70 text-sm font-bold tracking-wide uppercase mb-6 inline-block">Shared Zone</span>
                <div className="flex items-baseline gap-2 text-white">
                  <span className="text-5xl font-black">₹5,000</span>
                  <span className="text-white/50 font-medium">/ 5 months</span>
                </div>
                <p className="text-white/50 mt-4 leading-relaxed">Perfect for local businesses wanting high-visibility at a fraction of the cost.</p>
              </div>
              
              <ul className="space-y-4 mb-10 flex-1">
                {[
                  'Shared with up to 3 non-competing brands',
                  'Rotating AR billboard',
                  'Basic footfall analytics',
                  '1 tap-to-action link',
                  'Live Aug - Dec 2026'
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-white/80">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                onClick={() => setShowContactModal(true)}
                className="w-full h-14 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-lg"
              >
                Request Shared Zone
              </Button>
            </Card>

            {/* Dedicated Zone */}
            <Card className="bg-gradient-to-b from-emerald-900/40 to-black/50 border-emerald-500/30 rounded-[2rem] p-8 md:p-12 backdrop-blur-xl flex flex-col relative overflow-hidden transition-all hover:border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.1)] hover:shadow-[0_0_60px_rgba(16,185,129,0.2)]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-[50px] -z-10" />
              
              <div className="mb-8">
                <span className="px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm font-bold tracking-wide uppercase mb-6 inline-block">Dedicated Zone (Premium)</span>
                <div className="flex items-baseline gap-2 text-white">
                  <span className="text-5xl font-black">₹10,000</span>
                  <span className="text-emerald-400/70 font-medium">/ 5 months</span>
                </div>
                <p className="text-white/70 mt-4 leading-relaxed">Absolute exclusivity. Dominate a major hub like the Glass House and own 100% of the attention.</p>
              </div>
              
              <ul className="space-y-4 mb-10 flex-1">
                {[
                  '100% Exclusivity in your 50m radius',
                  'Custom 3D AR Assets & Branding',
                  'Advanced Real-time Analytics Dashboard',
                  'Gamified "Stamp" integration to drive footfall',
                  'Priority placement in search',
                  'Live Aug - Dec 2026'
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-white">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                onClick={() => setShowContactModal(true)}
                className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-bold text-lg shadow-lg"
              >
                Claim Dedicated Zone
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Media / Visual Evidence Section */}
      <section className="py-24 px-6 border-t border-white/5 bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">See It In Action</h2>
            <p className="text-white/50 text-lg">Watch how users interact with sponsor zones in real-time.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((item) => (
              <div key={item} className="relative aspect-[9/16] rounded-3xl overflow-hidden bg-white/5 border border-white/10 group cursor-pointer">
                {/* Placeholders for Vertical Videos */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white group-hover:bg-emerald-500 group-hover:text-black group-hover:border-emerald-400 transition-all">
                    <Play className="w-6 h-6 ml-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-emerald-950/40 -z-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/20 blur-[150px] rounded-full pointer-events-none" />
        
        <div className="max-w-3xl mx-auto text-center space-y-8 relative z-10">
          <h2 className="text-5xl md:text-7xl font-black tracking-tight">Ready to map your brand?</h2>
          <p className="text-xl text-white/70">
            Inventory is strictly limited to maintain user experience. Secure your zone for the Aug-Dec 2026 season today.
          </p>
          <div className="pt-4">
            <Button 
              onClick={() => setShowContactModal(true)}
              className="h-16 px-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xl shadow-[0_0_50px_rgba(16,185,129,0.5)] hover:scale-105 transition-transform"
            >
              Let's Talk Numbers
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 bg-black">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Navigation className="w-6 h-6 text-emerald-500 fill-emerald-500" />
            <span className="font-bold text-xl tracking-tight">wayon.top</span>
          </div>
          <div className="text-sm text-white/40 font-medium">
            © 2026 WayOnTop. All rights reserved. Lalbagh Botanical Garden.
          </div>
        </div>
      </footer>

      {/* Reused Report Modal but configured for Sales/Sponsors */}
      {showContactModal && (
        <ReportModal 
          onClose={() => setShowContactModal(false)} 
          defaultIssueType="sponsor"
          fixedIssueType={true}
        />
      )}
    </div>
  );
}
