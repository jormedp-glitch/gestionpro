-- 0006_fase7_gym_cobros.sql — Esquema de la Fase 7: cobros (núcleo) + rubro gimnasio
-- ============================================================================
-- PRERREQUISITOS (no saltear):
--   1. Migraciones 0001 → 0002 → 0003 → 0004 → 0005 aplicadas
--      (negocio_miembros + RLS por membresía).
--   2. Backup verificado ANTES de tocar cualquier cosa (pg_dump / Supabase
--      Dashboard). Ver scripts/backup-bootstrap.md.
--
-- CONTRATO (design AD-1…AD-7, spec R1/R2/R4/R9):
--   - NÚCLEO (aditivo, nullable: no rompe ningún rubro existente):
--     · public.cobros es una tabla NUEVA del núcleo: el concepto de cobro
--       sirve a todos los rubros, no solo a gimnasio (AD-1).
--     · public.clientes.email: la ficha del alumno lo exige (R2/R17).
--     · public.turnos.cliente_id / lugar: vinculan el turno con el cliente.
--   - RUBRO gimnasio: 8 tablas gym_* con negocio_id NOT NULL denormalizado
--     para el patrón RLS plano de 0001 (sin joins en las policies).
--   - AD-3: gym_ejercicios.negocio_id NULL = catálogo global COMPARTIDO de
--     solo lectura. Las policies de escritura exigen negocio_id IS NOT NULL,
--     por lo que el catálogo global es inmodificable por construcción.
--   - AD-4: una sola rutina activa por alumno, garantizada por un unique
--     index parcial (invariante en la base, no en la aplicación).
--   - AD-5: completados idempotentes por (cliente_id, rutina_ejercicio_id,
--     fecha): el doble click del portal no duplica.
--   - RLS: 4 policies por tabla (patrón 0001:117-155) + ENABLE ROW LEVEL
--     SECURITY al final (orden crítico de 0001:14: policies primero).
--   - GRANTS (crítico, lección 0004): las tablas nuevas de public nacen con
--     ALL para anon/authenticated. Sin el revoke, cualquier portador de la
--     anon key lee todo vía PostgREST.
--   - _fase7_migracion_map es INTERNA (idempotencia + verificación de la
--     migración de datos): RLS sin policies + revoke a anon y authenticated
--     (patrón 0004:22-24). Se dropea en 0008 (retiro de CoachFlow).
--
-- ROLLBACK (ver también scripts/backup-bootstrap.md):
--   drop table public._fase7_migracion_map;
--   drop table public.gym_progreso, public.gym_completados,
--              public.gym_asignaciones, public.gym_rutina_ejercicios,
--              public.gym_rutina_sesiones, public.gym_rutinas,
--              public.gym_ejercicios, public.gym_alumnos, public.cobros;
--   alter table public.turnos drop column cliente_id, drop column lugar;
--   alter table public.clientes drop column email;
--   Los rubros existentes y sus datos persisten intactos.
--
-- Verificación post-aplicación (la corre el maintainer, NO el autor):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -v tenant='<UUID-de-un-negocio-con-datos>' \
--     -v owner='<UUID-del-owner-de-ese-negocio>' \
--     -v other='<UUID-de-un-usuario-SIN-membresía-en-ese-negocio>' \
--     -f scripts/verify-rls.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Núcleo: cobros (AD-1) + columnas aditivas en clientes y turnos
-- ---------------------------------------------------------------------------
create table if not exists public.cobros (
  id         uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  monto      numeric not null,
  concepto   text,
  medio_pago text not null,
  fecha      date not null,
  created_at timestamptz not null default now(),
  constraint chk_cobros_monto_positivo
    check (monto >= 0),
  constraint chk_cobros_medio_pago_valido
    check (medio_pago in ('efectivo', 'transferencia', 'mercadopago', 'otro'))
);

create index if not exists idx_cobros_cliente_fecha
  on public.cobros (cliente_id, fecha desc);

-- R2/R17: la ficha del alumno incluye email y la migración lo conserva.
alter table public.clientes add column if not exists email text;

-- R20: el turno migrado se vincula al cliente y conserva el lugar.
alter table public.turnos add column if not exists cliente_id uuid
  references public.clientes(id) on delete set null;
alter table public.turnos add column if not exists lugar text;

-- ---------------------------------------------------------------------------
-- 2) Rubro gimnasio: tablas gym_*
-- ---------------------------------------------------------------------------

-- gym_alumnos: ficha 1:1 sobre clientes (cliente_id es la PK).
-- portal_token es la CAPACIDAD de acceso al portal (AD-2): UUID v4 no
-- enumerable. codigo_acceso es el dato legacy de CoachFlow y NO otorga acceso.
create table if not exists public.gym_alumnos (
  cliente_id    uuid primary key references public.clientes(id) on delete cascade,
  negocio_id    uuid not null references public.negocios(id) on delete cascade,
  objetivo      text,
  notas         text,
  altura_cm     numeric(5,1),
  fecha_nac     date,
  portal_token  uuid not null unique default gen_random_uuid(),
  codigo_acceso text,
  created_at    timestamptz not null default now()
);

-- gym_ejercicios: negocio_id NULL = catálogo global compartido (AD-3).
create table if not exists public.gym_ejercicios (
  id             uuid primary key default gen_random_uuid(),
  negocio_id     uuid references public.negocios(id) on delete cascade,
  nombre         text not null,
  grupo_muscular text,
  descripcion    text,
  url_video      text,
  activo         boolean not null default true,
  created_at     timestamptz not null default now()
);

create index if not exists idx_gym_ejercicios_negocio
  on public.gym_ejercicios (negocio_id);

-- gym_rutinas: sesiones_total > 0 (CHECK) porque el portal topea el avance.
create table if not exists public.gym_rutinas (
  id             uuid primary key default gen_random_uuid(),
  negocio_id     uuid not null references public.negocios(id) on delete cascade,
  nombre         text not null,
  descripcion    text,
  sesiones_total integer not null,
  activo         boolean not null default true,
  created_at     timestamptz not null default now(),
  constraint chk_gym_rutinas_sesiones_positivas check (sesiones_total > 0)
);

create table if not exists public.gym_rutina_sesiones (
  id            uuid primary key default gen_random_uuid(),
  negocio_id    uuid not null references public.negocios(id) on delete cascade,
  rutina_id     uuid not null references public.gym_rutinas(id) on delete cascade,
  numero_sesion integer not null,
  constraint uq_gym_rutina_sesiones_rutina_numero
    unique (rutina_id, numero_sesion)
);

create table if not exists public.gym_rutina_ejercicios (
  id           uuid primary key default gen_random_uuid(),
  negocio_id   uuid not null references public.negocios(id) on delete cascade,
  sesion_id    uuid not null references public.gym_rutina_sesiones(id) on delete cascade,
  ejercicio_id uuid not null references public.gym_ejercicios(id) on delete restrict,
  series       integer,
  repeticiones text,
  descanso_seg integer,
  notas        text,
  orden        integer not null default 0
);

create index if not exists idx_gym_rutina_ejercicios_sesion_orden
  on public.gym_rutina_ejercicios (sesion_id, orden);

create table if not exists public.gym_asignaciones (
  id            uuid primary key default gen_random_uuid(),
  negocio_id    uuid not null references public.negocios(id) on delete cascade,
  cliente_id    uuid not null references public.clientes(id) on delete cascade,
  rutina_id     uuid not null references public.gym_rutinas(id) on delete restrict,
  sesion_actual integer not null default 1,
  fecha_inicio  date not null default current_date,
  activa        boolean not null default true
);

-- AD-4: una sola rutina activa por alumno. Índice parcial: solo restringe
-- las filas con activa = true, así el historial de asignaciones no limita.
create unique index if not exists uq_gym_asignaciones_activa_por_cliente
  on public.gym_asignaciones (cliente_id)
  where activa;

create table if not exists public.gym_completados (
  id                  uuid primary key default gen_random_uuid(),
  negocio_id          uuid not null references public.negocios(id) on delete cascade,
  cliente_id          uuid not null references public.clientes(id) on delete cascade,
  rutina_ejercicio_id uuid not null
    references public.gym_rutina_ejercicios(id) on delete cascade,
  fecha               date not null,
  created_at          timestamptz not null default now(),
  constraint uq_gym_completados_cliente_ejercicio_fecha
    unique (cliente_id, rutina_ejercicio_id, fecha)
);

create table if not exists public.gym_progreso (
  id               uuid primary key default gen_random_uuid(),
  negocio_id       uuid not null references public.negocios(id) on delete cascade,
  cliente_id       uuid not null references public.clientes(id) on delete cascade,
  fecha            date not null,
  peso             numeric(5,1) not null,
  cintura          numeric,
  cadera           numeric,
  porcentaje_grasa numeric,
  pecho_cm         numeric,
  bicep_cm         numeric,
  metrica1_nombre  text,
  metrica1_valor   numeric,
  metrica2_nombre  text,
  metrica2_valor   numeric,
  notas            text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_gym_progreso_cliente_fecha
  on public.gym_progreso (cliente_id, fecha desc);

-- _fase7_migracion_map: idempotencia y verificación de la migración de datos
-- (origen cf_* → destino nuevo). Tabla INTERNA, no se accede desde la API.
-- La PK incluye destino_tabla: una MISMA fila de origen puede tener destinos en
-- más de una tabla (cf_profes → auth.users Y cf_profes → negocios). Con la PK
-- (origen_tabla, origen_id) el segundo destino se descartaba en silencio por el
-- `on conflict do nothing` y la migración dejaba de ser idempotente.
create table if not exists public._fase7_migracion_map (
  origen_tabla  text not null,
  origen_id     text not null,
  destino_tabla text not null,
  destino_id    uuid not null,
  primary key (origen_tabla, origen_id, destino_tabla)
);

-- ---------------------------------------------------------------------------
-- 3) RLS: policies por membresía (patrón 0001:117-155)
--    cobros es del núcleo y usa el mismo patrón: el negocio se resuelve por
--    negocio_miembros, igual que clientes/turnos/gastos.
-- ---------------------------------------------------------------------------
drop policy if exists "cobros_select" on public.cobros;
create policy "cobros_select" on public.cobros for select to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = cobros.negocio_id and m.user_id = auth.uid()));
drop policy if exists "cobros_insert" on public.cobros;
create policy "cobros_insert" on public.cobros for insert to authenticated
  with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = cobros.negocio_id and m.user_id = auth.uid()));
drop policy if exists "cobros_update" on public.cobros;
create policy "cobros_update" on public.cobros for update to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = cobros.negocio_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = cobros.negocio_id and m.user_id = auth.uid()));
drop policy if exists "cobros_delete" on public.cobros;
create policy "cobros_delete" on public.cobros for delete to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = cobros.negocio_id and m.user_id = auth.uid()));

drop policy if exists "gym_alumnos_select" on public.gym_alumnos;
create policy "gym_alumnos_select" on public.gym_alumnos for select to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_alumnos.negocio_id and m.user_id = auth.uid()));
drop policy if exists "gym_alumnos_insert" on public.gym_alumnos;
create policy "gym_alumnos_insert" on public.gym_alumnos for insert to authenticated
  with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_alumnos.negocio_id and m.user_id = auth.uid()));
drop policy if exists "gym_alumnos_update" on public.gym_alumnos;
create policy "gym_alumnos_update" on public.gym_alumnos for update to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_alumnos.negocio_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_alumnos.negocio_id and m.user_id = auth.uid()));
drop policy if exists "gym_alumnos_delete" on public.gym_alumnos;
create policy "gym_alumnos_delete" on public.gym_alumnos for delete to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_alumnos.negocio_id and m.user_id = auth.uid()));

-- AD-3: el catálogo global (negocio_id IS NULL) es legible por cualquier
-- miembro y NO es escribible por nadie desde la API.
drop policy if exists "gym_ejercicios_select" on public.gym_ejercicios;
create policy "gym_ejercicios_select" on public.gym_ejercicios for select to authenticated
  using (
    gym_ejercicios.negocio_id is null
    or exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_ejercicios.negocio_id and m.user_id = auth.uid())
  );
drop policy if exists "gym_ejercicios_insert" on public.gym_ejercicios;
create policy "gym_ejercicios_insert" on public.gym_ejercicios for insert to authenticated
  with check (
    gym_ejercicios.negocio_id is not null
    and exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_ejercicios.negocio_id and m.user_id = auth.uid())
  );
drop policy if exists "gym_ejercicios_update" on public.gym_ejercicios;
create policy "gym_ejercicios_update" on public.gym_ejercicios for update to authenticated
  using (
    gym_ejercicios.negocio_id is not null
    and exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_ejercicios.negocio_id and m.user_id = auth.uid())
  )
  with check (
    gym_ejercicios.negocio_id is not null
    and exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_ejercicios.negocio_id and m.user_id = auth.uid())
  );
drop policy if exists "gym_ejercicios_delete" on public.gym_ejercicios;
create policy "gym_ejercicios_delete" on public.gym_ejercicios for delete to authenticated
  using (
    gym_ejercicios.negocio_id is not null
    and exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_ejercicios.negocio_id and m.user_id = auth.uid())
  );

drop policy if exists "gym_rutinas_select" on public.gym_rutinas;
create policy "gym_rutinas_select" on public.gym_rutinas for select to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_rutinas.negocio_id and m.user_id = auth.uid()));
drop policy if exists "gym_rutinas_insert" on public.gym_rutinas;
create policy "gym_rutinas_insert" on public.gym_rutinas for insert to authenticated
  with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_rutinas.negocio_id and m.user_id = auth.uid()));
drop policy if exists "gym_rutinas_update" on public.gym_rutinas;
create policy "gym_rutinas_update" on public.gym_rutinas for update to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_rutinas.negocio_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_rutinas.negocio_id and m.user_id = auth.uid()));
drop policy if exists "gym_rutinas_delete" on public.gym_rutinas;
create policy "gym_rutinas_delete" on public.gym_rutinas for delete to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_rutinas.negocio_id and m.user_id = auth.uid()));

drop policy if exists "gym_rutina_sesiones_select" on public.gym_rutina_sesiones;
create policy "gym_rutina_sesiones_select" on public.gym_rutina_sesiones for select to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_rutina_sesiones.negocio_id and m.user_id = auth.uid()));
drop policy if exists "gym_rutina_sesiones_insert" on public.gym_rutina_sesiones;
create policy "gym_rutina_sesiones_insert" on public.gym_rutina_sesiones for insert to authenticated
  with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_rutina_sesiones.negocio_id and m.user_id = auth.uid()));
drop policy if exists "gym_rutina_sesiones_update" on public.gym_rutina_sesiones;
create policy "gym_rutina_sesiones_update" on public.gym_rutina_sesiones for update to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_rutina_sesiones.negocio_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_rutina_sesiones.negocio_id and m.user_id = auth.uid()));
drop policy if exists "gym_rutina_sesiones_delete" on public.gym_rutina_sesiones;
create policy "gym_rutina_sesiones_delete" on public.gym_rutina_sesiones for delete to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_rutina_sesiones.negocio_id and m.user_id = auth.uid()));

drop policy if exists "gym_rutina_ejercicios_select" on public.gym_rutina_ejercicios;
create policy "gym_rutina_ejercicios_select" on public.gym_rutina_ejercicios for select to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_rutina_ejercicios.negocio_id and m.user_id = auth.uid()));
drop policy if exists "gym_rutina_ejercicios_insert" on public.gym_rutina_ejercicios;
create policy "gym_rutina_ejercicios_insert" on public.gym_rutina_ejercicios for insert to authenticated
  with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_rutina_ejercicios.negocio_id and m.user_id = auth.uid()));
drop policy if exists "gym_rutina_ejercicios_update" on public.gym_rutina_ejercicios;
create policy "gym_rutina_ejercicios_update" on public.gym_rutina_ejercicios for update to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_rutina_ejercicios.negocio_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_rutina_ejercicios.negocio_id and m.user_id = auth.uid()));
drop policy if exists "gym_rutina_ejercicios_delete" on public.gym_rutina_ejercicios;
create policy "gym_rutina_ejercicios_delete" on public.gym_rutina_ejercicios for delete to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_rutina_ejercicios.negocio_id and m.user_id = auth.uid()));

drop policy if exists "gym_asignaciones_select" on public.gym_asignaciones;
create policy "gym_asignaciones_select" on public.gym_asignaciones for select to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_asignaciones.negocio_id and m.user_id = auth.uid()));
drop policy if exists "gym_asignaciones_insert" on public.gym_asignaciones;
create policy "gym_asignaciones_insert" on public.gym_asignaciones for insert to authenticated
  with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_asignaciones.negocio_id and m.user_id = auth.uid()));
drop policy if exists "gym_asignaciones_update" on public.gym_asignaciones;
create policy "gym_asignaciones_update" on public.gym_asignaciones for update to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_asignaciones.negocio_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_asignaciones.negocio_id and m.user_id = auth.uid()));
drop policy if exists "gym_asignaciones_delete" on public.gym_asignaciones;
create policy "gym_asignaciones_delete" on public.gym_asignaciones for delete to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_asignaciones.negocio_id and m.user_id = auth.uid()));

drop policy if exists "gym_completados_select" on public.gym_completados;
create policy "gym_completados_select" on public.gym_completados for select to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_completados.negocio_id and m.user_id = auth.uid()));
drop policy if exists "gym_completados_insert" on public.gym_completados;
create policy "gym_completados_insert" on public.gym_completados for insert to authenticated
  with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_completados.negocio_id and m.user_id = auth.uid()));
drop policy if exists "gym_completados_update" on public.gym_completados;
create policy "gym_completados_update" on public.gym_completados for update to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_completados.negocio_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_completados.negocio_id and m.user_id = auth.uid()));
drop policy if exists "gym_completados_delete" on public.gym_completados;
create policy "gym_completados_delete" on public.gym_completados for delete to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_completados.negocio_id and m.user_id = auth.uid()));

drop policy if exists "gym_progreso_select" on public.gym_progreso;
create policy "gym_progreso_select" on public.gym_progreso for select to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_progreso.negocio_id and m.user_id = auth.uid()));
drop policy if exists "gym_progreso_insert" on public.gym_progreso;
create policy "gym_progreso_insert" on public.gym_progreso for insert to authenticated
  with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_progreso.negocio_id and m.user_id = auth.uid()));
drop policy if exists "gym_progreso_update" on public.gym_progreso;
create policy "gym_progreso_update" on public.gym_progreso for update to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_progreso.negocio_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_progreso.negocio_id and m.user_id = auth.uid()));
drop policy if exists "gym_progreso_delete" on public.gym_progreso;
create policy "gym_progreso_delete" on public.gym_progreso for delete to authenticated
  using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gym_progreso.negocio_id and m.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 4) ENABLE ROW LEVEL SECURITY (orden crítico de 0001:14: policies primero)
--    _fase7_migracion_map se habilita SIN policies: nadie la lee por la API.
-- ---------------------------------------------------------------------------
alter table public.cobros                 enable row level security;
alter table public.gym_alumnos            enable row level security;
alter table public.gym_ejercicios         enable row level security;
alter table public.gym_rutinas            enable row level security;
alter table public.gym_rutina_sesiones    enable row level security;
alter table public.gym_rutina_ejercicios  enable row level security;
alter table public.gym_asignaciones       enable row level security;
alter table public.gym_completados        enable row level security;
alter table public.gym_progreso           enable row level security;
alter table public._fase7_migracion_map   enable row level security;

-- ---------------------------------------------------------------------------
-- 5) Grants (crítico, lección 0004)
--    Las tablas nuevas de public nacen con ALL para anon/authenticated: hay
--    que revocar anon explícitamente. authenticated recibe los privilegios
--    que ya usan las tablas de datos de 0001 (RLS sigue filtrando por
--    membresía: el grant habilita la operación, la policy decide las filas).
-- ---------------------------------------------------------------------------
revoke all on table public.cobros from anon;
grant select, insert, update, delete on table public.cobros to authenticated;

revoke all on table public.gym_alumnos from anon;
grant select, insert, update, delete on table public.gym_alumnos to authenticated;

revoke all on table public.gym_ejercicios from anon;
grant select, insert, update, delete on table public.gym_ejercicios to authenticated;

revoke all on table public.gym_rutinas from anon;
grant select, insert, update, delete on table public.gym_rutinas to authenticated;

revoke all on table public.gym_rutina_sesiones from anon;
grant select, insert, update, delete on table public.gym_rutina_sesiones to authenticated;

revoke all on table public.gym_rutina_ejercicios from anon;
grant select, insert, update, delete on table public.gym_rutina_ejercicios to authenticated;

revoke all on table public.gym_asignaciones from anon;
grant select, insert, update, delete on table public.gym_asignaciones to authenticated;

revoke all on table public.gym_completados from anon;
grant select, insert, update, delete on table public.gym_completados to authenticated;

revoke all on table public.gym_progreso from anon;
grant select, insert, update, delete on table public.gym_progreso to authenticated;

-- Tabla interna de la migración: sin acceso por la API (patrón 0004:22-24).
revoke all on table public._fase7_migracion_map from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Verificación post-aplicación (ambas deben pasar):
--   1) RLS habilitado en las 10 tablas nuevas:
--      select relname, relrowsecurity from pg_class
--       where relnamespace = 'public'::regnamespace
--         and relname in ('cobros','gym_alumnos','gym_ejercicios','gym_rutinas',
--                         'gym_rutina_sesiones','gym_rutina_ejercicios',
--                         'gym_asignaciones','gym_completados','gym_progreso',
--                         '_fase7_migracion_map');
--      -- todas true
--   2) Sin grants a anon en las tablas nuevas:
--      select table_name, grantee, privilege_type
--        from information_schema.role_table_grants
--       where table_schema = 'public'
--         and table_name like 'gym_%' or table_name in ('cobros','_fase7_migracion_map');
--      -- 0 filas para anon
--   3) Matriz RLS completa: psql -f scripts/verify-rls.sql
-- ---------------------------------------------------------------------------
