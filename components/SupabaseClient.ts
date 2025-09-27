import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables. Did you set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_KEY in .env.local?")
}

export const supabase = createClient(supabaseUrl, supabaseKey)