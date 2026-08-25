import {getDeviceUUID} from './device';
import {supabase} from '@wayontop/ui/lib/supabase';

export interface AnalyticsEvent {
    device_uuid: string;
    venue_key: string;
    event_type: string;
    event_data: any;
    timestamp: number;
}

const ANALYTICS_QUEUE_KEY = 'wayontop_analytics_queue';
let isSyncing = false;

export const Analytics = {
    logEvent: (eventType: string, eventData: any = {}) => {
        const uuid = getDeviceUUID();
        const venueKey = localStorage.getItem('wayontop_venue_key') || 'lalbagh';
        const event: AnalyticsEvent = {
            device_uuid: uuid,
            venue_key: venueKey,
            event_type: eventType,
            event_data: eventData,
            timestamp: Date.now()
        };

        // 1. Save to local queue
        const queueStr = localStorage.getItem(ANALYTICS_QUEUE_KEY);
        const queue: AnalyticsEvent[] = queueStr ? JSON.parse(queueStr) : [];
        queue.push(event);
        localStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queue));

        // 2. Attempt sync
        void Analytics.syncQueue();
    },

    syncQueue: async () => {
        if (isSyncing) return;
        if (!navigator.onLine) return; // Wait for connection

        isSyncing = true;
        const queueStr = localStorage.getItem(ANALYTICS_QUEUE_KEY);
        if (!queueStr) {
            isSyncing = false;
            return;
        }

        const queue: AnalyticsEvent[] = JSON.parse(queueStr);
        if (queue.length === 0) {
            isSyncing = false;
            return;
        }

        // Send to Supabase
        try {
            const {error} = await supabase
                .from('analytics_events')
                .insert(queue.map(q => ({
                    venue_key: q.venue_key || 'lalbagh',
                    device_uuid: q.device_uuid,
                    event_type: q.event_type,
                    event_data: q.event_data,
                    created_at: new Date(q.timestamp).toISOString()
                })))
                .select();

            if (!error) {
                // Safely remove only the events we just processed to avoid race conditions
                const currentQueueStr = localStorage.getItem(ANALYTICS_QUEUE_KEY);
                if (currentQueueStr) {
                    const currentQueue: AnalyticsEvent[] = JSON.parse(currentQueueStr);
                    // Filter out the ones we just sent by timestamp/type
                    const remaining = currentQueue.filter(
                        curr => !queue.some(sent => sent.timestamp === curr.timestamp && sent.event_type === curr.event_type)
                    );
                    localStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(remaining));
                }
            }
        } catch (e) {
            console.error('Failed to sync analytics', e);
        } finally {
            isSyncing = false;
        }
    }
};

// Listen for network reconnect to flush queue
if (typeof window !== 'undefined') {
    window.addEventListener('online', Analytics.syncQueue);
}
