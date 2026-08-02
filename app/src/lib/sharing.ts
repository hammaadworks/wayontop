import { Analytics } from './analytics';
import { showAlert } from './events';

export const ViralSharing = {
  shareText: async (title: string, text: string, url: string = 'https://lalbagh.top') => {
    Analytics.logEvent('share_button_tapped', { type: 'text' });
    
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `${text}\n\n@lalbagh.top #LalbaghFlowerShow`,
          url
        });
        return true;
      } catch (err) {
        try {
          await navigator.clipboard.writeText(url);
          showAlert('Link copied to clipboard! (Sharing not supported)');
        } catch (e) {
          showAlert('Sharing is not supported on this device browser. Copy this link: ' + url);
        }
        return false;
      }
    } else {
      showAlert('Sharing is not supported on this device browser. Copy this link: ' + url);
      return false;
    }
  },

  shareAchievement: async (stampName: string) => {
    return ViralSharing.shareText(
      'New Stamp Unlocked!',
      `I just discovered the hidden ${stampName} stamp at the Lalbagh Flower Show using the AR Navigator! 🌸✨`
    );
  },

  shareImage: async (blob: Blob, title: string = 'Lalbagh AR Explorer') => {
    Analytics.logEvent('share_button_tapped', { type: 'image' });
    
    const file = new File([blob], 'lalbagh-ar-capture.jpg', { type: 'image/jpeg' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title,
          text: `Check out my AR view at the Lalbagh Flower Show! 🌸✨\n\n@lalbagh.top #LalbaghFlowerShow`,
        });
        return true;
      } catch (err) {
        console.error('Image share failed', err);
        return false;
      }
    } else {
      // Fallback: download the image
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lalbagh-ar-capture.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return false;
    }
  }
};
