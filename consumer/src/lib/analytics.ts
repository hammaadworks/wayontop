import { getDeviceUUID } from './device';
import { supabase } from '@wayontop/ui/lib/supabase';

export interface AnalyticsEvent {
  device_uuid: string;
  event_type: string;
  event_data: any;
  timestamp: number;
}

const ANALYTICS_QUEUE_KEY = 'wayontop_analytics_queue';

export const Analytics = {
  logEvent: (eventType: string, eventData: any = {}) => {
    const uuid = getDeviceUUID();
    const event: AnalyticsEvent = {
      device_uuid: uuid,
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
    if (!navigator.onLine) return; // Wait for connection

    const queueStr = localStorage.getItem(ANALYTICS_QUEUE_KEY);
    if (!queueStr) return;

    const queue: AnalyticsEvent[] = JSON.parse(queueStr);
    if (queue.length === 0) return;

    // Send to Supabase
    try {
      const { error } = await supabase
        .from('analytics_events')
        .insert(queue.map(q => ({
          venue_key: 'lalbagh',
          device_uuid: q.device_uuid,
          event_type: q.event_type,
          event_data: q.event_data,
          created_at: new Date(q.timestamp).toISOString()
        })));

      if (!error) {
        // Clear queue on success
        localStorage.removeItem(ANALYTICS_QUEUE_KEY);
      }
    } catch (e) {
      console.error('Failed to sync analytics', e);
    }
  }
};

// Listen for network reconnect to flush queue
if (typeof window !== 'undefined') {
  window.addEventListener('online', Analytics.syncQueue);
}
