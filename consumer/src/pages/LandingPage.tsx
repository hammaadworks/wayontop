import { ArrowRight, MapPin, Sparkles, Navigation, LineChart, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@wayontop/ui/components/ui/button';
import { Card } from '@wayontop/ui/components/ui/card';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500/30 font-sans overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-black fill-black" />
            </div>
            <span className="font-bold text-xl tracking-tight">WayOnTop</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
            <a href="#venues" className="hover:text-emerald-400 transition-colors">Venues</a>
            <a href="#about" className="hover:text-emerald-400 transition-colors">About</a>
            <a href="#sponsors" className="hover:text-emerald-400 transition-colors">For Sponsors</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/sponsors">
              <Button variant="ghost" className="text-white hover:text-emerald-400 hover:bg-white/5">
                Sponsor Login
              </Button>
            </Link>
            <Link to="/">
              <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full px-6">
                Open App
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/40 via-black to-black -z-10" />
        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-white/90">The future of outdoor navigation is here.</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
            Touch grass, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
              but make it AR ✨
            </span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            Frictionless, app-less augmented reality wayfinding for massive outdoor venues. No downloads, no sign-ups. Just point your camera and explore.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/">
              <Button className="h-14 px-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg w-full sm:w-auto shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                Experience Lalbagh <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Venues Section */}
      <section id="venues" className="py-24 px-6 border-t border-white/5 bg-black">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Live Venues</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Link to="/">
              <div className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-500 cursor-pointer p-8 h-[300px] flex flex-col justify-end">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                {/* Background image placeholder */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1596404981881-22fb1380905a?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-700" />
                <div className="relative z-20">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium tracking-wide uppercase text-sm">Bengaluru, KA</span>
                  </div>
                  <h3 className="text-3xl font-bold mb-2">Lalbagh Botanical Garden</h3>
                  <p className="text-white/70">240-acre historic park. Explore the Glass House & ancient rocks.</p>
                </div>
              </div>
            </Link>
            
            <div className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.02] p-8 h-[300px] flex flex-col justify-center items-center text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white/30" />
              </div>
              <h3 className="text-xl font-bold text-white/50 mb-2">More Venues Coming Soon</h3>
              <p className="text-white/30 text-sm max-w-[250px]">We are expanding our AR mapping tech to malls, theme parks, and campuses.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-6 border-t border-white/5 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-5xl font-bold">Why We Built This</h2>
          <p className="text-xl text-white/60 leading-relaxed text-left md:text-center">
            Have you ever opened Google Maps inside a massive park, only to see a useless blue dot surrounded by green nothingness? We did too. <br/><br/>
            <strong>WayOnTop</strong> bridges the gap between digital utility and physical reality. By leveraging the sensors already in your pocket, we map complex offline venues into intuitive, heads-up AR experiences that feel like magic.
          </p>
        </div>
      </section>

      {/* Sponsor Section */}
      <section id="sponsors" className="py-24 px-6 border-t border-white/5 bg-gradient-to-b from-black to-emerald-950/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl font-bold">Sponsor a Zone. <br/>Own the Footfall.</h2>
              <p className="text-lg text-white/60 leading-relaxed">
                Traditional billboards don't tell you who looked at them. WayOnTop’s AR platform creates digital, hyper-local geofenced sponsor zones within physical venues.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-white/80">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <LineChart className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span>100% Trackable Impressions & Dwell Time</span>
                </li>
                <li className="flex items-center gap-3 text-white/80">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Navigation className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span>Drive physical foot traffic to your activation</span>
                </li>
              </ul>
              <Link to="/sponsors" className="inline-block pt-4">
                <Button className="bg-white text-black hover:bg-white/90 rounded-full px-8 h-12 font-bold">
                  Sponsor Self-Serve Portal
                </Button>
              </Link>
            </div>
            
            {/* Visual Representation */}
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full" />
              <div className="relative bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                <div className="space-y-6">
                  <div className="h-40 rounded-2xl bg-black/50 border border-white/5 relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2074&auto=format&fit=crop')] bg-cover bg-center opacity-30" />
                    <div className="w-32 h-32 rounded-full bg-emerald-500/20 border border-emerald-500/40 absolute flex items-center justify-center animate-pulse">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/40 blur-md" />
                    </div>
                    <span className="relative z-10 font-bold tracking-widest text-emerald-300">SPONSOR ZONE</span>
                  </div>
                  <Card className="bg-black/40 border-white/10 p-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-medium text-white/70">Live Analytics</span>
                      <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded">ACTIVE</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">Footfall Captured</span>
                        <span className="font-mono text-white">2,405</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">Engagement Rate</span>
                        <span className="font-mono text-white">41.2%</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact / Footer */}
      <footer className="py-12 px-6 border-t border-white/5 bg-black">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-emerald-500 fill-emerald-500" />
            <span className="font-bold text-lg">wayon.top</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/50">
            <a href="mailto:hello@wayon.top" className="flex items-center gap-2 hover:text-white transition-colors">
              <Mail className="w-4 h-4" />
              hello@wayon.top
            </a>
            <span>•</span>
            <a href="tel:+918310428923" className="hover:text-white transition-colors">
              +91 83104 28923
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
