import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@wayontop/ui/lib/supabase';
import { toast } from 'sonner';

export interface Venue {
  id: string;
  name: string;
  key: string;
  lat: number;
  lng: number;
  zoom: number;
}

export function useVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);

  const loadVenues = useCallback(async () => {
    setLoadingVenues(true);
    const { data, error } = await supabase.from('venues').select('*').order('created_at', { ascending: false });
    if (error) {
      toast.error('Error loading venues');
    } else if (data) {
      setVenues(data);
    }
    setLoadingVenues(false);
  }, []);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  const createVenue = async (venueData: Partial<Venue>) => {
    if (!venueData.name || !venueData.key || !venueData.lat || !venueData.lng) {
      toast.error('Name, Key and coordinates required');
      return null;
    }
    const validKey = /^[a-z0-9]+$/.test(venueData.key);
    if (!validKey) {
      toast.error('Key must be lowercase alphanumeric, one word only');
      return null;
    }

    const { data, error } = await supabase.from('venues').insert([{
      name: venueData.name,
      key: venueData.key,
      lat: venueData.lat,
      lng: venueData.lng,
      zoom: venueData.zoom || 16
    }]).select().single();

    if (error) {
      toast.error('Failed to create venue: ' + error.message);
      return null;
    } else if (data) {
      toast.success('Venue created!');
      setVenues(prev => [data, ...prev]);
      return data as Venue;
    }
    return null;
  };

  const updateVenue = async (venueData: Partial<Venue>): Promise<boolean> => {
    if (!venueData.id || !venueData.name || !venueData.key || !venueData.lat || !venueData.lng) {
      toast.error('Name, Key and coordinates required');
      return false;
    }
    const validKey = /^[a-z0-9]+$/.test(venueData.key);
    if (!validKey) {
      toast.error('Key must be lowercase alphanumeric, one word only');
      return false;
    }

    const { data, error } = await supabase.from('venues').update({
      name: venueData.name,
      key: venueData.key,
      lat: venueData.lat,
      lng: venueData.lng,
      zoom: venueData.zoom || 16
    }).eq('id', venueData.id).select().single();

    if (error) {
      toast.error('Failed to update venue: ' + error.message);
      return false;
    } else if (data) {
      toast.success('Venue updated!');
      setVenues(prev => prev.map(v => (v.id === data.id ? data : v)));
      return true;
    }
    return false;
  };

  const deleteVenue = async (venueId: string) => {
    const { error } = await supabase.from('venues').delete().eq('id', venueId);
    if (error) {
      toast.error('Failed to delete venue: ' + error.message);
      return false;
    } else {
      toast.success('Venue deleted');
      setVenues(prev => prev.filter(v => v.id !== venueId));
      return true;
    }
  };

  return { venues, loadingVenues, createVenue, updateVenue, deleteVenue };
}
