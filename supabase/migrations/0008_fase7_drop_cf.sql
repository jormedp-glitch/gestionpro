-- 0008_fase7_drop_cf.sql — Retiro de CoachFlow: drop de las tablas cf_*
-- (fase 7, PR 8 / task 6.1; spec R22; design "Migration / Rollout" paso 7)
-- ============================================================================
-- QUÉ HACE:
--   Dropea las 11 tablas legacy de CoachFlow (cf_*) y las 2 tablas internas de
--   la migración (_fase7_migracion_map y _fase7_profes_reusados). Es el ÚLTIMO
--   paso del rollout: cierra la app vieja por construcción (sin cf_* CoachFlow
--   no puede autenticar ni leer nada).
--
-- PRERREQUISITOS (no saltear):
--   1. scripts/verify-coachflow.sql corrió y terminó en PASS (exit 0) sobre la
--      base migrada. Este archivo NO re-verifica la migración: la asume hecha.
--   2. Backup verificado DESPUÉS del verify (el backup pre-migración no
--      alcanza: hay que poder restaurar el estado post-migración). Ver
--      scripts/backup-bootstrap.md.
--   3. La redirección de CoachFlow a GestiónPro está lista (D4): al dropear,
--      la app vieja deja de funcionar de inmediato.
--
-- GATE go/no-go (patrón D-13, antes de tocar nada):
--   Si hay filas en cf_profes y no están mapeadas en _fase7_migracion_map
--   (cf_profes → auth.users), aborta sin dropear nada. Cubre los dos casos
--   reales: correrlo antes de migrar y correrlo después de un rollback (el map
--   queda vacío y cf_* siguen siendo la única copia de los datos).
--
-- ORDEN DEL DROP (hijos → padres, respetando las FKs entre cf_*):
--   cf_completados → cf_rutina_ejercicios → cf_rutina_semanas →
--   cf_asignaciones → cf_progreso → cf_pagos → cf_turnos → cf_alumnos →
--   cf_ejercicios → cf_rutinas → cf_profes → _fase7_migracion_map →
--   _fase7_profes_reusados.
--
-- IDEMPOTENTE: usa `drop table if exists`; re-ejecutarlo no falla y no hace
-- nada (si las tablas ya no están, el gate tampoco tiene nada que chequear).
--
-- TRANSACCIONAL: aplicar en UNA sola transacción (D-13):
--   psql "$DATABASE_URL" -1 -v ON_ERROR_STOP=1 \
--     -f supabase/migrations/0008_fase7_drop_cf.sql
--
-- ROLLBACK: scripts/rollback-coachflow.sql ya NO aplica después de este paso
--   (su índice, el map, se dropea acá). Deshacer = restaurar el backup del
--   prerrequisito 2.
--
-- Verificación post-aplicación (la corre el maintainer, NO el autor):
--   select c.relname
--     from pg_class c join pg_namespace n on n.oid = c.relnamespace
--    where n.nspname = 'public'
--      and (c.relname like 'cf\_%' or c.relname like '\_fase7\_%');
--   → 0 filas.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) GATE go/no-go: no dropear la única copia de los datos.
-- ---------------------------------------------------------------------------
do $$
declare
  v_profes   bigint := 0;
  v_mapeados bigint := 0;
begin
  -- Sin cf_profes no hay nada que proteger (re-ejecución o base sin CoachFlow).
  if to_regclass('public.cf_profes') is null then
    raise notice '0008 gate: cf_profes no existe (nada que dropear).';
    return;
  end if;

  execute 'select count(*) from public.cf_profes' into v_profes;
  if v_profes = 0 then
    raise notice '0008 gate: cf_profes está vacía (no hay datos que perder).';
    return;
  end if;

  if to_regclass('public._fase7_migracion_map') is not null then
    execute $q$
      select count(*) from public._fase7_migracion_map
       where origen_tabla = 'cf_profes' and destino_tabla = 'auth.users'
    $q$ into v_mapeados;
  end if;

  if v_mapeados < v_profes then
    raise exception
      'ABORTADO 0008: hay % profe(s) en cf_profes y solo % mapeado(s) a auth.users. '
      'Corré scripts/verify-coachflow.sql y confirmá el PASS antes de dropear '
      '(un map vacío indica que la migración no corrió o se revirtió). No se dropeó nada.',
      v_profes, v_mapeados;
  end if;

  raise notice '0008 gate: % profe(s) migrado(s) — se puede dropear.', v_profes;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Drop de las tablas cf_* (hijos primero).
-- ---------------------------------------------------------------------------
drop table if exists public.cf_completados;
drop table if exists public.cf_rutina_ejercicios;
drop table if exists public.cf_rutina_semanas;
drop table if exists public.cf_asignaciones;
drop table if exists public.cf_progreso;
drop table if exists public.cf_pagos;
drop table if exists public.cf_turnos;
drop table if exists public.cf_alumnos;
drop table if exists public.cf_ejercicios;
drop table if exists public.cf_rutinas;
drop table if exists public.cf_profes;

-- ---------------------------------------------------------------------------
-- 3) Tablas internas de la migración (al final: el map es el índice del
--    rollback por script y la bitácora de cuentas reusadas).
-- ---------------------------------------------------------------------------
drop table if exists public._fase7_migracion_map;
drop table if exists public._fase7_profes_reusados;

-- ---------------------------------------------------------------------------
-- 4) Reporte final.
-- ---------------------------------------------------------------------------
select '0008_fase7_drop_cf: cf_* y tablas internas dropeadas (CoachFlow retirado)' as resultado;
