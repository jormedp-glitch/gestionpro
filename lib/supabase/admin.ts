import "server-only";

import { createClient } from "@supabase/supabase-js";

// Service-role admin client (R8): server-only module.
// - Reads the server-side env pair (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
//   Never exposed via public env vars: the secret must not reach the browser
//   bundle.
// - The generic client is intentionally NOT exported; the public surface is
//   the two operations below, consumed only by server actions.
const admin = createClient(
  process.env.SUPABASE_URL!,
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
