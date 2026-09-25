-- scripts/migracion-coachflow-auth.sql — Migración de los profes de CoachFlow a
-- Supabase Auth (fase 7, PR 2 / task 2.1)
-- ============================================================================
-- PRERREQUISITOS (no saltear):
--   1. Migraciones 0001 → 0006 aplicadas (incluye public._fase7_migracion_map).
--   2. Backup verificado ANTES de tocar cualquier cosa. Ver
--      scripts/backup-bootstrap.md.
--   3. pgcrypto disponible en el schema `extensions` (estándar de Supabase):
--      extensions.crypt() / extensions.gen_salt(). Verificar con:
--        select extname, extnamespace::regnamespace from pg_extension where extname = 'pgcrypto';
--   4. Ejecutar PRIMERO con un solo profe (ver "VALIDACIÓN" abajo) y probar el
--      login. El esquema de auth.* varía según la versión de GoTrue: si el
--      INSERT falla por columnas faltantes o NOT NULL, el fallback documentado
--      es crear los usuarios con la Admin API (lib/supabase/admin.ts, patrón
--      de la fase 6) en lugar de SQL directo.
--
-- CONTRATO (design D1/D2 + spec R16):
--   - D1: la contraseña actual del profe se conserva como contraseña inicial.
--     cf_profes.password_hash ES la contraseña en TEXTO PLANO (agujero de
--     CoachFlow) → se hashea acá con bcrypt: crypt(password, gen_salt('bf')).
--     GoTrue valida con golang/bcrypt, que acepta el prefijo $2a$.
--   - D2: profe sin email → placeholder <slug>@migrado.invalid (RFC 2606, no
--     resoluble). Corregible después con la Admin API.
--   - idempotente: cada profe migrado queda en _fase7_migracion_map
--     (origen_tabla='cf_profes'); las filas ya mapeadas se saltean.
--   - transaccional: todo el script corre en una sola transacción.
--   - NO toca negocios ni negocio_miembros: eso lo hace migracion-coachflow.sql,
--     que resuelve el user_id por el map. Este script solo crea las identidades.
--   - Reuso: si el email del profe YA existe en auth.users (p. ej. el maintainer
--     ya tenía cuenta en GestiónPro), se reusa ese user_id y NO se le toca la
--     contraseña ni los metadatos (la app lee auth.users.email, no
--     raw_user_meta_data: no hay nada que sincronizar). Se reporta.
--   - password_hash vacío o nulo → encrypted_password NULL (no se puede loguear
--     con contraseña; requiere recuperación). NUNCA se hashea la cadena vacía,
--     porque eso permitiría un login con contraseña vacía.
--
-- VALIDACIÓN (con UN profe, antes de migrar el resto):
--   -- 1) Migrar un solo profe:
--   --    (editá el WHERE del paso 2 para tomar 1 fila, o corré el script con
--   --     un LIMIT 1 en la tabla temporal)
--   -- 2) Verificar el hash:
--   select u.email,
--          extensions.crypt('<password-en-texto-plano>', u.encrypted_password) = u.encrypted_password as password_ok
--     from auth.users u where u.email = '<email-del-profe>';
--   -- 3) Probar el login real en GestiónPro.
--
-- ROLLBACK (ver también scripts/rollback-coachflow.sql):
--   -- Borra SOLO los usuarios creados por esta migración (los reusados NO se
--   -- tocan) y su map. Las filas de cf_profes quedan intactas.
--   delete from auth.identities i
--    using public._fase7_migracion_map m
--    where m.origen_tabla = 'cf_profes'
--      and m.destino_tabla = 'auth.users'
--      and i.user_id = m.destino_id
--      and i.provider = 'email'
--      and not exists (select 1 from public._fase7_profes_reusados r where r.user_id = m.destino_id);
--   delete from auth.users u
--    using public._fase7_migracion_map m
--    where m.origen_tabla = 'cf_profes'
--      and m.destino_tabla = 'auth.users'
--      and u.id = m.destino_id
--      and not exists (select 1 from public._fase7_profes_reusados r where r.user_id = m.destino_id);
--   delete from public._fase7_migracion_map
--    where origen_tabla = 'cf_profes' and destino_tabla = 'auth.users';
--   (La tabla _fase7_profes_reusados la crea el propio script; conservala hasta
--    el rollback para no borrar cuentas preexistentes.)
-- ============================================================================

\set ON_ERROR_STOP on

begin;

-- ---------------------------------------------------------------------------
-- 0) Guardas previas: fallar ANTES de escribir nada.
-- ---------------------------------------------------------------------------

-- 0a) pgcrypto en extensions (requisito del hasheo).
do $$
begin
  if not exists (
    select 1 from pg_extension e
     where e.extname = 'pgcrypto'
       and e.extnamespace::regnamespace::text = 'extensions'
  ) then
    raise exception
      'pgcrypto no esta en el schema extensions: extensions.crypt() no existe. Revisa el prerequisito 3.';
  end if;
end $$;

-- 0b) Emails destino duplicados entre profes: dos filas de cf_profes con el
--     mismo email (o el mismo slug sin email) terminarían compartiendo UNA
--     sola cuenta de auth.users (dos negocios con el mismo dueño, o peor: un
--     profe viendo los datos de otro). Se falla con el listado para que se
--     corrija el dato de origen: es preferible a inventar un email o a fusionar
--     cuentas en silencio. Se miran TODOS los profes (mapeados o no), porque la
--     colisión también puede darse contra una fila ya migrada.
do $$
declare
  v_dup text;
begin
  select string_agg(format('%s (%s filas)', email_destino, n), ', ')
    into v_dup
    from (
      select lower(coalesce(nullif(trim(p.email), ''), p.slug || '@migrado.invalid')) as email_destino,
             count(*) as n
        from public.cf_profes p
       group by 1
      having count(*) > 1
    ) d;

  if v_dup is not null then
    raise exception 'Emails destino duplicados en cf_profes: %. Corregilos en el origen antes de migrar.', v_dup;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1) Resolución de cada profe pendiente: email destino + user_id.
--    user_id_existente: cuenta de auth.users que ya tiene ese email (se reusa).
--    user_id_destino:   el id final (el existente o uno nuevo).
-- ---------------------------------------------------------------------------
create temporary table _fase7_profes_auth on commit drop as
select
  p.id                                                              as profe_id,
  p.nombre,
  p.slug,
  coalesce(nullif(trim(p.email), ''), p.slug || '@migrado.invalid') as email_destino,
  nullif(p.password_hash, '')                                       as password_plano,
  (select u.id
     from auth.users u
    where lower(u.email) = lower(coalesce(nullif(trim(p.email), ''), p.slug || '@migrado.invalid'))
    order by u.created_at nulls last
    limit 1)                                                        as user_id_existente
from public.cf_profes p
where not exists (
  select 1 from public._fase7_migracion_map m
   where m.origen_tabla = 'cf_profes' and m.origen_id = p.id::text
);

alter table _fase7_profes_auth add column user_id_destino uuid;
update _fase7_profes_auth
   set user_id_destino = coalesce(user_id_existente, gen_random_uuid());

-- 1a) Bitácora de reusados: el rollback NO debe borrar cuentas preexistentes.
create table if not exists public._fase7_profes_reusados (
  user_id    uuid primary key,
  email      text not null,
  created_at timestamptz not null default now()
);

insert into public._fase7_profes_reusados (user_id, email)
select t.user_id_existente, t.email_destino
  from _fase7_profes_auth t
 where t.user_id_existente is not null
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 2) auth.users: SOLO los profes sin cuenta previa.
--    Los tokens de GoTrue van en '' (no NULL): hay versiones con NOT NULL.
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  t.user_id_destino,
  'authenticated',
  'authenticated',
  t.email_destino,
  case
    when t.password_plano is null then null
    else extensions.crypt(t.password_plano, extensions.gen_salt('bf'))
  end,
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('nombre', t.nombre, 'slug', t.slug),
  '', '', '', ''
from _fase7_profes_auth t
where t.user_id_existente is null;

-- ---------------------------------------------------------------------------
-- 3) auth.identities (provider 'email'), para nuevos Y reusados sin identidad.
-- ---------------------------------------------------------------------------
insert into auth.identities (
  provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at, id
)
select
  t.user_id_destino::text,
  t.user_id_destino,
  jsonb_build_object(
    'sub',            t.user_id_destino::text,
    'email',          t.email_destino,
    'email_verified', true
  ),
  'email',
  now(), now(), now(),
  gen_random_uuid()
from _fase7_profes_auth t
where not exists (
  select 1 from auth.identities i
   where i.user_id = t.user_id_destino and i.provider = 'email'
);

-- ---------------------------------------------------------------------------
-- 4) Map de idempotencia (origen cf_profes → destino auth.users).
-- ---------------------------------------------------------------------------
insert into public._fase7_migracion_map (origen_tabla, origen_id, destino_tabla, destino_id)
select 'cf_profes', t.profe_id::text, 'auth.users', t.user_id_destino
  from _fase7_profes_auth t
on conflict (origen_tabla, origen_id, destino_tabla) do nothing;

-- ---------------------------------------------------------------------------
-- 5) Reporte de la corrida.
-- ---------------------------------------------------------------------------
select
  count(*)                                                          as profes_procesados,
  count(*) filter (where t.user_id_existente is null)               as usuarios_creados,
  count(*) filter (where t.user_id_existente is not null)           as usuarios_reusados,
  count(*) filter (where t.password_plano is null)                  as sin_password,
  count(*) filter (where t.email_destino like '%@migrado.invalid')  as con_email_placeholder
from _fase7_profes_auth t;

select
  (select count(*) from public.cf_profes)                                        as cf_profes_total,
  (select count(*) from public._fase7_migracion_map
    where origen_tabla = 'cf_profes' and destino_tabla = 'auth.users')            as mapeados_total;

commit;

-- ---------------------------------------------------------------------------
-- Verificación post-aplicación:
--   1) Todo profe quedó mapeado y su usuario existe:
--      select count(*) from public.cf_profes p
--       where not exists (
--         select 1 from public._fase7_migracion_map m
--          join auth.users u on u.id = m.destino_id
--          where m.origen_tabla = 'cf_profes' and m.origen_id = p.id::text
--       );   -- 0
--   2) Cada usuario nuevo tiene identidad 'email':
--      select count(*) from public._fase7_migracion_map m
--       where m.origen_tabla = 'cf_profes'
--         and not exists (select 1 from auth.identities i
--                          where i.user_id = m.destino_id and i.provider = 'email');   -- 0
--   3) Ningún hash quedó en texto plano (no debe empezar con $2):
--      select count(*) from auth.users u
--        join public._fase7_migracion_map m on m.destino_id = u.id
--       where m.origen_tabla = 'cf_profes'
--         and u.encrypted_password is not null
--         and u.encrypted_password not like '$2%';   -- 0
-- ---------------------------------------------------------------------------
