-- scripts/verify-ordering.sql — Verificación post-0003 (fase 3, WU-1)
-- ============================================================================
-- Verifica:
--   1. la tabla negocio_orden_contadores existe
--   2. los índices de 0003 existen (uq_equipos_negocio_orden, uq_negocios_slug,
--      idx_turnos_negocio_fecha, idx_clientes_negocio, idx_historial_equipo,
--      idx_equipos_numero_orden, idx_equipos_negocio_created)
--   3. 0 pares (negocio, numero_orden) duplicados en equipos
--   4. contador.ultimo = max(numero_orden) por negocio
--   5. RPC secuencial: 2 llamadas con claims JWT de owner (patrón verify-rls)
--      devuelven números consecutivos y el contador avanza exactamente 2
-- Termina con exit 0 si todo pasa; exit != 0 si algo falla (ON_ERROR_STOP +
-- RAISE EXCEPTION).
--
-- Uso (rol con privilegios, p. ej. postgres/service_role):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -v tenant='<UUID-de-un-negocio-con-datos>' \
--     -v owner='<UUID-del-owner-de-ese-negocio>' \
--     -f scripts/verify-ordering.sql
--
-- Prerequisitos:
--   - Migraciones 0001 → 0002 → 0003 aplicadas.
--   - scripts/bootstrap-owners.sql ejecutado (el owner debe ser miembro del
--     tenant; el RPC exige membresía) o, en un entorno de pruebas, una fila
--     manual en negocio_miembros.
--   - Entorno con el esquema auth de Supabase (auth.uid()): proyecto Supabase
--     o supabase-local. En un postgres pelado sin auth, el paso 5 no aplica.
--
-- Nota: cada bloque DO corre en su propia transacción (SET LOCAL ROLE /
-- set_config(..., true) no persisten entre bloques, igual que verify-rls).
-- Única mutación esperada: el paso 5 avanza el contador del tenant en +2
-- (deliberado: demuestra el incremento atómico).
-- ============================================================================

\set ON_ERROR_STOP on

-- 1) Tabla contador existe
do $$
begin
  if not exists (
    select 1 from pg_tables
     where schemaname = 'public' and tablename = 'negocio_orden_contadores'
  ) then
    raise exception 'FALLO: tabla negocio_orden_contadores no existe';
  end if;
  raise notice 'OK: tabla negocio_orden_contadores existe';
end $$;

-- 2) Índices de 0003 existen
do $$
declare
  expected text[] := array[
    'uq_equipos_negocio_orden',
    'uq_negocios_slug',
    'idx_turnos_negocio_fecha',
    'idx_clientes_negocio',
    'idx_historial_equipo',
    'idx_equipos_numero_orden',
    'idx_equipos_negocio_created'
  ];
  i text;
begin
  foreach i in array expected loop
    if not exists (
      select 1 from pg_indexes
       where schemaname = 'public' and indexname = i
    ) then
      raise exception 'FALLO: índice % no existe', i;
    end if;
    raise notice 'OK: índice % existe', i;
  end loop;
end $$;

-- 3) 0 pares (negocio, numero_orden) duplicados
do $$
declare
  n bigint;
begin
  select count(*) into n
    from (select negocio_id, numero_orden
            from public.equipos
           group by negocio_id, numero_orden having count(*) > 1) d;
  if n <> 0 then
    raise exception 'FALLO: % pares (negocio, numero_orden) duplicados', n;
  end if;
  raise notice 'OK: 0 pares (negocio, numero_orden) duplicados';
end $$;

-- 4) contador.ultimo = max(numero_orden) por negocio
do $$
declare
  n bigint;
begin
  select count(*) into n
    from public.negocio_orden_contadores c
    left join (
      select negocio_id, max(cast(numero_orden as int)) mx
        from public.equipos group by negocio_id
    ) m on m.negocio_id = c.negocio_id
   where m.mx is not null and c.ultimo <> m.mx;
  if n <> 0 then
    raise exception 'FALLO: % negocio(s) con contador.ultimo <> max(numero_orden)', n;
  end if;
  raise notice 'OK: contador.ultimo = max(numero_orden) por negocio';
end $$;

-- 5) RPC secuencial: 2 llamadas como owner → consecutivas, contador +2.
--    No se hardcodea '0001'/'0002': el backfill pudo dejar ultimo > 0, así
--    que se compara contra el contador previo (antes → después).
do $$
declare
  v_before bigint;
  v_after  bigint;
  v1 text;
  v2 text;
begin
  -- contador inicial: como rol privilegiado (authenticated no tiene acceso
  -- directo a negocio_orden_contadores; D-01)
  select coalesce(ultimo, 0) into v_before
    from public.negocio_orden_contadores
   where negocio_id = :'tenant'::uuid;

  perform set_config('request.jwt.claim.sub', :'owner', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', :'owner', 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;

  select public.generar_numero_orden(:'tenant'::uuid) into v1;
  select public.generar_numero_orden(:'tenant'::uuid) into v2;

  if cast(v1 as int) <> v_before + 1 then
    raise exception 'FALLO RPC: 1ra llamada devolvió % (esperaba %)', v1, lpad((v_before + 1)::text, 4, '0');
  end if;
  if cast(v2 as int) <> v_before + 2 then
    raise exception 'FALLO RPC: 2da llamada devolvió % (esperaba %)', v2, lpad((v_before + 2)::text, 4, '0');
  end if;

  reset role;

  select coalesce(ultimo, 0) into v_after
    from public.negocio_orden_contadores
   where negocio_id = :'tenant'::uuid;

  if v_after <> v_before + 2 then
    raise exception 'FALLO RPC: contador quedó en % (esperaba %)', v_after, v_before + 2;
  end if;

  raise notice 'OK RPC: % → % secuenciales (contador % → %)', v1, v2, v_before, v_after;
end $$;

select 'verify-ordering: TODAS LAS COMPROBACIONES OK' as resultado;