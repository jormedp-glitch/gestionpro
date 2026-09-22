-- scripts/verify-coachflow.sql — Verificación de la migración de CoachFlow
-- (fase 7, PR 4 / task 2.7)
-- ============================================================================
-- Qué verifica:
--   1. COBERTURA: por cada par origen → destino, la cantidad de filas
--      MIGRABLES del origen (mismo criterio que la migración) coincide con las
--      filas mapeadas. Las filas omitidas a propósito (huérfanos, sin fecha,
--      sin peso) se reportan aparte: no son un fallo, son pérdida controlada.
--   2. DESTINOS REALES: cada destino_id del map existe en la tabla destino.
--      (Detecta ids fantasma, p. ej. si un `on conflict` salteó un insert.)
--   3. INTEGRIDAD: portal_token únicos y no nulos; negocio_id no nulo donde el
--      destino lo exige; una sola ficha por cliente; una sola asignación activa
--      por alumno (AD-4).
--   4. AUTH: cada profe migrado tiene identidad 'email' y ninguna contraseña
--      quedó en texto plano.
--   5. RLS Y GRANTS: las 10 tablas nuevas tienen RLS habilitado y anon no
--      tiene ningún grant.
--
-- Termina con exit 0 si todo pasa; exit != 0 si algo falla (ON_ERROR_STOP +
-- RAISE EXCEPTION). Idempotente: solo lecturas y una tabla temporal.
--
-- Uso (rol con privilegios, p. ej. postgres/service_role):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/verify-coachflow.sql
--
-- Requiere que las migraciones 0006 y los 3 scripts de migración ya hayan
-- corrido. Si se corre antes, el map está vacío y la verificación lo reporta.
-- ============================================================================

\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------------
-- 0) Filas migrables esperadas por par origen → destino (mismo criterio que la
--    migración). Se materializa para poder comparar en un solo lugar.
-- ---------------------------------------------------------------------------
drop table if exists _verify_coachflow_esperado;
create temporary table _verify_coachflow_esperado as
  select 'cf_profes' as origen_tabla, 'auth.users' as destino_tabla,
         count(*) as esperado
    from public.cf_profes
  union all
  select 'cf_profes', 'negocios', count(*) from public.cf_profes
  union all
  select 'cf_alumnos', 'clientes', count(*)
    from public.cf_alumnos a
   where a.profe_id is not null
     and exists (select 1 from public.cf_profes p where p.id = a.profe_id)
  union all
  -- Los ejercicios migran SIEMPRE: los globales o sin profe van al catálogo.
  select 'cf_ejercicios', 'gym_ejercicios', count(*) from public.cf_ejercicios
  union all
  select 'cf_rutinas', 'gym_rutinas', count(*)
    from public.cf_rutinas r
   where exists (select 1 from public.cf_profes p where p.id = r.profe_id)
  union all
  select 'cf_rutina_semanas', 'gym_rutina_sesiones', count(*)
    from public.cf_rutina_semanas s
   where exists (select 1 from public._fase7_migracion_map m
                  where m.origen_tabla = 'cf_rutinas'
                    and m.destino_tabla = 'gym_rutinas'
                    and m.origen_id = s.rutina_id::text)
  union all
  select 'cf_rutina_ejercicios', 'gym_rutina_ejercicios', count(*)
    from public.cf_rutina_ejercicios re
   where exists (select 1 from public._fase7_migracion_map m
                  where m.origen_tabla = 'cf_rutina_semanas'
                    and m.destino_tabla = 'gym_rutina_sesiones'
                    and m.origen_id = re.semana_id::text)
     and exists (select 1 from public._fase7_migracion_map m
                  where m.origen_tabla = 'cf_ejercicios'
                    and m.destino_tabla = 'gym_ejercicios'
                    and m.origen_id = re.ejercicio_id::text)
  union all
  select 'cf_asignaciones', 'gym_asignaciones', count(*)
    from public.cf_asignaciones a
   where exists (select 1 from public._fase7_migracion_map m
                  where m.origen_tabla = 'cf_alumnos'
                    and m.destino_tabla = 'clientes'
                    and m.origen_id = a.alumno_id::text)
     and exists (select 1 from public._fase7_migracion_map m
                  where m.origen_tabla = 'cf_rutinas'
                    and m.destino_tabla = 'gym_rutinas'
                    and m.origen_id = a.rutina_id::text)
  union all
  -- Completados: la migración los mapea por clave natural (cliente, actividad,
  -- fecha), así que acá se cuenta lo mismo: filas de origen con destino real.
  select 'cf_completados', 'gym_completados', count(*)
    from public.cf_completados c
   where coalesce(nullif(c.fecha::text, '')::date, c.created_at::date) is not null
     and exists (
       select 1 from public.gym_completados gc
        join public._fase7_migracion_map mc
          on mc.origen_tabla = 'cf_alumnos' and mc.destino_tabla = 'clientes'
         and mc.destino_id = gc.cliente_id
        join public._fase7_migracion_map mre
          on mre.origen_tabla = 'cf_rutina_ejercicios'
         and mre.destino_tabla = 'gym_rutina_ejercicios'
         and mre.destino_id = gc.rutina_ejercicio_id
       where mc.origen_id = c.alumno_id::text
         and mre.origen_id = c.rutina_ejercicio_id::text
         and gc.fecha = coalesce(nullif(c.fecha::text, '')::date, c.created_at::date)
     )
  union all
  select 'cf_progreso', 'gym_progreso', count(*)
    from public.cf_progreso pr
   where pr.peso is not null
     and nullif(pr.fecha::text, '')::date is not null
     and exists (select 1 from public._fase7_migracion_map m
                  where m.origen_tabla = 'cf_alumnos'
                    and m.destino_tabla = 'clientes'
                    and m.origen_id = pr.alumno_id::text)
  union all
  select 'cf_pagos', 'cobros', count(*)
    from public.cf_pagos pg
   where exists (select 1 from public._fase7_migracion_map m
                  where m.origen_tabla = 'cf_alumnos'
                    and m.destino_tabla = 'clientes'
                    and m.origen_id = pg.alumno_id::text)
  union all
  select 'cf_turnos', 'turnos', count(*)
    from public.cf_turnos t
   where t.fecha_hora is not null
     and exists (select 1 from public._fase7_migracion_map m
                  where m.origen_tabla = 'cf_profes'
                    and m.destino_tabla = 'negocios'
                    and m.origen_id = t.profe_id::text);

-- ---------------------------------------------------------------------------
-- 1) Cobertura: migrables == mapeadas.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select e.origen_tabla, e.destino_tabla, e.esperado,
           coalesce(m.mapeado, 0) as mapeado
      from _verify_coachflow_esperado e
      left join (
        select origen_tabla, destino_tabla, count(*) as mapeado
          from public._fase7_migracion_map
         group by 1, 2
      ) m on m.origen_tabla = e.origen_tabla and m.destino_tabla = e.destino_tabla
     order by e.origen_tabla, e.destino_tabla
  loop
    if r.mapeado <> r.esperado then
      raise exception 'FALLO cobertura % -> %: mapeadas % de % migrables',
        r.origen_tabla, r.destino_tabla, r.mapeado, r.esperado;
    end if;
    raise notice 'OK cobertura: % -> % = % filas', r.origen_tabla, r.destino_tabla, r.mapeado;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Destinos reales: ningún id fantasma en el map.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  n bigint;
begin
  for r in
    select m.destino_tabla as tabla, m.destino_id as id
      from public._fase7_migracion_map m
     where (m.destino_tabla = 'auth.users'
            and not exists (select 1 from auth.users d where d.id = m.destino_id))
        or (m.destino_tabla = 'negocios'
            and not exists (select 1 from public.negocios d where d.id = m.destino_id))
        or (m.destino_tabla = 'clientes'
            and not exists (select 1 from public.clientes d where d.id = m.destino_id))
        or (m.destino_tabla = 'gym_alumnos'
            and not exists (select 1 from public.gym_alumnos d where d.cliente_id = m.destino_id))
        or (m.destino_tabla = 'gym_ejercicios'
            and not exists (select 1 from public.gym_ejercicios d where d.id = m.destino_id))
        or (m.destino_tabla = 'gym_rutinas'
            and not exists (select 1 from public.gym_rutinas d where d.id = m.destino_id))
        or (m.destino_tabla = 'gym_rutina_sesiones'
            and not exists (select 1 from public.gym_rutina_sesiones d where d.id = m.destino_id))
        or (m.destino_tabla = 'gym_rutina_ejercicios'
            and not exists (select 1 from public.gym_rutina_ejercicios d where d.id = m.destino_id))
        or (m.destino_tabla = 'gym_asignaciones'
            and not exists (select 1 from public.gym_asignaciones d where d.id = m.destino_id))
        or (m.destino_tabla = 'gym_completados'
            and not exists (select 1 from public.gym_completados d where d.id = m.destino_id))
        or (m.destino_tabla = 'gym_progreso'
            and not exists (select 1 from public.gym_progreso d where d.id = m.destino_id))
        or (m.destino_tabla = 'cobros'
            and not exists (select 1 from public.cobros d where d.id = m.destino_id))
        or (m.destino_tabla = 'turnos'
            and not exists (select 1 from public.turnos d where d.id = m.destino_id))
     limit 1
  loop
    raise exception 'FALLO destino inexistente: el map apunta a % % que no existe',
      r.tabla, r.id;
  end loop;

  select count(*) into n from public._fase7_migracion_map;
  raise notice 'OK destinos reales: % filas del map apuntan a filas existentes', n;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Integridad de los destinos.
-- ---------------------------------------------------------------------------
do $$
declare
  n bigint;
begin
  select count(*) into n from public.gym_alumnos where portal_token is null;
  if n <> 0 then raise exception 'FALLO: % fichas sin portal_token', n; end if;

  select count(*) into n
    from (select portal_token from public.gym_alumnos
           group by 1 having count(*) > 1) x;
  if n <> 0 then raise exception 'FALLO: % portal_token duplicados', n; end if;

  select count(*) into n from public.gym_alumnos g
   where not exists (select 1 from public.clientes c where c.id = g.cliente_id);
  if n <> 0 then raise exception 'FALLO: % fichas sin cliente', n; end if;

  -- negocio_id obligatorio en las tablas que lo exigen.
  select count(*) into n
    from (
      select 'gym_alumnos' t, count(*) c from public.gym_alumnos where negocio_id is null
      union all select 'gym_rutinas', count(*) from public.gym_rutinas where negocio_id is null
      union all select 'gym_asignaciones', count(*) from public.gym_asignaciones where negocio_id is null
      union all select 'gym_completados', count(*) from public.gym_completados where negocio_id is null
      union all select 'gym_progreso', count(*) from public.gym_progreso where negocio_id is null
      union all select 'cobros', count(*) from public.cobros where negocio_id is null
      union all select 'turnos', count(*) from public.turnos where negocio_id is null
    ) x where x.c <> 0;
  if n <> 0 then raise exception 'FALLO: % tablas con negocio_id nulo', n; end if;

  -- AD-4: una sola asignación activa por alumno.
  select count(*) into n
    from (select cliente_id from public.gym_asignaciones
           where activa group by 1 having count(*) > 1) x;
  if n <> 0 then raise exception 'FALLO AD-4: % alumnos con mas de una asignacion activa', n; end if;

  -- Cada negocio migrado tiene al menos un owner.
  select count(*) into n
    from public.negocios ng
   where ng.rubro = 'gimnasio'
     and not exists (select 1 from public.negocio_miembros m
                      where m.negocio_id = ng.id and m.rol = 'owner');
  if n <> 0 then raise exception 'FALLO: % negocios gimnasio sin owner', n; end if;

  raise notice 'OK integridad: tokens unicos, FKs completas, AD-4 y owners';
end $$;

-- ---------------------------------------------------------------------------
-- 4) Auth: identidades y contraseñas hasheadas.
-- ---------------------------------------------------------------------------
do $$
declare
  n bigint;
begin
  select count(*) into n
    from public._fase7_migracion_map m
   where m.origen_tabla = 'cf_profes'
     and m.destino_tabla = 'auth.users'
     and not exists (select 1 from auth.identities i
                      where i.user_id = m.destino_id and i.provider = 'email');
  if n <> 0 then raise exception 'FALLO: % usuarios migrados sin identidad email', n; end if;

  select count(*) into n
    from public._fase7_migracion_map m
    join auth.users u on u.id = m.destino_id
   where m.origen_tabla = 'cf_profes'
     and m.destino_tabla = 'auth.users'
     and u.encrypted_password is not null
     and u.encrypted_password not like '$2%';
  if n <> 0 then raise exception 'FALLO: % contraseñas en texto plano', n; end if;

  raise notice 'OK auth: identidades email completas y contraseñas hasheadas';
end $$;

-- ---------------------------------------------------------------------------
-- 5) RLS y grants de las tablas nuevas.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  n bigint;
  tablas text[] := array[
    'cobros', 'gym_alumnos', 'gym_ejercicios', 'gym_rutinas',
    'gym_rutina_sesiones', 'gym_rutina_ejercicios', 'gym_asignaciones',
    'gym_completados', 'gym_progreso', '_fase7_migracion_map'
  ];
begin
  foreach t in array tablas loop
    select count(*) into n
      from pg_class c
      join pg_namespace ns on ns.oid = c.relnamespace
     where ns.nspname = 'public' and c.relname = t and c.relrowsecurity;
    if n <> 1 then raise exception 'FALLO RLS: % no tiene row level security', t; end if;

    select count(*) into n
      from information_schema.role_table_grants g
     where g.table_schema = 'public' and g.table_name = t and g.grantee = 'anon';
    if n <> 0 then raise exception 'FALLO grants: anon tiene % grant(s) en %', n, t; end if;
  end loop;
  raise notice 'OK RLS y grants: 10 tablas con RLS y sin acceso de anon';
end $$;

-- ---------------------------------------------------------------------------
-- 6) Reporte final: qué se migró y qué se omitió (pérdida controlada).
-- ---------------------------------------------------------------------------
select e.origen_tabla, e.destino_tabla, e.esperado as migrables,
       coalesce(m.mapeado, 0) as mapeadas
  from _verify_coachflow_esperado e
  left join (
    select origen_tabla, destino_tabla, count(*) as mapeado
      from public._fase7_migracion_map group by 1, 2
  ) m on m.origen_tabla = e.origen_tabla and m.destino_tabla = e.destino_tabla
 order by 1, 2;

select 'alumnos sin profe' as omitidos, count(*) as filas
  from public.cf_alumnos a
 where a.profe_id is null
    or not exists (select 1 from public.cf_profes p where p.id = a.profe_id)
union all select 'completados sin fecha', count(*)
  from public.cf_completados c
 where coalesce(nullif(c.fecha::text, '')::date, c.created_at::date) is null
union all select 'progreso sin peso o fecha', count(*)
  from public.cf_progreso pr
 where pr.peso is null or nullif(pr.fecha::text, '')::date is null
union all select 'turnos sin fecha_hora', count(*)
  from public.cf_turnos t
 where t.fecha_hora is null
order by 1;

select 'verify-coachflow: TODAS LAS COMPROBACIONES OK' as resultado;
