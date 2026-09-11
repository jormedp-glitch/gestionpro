-- 0001_fase1_seguridad.sql — Membership + RLS (fase 1, WU-2)
-- ============================================================================
-- PRERREQUISITOS (no saltear):
--   1. Backup verificado ANTES de tocar cualquier cosa (pg_dump / Supabase
--      Dashboard). Ver scripts/backup-bootstrap.md.
--   2. Ejecutar scripts/bootstrap-owners.sql con un rol privilegiado
--      (postgres / service_role) para que un administrador explícito quede como
--      owner de TODOS los negocios existentes. El bootstrap se ejecuta DESPUÉS
--      de esta migración (necesita la tabla negocio_miembros) y ANTES de liberar
--      la app: RLS se habilita al final de este archivo y el rol privilegiado
--      del operador lo atraviesa.
--   3. Verificar la matriz con scripts/verify-rls.sql.
--
-- ORDEN CRÍTICO (spec + D-04): policies primero → ENABLE ROW LEVEL SECURITY
-- al FINAL del archivo.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tabla de membresías (WU2-2)
-- ---------------------------------------------------------------------------
create table public.negocio_miembros (
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  rol        text not null check (rol in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  primary key (negocio_id, user_id)
);

create index idx_negocio_miembros_user on public.negocio_miembros (user_id);

-- Grants: solo lectura para authenticated; la escritura queda restringida a los
-- RPCs security definer (crear_negocio_con_owner) y al bootstrap del operador.
revoke all on public.negocio_miembros from anon;
grant select on public.negocio_miembros to authenticated;

-- ---------------------------------------------------------------------------
-- 2) RPC: crear_negocio_con_owner (WU2-3)
--    Atómico: inserta el negocio + la membresía de owner en una sola
--    transacción (un cuerpo de función plpgsql es atómico). El alta de negocios
--    pasa EXCLUSIVAMENTE por este RPC (D-04: no hay policy de insert).
-- ---------------------------------------------------------------------------
create or replace function public.crear_negocio_con_owner(
  p_nombre text,
  p_slug   text,
  p_rubro  text
)
returns public.negocios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_negocio public.negocios;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión iniciada';
  end if;

  insert into public.negocios (nombre, slug, rubro)
  values (p_nombre, p_slug, p_rubro)
  returning * into v_negocio;

  insert into public.negocio_miembros (negocio_id, user_id, rol)
  values (v_negocio.id, auth.uid(), 'owner');

  return v_negocio;
end;
$$;

revoke all on function public.crear_negocio_con_owner(text, text, text) from public;
grant execute on function public.crear_negocio_con_owner(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Auditoría: generar_numero_orden (WU2-4)
--    Reemplaza la función existente para cerrar la escalación: antes era
--    ejecutable sin verificar membresía. El número se mantiene secuencial por
--    negocio (texto zero-padded de 4 dígitos); si el negocio ya tenía otro
--    formato, ajustar antes de migrar (ver scripts/backup-bootstrap.md).
-- ---------------------------------------------------------------------------
create or replace function public.generar_numero_orden(p_negocio_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero text;
begin
  if not exists (
    select 1 from public.negocio_miembros m
    where m.negocio_id = p_negocio_id
      and m.user_id = auth.uid()
  ) then
    raise exception 'El usuario no es miembro del negocio';
  end if;

  select lpad((count(*) + 1)::text, 4, '0')
    into v_numero
    from public.equipos e
   where e.negocio_id = p_negocio_id;

  return v_numero;
end;
$$;

revoke all on function public.generar_numero_orden(uuid) from public;
grant execute on function public.generar_numero_orden(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Políticas RLS (WU2-5)
--    Membership lookup: auth.uid() (derivado del claim estándar sub del JWT de
--    sesión) contra negocio_miembros. Sin claims personalizados en el JWT.
--    anon: CERO policies (sin policies = sin filas).
-- ---------------------------------------------------------------------------

-- clientes
create policy "clientes_select" on public.clientes for select to authenticated using (exists (select 1 from public.negocio_miembros m where m.negocio_id = clientes.negocio_id and m.user_id = auth.uid()));
create policy "clientes_insert" on public.clientes for insert to authenticated with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = clientes.negocio_id and m.user_id = auth.uid()));
create policy "clientes_update" on public.clientes for update to authenticated using (exists (select 1 from public.negocio_miembros m where m.negocio_id = clientes.negocio_id and m.user_id = auth.uid())) with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = clientes.negocio_id and m.user_id = auth.uid()));
create policy "clientes_delete" on public.clientes for delete to authenticated using (exists (select 1 from public.negocio_miembros m where m.negocio_id = clientes.negocio_id and m.user_id = auth.uid()));

-- turnos
create policy "turnos_select" on public.turnos for select to authenticated using (exists (select 1 from public.negocio_miembros m where m.negocio_id = turnos.negocio_id and m.user_id = auth.uid()));
create policy "turnos_insert" on public.turnos for insert to authenticated with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = turnos.negocio_id and m.user_id = auth.uid()));
create policy "turnos_update" on public.turnos for update to authenticated using (exists (select 1 from public.negocio_miembros m where m.negocio_id = turnos.negocio_id and m.user_id = auth.uid())) with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = turnos.negocio_id and m.user_id = auth.uid()));
create policy "turnos_delete" on public.turnos for delete to authenticated using (exists (select 1 from public.negocio_miembros m where m.negocio_id = turnos.negocio_id and m.user_id = auth.uid()));

-- gastos
create policy "gastos_select" on public.gastos for select to authenticated using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gastos.negocio_id and m.user_id = auth.uid()));
create policy "gastos_insert" on public.gastos for insert to authenticated with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = gastos.negocio_id and m.user_id = auth.uid()));
create policy "gastos_update" on public.gastos for update to authenticated using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gastos.negocio_id and m.user_id = auth.uid())) with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = gastos.negocio_id and m.user_id = auth.uid()));
create policy "gastos_delete" on public.gastos for delete to authenticated using (exists (select 1 from public.negocio_miembros m where m.negocio_id = gastos.negocio_id and m.user_id = auth.uid()));

-- equipos
create policy "equipos_select" on public.equipos for select to authenticated using (exists (select 1 from public.negocio_miembros m where m.negocio_id = equipos.negocio_id and m.user_id = auth.uid()));
create policy "equipos_insert" on public.equipos for insert to authenticated with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = equipos.negocio_id and m.user_id = auth.uid()));
create policy "equipos_update" on public.equipos for update to authenticated using (exists (select 1 from public.negocio_miembros m where m.negocio_id = equipos.negocio_id and m.user_id = auth.uid())) with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = equipos.negocio_id and m.user_id = auth.uid()));
create policy "equipos_delete" on public.equipos for delete to authenticated using (exists (select 1 from public.negocio_miembros m where m.negocio_id = equipos.negocio_id and m.user_id = auth.uid()));

-- reparaciones_historial
create policy "historial_select" on public.reparaciones_historial for select to authenticated using (exists (select 1 from public.negocio_miembros m where m.negocio_id = reparaciones_historial.negocio_id and m.user_id = auth.uid()));
create policy "historial_insert" on public.reparaciones_historial for insert to authenticated with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = reparaciones_historial.negocio_id and m.user_id = auth.uid()));
create policy "historial_update" on public.reparaciones_historial for update to authenticated using (exists (select 1 from public.negocio_miembros m where m.negocio_id = reparaciones_historial.negocio_id and m.user_id = auth.uid())) with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = reparaciones_historial.negocio_id and m.user_id = auth.uid()));
create policy "historial_delete" on public.reparaciones_historial for delete to authenticated using (exists (select 1 from public.negocio_miembros m where m.negocio_id = reparaciones_historial.negocio_id and m.user_id = auth.uid()));

-- reparaciones_repuestos
create policy "repuestos_select" on public.reparaciones_repuestos for select to authenticated using (exists (select 1 from public.negocio_miembros m where m.negocio_id = reparaciones_repuestos.negocio_id and m.user_id = auth.uid()));
create policy "repuestos_insert" on public.reparaciones_repuestos for insert to authenticated with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = reparaciones_repuestos.negocio_id and m.user_id = auth.uid()));
create policy "repuestos_update" on public.reparaciones_repuestos for update to authenticated using (exists (select 1 from public.negocio_miembros m where m.negocio_id = reparaciones_repuestos.negocio_id and m.user_id = auth.uid())) with check (exists (select 1 from public.negocio_miembros m where m.negocio_id = reparaciones_repuestos.negocio_id and m.user_id = auth.uid()));
create policy "repuestos_delete" on public.reparaciones_repuestos for delete to authenticated using (exists (select 1 from public.negocio_miembros m where m.negocio_id = reparaciones_repuestos.negocio_id and m.user_id = auth.uid()));

-- negocios: solo SELECT por membresía (D-04: sin policy de insert/update/delete;
-- el alta pasa únicamente por crear_negocio_con_owner).
create policy "negocios_select" on public.negocios for select to authenticated using (exists (select 1 from public.negocio_miembros m where m.negocio_id = negocios.id and m.user_id = auth.uid()));

-- negocio_miembros: cada usuario solo ve sus propias membresías.
create policy "miembros_propios" on public.negocio_miembros for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5) Habilitar RLS al FINAL (WU2-6) — después de todas las policies.
-- ---------------------------------------------------------------------------
alter table public.negocios enable row level security;
alter table public.clientes enable row level security;
alter table public.turnos enable row level security;
alter table public.gastos enable row level security;
alter table public.equipos enable row level security;
alter table public.reparaciones_historial enable row level security;
alter table public.reparaciones_repuestos enable row level security;
alter table public.negocio_miembros enable row level security;