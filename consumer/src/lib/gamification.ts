import {getDeviceUUID} from './device';
import {supabase} from '@wayontop/ui/lib/supabase';
import {Analytics} from './analytics';

const STAMPS_KEY = 'wayontop_collected_stamps';

export const Gamification = {
    getCollectedStamps: (): string[] => {
        const data = localStorage.getItem(STAMPS_KEY);
        return data ? JSON.parse(data) : [];
    },

    hasCollected: (stampId: string): boolean => {
        return Gamification.getCollectedStamps().includes(stampId);
    },

    claimStamp: (stampId: string) => {
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
    },

    claimGoldenStamp: async (stampId: string, newLat: number, newLng: number) => {
        if (!navigator.onLine) {
            throw new Error("Must be online to claim the Golden Stamp!");
        }

        const uuid = getDeviceUUID();
        const venueKey = localStorage.getItem('wayontop_venue_key') || 'lalbagh';

        const {data, error} = await supabase.rpc('claim_golden_stamp', {
            stamp_id: stampId,
            target_venue_key: venueKey,
            player_id: uuid,
            new_lat: newLat,
            new_lng: newLng
        });

        if (error) throw error;
        if (data === false) {
            throw new Error("Too late! Someone else just claimed it!");
        }

        Analytics.logEvent('golden_stamp_collected', {stamp_id: stampId});
        return true;
    }
};
