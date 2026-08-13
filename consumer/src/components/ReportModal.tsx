import { useState } from 'react';
import { X, Send, AlertTriangle, Mail, MessageCircle, Check } from 'lucide-react';
import { Button } from '@wayontop/ui/components/ui/button';
import { Input } from '@wayontop/ui/components/ui/input';
import { sendLarkMessage } from '../lib/lark';
import confetti from 'canvas-confetti';

interface ReportModalProps {
  onClose: () => void;
  defaultIssueType?: string;
  fixedIssueType?: boolean;
  defaultMessage?: string;
}

export function ReportModal({ onClose, defaultIssueType = 'bug', fixedIssueType = false, defaultMessage = '' }: ReportModalProps) {
  const [issueType, setIssueType] = useState(defaultIssueType);
  const [description, setDescription] = useState(defaultMessage);
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactError, setContactError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isValidContact = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^(?:\+91|91)?[6-9]\d{9}$/;
    return emailRegex.test(value) || phoneRegex.test(cleanPhone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contact || !isValidContact(contact)) {
      setContactError(true);
      return;
    }
    setContactError(false);

    if (!description.trim()) {
      alert('Please describe the issue');
      return;
    }
    
    setIsSubmitting(true);
    const message = `**Issue Type:** ${issueType}\n**Contact:** ${contact}\n**Description:**\n${description}`;
    const success = await sendLarkMessage(message, "New WayOnTop Report");
    setIsSubmitting(false);
    
    if (success) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#fcd34d', '#ffffff']
      });
      setIsSuccess(true);
    } else {
      alert('Failed to send message. Please try again or email us directly.');
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-sm bg-[#1C1C1E] border border-emerald-500/30 rounded-3xl p-8 text-center shadow-2xl animate-in zoom-in-95 duration-500">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Sent Successfully!</h2>
          <p className="text-slate-400 text-sm mb-8">We'll get back to you super quick!!</p>
          <Button onClick={onClose} className="w-full bg-white/10 hover:bg-white/20 text-white rounded-xl h-12">Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#1C1C1E] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            {issueType === 'sponsor' ? 'Contact Sales' : 'Contact Developer'}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10 rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Quick Contact Buttons */}
        <div className="grid grid-cols-2 gap-3 p-4 pb-0">
          <a href="mailto:hammaadworks@gmail.com" className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 px-2 transition-colors">
            <Mail className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-white truncate">Email</span>
          </a>
          <a href="https://wa.me/918310428923" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 px-2 transition-colors">
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-white truncate">WhatsApp</span>
          </a>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Topic</label>
            <select
              value={issueType}
              onChange={e => setIssueType(e.target.value)}
              disabled={fixedIssueType}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="bug">Report Bug / Glitch</option>
              <option value="feedback">General Feedback</option>
              <option value="data">Missing POI / Wrong Data</option>
              <option value="contact">Get in touch with dev</option>
              <option value="sponsor">Sponsor a Zone</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Message</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={issueType === 'sponsor' ? "Thanks for loving Lalbagh. Share your brand name and contact, we'd be honored to have you." : "How can we help?"}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm min-h-[120px] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Email / Phone</label>
            <Input
              value={contact}
              onChange={e => {
                setContact(e.target.value);
                setContactError(false);
              }}
              placeholder="So we can reach back to you"
              className={`w-full bg-black/50 border ${contactError ? 'border-red-500 focus:ring-red-500' : 'border-white/10 focus:ring-emerald-500'} rounded-xl px-3 h-12 text-white text-sm focus:ring-2`}
            />
            {contactError && <p className="text-red-400 text-xs mt-1.5 animate-in slide-in-from-top-1">Hehe, stop kidding! Enter a valid phone / email.</p>}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? 'Sending...' : (
              <>
                <Send className="w-5 h-5" />
                Send Message
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
