// scripts/cleanup-sandbox-e2e.mjs
//
// Limpia los negocios que deja el smoke E2E en el sandbox.
//
// El smoke es destructivo por diseño (crea un negocio `E2E Smoke <timestamp>`
// con su turno para probar el flujo completo). El sandbox es descartable, pero
// acumular negocios basura lo vuelve ruidoso para la prueba manual.
//
// Uso (en CI, después de `npx playwright test`):
//   E2E_SUPABASE_URL=https://<ref>.supabase.co \
//   E2E_SERVICE_ROLE_KEY=... \
//   node scripts/cleanup-sandbox-e2e.mjs
//
// Las membresías y los turnos del negocio se van por ON DELETE CASCADE.

const url = process.env.E2E_SUPABASE_URL;
const key = process.env.E2E_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log(
    "[cleanup-sandbox] sin E2E_SUPABASE_URL/E2E_SERVICE_ROLE_KEY: nada que hacer.",
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
