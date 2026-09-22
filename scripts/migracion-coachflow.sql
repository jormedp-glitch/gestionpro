-- scripts/migracion-coachflow.sql — Migración de datos de CoachFlow: negocio,
-- personas y catálogo de entrenamiento (fase 7, PR 3a / tasks 2.2–2.4)
-- ============================================================================
-- PRERREQUISITOS (no saltear):
--   1. Migraciones 0001 → 0006 aplicadas.
--   2. scripts/migracion-coachflow-auth.sql EJECUTADO: cada cf_profes tiene su
--      fila en _fase7_migracion_map (cf_profes → auth.users). Sin eso no hay
--      owner para negocio_miembros y el script falla en la guarda 0a.
--   3. Backup verificado. Ver scripts/backup-bootstrap.md.
--
-- ALCANCE (primera mitad del orden de migración del design):
--   negocios + negocio_miembros → clientes + gym_alumnos → gym_ejercicios →
--   gym_rutinas → gym_rutina_sesiones → gym_rutina_ejercicios.
--   La segunda mitad (asignaciones, completados, progreso, cobros y turnos)
--   está en scripts/migracion-coachflow-actividad.sql y se corre DESPUÉS.
--
-- CONTRATO:
--   - transaccional (begin/commit) e IDEMPOTENTE por _fase7_migracion_map:
--     re-ejecutarlo no duplica nada.
--   - Pérdida controlada: las filas que no pueden cumplir el destino se OMITEN
--     y se cuentan en el reporte final (nunca se inventan datos):
--       · alumnos sin profe resoluble (huérfanos)
--       · rutinas/actividades sin negocio o sin padre resoluble
--   - AD-3: los ejercicios globales (es_global) o sin profe resoluble van al
--     catálogo compartido (negocio_id NULL), que es de solo lectura.
--   - `clientes.vence` se recalcula como proximoVencimiento(último pago, hoy),
--     la misma regla de lib/domain/cuotas.ts: ancla = último pago si es futuro,
--     si no hoy; + 1 mes con clamp de fin de mes (Postgres lo hace en
--     date + interval '1 month'). El estado del cliente NO se lee de la columna
--     `estado`: se deriva del vence (regla existente).
--   - `cf_alumnos.estado` se PRESERVA en clientes.estado (R17), aunque la UI no
--     lo lea, para no perder el dato de origen.
--   - CASTS DEFENSIVOS: varias columnas de cf_* son texto libre en el proyecto
--     original (fecha, fecha_hora). Se castean explícitamente (::date,
--     ::timestamp) para que el script funcione tanto si la columna es date como
--     si es text.
--
-- ROLLBACK: scripts/rollback-coachflow.sql (borra los destinos por el map, en
-- orden inverso; las cf_* quedan intactas).
-- ============================================================================

\set ON_ERROR_STOP on

begin;

-- ---------------------------------------------------------------------------
-- 0) Guardas
-- ---------------------------------------------------------------------------

-- 0a) La migración de auth tiene que haber corrido.
do $$
declare
  n bigint;
begin
  select count(*) into n
    from public.cf_profes p
   where not exists (
     select 1 from public._fase7_migracion_map m
      where m.origen_tabla = 'cf_profes'
        and m.destino_tabla = 'auth.users'
        and m.origen_id = p.id::text
   );
  if n <> 0 then
    raise exception 'Hay % profes sin migrar a auth.users. Corre scripts/migracion-coachflow-auth.sql primero.', n;
  end if;
end $$;

-- 0b) Alumnos huérfanos (sin profe): se omiten, pero se avisa ANTES de escribir.
do $$
declare
  n bigint;
begin
  select count(*) into n
    from public.cf_alumnos a
   where a.profe_id is null
      or not exists (select 1 from public.cf_profes p where p.id = a.profe_id);
  if n > 0 then
    raise warning 'Hay % alumnos sin profe: se OMITEN (ver reporte final).', n;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1) Profes → negocios + negocio_miembros(owner)  (R16)
-- ---------------------------------------------------------------------------
create temporary table _fase7_negocios on commit drop as
select
  p.id                     as profe_id,
  p.nombre,
  p.slug                   as base_slug,
  coalesce(p.activo, true) as activo,
  m.destino_id             as user_id,
  null::text               as slug_final
from public.cf_profes p
join public._fase7_migracion_map m
  on m.origen_tabla = 'cf_profes'
 and m.destino_tabla = 'auth.users'
 and m.origen_id = p.id::text
where not exists (
  select 1 from public._fase7_migracion_map m2
   where m2.origen_tabla = 'cf_profes'
     and m2.destino_tabla = 'negocios'
     and m2.origen_id = p.id::text
);

-- slug: el de CoachFlow; si choca con un negocio existente o con otro nuevo, se
-- agrega -gym (y -gym2, -gym3... hasta encontrar uno libre).
do $$
declare
  r record;
  v_slug text;
  v_n int;
begin
  for r in select profe_id, base_slug from _fase7_negocios order by base_slug, profe_id loop
    v_slug := r.base_slug;
    v_n := 0;
    while exists (select 1 from public.negocios n where n.slug = v_slug)
       or exists (select 1 from _fase7_negocios t where t.slug_final = v_slug) loop
      v_n := v_n + 1;
      v_slug := r.base_slug || '-gym' || case when v_n > 1 then v_n::text else '' end;
    end loop;
    update _fase7_negocios set slug_final = v_slug where profe_id = r.profe_id;
  end loop;
end $$;

with nuevos as (
  select t.profe_id, t.nombre, t.slug_final, t.activo, gen_random_uuid() as destino_id
    from _fase7_negocios t
), ins as (
  insert into public.negocios (id, nombre, slug, rubro, activo)
  select n.destino_id, n.nombre, n.slug_final, 'gimnasio', n.activo
    from nuevos n
  returning id
)
insert into public._fase7_migracion_map (origen_tabla, origen_id, destino_tabla, destino_id)
select 'cf_profes', n.profe_id::text, 'negocios', n.destino_id
  from nuevos n
on conflict (origen_tabla, origen_id, destino_tabla) do nothing;

-- Owner: el profe migrado es dueño de su negocio.
insert into public.negocio_miembros (negocio_id, user_id, rol)
select mn.destino_id, mu.destino_id, 'owner'
  from public._fase7_migracion_map mn
  join public._fase7_migracion_map mu
    on mu.origen_tabla = 'cf_profes'
   and mu.origen_id = mn.origen_id
   and mu.destino_tabla = 'auth.users'
 where mn.origen_tabla = 'cf_profes'
   and mn.destino_tabla = 'negocios'
on conflict (negocio_id, user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 2) Alumnos → clientes + gym_alumnos  (R17)
-- ---------------------------------------------------------------------------
create temporary table _fase7_alumnos on commit drop as
select
  a.id                                as alumno_id,
  a.nombre,
  a.telefono,
  a.email,
  a.estado,
  a.objetivo,
  a.notas,
  a.altura_cm,
  nullif(a.fecha_nac::text, '')::date as fecha_nac,
  a.codigo_acceso,
  mn.destino_id                       as negocio_id,
  -- proximoVencimiento(último pago, hoy)
  ((case
      when lp.ultimo_pago is null or lp.ultimo_pago < current_date then current_date
      else lp.ultimo_pago
    end) + interval '1 month')::date  as vence,
  gen_random_uuid()                   as cliente_id
from public.cf_alumnos a
join public._fase7_migracion_map mn
  on mn.origen_tabla = 'cf_profes'
 and mn.destino_tabla = 'negocios'
 and mn.origen_id = a.profe_id::text
left join lateral (
  select max(nullif(pg.fecha::text, '')::date) as ultimo_pago
    from public.cf_pagos pg
   where pg.alumno_id = a.id
) lp on true
where not exists (
  select 1 from public._fase7_migracion_map m2
   where m2.origen_tabla = 'cf_alumnos' and m2.origen_id = a.id::text
);

with nuevos as (
  select t.alumno_id, t.cliente_id, t.negocio_id, t.nombre, t.telefono, t.email, t.vence, t.estado
    from _fase7_alumnos t
), ins as (
  insert into public.clientes (id, negocio_id, nombre, telefono, email, plan, cuota, vence, estado)
  select n.cliente_id, n.negocio_id, n.nombre, n.telefono, n.email, null, null, n.vence, n.estado
    from nuevos n
  returning id
)
insert into public._fase7_migracion_map (origen_tabla, origen_id, destino_tabla, destino_id)
select 'cf_alumnos', n.alumno_id::text, 'clientes', n.cliente_id
  from nuevos n
on conflict (origen_tabla, origen_id, destino_tabla) do nothing;

-- Ficha gym 1:1. portal_token es NUEVO (capacidad del portal, AD-2);
-- codigo_acceso se conserva como dato legacy y NO otorga acceso.
insert into public.gym_alumnos
  (cliente_id, negocio_id, objetivo, notas, altura_cm, fecha_nac, portal_token, codigo_acceso)
select t.cliente_id, t.negocio_id, t.objetivo, t.notas, t.altura_cm, t.fecha_nac,
       gen_random_uuid(), t.codigo_acceso
  from _fase7_alumnos t
on conflict (cliente_id) do nothing;

-- ---------------------------------------------------------------------------
-- 3) Ejercicios → gym_ejercicios  (R18 / AD-3)
--    es_global o profe no resoluble → negocio_id NULL (catálogo compartido):
--    no se pierde el ejercicio y queda de solo lectura.
-- ---------------------------------------------------------------------------
with nuevos as (
  select
    e.id as ejercicio_id,
    case when coalesce(e.es_global, false) then null else mn.destino_id end as negocio_id,
    e.nombre,
    e.grupo_muscular,
    e.descripcion,
    e.url_video,
    coalesce(e.activo, true) as activo,
    gen_random_uuid() as destino_id
  from public.cf_ejercicios e
  left join public._fase7_migracion_map mn
    on mn.origen_tabla = 'cf_profes'
   and mn.destino_tabla = 'negocios'
   and mn.origen_id = e.profe_id::text
  where not exists (
    select 1 from public._fase7_migracion_map m2
     where m2.origen_tabla = 'cf_ejercicios' and m2.origen_id = e.id::text
  )
), ins as (
  insert into public.gym_ejercicios
    (id, negocio_id, nombre, grupo_muscular, descripcion, url_video, activo)
  select n.destino_id, n.negocio_id, n.nombre, n.grupo_muscular, n.descripcion, n.url_video, n.activo
    from nuevos n
  returning id
)
insert into public._fase7_migracion_map (origen_tabla, origen_id, destino_tabla, destino_id)
select 'cf_ejercicios', n.ejercicio_id::text, 'gym_ejercicios', n.destino_id
  from nuevos n
on conflict (origen_tabla, origen_id, destino_tabla) do nothing;

-- ---------------------------------------------------------------------------
-- 4) Rutinas → gym_rutinas  (R18)
--    sesiones_total = greatest(coalesce(semanas_total, 1), 1) por el CHECK > 0.
-- ---------------------------------------------------------------------------
with nuevos as (
  select
    r.id as rutina_id,
    mn.destino_id as negocio_id,
    r.nombre,
    r.descripcion,
    greatest(coalesce(r.semanas_total, 1), 1) as sesiones_total,
    coalesce(r.activo, true) as activo,
    gen_random_uuid() as destino_id
  from public.cf_rutinas r
  join public._fase7_migracion_map mn
    on mn.origen_tabla = 'cf_profes'
   and mn.destino_tabla = 'negocios'
   and mn.origen_id = r.profe_id::text
  where not exists (
    select 1 from public._fase7_migracion_map m2
     where m2.origen_tabla = 'cf_rutinas' and m2.origen_id = r.id::text
  )
), ins as (
  insert into public.gym_rutinas (id, negocio_id, nombre, descripcion, sesiones_total, activo)
  select n.destino_id, n.negocio_id, n.nombre, n.descripcion, n.sesiones_total, n.activo
    from nuevos n
  returning id
)
insert into public._fase7_migracion_map (origen_tabla, origen_id, destino_tabla, destino_id)
select 'cf_rutinas', n.rutina_id::text, 'gym_rutinas', n.destino_id
  from nuevos n
on conflict (origen_tabla, origen_id, destino_tabla) do nothing;

-- ---------------------------------------------------------------------------
-- 5) Semanas → gym_rutina_sesiones  (numero_semana → numero_sesion)
-- ---------------------------------------------------------------------------
with nuevos as (
  select
    s.id as semana_id,
    mr.destino_id as rutina_id,
    gr.negocio_id as negocio_id,
    s.numero_semana as numero_sesion,
    gen_random_uuid() as destino_id
  from public.cf_rutina_semanas s
  join public._fase7_migracion_map mr
    on mr.origen_tabla = 'cf_rutinas'
   and mr.destino_tabla = 'gym_rutinas'
   and mr.origen_id = s.rutina_id::text
  join public.gym_rutinas gr on gr.id = mr.destino_id
  where not exists (
    select 1 from public._fase7_migracion_map m2
     where m2.origen_tabla = 'cf_rutina_semanas' and m2.origen_id = s.id::text
  )
), ins as (
  insert into public.gym_rutina_sesiones (id, negocio_id, rutina_id, numero_sesion)
  select n.destino_id, n.negocio_id, n.rutina_id, n.numero_sesion
    from nuevos n
  returning id
)
insert into public._fase7_migracion_map (origen_tabla, origen_id, destino_tabla, destino_id)
select 'cf_rutina_semanas', n.semana_id::text, 'gym_rutina_sesiones', n.destino_id
  from nuevos n
on conflict (origen_tabla, origen_id, destino_tabla) do nothing;

-- ---------------------------------------------------------------------------
-- 6) Actividades → gym_rutina_ejercicios  (orden NULL → 0)
-- ---------------------------------------------------------------------------
with nuevos as (
  select
    re.id as actividad_id,
    ms.destino_id as sesion_id,
    gs.negocio_id as negocio_id,
    me.destino_id as ejercicio_id,
    re.series,
    re.repeticiones,
    re.descanso_seg,
    re.notas,
    coalesce(re.orden, 0) as orden,
    gen_random_uuid() as destino_id
  from public.cf_rutina_ejercicios re
  join public._fase7_migracion_map ms
    on ms.origen_tabla = 'cf_rutina_semanas'
   and ms.destino_tabla = 'gym_rutina_sesiones'
   and ms.origen_id = re.semana_id::text
  join public.gym_rutina_sesiones gs on gs.id = ms.destino_id
  join public._fase7_migracion_map me
    on me.origen_tabla = 'cf_ejercicios'
   and me.destino_tabla = 'gym_ejercicios'
   and me.origen_id = re.ejercicio_id::text
  where not exists (
    select 1 from public._fase7_migracion_map m2
     where m2.origen_tabla = 'cf_rutina_ejercicios' and m2.origen_id = re.id::text
  )
), ins as (
  insert into public.gym_rutina_ejercicios
    (id, negocio_id, sesion_id, ejercicio_id, series, repeticiones, descanso_seg, notas, orden)
  select n.destino_id, n.negocio_id, n.sesion_id, n.ejercicio_id,
         n.series, n.repeticiones, n.descanso_seg, n.notas, n.orden
    from nuevos n
  returning id
)
insert into public._fase7_migracion_map (origen_tabla, origen_id, destino_tabla, destino_id)
select 'cf_rutina_ejercicios', n.actividad_id::text, 'gym_rutina_ejercicios', n.destino_id
  from nuevos n
on conflict (origen_tabla, origen_id, destino_tabla) do nothing;

commit;

-- ---------------------------------------------------------------------------
-- 7) Reporte de esta mitad: origen vs destino y omitidos.
-- ---------------------------------------------------------------------------
select 'cf_profes' as origen, count(*) as filas from public.cf_profes
union all select 'cf_alumnos',           count(*) from public.cf_alumnos
union all select 'cf_ejercicios',        count(*) from public.cf_ejercicios
union all select 'cf_rutinas',           count(*) from public.cf_rutinas
union all select 'cf_rutina_semanas',    count(*) from public.cf_rutina_semanas
union all select 'cf_rutina_ejercicios', count(*) from public.cf_rutina_ejercicios
order by 1;

select origen_tabla, destino_tabla, count(*) as mapeados
  from public._fase7_migracion_map
 group by 1, 2
 order by 1;

-- Omitidos (pérdida controlada): cada fila de acá es un dato que NO se migró.
select 'alumnos sin profe' as omitidos, count(*) as filas
  from public.cf_alumnos a
 where a.profe_id is null
    or not exists (select 1 from public.cf_profes p where p.id = a.profe_id);
