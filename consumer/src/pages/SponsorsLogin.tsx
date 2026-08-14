import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@wayontop/ui/lib/supabase';
import { Button } from '@wayontop/ui/components/ui/button';
import { Input } from '@wayontop/ui/components/ui/input';
import { Navigation, AlertCircle } from 'lucide-react';

export default function SponsorsLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase
      .from('sponsors')
      .select('id')
      .eq('email', email)
      .eq('password', password)
      .maybeSingle();

    if (signInError || !data) {
      setError(signInError?.message || 'Invalid email or password');
      setLoading(false);
    } else {
      localStorage.setItem('wayontop_sponsor_id', data.id);
      navigate('/sponsors/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 font-sans">
      <Link to="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Navigation className="w-6 h-6 text-emerald-600 fill-emerald-600" />
        </div>
        <span className="font-bold text-2xl tracking-tight text-slate-900"><span className="text-emerald-600">lalbagh</span>.top</span>
      </Link>

      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Sponsor Login</h1>
        <p className="text-slate-500 mb-6">Enter your credentials to manage your zones.</p>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-slate-50 border-slate-200 focus:ring-emerald-500 h-12"
              placeholder="brand@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-slate-50 border-slate-200 focus:ring-emerald-500 h-12"
              placeholder="••••••••"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl mt-4"
          >
            {loading ? 'Logging in...' : 'Login to Dashboard'}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Don't have an account? <Link to="/sponsors" className="text-emerald-600 font-medium hover:underline">Contact sales to sponsor</Link>
        </p>
      </div>
    </div>
  );
}
