// scripts/cleanup-sandbox-e2e.mjs
//
// Limpia los negocios que deja el smoke E2E en el sandbox.
//
// El smoke es destructivo por diseño (crea un negocio `E2E Smoke <timestamp>`
// con su turno para probar el flujo completo). El sandbox es descartable, pero
// acumular negocios basura lo vuelve ruidoso para la prueba manual.
//
// Uso (en CI, después de `npx playwright test`):
//   node scripts/cleanup-sandbox-e2e.mjs
//
// Lee las variables que el job de E2E ya define: NEXT_PUBLIC_SUPABASE_URL y
// SUPABASE_SERVICE_ROLE_KEY (acepta también los alias E2E_* por si se corre
// a mano).
//
// Las membresías y los turnos del negocio se van por ON DELETE CASCADE.

const url =
  process.env.E2E_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.E2E_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log(
    "[cleanup-sandbox] sin URL o service_role: nada que hacer (¿el job de E2E define NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY?).",
  );
  process.exit(0);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  Prefer: "return=representation",
};

try {
  const res = await fetch(`${url}/rest/v1/negocios?slug=like.e2e-smoke-*`, {
    method: "DELETE",
    headers,
  });
  const texto = await res.text();
  if (!res.ok) {
    console.error(
      `[cleanup-sandbox] no se pudo limpiar (${res.status}): ${texto.slice(0, 200)}`,
    );
    process.exit(1);
  }
  let n = 0;
  try {
    n = JSON.parse(texto || "[]").length;
  } catch {
    n = texto ? 1 : 0;
  }
  console.log(`[cleanup-sandbox] negocios E2E borrados: ${n}`);
} catch (e) {
  console.error(`[cleanup-sandbox] error: ${e.message}`);
  process.exit(1);
}
