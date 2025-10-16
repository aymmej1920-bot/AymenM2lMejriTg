import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iqaymjchscdvlofvuacn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxYXltamNoc2NkdmxvZnZ1YWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjM2ODcsImV4cCI6MjA3NjE5OTY4N30.Pn1TO2VVwD_KX4llyVymuHLIke-3orY2UH9cnoa8zWk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);