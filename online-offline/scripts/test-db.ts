import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
console.log('URL:', url?.slice(0,30));
console.log('KEY:', key?.slice(0,10));

const db = createClient(url, key);
db.from('periods').select('id, name, is_active').eq('is_active', true).then(({ data, error }) => {
  console.log('data:', JSON.stringify(data));
  console.log('error:', JSON.stringify(error));
});
