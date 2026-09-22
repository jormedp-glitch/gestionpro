-- scripts/verify-rls.sql — Verificación de la matriz RLS (fase 1, WU-2 · fase 7, WU-1)
-- ============================================================================
-- Verifica:
--   1. anon: 0 filas visibles en las 7 tablas de datos de la fase 1
--      (conservan el grant por defecto y se apoyan solo en RLS = 0 filas)
--   1b. fase 7: anon NO tiene grants sobre las 10 tablas nuevas (cobros,
--      las 8 gym_* y _fase7_migracion_map). 0006 revoca anon explícitamente,
--      así que la consulta de anon falla con permission denied en lugar de
--      devolver 0 filas: se verifica el catálogo de grants (lección 0004).
--   2. cross-tenant: un usuario de otro negocio ve 0 filas del tenant
--      (incluidas las tablas cobros y gym_* de la fase 7)
--   3. owner: el owner ve su negocio y su propia membresía (ok)
--   4. fase 7: el owner SÍ ve sus propias filas en las tablas nuevas
--      (sin este bloque, policies demasiado restrictivas pasarían los
--      checks negativos) y el catálogo global de ejercicios es legible.
-- Termina con exit 0 si todo pasa; exit != 0 si algo falla (ON_ERROR_STOP +
-- RAISE EXCEPTION). Idempotente: solo lecturas y settings de sesión.
--
-- Uso (rol con privilegios, p. ej. postgres/service_role):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -v tenant='<UUID-de-un-negocio-con-datos>' \
--     -v owner='<UUID-del-owner-de-ese-negocio>' \
--     -v other='<UUID-de-un-usuario-SIN-membresía-en-ese-negocio>' \
--     -f scripts/verify-rls.sql
--
-- GOTCHA de psql (corregido en fase 7): psql NO interpola :'variable' dentro
-- de un bloque `do $$ ... $$` — lo trata como string citado y el bloque falla
-- con `syntax error at or near ":"`. Los valores viajan por GUCs de sesión
-- seteadas FUERA del bloque y se leen adentro con current_setting().
--
-- Nota: cada bloque DO corre en su propia transacción, por lo que
-- SET LOCAL ROLE / set_config(..., true) no persisten entre bloques. Por eso
-- los valores se setean con is_local = false (alcance de sesión).
-- ============================================================================

\set ON_ERROR_STOP on

-- Valores de trabajo en GUCs de sesión (ver GOTCHA arriba).
select set_config('verify.tenant', :'tenant', false);
select set_config('verify.owner', :'owner', false);
select set_config('verify.other', :'other', false);

-- 1) anon: 0 filas en las 7 tablas de la fase 1
do $$
declare
  t text;
  n bigint;
  tables text[] := array[
    'negocios', 'clientes', 'turnos', 'gastos', 'equipos',
    'reparaciones_historial', 'reparaciones_repuestos'
  ];
begin
  set local role anon;
  foreach t in array tables loop
    execute format('select count(*) from public.%I', t) into n;
    if n <> 0 then
      raise exception 'FALLO anon: % visible (% filas)', t, n;
    end if;
    raise notice 'OK anon: % = 0 filas', t;
  end loop;
end $$;

-- 1b) Fase 7: anon no debe tener NINGÚN grant sobre las tablas nuevas.
--     Las tablas de 0001 conservan el grant por defecto de Supabase y se
--     apoyan solo en RLS (por eso el bloque 1 cuenta filas). 0006, en cambio,
--     revoca anon explícitamente: sin grant la consulta ni se intenta, así
--     que se verifica el catálogo de grants en lugar de un count.
do $$
declare
  t text;
  n bigint;
  tables text[] := array[
    'cobros',
    'gym_alumnos', 'gym_ejercicios', 'gym_rutinas', 'gym_rutina_sesiones',
    'gym_rutina_ejercicios', 'gym_asignaciones', 'gym_completados',
    'gym_progreso', '_fase7_migracion_map'
  ];
begin
  foreach t in array tables loop
    select count(*) into n
      from information_schema.role_table_grants g
     where g.table_schema = 'public'
       and g.table_name = t
       and g.grantee = 'anon';
    if n <> 0 then
      raise exception 'FALLO grants anon: % tiene % grant(s)', t, n;
    end if;
    raise notice 'OK grants anon: % sin grants', t;
  end loop;
end $$;

-- 2) cross-tenant: el usuario "other" (sin membresía en el tenant) ve 0 filas
select set_config('request.jwt.claim.sub', :'other', false);
select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'other', 'role', 'authenticated')::text,
  false
);

do $$
declare
  n bigint;
  v_tenant uuid := current_setting('verify.tenant')::uuid;
begin
  set local role authenticated;

  select count(*) into n from public.clientes where negocio_id = v_tenant;
  if n <> 0 then raise exception 'FALLO cross-tenant: clientes visibles (%)', n; end if;

  select count(*) into n from public.turnos where negocio_id = v_tenant;
  if n <> 0 then raise exception 'FALLO cross-tenant: turnos visibles (%)', n; end if;

  select count(*) into n from public.gastos where negocio_id = v_tenant;
  if n <> 0 then raise exception 'FALLO cross-tenant: gastos visibles (%)', n; end if;

  select count(*) into n from public.equipos where negocio_id = v_tenant;
  if n <> 0 then raise exception 'FALLO cross-tenant: equipos visibles (%)', n; end if;

  select count(*) into n from public.reparaciones_historial
  where negocio_id = v_tenant;
  if n <> 0 then raise exception 'FALLO cross-tenant: historial visible (%)', n; end if;

  select count(*) into n from public.reparaciones_repuestos
  where negocio_id = v_tenant;
  if n <> 0 then raise exception 'FALLO cross-tenant: repuestos visibles (%)', n; end if;

  -- Fase 7: cobros (núcleo) y las 8 tablas del rubro gimnasio.
  -- gym_ejercicios incluye el catálogo global (negocio_id IS NULL): el filtro
  -- por tenant debe dar 0 aunque "other" sí vea los globales.
  select count(*) into n from public.cobros where negocio_id = v_tenant;
  if n <> 0 then raise exception 'FALLO cross-tenant: cobros visibles (%)', n; end if;

  select count(*) into n from public.gym_alumnos where negocio_id = v_tenant;
  if n <> 0 then raise exception 'FALLO cross-tenant: gym_alumnos visibles (%)', n; end if;

  select count(*) into n from public.gym_ejercicios where negocio_id = v_tenant;
  if n <> 0 then raise exception 'FALLO cross-tenant: gym_ejercicios visibles (%)', n; end if;

  select count(*) into n from public.gym_rutinas where negocio_id = v_tenant;
  if n <> 0 then raise exception 'FALLO cross-tenant: gym_rutinas visibles (%)', n; end if;

  select count(*) into n from public.gym_rutina_sesiones
  where negocio_id = v_tenant;
  if n <> 0 then raise exception 'FALLO cross-tenant: gym_rutina_sesiones visibles (%)', n; end if;

  select count(*) into n from public.gym_rutina_ejercicios
  where negocio_id = v_tenant;
  if n <> 0 then raise exception 'FALLO cross-tenant: gym_rutina_ejercicios visibles (%)', n; end if;

  select count(*) into n from public.gym_asignaciones where negocio_id = v_tenant;
  if n <> 0 then raise exception 'FALLO cross-tenant: gym_asignaciones visibles (%)', n; end if;

  select count(*) into n from public.gym_completados where negocio_id = v_tenant;
  if n <> 0 then raise exception 'FALLO cross-tenant: gym_completados visibles (%)', n; end if;

  select count(*) into n from public.gym_progreso where negocio_id = v_tenant;
  if n <> 0 then raise exception 'FALLO cross-tenant: gym_progreso visibles (%)', n; end if;

  select count(*) into n from public.negocios where id = v_tenant;
  if n <> 0 then raise exception 'FALLO cross-tenant: negocio visible (%)', n; end if;

  raise notice 'OK cross-tenant: 0 filas del tenant para otro usuario';
end $$;

-- 3) owner: el owner ve su negocio y su propia membresía, y ninguna ajena
select set_config('request.jwt.claim.sub', :'owner', false);
select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'owner', 'role', 'authenticated')::text,
  false
);

do $$
declare
  n bigint;
  v_tenant uuid := current_setting('verify.tenant')::uuid;
  v_owner  uuid := current_setting('verify.owner')::uuid;
begin
  set local role authenticated;

  select count(*) into n from public.negocios where id = v_tenant;
  if n <> 1 then raise exception 'FALLO owner: negocio no visible'; end if;

  select count(*) into n from public.negocio_miembros
  where negocio_id = v_tenant and user_id = v_owner;
  if n <> 1 then raise exception 'FALLO owner: membresía propia no visible'; end if;

  select count(*) into n from public.negocio_miembros
  where negocio_id = v_tenant and user_id <> v_owner;
  if n <> 0 then raise exception 'FALLO owner: ve membresías ajenas (%)', n; end if;

  raise notice 'OK owner: negocio y membresía propia visibles';
end $$;

-- 4) Fase 7: el owner SÍ ve sus propias filas en las tablas nuevas.
--    Los counts esperados se calculan ANTES como rol privilegiado (que
--    bypassea RLS) y se comparan contra lo que ve el owner: así el check
--    vale para cualquier volumen de datos, no solo para un fixture.
drop table if exists _verify_expected_fase7;
create temporary table _verify_expected_fase7 as
  select 'cobros' as tabla, count(*) as filas
    from public.cobros where negocio_id = :'tenant'::uuid
  union all select 'gym_alumnos', count(*)
    from public.gym_alumnos where negocio_id = :'tenant'::uuid
  union all select 'gym_ejercicios', count(*)
    from public.gym_ejercicios where negocio_id = :'tenant'::uuid
  union all select 'gym_rutinas', count(*)
    from public.gym_rutinas where negocio_id = :'tenant'::uuid
  union all select 'gym_rutina_sesiones', count(*)
    from public.gym_rutina_sesiones where negocio_id = :'tenant'::uuid
  union all select 'gym_rutina_ejercicios', count(*)
    from public.gym_rutina_ejercicios where negocio_id = :'tenant'::uuid
  union all select 'gym_asignaciones', count(*)
    from public.gym_asignaciones where negocio_id = :'tenant'::uuid
  union all select 'gym_completados', count(*)
    from public.gym_completados where negocio_id = :'tenant'::uuid
  union all select 'gym_progreso', count(*)
    from public.gym_progreso where negocio_id = :'tenant'::uuid;

do $$
declare
  i int;
  n bigint;
  v_tablas text[];
  v_filas  bigint[];
  v_tenant uuid := current_setting('verify.tenant')::uuid;
begin
  -- Se leen ANTES de cambiar de rol: el temp table pertenece al rol
  -- privilegiado y `authenticated` no tiene permiso sobre él.
  select array_agg(tabla order by tabla), array_agg(filas order by tabla)
    into v_tablas, v_filas
    from _verify_expected_fase7;

  set local role authenticated;

  for i in 1..coalesce(array_length(v_tablas, 1), 0) loop
    execute format('select count(*) from public.%I where negocio_id = $1', v_tablas[i])
      into n using v_tenant;
    if n <> v_filas[i] then
      raise exception 'FALLO owner: % visible(s) = % (esperado %)', v_tablas[i], n, v_filas[i];
    end if;
    raise notice 'OK owner: % = % fila(s)', v_tablas[i], n;
  end loop;

  -- AD-3: el catálogo global de ejercicios es legible por cualquier miembro.
  select count(*) into n from public.gym_ejercicios where negocio_id is null;
  if n > 0 then
    raise notice 'OK owner: catálogo global visible (% ejercicios)', n;
  else
    raise notice 'INFO owner: catálogo global vacío (se carga en la migración de datos)';
  end if;
end $$;

select 'verify-rls: TODAS LAS COMPROBACIONES OK' as resultado;
