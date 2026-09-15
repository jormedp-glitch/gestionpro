-- 0004_fase3_duplicates_log_rls.sql — Cierre de exposición de la tabla de
-- auditoría de duplicados (fix del Security Advisor de Supabase)
-- ============================================================================
-- CONTEXTO:
--   0003 creó public._fase3_duplicates_log (snapshot de auditoría del backfill
--   de numero_orden) FUERA del bloque de RLS de 0001 y sin revocar los grants
--   por defecto de Supabase (anon/authenticated con ALL). Resultado: el
--   Security Advisor la reporta como "RLS Disabled in Public" y cualquier
--   portador de la anon key podía leerla, editarla y borrarla vía PostgREST.
--
--   La tabla hermana negocio_orden_contadores no aparece en el advisor porque
--   0003 sí le hizo revoke all a anon/authenticated (líneas 103-104).
--
-- CONTRATO:
--   - MIGRACIÓN ADITIVA: solo RLS + grants. No toca datos ni columnas.
--   - Sin políticas: la tabla no se accede desde la API (no hay código de
--     runtime que la lea; solo auditoría manual). service_role y el SQL
--     editor (postgres) siguen viendo el snapshot porque bypassean RLS.
--   - Idempotente: re-ejecutable sin cambios.
-- ============================================================================

alter table public._fase3_duplicates_log enable row level security;

revoke all on table public._fase3_duplicates_log from anon, authenticated;

-- Verificación post-aplicación (ambas deben pasar):
--   1) RLS habilitado:
--      select relrowsecurity from pg_class
--       where oid = 'public._fase3_duplicates_log'::regclass;   -- true
--   2) Sin grants a anon/authenticated:
--      select grantee, privilege_type from information_schema.role_table_grants
--       where table_schema = 'public' and table_name = '_fase3_duplicates_log';
--      -- 0 filas
