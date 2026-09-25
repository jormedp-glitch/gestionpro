-- scripts/verify-portal.sql — Verificación del portal público (fase 7, WU-7a)
-- ============================================================================
-- Verifica los 4 RPC del portal SIN fixtures (corrible en el rollout contra la
-- base real, con o sin datos):
--   1. Existen, son security definer, fijan search_path = public y sus grants
--      son solo anon + authenticated (PUBLIC revocado).
--   2. Tripwire de allowlist: el cuerpo de los RPC no menciona email, teléfono,
--      negocio_miembros ni auth.users (R14). Complementa la revisión de código.
--   3. Sin oráculo: un token aleatorio devuelve NULL en el RPC de lectura y
--      {ok:false, motivo:'no_disponible'} en los 3 mutadores, sin excepción.
--   4. anon ejecuta los RPC pero NO puede leer las tablas del portal directo
--      (permission denied; defensa en profundidad de los grants de 0006).
--
-- Uso (rol con privilegios, p. ej. postgres/service_role):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/verify-portal.sql
-- Termina con exit 0 si todo pasa; exit != 0 si algo falla (ON_ERROR_STOP +
-- RAISE EXCEPTION). Idempotente: solo lecturas y settings de sesión.
--
-- GOTCHA de psql (fase 1/7): :'variable' no se interpola dentro de `do $$ ... $$`;
-- este script no necesita variables, así que no aplica.
-- ============================================================================

\set ON_ERROR_STOP on

-- 1) Firma, security definer, search_path, grants y tripwire de allowlist.
do $$
declare
  v_firma text;
  v_oid   oid;
  v_proc  record;
  firmas text[] := array['public.obtener_portal_alumno(uuid)',
    'public.marcar_completado_portal(uuid, uuid, date)',
    'public.desmarcar_completado_portal(uuid, uuid, date)',
    'public.avanzar_sesion_portal(uuid)'];
begin
  foreach v_firma in array firmas loop
    v_oid := to_regprocedure(v_firma);
    if v_oid is null then
      raise exception 'FALLO: no existe la función %', v_firma;
    end if;

    select p.prosecdef, p.proconfig, p.proacl into v_proc from pg_proc p where p.oid = v_oid;

    if not v_proc.prosecdef then
      raise exception 'FALLO %: no es security definer', v_firma;
    end if;
    if v_proc.proconfig is null or not ('search_path=public' = any (v_proc.proconfig)) then
      raise exception 'FALLO %: no fija search_path = public (%)', v_firma, v_proc.proconfig;
    end if;
    if not has_function_privilege('anon', v_oid, 'EXECUTE') then
      raise exception 'FALLO %: anon no puede ejecutar', v_firma;
    end if;
    if not has_function_privilege('authenticated', v_oid, 'EXECUTE') then
      raise exception 'FALLO %: authenticated no puede ejecutar', v_firma;
    end if;

    -- grantee = 0 es PUBLIC en el ACL: con revoke all from public no debe quedar entrada.
    if v_proc.proacl is null
       or exists (select 1 from aclexplode(v_proc.proacl) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception 'FALLO %: PUBLIC conserva EXECUTE', v_firma;
    end if;
    if pg_get_functiondef(v_oid) ~* '(email|telefono|negocio_miembros|auth\.users)' then
      raise exception 'FALLO allowlist: % menciona un dato prohibido (email/telefono/membresías)', v_firma;
    end if;

    raise notice 'OK %: definer + search_path + grants (anon/authenticated, sin PUBLIC) + allowlist', v_firma;
  end loop;
end $$;

-- 2) Sin oráculo: token aleatorio (no puede existir) → misma respuesta que
--    cualquier caso no autorizado, sin excepción.
do $$
declare
  v_json  jsonb;
  v_token uuid := gen_random_uuid();
begin
  set local role anon;

  v_json := public.obtener_portal_alumno(v_token);
  if v_json is not null then
    raise exception 'FALLO no-oráculo: obtener_portal_alumno(token aleatorio) devolvió %', v_json;
  end if;
  raise notice 'OK no-oráculo: obtener_portal_alumno(token aleatorio) = NULL';

  v_json := public.marcar_completado_portal(v_token, gen_random_uuid(), current_date);
  if v_json ->> 'ok' <> 'false' or v_json ->> 'motivo' <> 'no_disponible' then
    raise exception 'FALLO no-oráculo: marcar_completado_portal devolvió %', v_json;
  end if;
  v_json := public.desmarcar_completado_portal(v_token, gen_random_uuid(), current_date);
  if v_json ->> 'ok' <> 'false' or v_json ->> 'motivo' <> 'no_disponible' then
    raise exception 'FALLO no-oráculo: desmarcar_completado_portal devolvió %', v_json;
  end if;
  v_json := public.avanzar_sesion_portal(v_token);
  if v_json ->> 'ok' <> 'false' or v_json ->> 'motivo' <> 'no_disponible' then
    raise exception 'FALLO no-oráculo: avanzar_sesion_portal devolvió %', v_json;
  end if;

  raise notice 'OK no-oráculo: los 3 mutadores con token aleatorio = no_disponible';
end $$;

-- 3) anon ejecuta los RPC (bloque 2) pero no lee las tablas directo.
do $$
declare
  t text;
  n bigint;
  tables text[] := array['gym_alumnos', 'gym_asignaciones', 'gym_rutina_sesiones',
    'gym_rutina_ejercicios', 'gym_completados', 'gym_progreso', 'cobros'];
begin
  set local role anon;
  foreach t in array tables loop
    begin
      execute format('select count(*) from public.%I', t) into n;
      raise exception 'FALLO: anon pudo leer public.% (% filas)', t, n;
    exception
      when insufficient_privilege then
        raise notice 'OK: anon no puede leer public.% directo', t;
    end;
  end loop;
end $$;

select 'verify-portal: TODAS LAS COMPROBACIONES OK' as resultado;
