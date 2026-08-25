import {getDeviceUUID} from './device';
import {supabase} from '@wayontop/ui/lib/supabase';
import {Analytics} from './analytics';

const STAMPS_KEY = 'wayontop_collected_stamps_v2';

export const Gamification = {
    getCollectedStamps: (): number[] => {
        const data = localStorage.getItem(STAMPS_KEY);
        if (!data) return [];
        try {
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    },

    hasCollected: (stampId: number): boolean => {
        return Gamification.getCollectedStamps().includes(stampId);
    },

    claimStamp: (stampId: number) => {
        const stamps = Gamification.getCollectedStamps();
        if (!stamps.includes(stampId)) {
            stamps.push(stampId);
            localStorage.setItem(STAMPS_KEY, JSON.stringify(stamps));
            Analytics.logEvent('stamp_collected', {stamp_id: stampId});
            void Gamification.syncTotalCount();
        }
    },

    syncTotalCount: async () => {
        if (!navigator.onLine) return;

        const stamps = Gamification.getCollectedStamps();
        const uuid = getDeviceUUID();
        const igHandle = localStorage.getItem('wayontop_ig_handle') || null;
        const venueKey = localStorage.getItem('wayontop_venue_key') || 'lalbagh';

        try {
            // Upsert to leaderboard
            await supabase.from('leaderboard').upsert({
                device_uuid: uuid,
                venue_key: venueKey,
                total_stamps: stamps.length,
                ig_handle: igHandle,
                last_synced_at: new Date().toISOString()
            }, {onConflict: 'device_uuid,venue_key'});
        } catch (e) {
            console.error('Leaderboard sync failed', e);
        }
    }
};
