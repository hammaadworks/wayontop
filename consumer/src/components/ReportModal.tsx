import { useState } from 'react';
import { X, Send, AlertTriangle } from 'lucide-react';
import { Button } from '@wayontop/ui/components/ui/button';
import { Input } from '@wayontop/ui/components/ui/input';
import { sendLarkMessage } from '../lib/lark';

interface ReportModalProps {
  onClose: () => void;
  defaultIssueType?: string;
  fixedIssueType?: boolean;
}

export function ReportModal({ onClose, defaultIssueType = 'bug', fixedIssueType = false }: ReportModalProps) {
  const [issueType, setIssueType] = useState(defaultIssueType);
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Please describe the issue');
      return;
    }
    
    setIsSubmitting(true);
    const message = `**Issue Type:** ${issueType}\n**Contact:** ${contact || 'Anonymous'}\n**Description:**\n${description}`;
    const success = await sendLarkMessage(message, "New WayOnTop Report");
    setIsSubmitting(false);
    
    if (success) {
      alert('Message sent successfully!');
      onClose();
    } else {
      alert('Failed to send message. Please try again or email us directly.');
    }
  };

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
              placeholder="How can we help?"
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm min-h-[100px] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Email / Phone (Optional)</label>
            <Input
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder="So we can reach back to you"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3 h-12 text-white text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Sending...' : (
              <>
                <Send className="w-5 h-5" />
                Send Message
              </>
            )}
          </Button>
          
          <p className="text-xs text-white/40 text-center mt-4">
            Or email me directly at <a href="mailto:hammaadworks@gmail.com" className="text-emerald-400 hover:underline">hammaadworks@gmail.com</a>
          </p>
        </form>
      </div>
    </div>
  );
}
