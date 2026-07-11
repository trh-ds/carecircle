// src/lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
export const createServerClient = () => {
    const cookieStore = cookies();
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        // { cookies : { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
};


export const createAdminClient = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
};