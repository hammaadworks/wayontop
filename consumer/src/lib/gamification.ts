import {Analytics} from './analytics';

const STAMPS_KEY = 'wayontop_collected_stamps';

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
        }
    }
};
