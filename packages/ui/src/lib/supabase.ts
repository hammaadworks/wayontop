/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function fetchAllPages<T = any>(queryFn: () => any): Promise<T[]> {
    let allData: T[] = [];
    let from = 0;
    const pageSize = 1000;
    
    while (true) {
        const { data, error } = await queryFn().range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        
        allData = allData.concat(data);
        if (data.length < pageSize) break;
        
        from += pageSize;
    }
    
    return allData;
}
