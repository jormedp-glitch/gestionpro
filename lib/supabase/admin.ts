import "server-only";

import { createClient } from "@supabase/supabase-js";

// Service-role admin client (R8): server-only module.
// - URL: the project URL (NEXT_PUBLIC_SUPABASE_URL), already public — the same
//   value the anon-key clients use, so there is no duplicate env var.
// - Secret: SUPABASE_SERVICE_ROLE_KEY is server-only and must never reach the
//   browser bundle (never NEXT_PUBLIC_*).
// - The generic client is intentionally NOT exported; the public surface is
//   the two operations below, consumed only by server actions.
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export async function createUserWithPassword(email: string, password: string) {
  return admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
}

export async function deleteUser(userId: string) {
  return admin.auth.admin.deleteUser(userId);
}
