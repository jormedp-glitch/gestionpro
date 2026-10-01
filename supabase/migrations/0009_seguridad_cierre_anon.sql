-- 0009_seguridad_cierre_anon.sql — Cierre de la superficie de `anon`:
-- RLS explícita en el contador de órdenes + revoke de EXECUTE en los RPCs
-- internos (fix del Security Advisor de Supabase, email del 2026-09-27)
-- ============================================================================
-- CONTEXTO (dos pendientes que el advisor dejó visibles en la auditoría del
-- 2026-09-29; el crítico del email ya estaba resuelto por el rollout de FASE 7):
--   1) public.negocio_orden_contadores (0003) quedó SIN RLS a propósito
--      ("solo alcanzable vía el RPC security definer", 0003:96/103-104).
--      0003 sí le revocó los grants a anon/authenticated, por eso el advisor
--      no la marca; pero la única defensa es el revoke: si algún día se
--      agrega un grant, la tabla queda expuesta al instante. RLS explícita
--      convierte la defensa en doble (RLS + grants) y hace la intención
--      evidente. Sin policies a propósito: no hay código de runtime que la
--      lea; solo la escribe el RPC `generar_numero_orden`.
--   2) Los 11 RPCs `security definer` de public quedaron ejecutables por
--      `anon`: las migraciones hicieron `revoke ... from public` (el
--      pseudo-rol), pero Supabase otorga EXECUTE explícito a anon/
--      authenticated vía default privileges al crear funciones en `public`
--      → ese grant sobrevive al revoke. Lección 0004 aplicada a funciones:
--      el revoke tiene que nombrar a anon/authenticated; `from public` no
--      alcanza. Se revoca EXECUTE de `anon` SOLO en los 6 RPCs internos
--      (los que exigen sesión y validan con auth.uid()). Los 5 RPCs públicos
--      por token (seguimiento 0002 y portal 0007) conservan el grant a anon
--      a propósito (D-11/D-16).
--
-- CONTRATO:
--   - MIGRACIÓN ADITIVA: solo RLS + grants de función. No toca datos,
--     columnas, policies ni el cuerpo de las funciones.
--   - Sin impacto de runtime: los 6 RPCs internos se invocan desde la app
--     con sesión (rol authenticated); `generar_numero_orden` corre como
--     owner (security definer, owner postgres) y el owner de la tabla
--     bypassea RLS (la tabla no tiene FORCE RLS).
--   - Idempotente: re-ejecutable sin cambios.
--   - Rollback: `alter table public.negocio_orden_contadores disable row
--     level security;` + `grant execute on function <firma> to anon;`
--     (no recomendado: reabre el hallazgo del advisor).
-- ============================================================================

-- 1) RLS explícita en el contador de órdenes (patrón 0004).
alter table public.negocio_orden_contadores enable row level security;

-- 2) `anon` no ejecuta los RPCs internos (los públicos por token siguen OK).
revoke execute on function public.crear_negocio_con_owner(text, text, text) from anon;
revoke execute on function public.generar_numero_orden(uuid) from anon;
revoke execute on function public.listar_miembros(uuid) from anon;
revoke execute on function public.agregar_miembro(uuid, text, text) from anon;
revoke execute on function public.cambiar_rol_miembro(uuid, uuid, text) from anon;
revoke execute on function public.quitar_miembro(uuid, uuid) from anon;

-- Verificación post-aplicación (todo debe pasar):
--   1) RLS habilitado:
--      select relrowsecurity from pg_class
--       where oid = 'public.negocio_orden_contadores'::regclass;   -- true
--   2) anon sin EXECUTE en los 6 RPCs internos y CON EXECUTE en los 5
--      públicos por token:
--      select p.oid::regprocedure as firma,
--             has_function_privilege('anon', p.oid, 'execute') as anon_exec
--        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--       where n.nspname = 'public' order by firma;
--      -- internos: false | públicos (seguimiento/portal): true
--   3) La matriz completa sigue en scripts/verify-rls.sql (bloque 1c).
