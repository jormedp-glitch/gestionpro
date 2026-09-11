-- 0003_fase3_datos.sql — Integridad de datos + contador atómico (fase 3, WU-1)
-- ============================================================================
-- PRERREQUISITOS (no saltear):
--   1. Las migraciones 0001 y 0002 deben estar aplicadas (negocio_miembros,
--      RLS, acceso_token). 0003 se apila sobre ellas en la MISMA ventana de
--      rollout (ver scripts/backup-bootstrap.md).
--   2. Backup verificado ANTES de tocar cualquier cosa (pg_dump / Supabase
--      Dashboard). Ver scripts/backup-bootstrap.md.
--   3. En producción hay datos reales: los gates del bloque DO inicial
--      abortan ANTES de modificar nada si detectan slugs duplicados,
--      numero_orden no numéricos o violaciones de los CHECKs que esta
--      migración agrega. El operador normaliza/dedupe y reintenta.
--
-- CONTRATO (spec + D-01..D-06):
--   - MIGRACIÓN ADITIVA: create table / create or replace function / create
--     index / add constraint. NO altera columnas ni toca tablas cf_* (son de
--     otra app del mismo proyecto) ni los tipos (estado/categoria siguen text).
--   - El contador de órdenes pasa de count+1 (race real) a un upsert atómico
--     con row-lock por negocio (D-01/D-02).
--   - Gates go/no-go ANTES de cualquier DDL (autocommit por statement en
--     psql: si el gate falla, NO se modificó nada).
--   - Backfill idempotente con guard clause + snapshot de auditoría en
--     _fase3_duplicates_log (D-03/D-04).
--   - Rollback documentado en scripts/backup-bootstrap.md (drop uq_*/idx_*/
--     chk_*/contador + restaurar generar_numero_orden de 0001).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) GATE go/no-go (F3-1-01 + F3-1-06)
--    PRIMER statement ejecutable: aborta antes de tocar cualquier objeto si
--    los datos legacy no cumplen las precondiciones de la migración.
-- ---------------------------------------------------------------------------
do $$
declare
  v_slug_dups     bigint;
  v_slug_lista    text;
  v_no_numericos  bigint;
  v_gastos_neg    bigint;
  v_repuestos_bad bigint;
  v_clientes_neg  bigint;
begin
  -- 1.1) slugs duplicados (lower + trim) → uq_negocios_slug no podría crearse
  select count(*), coalesce(string_agg(slug, ', '), '')
    into v_slug_dups, v_slug_lista
    from (select lower(trim(slug)) slug
            from public.negocios
           group by lower(trim(slug)) having count(*) > 1) d;
  if v_slug_dups > 0 then
    raise exception 'ABORTADO 0003: % slug(s) duplicado(s): % — dedupe y reintente (no se modificó nada)',
      v_slug_dups, v_slug_lista;
  end if;

  -- 1.2) numero_orden no numéricos → el backfill (max(cast(numero_orden as
  --      int))) y el índice único uq_equipos_negocio_orden los asumirían rotos
  select count(*) into v_no_numericos
    from public.equipos
   where numero_orden !~ '^[0-9]+$';
  if v_no_numericos > 0 then
    raise exception 'ABORTADO 0003: % equipo(s) con numero_orden no numérico — normalice (ej. ''0001'') y reintente (no se modificó nada)',
      v_no_numericos;
  end if;

  -- 1.3) gastos.monto < 0 → chk_gastos_monto_positivo no podría crearse
  select count(*) into v_gastos_neg from public.gastos where monto < 0;
  if v_gastos_neg > 0 then
    raise exception 'ABORTADO 0003: % gasto(s) con monto < 0 — corrija y reintente (no se modificó nada)',
      v_gastos_neg;
  end if;

  -- 1.4) repuestos: costo < 0, precio_cobrado < 0 o cantidad <= 0
  select count(*) into v_repuestos_bad
    from public.reparaciones_repuestos
   where costo < 0 or precio_cobrado < 0 or cantidad <= 0;
  if v_repuestos_bad > 0 then
    raise exception 'ABORTADO 0003: % repuesto(s) con costo/precio_cobrado < 0 o cantidad <= 0 — corrija y reintente (no se modificó nada)',
      v_repuestos_bad;
  end if;

  -- 1.5) clientes.cuota < 0 → chk_clientes_cuota_no_negativa no podría crearse
  select count(*) into v_clientes_neg from public.clientes where cuota < 0;
  if v_clientes_neg > 0 then
    raise exception 'ABORTADO 0003: % cliente(s) con cuota < 0 — corrija y reintente (no se modificó nada)',
      v_clientes_neg;
  end if;

  raise notice '0003 gate: pre-flight OK (slugs, numero_orden, gastos, repuestos, clientes)';
end $$;

-- ---------------------------------------------------------------------------
-- 2) Unicidad de slug por negocio (D-05) — gate 1.1 ya garantizó 0 duplicados
-- ---------------------------------------------------------------------------
create unique index uq_negocios_slug on public.negocios (lower(trim(slug)));

-- ---------------------------------------------------------------------------
-- 3) Contador atómico de órdenes por negocio (F3-1-02, D-01)
--    Sin RLS: solo alcanzable vía el RPC security definer (D-01).
-- ---------------------------------------------------------------------------
create table public.negocio_orden_contadores (
  negocio_id uuid primary key references public.negocios (id) on delete cascade,
  ultimo     bigint not null default 0
);

revoke all on public.negocio_orden_contadores from anon;
revoke all on public.negocio_orden_contadores from authenticated;

-- ---------------------------------------------------------------------------
-- 4) RPC reemplazado: upsert atómico con row-lock (F3-1-03, D-02)
--    Cuerpo exacto del diseño: membresía → insert ... on conflict do update
--    ... +1 returning lpad(ultimo, 4, '0'). Mismo security definer,
--    search_path y grants que 0001.
-- ---------------------------------------------------------------------------
create or replace function public.generar_numero_orden(p_negocio_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_numero text;
begin
  if not exists (select 1 from public.negocio_miembros m
    where m.negocio_id = p_negocio_id and m.user_id = auth.uid()) then
    raise exception 'El usuario no es miembro del negocio';
  end if;
  insert into public.negocio_orden_contadores (negocio_id, ultimo)
  values (p_negocio_id, 1)
  on conflict (negocio_id) do update
    set ultimo = public.negocio_orden_contadores.ultimo + 1
  returning lpad(ultimo::text, 4, '0') into v_numero;
  return v_numero;
end; $$;

revoke all on function public.generar_numero_orden(uuid) from public;
grant execute on function public.generar_numero_orden(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Backfill idempotente (F3-1-04, D-03/D-04)
--    Guard clause: si uq_equipos_negocio_orden ya existe, la migración ya se
--    aplicó → skip (spec: re-ejecución sin cambios). Snapshot de duplicados
--    SIEMPRE (auditoría). Renumera SOLO filas duplicadas (rn > 1): el primer
--    del grupo conserva su número; los demás siguen al max por negocio.
-- ---------------------------------------------------------------------------
do $$
declare
  v_dups bigint;
  v_bad  bigint;
begin
  -- guard: ya aplicada → skip (spec Re-ejecución)
  if exists (
    select 1 from pg_indexes
     where schemaname = 'public' and indexname = 'uq_equipos_negocio_orden'
  ) then
    raise notice '0003 backfill: uq_equipos_negocio_orden ya existe — skip (idempotente)';
    return;
  end if;

  -- pre-flight formato numérico (defensa; el gate 1.2 ya lo cubrió)
  select count(*) into v_dups from public.equipos where numero_orden !~ '^[0-9]+$';
  if v_dups > 0 then
    raise exception '0003 backfill: numero_orden no numérico detectado — abortando';
  end if;

  -- snapshot de auditoría (D-04): create table if not exists SIEMPRE
  create table if not exists public._fase3_duplicates_log (
    negocio_id   uuid not null,
    numero_orden text not null,
    id           uuid not null,  -- equipos.id (equipo afectado)
    ocurrencia   int  not null,  -- 1 = conserva número; > 1 = renumerado
    snapshot_at  timestamptz not null default now()
  );

  -- inserta TODAS las filas de cada grupo duplicado (ocurrencia = rn)
  insert into public._fase3_duplicates_log (negocio_id, numero_orden, id, ocurrencia)
  with dups as (
    select negocio_id, numero_orden
      from public.equipos
     group by negocio_id, numero_orden having count(*) > 1
  ),
  ranked as (
    select e.id, e.negocio_id, e.numero_orden,
           row_number() over (partition by e.negocio_id, e.numero_orden order by e.created_at, e.id) rn
      from public.equipos e
      join dups d on d.negocio_id = e.negocio_id and d.numero_orden = e.numero_orden
  )
  select negocio_id, numero_orden, id, rn from ranked;

  get diagnostics v_dups = row_count;
  if v_dups > 0 then
    raise notice '0003 backfill: % fila(s) duplicada(s) snapshoteada(s) en _fase3_duplicates_log', v_dups;
  end if;

  -- renumerar SOLO duplicados (D-03): números siguientes al max por negocio
  with dups as (
    select negocio_id, numero_orden
      from public.equipos
     group by negocio_id, numero_orden having count(*) > 1
  ),
  ranked as (
    select e.id, e.negocio_id, e.created_at,
           row_number() over (partition by e.negocio_id, e.numero_orden order by e.created_at, e.id) rn
      from public.equipos e
      join dups d on d.negocio_id = e.negocio_id and d.numero_orden = e.numero_orden
  ),
  maxes as (
    select negocio_id, max(cast(numero_orden as int)) max_orden
      from public.equipos group by negocio_id
  ),
  to_fix as (
    select r.id, m.max_orden + row_number() over (partition by r.negocio_id order by r.created_at, r.id) nuevo
      from ranked r join maxes m on m.negocio_id = r.negocio_id
     where r.rn > 1
  )
  update public.equipos e set numero_orden = lpad(x.nuevo::text, 4, '0')
    from to_fix x where e.id = x.id;

  -- count check: 0 pares (negocio, numero_orden) duplicados restantes
  select count(*) into v_dups
    from (select negocio_id, numero_orden from public.equipos
           group by negocio_id, numero_orden having count(*) > 1) d;
  if v_dups > 0 then
    raise exception '0003 backfill: % pares duplicados restantes tras renumerar', v_dups;
  end if;

  -- contadores: ultimo = max(numero_orden) por negocio (incluye filas legacy
  -- no duplicadas) → la próxima llamada al RPC continúa en max + 1
  insert into public.negocio_orden_contadores (negocio_id, ultimo)
  select negocio_id, max(cast(numero_orden as int))
    from public.equipos
   group by negocio_id
  on conflict (negocio_id) do nothing;

  -- count check final: ningún contador por debajo del max de su negocio
  select count(*) into v_bad
    from public.negocio_orden_contadores c
    left join (select negocio_id, max(cast(numero_orden as int)) mx
                 from public.equipos group by negocio_id) m on m.negocio_id = c.negocio_id
   where m.mx is not null and c.ultimo < m.mx;
  if v_bad > 0 then
    raise exception '0003 backfill: % negocio(s) con contador < max(numero_orden)', v_bad;
  end if;

  raise notice '0003 backfill: ok (snapshot + renumber + contadores poblados)';
end $$;

-- ---------------------------------------------------------------------------
-- 6) Unicidad de numero_orden POR negocio (F3-1-05) — SOLO después del
--    backfill: el mismo número en otro negocio sigue permitido (spec).
-- ---------------------------------------------------------------------------
create unique index uq_equipos_negocio_orden on public.equipos (negocio_id, numero_orden);

-- ---------------------------------------------------------------------------
-- 7) Índices del plan (F3-1-05) — nombres exactos del diseño
-- ---------------------------------------------------------------------------
create index if not exists idx_turnos_negocio_fecha     on public.turnos (negocio_id, fecha);
create index if not exists idx_clientes_negocio         on public.clientes (negocio_id);
create index if not exists idx_historial_equipo         on public.reparaciones_historial (equipo_id);
create index if not exists idx_equipos_numero_orden     on public.equipos (numero_orden);
create index if not exists idx_equipos_negocio_created  on public.equipos (negocio_id, created_at);

-- ---------------------------------------------------------------------------
-- 8) CHECKs de negocio (F3-1-06, D-06) — VALID directo: tablas chicas y el
--    gate 1.3/1.4/1.5 ya garantizó 0 violadores. NULL pasa (legacy OK).
-- ---------------------------------------------------------------------------
alter table public.gastos               add constraint chk_gastos_monto_positivo      check (monto >= 0);
alter table public.reparaciones_repuestos add constraint chk_repuestos_costo_no_negativo   check (costo >= 0);
alter table public.reparaciones_repuestos add constraint chk_repuestos_precio_no_negativo  check (precio_cobrado >= 0);
alter table public.reparaciones_repuestos add constraint chk_repuestos_cantidad_positiva   check (cantidad > 0);
alter table public.clientes             add constraint chk_clientes_cuota_no_negativa check (cuota >= 0);