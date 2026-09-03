-- scripts/verify-rls.sql — Verificación de la matriz RLS (fase 1, WU-2)
-- ============================================================================
-- Verifica:
--   1. anon: 0 filas visibles en las 7 tablas de datos (sin policies = 0 filas)
--   2. cross-tenant: un usuario de otro negocio ve 0 filas del tenant
--   3. owner: el owner ve su negocio y su propia membresía (ok)
-- Termina con exit 0 si todo pasa; exit != 0 si algo falla (ON_ERROR_STOP +
-- RAISE EXCEPTION). Idempotente: solo lecturas y settings transaccionales.
--
-- Uso (rol con privilegios, p. ej. postgres/service_role):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -v tenant='<UUID-de-un-negocio-con-datos>' \
--     -v owner='<UUID-del-owner-de-ese-negocio>' \
--     -v other='<UUID-de-un-usuario-SIN-membresía-en-ese-negocio>' \
--     -f scripts/verify-rls.sql
--
-- Nota: cada bloque DO corre en su propia transacción, por lo que
-- SET LOCAL ROLE / set_config(..., true) no persisten entre bloques.
-- ============================================================================

\set ON_ERROR_STOP on

-- 1) anon: 0 filas en las 7 tablas
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

-- 2) cross-tenant: el usuario "other" (sin membresía en el tenant) ve 0 filas
do $$
declare
  n bigint;
begin
  perform set_config('request.jwt.claim.sub', :'other', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', :'other', 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;

  select count(*) into n from public.clientes where negocio_id = :'tenant'::uuid;
  if n <> 0 then raise exception 'FALLO cross-tenant: clientes visibles (%)', n; end if;

  select count(*) into n from public.turnos where negocio_id = :'tenant'::uuid;
  if n <> 0 then raise exception 'FALLO cross-tenant: turnos visibles (%)', n; end if;

  select count(*) into n from public.gastos where negocio_id = :'tenant'::uuid;
  if n <> 0 then raise exception 'FALLO cross-tenant: gastos visibles (%)', n; end if;

  select count(*) into n from public.equipos where negocio_id = :'tenant'::uuid;
  if n <> 0 then raise exception 'FALLO cross-tenant: equipos visibles (%)', n; end if;

  select count(*) into n from public.reparaciones_historial
  where negocio_id = :'tenant'::uuid;
  if n <> 0 then raise exception 'FALLO cross-tenant: historial visible (%)', n; end if;

  select count(*) into n from public.reparaciones_repuestos
  where negocio_id = :'tenant'::uuid;
  if n <> 0 then raise exception 'FALLO cross-tenant: repuestos visibles (%)', n; end if;

  select count(*) into n from public.negocios where id = :'tenant'::uuid;
  if n <> 0 then raise exception 'FALLO cross-tenant: negocio visible (%)', n; end if;

  raise notice 'OK cross-tenant: 0 filas del tenant para otro usuario';
end $$;

-- 3) owner: el owner ve su negocio y su propia membresía, y ninguna ajena
do $$
declare
  n bigint;
begin
  perform set_config('request.jwt.claim.sub', :'owner', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', :'owner', 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;

  select count(*) into n from public.negocios where id = :'tenant'::uuid;
  if n <> 1 then raise exception 'FALLO owner: negocio no visible'; end if;

  select count(*) into n from public.negocio_miembros
  where negocio_id = :'tenant'::uuid and user_id = :'owner'::uuid;
  if n <> 1 then raise exception 'FALLO owner: membresía propia no visible'; end if;

  select count(*) into n from public.negocio_miembros
  where negocio_id = :'tenant'::uuid and user_id <> :'owner'::uuid;
  if n <> 0 then raise exception 'FALLO owner: ve membresías ajenas (%)', n; end if;

  raise notice 'OK owner: negocio y membresía propia visibles';
end $$;

select 'verify-rls: TODAS LAS COMPROBACIONES OK' as resultado;