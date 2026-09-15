-- 0005_fase6_membresias.sql — Gestión de miembros del negocio (fase 6, WU-1)
-- ============================================================================
-- PRERREQUISITOS (no saltear):
--   1. Migraciones 0001 → 0002 → 0003 → 0004 aplicadas (negocio_miembros + RLS).
--   2. Backup verificado ANTES de tocar cualquier cosa (pg_dump / Supabase
--      Dashboard). Ver scripts/backup-bootstrap.md.
--   3. scripts/bootstrap-owners.sql ejecutado: cada negocio debe tener al
--      menos un owner (R5 exige que SIEMPRE quede un owner).
--
-- CONTRATO (spec R2–R7 + design D1/D2):
--   - 4 RPC security definer (patrón crear_negocio_con_owner, 0001:42-71):
--     listar_miembros, agregar_miembro, cambiar_rol_miembro, quitar_miembro.
--     El CRUD de membresías pasa EXCLUSIVAMENTE por estos RPC (D-04: los
--     grants de 0001:33-34 solo permiten SELECT; las mutaciones no son
--     alcanzables por PostgREST salvo vía RPC).
--   - El owner se valida DENTRO de cada RPC con auth.uid() (security
--     definer no otorga privilegios al llamador; RLS no aplica al owner de
--     la función → chequeo explícito, como 0001:89-95).
--   - auth.users NO está expuesto por PostgREST: el email viaja solo por
--     listar_miembros (join negocio_miembros × auth.users, R2) y
--     agregar_miembro resuelve el user_id por email DENTRO del RPC (D2:
--     dedupe en un único punto, cero llamadas service_role extra, R7).
--   - R5: no se puede quitar/demotar al último owner (cubre auto-remoción
--     y auto-democión; el mensaje es el mismo para ambos RPC).
--   - MIGRACIÓN ADITIVA e IDEMPOTENTE: create or replace + grants
--     re-aplicables; sin policies nuevas, sin backfill, sin gates de datos.
--   - Grants: revoke all from public + grant execute to authenticated POR
--     firma (patrón 0001:70-71 y 106-107).
--
-- ROLLBACK (ver también scripts/backup-bootstrap.md):
--   drop function public.listar_miembros(uuid);
--   drop function public.agregar_miembro(uuid, text, text);
--   drop function public.cambiar_rol_miembro(uuid, uuid, text);
--   drop function public.quitar_miembro(uuid, uuid);
--   Las membresías existentes persisten (tabla intacta; gestión por SQL
--   hasta re-aplicar). Fases 0-5 sin tocar.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) listar_miembros (R2)
--    Única vía para leer emails de los miembros: join con auth.users (no
--    expuesto por PostgREST). Owner-only (R6): un editor o no-miembro no
--    ve los emails del negocio.
-- ---------------------------------------------------------------------------
create or replace function public.listar_miembros(p_negocio_id uuid)
returns table (
  user_id    uuid,
  email      text,
  rol        text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión iniciada';
  end if;

  if not exists (
    select 1 from public.negocio_miembros m
    where m.negocio_id = p_negocio_id
      and m.user_id = auth.uid()
      and m.rol = 'owner'
  ) then
    raise exception 'Se requiere rol owner';
  end if;

  return query
  select m.user_id,
         u.email::text,
         m.rol,
         m.created_at
    from public.negocio_miembros m
    join auth.users u on u.id = m.user_id
   where m.negocio_id = p_negocio_id
   order by m.created_at, m.user_id;
end;
$$;

revoke all on function public.listar_miembros(uuid) from public;
grant execute on function public.listar_miembros(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) agregar_miembro (R1 + R7)
--    Resuelve el user_id por email dentro del RPC (D2) y rechaza emails ya
--    miembros con mensaje claro; la PK (negocio_id, user_id) queda como
--    backstop ante carreras. NO crea el usuario auth: eso corresponde a la
--    Server Action con la admin API (R1: orden usuario → membresía +
--    compensación). El CHECK de la tabla (rol in owner/editor) queda como
--    backstop de p_rol.
-- ---------------------------------------------------------------------------
create or replace function public.agregar_miembro(
  p_negocio_id uuid,
  p_email      text,
  p_rol        text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email   text;
  v_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión iniciada';
  end if;

  if not exists (
    select 1 from public.negocio_miembros m
    where m.negocio_id = p_negocio_id
      and m.user_id = auth.uid()
      and m.rol = 'owner'
  ) then
    raise exception 'Se requiere rol owner';
  end if;

  v_email := lower(trim(p_email));

  select u.id into v_user_id
    from auth.users u
   where lower(u.email) = v_email
   limit 1;

  if v_user_id is null then
    raise exception 'No existe un usuario con ese email';
  end if;

  if exists (
    select 1 from public.negocio_miembros m
    where m.negocio_id = p_negocio_id
      and m.user_id = v_user_id
  ) then
    raise exception 'El email ya es miembro del negocio';
  end if;

  insert into public.negocio_miembros (negocio_id, user_id, rol)
  values (p_negocio_id, v_user_id, p_rol);
end;
$$;

revoke all on function public.agregar_miembro(uuid, text, text) from public;
grant execute on function public.agregar_miembro(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) cambiar_rol_miembro (R3 + R5)
--    Promoción/democión entre owner y editor. Rechaza demotar al ÚLTIMO
--    owner (count owners = 1 y el target es ese owner) — cubre la
--    auto-democión. El CHECK de la tabla (rol in owner/editor) queda como
--    backstop de p_rol.
-- ---------------------------------------------------------------------------
create or replace function public.cambiar_rol_miembro(
  p_negocio_id uuid,
  p_user_id    uuid,
  p_rol        text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owners bigint;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión iniciada';
  end if;

  if not exists (
    select 1 from public.negocio_miembros m
    where m.negocio_id = p_negocio_id
      and m.user_id = auth.uid()
      and m.rol = 'owner'
  ) then
    raise exception 'Se requiere rol owner';
  end if;

  if not exists (
    select 1 from public.negocio_miembros m
    where m.negocio_id = p_negocio_id
      and m.user_id = p_user_id
  ) then
    raise exception 'El usuario no es miembro del negocio';
  end if;

  select count(*) into v_owners
    from public.negocio_miembros m
   where m.negocio_id = p_negocio_id
     and m.rol = 'owner';

  if v_owners = 1
     and p_rol <> 'owner'
     and exists (
       select 1 from public.negocio_miembros m
       where m.negocio_id = p_negocio_id
         and m.user_id = p_user_id
         and m.rol = 'owner'
     ) then
    raise exception 'No se puede quitar/demotar al último owner';
  end if;

  update public.negocio_miembros
     set rol = p_rol
   where negocio_id = p_negocio_id
     and user_id = p_user_id;
end;
$$;

revoke all on function public.cambiar_rol_miembro(uuid, uuid, text) from public;
grant execute on function public.cambiar_rol_miembro(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) quitar_miembro (R4 + R5)
--    Al borrar la fila, RLS revoca el acceso del miembro de inmediato (sin
--    fila → sin match con auth.uid()). Rechaza quitar al ÚLTIMO owner,
--    incluida la auto-remoción.
-- ---------------------------------------------------------------------------
create or replace function public.quitar_miembro(
  p_negocio_id uuid,
  p_user_id    uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owners bigint;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión iniciada';
  end if;

  if not exists (
    select 1 from public.negocio_miembros m
    where m.negocio_id = p_negocio_id
      and m.user_id = auth.uid()
      and m.rol = 'owner'
  ) then
    raise exception 'Se requiere rol owner';
  end if;

  if not exists (
    select 1 from public.negocio_miembros m
    where m.negocio_id = p_negocio_id
      and m.user_id = p_user_id
  ) then
    raise exception 'El usuario no es miembro del negocio';
  end if;

  select count(*) into v_owners
    from public.negocio_miembros m
   where m.negocio_id = p_negocio_id
     and m.rol = 'owner';

  if v_owners = 1
     and exists (
       select 1 from public.negocio_miembros m
       where m.negocio_id = p_negocio_id
         and m.user_id = p_user_id
         and m.rol = 'owner'
     ) then
    raise exception 'No se puede quitar/demotar al último owner';
  end if;

  delete from public.negocio_miembros
   where negocio_id = p_negocio_id
     and user_id = p_user_id;
end;
$$;

revoke all on function public.quitar_miembro(uuid, uuid) from public;
grant execute on function public.quitar_miembro(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Verificación post-aplicación (corre el maintainer, NO el autor):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -v tenant='<UUID-de-un-negocio-con-UN-solo-owner>' \
--     -v owner='<UUID-del-owner>' \
--     -v editor='<UUID-de-un-editor>' \
--     -v other='<UUID-de-un-usuario-SIN-membresía-en-ese-negocio>' \
--     -v other_email='<email-de-other>' \
--     -f scripts/verify-membresias.sql
-- ---------------------------------------------------------------------------