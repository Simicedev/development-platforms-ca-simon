
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Support common env names; prefer ANON key if set
const supabaseKey =
	import.meta.env.VITE_SUPABASE_ANON_KEY ??
	import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase
        