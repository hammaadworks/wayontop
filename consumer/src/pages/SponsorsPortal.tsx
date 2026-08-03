import { useState, useEffect } from 'react';
import { supabase } from '@wayontop/ui/lib/supabase';
import { Button } from '@wayontop/ui/components/ui/button';
import { Input } from '@wayontop/ui/components/ui/input';
import { Label } from '@wayontop/ui/components/ui/label';
import { Card } from '@wayontop/ui/components/ui/card';
import { Navigation, LogOut, MapPin, TrendingUp, Image as ImageIcon, UploadCloud } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SponsorsPortal() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Login states
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    
    // As per user request: login using email and mobile as password
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: phone, // using phone as password as requested
    });

    if (error) {
      setLoginError(error.message);
    }
    setIsLoggingIn(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-black to-black -z-10" />
        
        <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-white/50 hover:text-white transition-colors">
          <Navigation className="w-5 h-5 text-emerald-500" />
          <span className="font-bold">wayon.top</span>
        </Link>

        <Card className="w-full max-w-md bg-white/5 border-white/10 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Sponsor Portal</h1>
            <p className="text-white/50 text-sm">Sign in to manage your zones and creatives.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-white/70">Email Address</Label>
              <Input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-black/50 border-white/10 text-white placeholder:text-white/20 h-12 rounded-xl focus:border-emerald-500"
                placeholder="company@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Mobile Number (Password)</Label>
              <Input 
                type="password"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="bg-black/50 border-white/10 text-white placeholder:text-white/20 h-12 rounded-xl focus:border-emerald-500"
                placeholder="Enter your registered mobile"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {loginError}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl"
            >
              {isLoggingIn ? 'Authenticating...' : 'Sign In'}
            </Button>
            
            <p className="text-center text-xs text-white/40 mt-6">
              Need an account? Call us at +91 83104 28923
            </p>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500/30 font-sans pb-20">
      {/* Header */}
      <nav className="sticky top-0 w-full z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-emerald-500 fill-emerald-500" />
            <span className="font-bold">Sponsor Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/50 hidden sm:inline-block">{session.user.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white/70 hover:text-white hover:bg-white/5">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-12 space-y-12">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome back.</h1>
          <p className="text-white/50">Manage your active zones, view analytics, or request new inventory.</p>
        </div>

        {/* Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/5 border-white/10 p-6 rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-medium text-white/70">Active Zones</h3>
            </div>
            <p className="text-4xl font-bold">1</p>
          </Card>
          
          <Card className="bg-white/5 border-white/10 p-6 rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-medium text-white/70">Total Footfall</h3>
            </div>
            <p className="text-4xl font-bold">8,402</p>
            <p className="text-xs text-blue-400 mt-2">+12% this week</p>
          </Card>
          
          <Card className="bg-white/5 border-white/10 p-6 rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h3 className="font-medium text-white/70">Ad Impressions</h3>
            </div>
            <p className="text-4xl font-bold">3,190</p>
            <p className="text-xs text-purple-400 mt-2">38% CTR on modal</p>
          </Card>
        </div>

        {/* Inventory Management & Market */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Available Inventory (Lalbagh Botanical Garden)</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Hardcoded mock inventory based on PRD requirements */}
            <Card className="bg-white/5 border-white/10 p-6 rounded-3xl backdrop-blur-md relative overflow-hidden group">
              <div className="absolute top-4 right-4 bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
                YOURS
              </div>
              <h3 className="text-xl font-bold mb-2">Main Gate Hub</h3>
              <p className="text-white/50 text-sm mb-6">Radius: 100m • Highest traffic entry point.</p>
              
              <div className="space-y-4">
                <div className="bg-black/50 rounded-xl p-4 border border-white/5">
                  <p className="text-xs text-white/50 mb-2">Current Creative</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/10 rounded flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-white/30" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">mtr-banner-v2.png</p>
                        <p className="text-xs text-emerald-400">Active</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="border-white/10 text-black hover:bg-white/10 hover:text-white">
                      Update
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-black/40 border-white/5 p-6 rounded-3xl relative overflow-hidden">
              <h3 className="text-xl font-bold mb-2">Glass House Premium Zone</h3>
              <p className="text-white/50 text-sm mb-4">Radius: 50m • Premium center-park location.</p>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-2xl font-bold text-white">₹5,000</span>
                <span className="text-white/40 text-sm">/ month</span>
              </div>
              
              <div className="pt-4 border-t border-white/5">
                <Button className="w-full bg-white text-black hover:bg-white/90 font-bold rounded-xl" onClick={() => alert('Purchase request sent! We will call you shortly at +91 83104 28923.')}>
                  Request to Buy
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
