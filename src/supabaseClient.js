import { createClient } from "@supabase/supabase-js";

// Хэрэв та өөр Supabase төсөл ашиглах бол эдгээр хоёр утгыг
// Supabase Dashboard → Project Settings → API хэсгээс аваад солино.
export const SUPABASE_URL = "https://vbgqgwfcklkfecvocsyt.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZ3Fnd2Zja2xrZmVjdm9jc3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODUyMDIsImV4cCI6MjA5Njc2MTIwMn0.kmFSbs2nDXCRbzaAck-yI5NN9rH2FL5r84bp8cCY3Ac";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
