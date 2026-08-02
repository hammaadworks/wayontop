import { useEffect, useState } from 'react';

const isInAppBrowser = () => {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
  const isInstagram = (ua.indexOf('Instagram') > -1);
  const isFacebook = (ua.indexOf('FBAN') > -1) || (ua.indexOf('FBAV') > -1);
  const isSnapchat = (ua.indexOf('Snapchat') > -1);
  const isLinkedIn = (ua.indexOf('LinkedIn') > -1);
  const isTwitter = (ua.indexOf('Twitter') > -1);
  
  return isInstagram || isFacebook || isSnapchat || isLinkedIn || isTwitter;
};

export function InAppBrowserBlocker({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (isInAppBrowser()) {
      setBlocked(true);
    }
  }, []);

  if (!blocked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
      <div className="mb-8">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold mb-4">Hold on!</h1>
      <p className="text-lg mb-8 max-w-md">
        You're viewing this in an in-app browser. To use the AR navigation and save your progress offline, please open this link in your system browser (Safari/Chrome).
      </p>
      
      <div className="bg-white/10 rounded-xl p-6 border border-white/20 w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4">How to fix:</h2>
        
        <div className="text-left space-y-4">
          <div className="flex items-start">
            <span className="flex items-center justify-center bg-blue-500 text-white font-bold rounded-full h-6 w-6 shrink-0 mt-0.5 mr-3">1</span>
            <p>Tap the <strong>three dots</strong> in the top right corner.</p>
          </div>
          <div className="flex items-start">
            <span className="flex items-center justify-center bg-blue-500 text-white font-bold rounded-full h-6 w-6 shrink-0 mt-0.5 mr-3">2</span>
            <p>Select <strong>"Open in system browser"</strong> or <strong>"Open in Safari/Chrome"</strong>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
