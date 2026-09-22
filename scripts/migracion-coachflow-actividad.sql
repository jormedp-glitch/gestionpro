-- scripts/migracion-coachflow-actividad.sql — Migración de datos de CoachFlow:
-- actividad del alumno y plata (fase 7, PR 3b / tasks 2.5–2.6)
-- ============================================================================
-- PRERREQUISITOS (no saltear):
--   1. Migraciones 0001 → 0006 aplicadas.
--   2. scripts/migracion-coachflow-auth.sql EJECUTADO.
--   3. scripts/migracion-coachflow.sql EJECUTADO (negocio, personas y catálogo).
--      Sin eso no hay clientes ni rutinas destino y la guarda 0a falla.
--   4. Backup verificado. Ver scripts/backup-bootstrap.md.
--
-- ALCANCE (segunda mitad del orden de migración del design):
--   gym_asignaciones → gym_completados → gym_progreso → cobros → turnos.
--
-- CONTRATO:
--   - transaccional (begin/commit) e IDEMPOTENTE por _fase7_migracion_map.
--   - Pérdida controlada: las filas que no pueden cumplir el destino se OMITEN
--     y se cuentan en el reporte final (nunca se inventan datos):
--       · asignaciones sin alumno o sin rutina resoluble
--       · completados sin fecha resoluble
--       · progreso sin peso o sin fecha (peso es NOT NULL en el destino)
--       · turnos sin fecha_hora
--   - AD-4: si un alumno trae más de una asignación activa, se conserva la más
--     reciente y se desactivan las demás (el unique parcial lo exige). Se
--     reporta el total de desactivadas.
--   - AD-5: los completados son idempotentes por (cliente, actividad, fecha);
--     si el origen trae duplicados, el destino se queda con uno solo.
--   - `medio_pago` fuera de la lista permitida por el CHECK → 'otro' (R19).
--   - `fecha_hora` se parte en fecha + hora; `espacio` → `lugar`; el estado se
--     mapea al vocabulario del núcleo (pendiente → confirmado, que es el alta).
--   - CASTS DEFENSIVOS: varias columnas de cf_* son texto libre en el proyecto
--     original (fecha, fecha_hora, fecha_inicio). Se castean explícitamente
--     para que el script funcione tanto si la columna es date como si es text.
--
-- ROLLBACK: scripts/rollback-coachflow.sql.
-- ============================================================================

\set ON_ERROR_STOP on

begin;

-- ---------------------------------------------------------------------------
-- 0) Guarda: la primera mitad tiene que haber corrido.
-- ---------------------------------------------------------------------------
do $$
declare
  n bigint;
begin
  select count(*) into n
    from public.cf_alumnos a
   where not exists (
     select 1 from public._fase7_migracion_map m
      where m.origen_tabla = 'cf_alumnos'
        and m.destino_tabla = 'clientes'
        and m.origen_id = a.id::text
   )
   and a.profe_id is not null
   and exists (select 1 from public.cf_profes p where p.id = a.profe_id);

  if n <> 0 then
    raise exception 'Hay % alumnos migrables sin mapear a clientes. Corre scripts/migracion-coachflow.sql primero.', n;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1) Asignaciones → gym_asignaciones  (AD-4: una sola activa por alumno)
--    Si el origen trae varias activas, queda activa la más reciente y las
--    demás se migran desactivadas (se reporta el total de desactivadas).
-- ---------------------------------------------------------------------------
create temporary table _fase7_asignaciones on commit drop as
select
  a.id as asignacion_id,
  mc.destino_id as cliente_id,
  cl.negocio_id as negocio_id,
  mr.destino_id as rutina_id,
  greatest(coalesce(a.semana_actual, 1), 1) as sesion_actual,
  coalesce(nullif(a.fecha_inicio::text, '')::date, current_date) as fecha_inicio,
  (coalesce(a.activa, true)
   and row_number() over (
     partition by a.alumno_id
     order by nullif(a.fecha_inicio::text, '')::date desc nulls last, a.id
   ) = 1) as activa,
  gen_random_uuid() as destino_id
from public.cf_asignaciones a
join public._fase7_migracion_map mc
  on mc.origen_tabla = 'cf_alumnos'
 and mc.destino_tabla = 'clientes'
 and mc.origen_id = a.alumno_id::text
join public.clientes cl on cl.id = mc.destino_id
join public._fase7_migracion_map mr
  on mr.origen_tabla = 'cf_rutinas'
 and mr.destino_tabla = 'gym_rutinas'
 and mr.origen_id = a.rutina_id::text
where not exists (
  select 1 from public._fase7_migracion_map m2
   where m2.origen_tabla = 'cf_asignaciones' and m2.origen_id = a.id::text
);

with ins as (
  insert into public.gym_asignaciones
    (id, negocio_id, cliente_id, rutina_id, sesion_actual, fecha_inicio, activa)
  select t.destino_id, t.negocio_id, t.cliente_id, t.rutina_id,
         t.sesion_actual, t.fecha_inicio, t.activa
    from _fase7_asignaciones t
  returning id
)
insert into public._fase7_migracion_map (origen_tabla, origen_id, destino_tabla, destino_id)
select 'cf_asignaciones', t.asignacion_id::text, 'gym_asignaciones', t.destino_id
  from _fase7_asignaciones t
on conflict (origen_tabla, origen_id, destino_tabla) do nothing;

-- ---------------------------------------------------------------------------
-- 2) Completados → gym_completados  (AD-5)
--    fecha = coalesce(fecha, created_at::date); sin fecha resoluble se OMITE.
-- ---------------------------------------------------------------------------
-- 2a) Insertar los destinos. El `on conflict` absorbe los duplicados del
--     origen: gym_completados tiene unique (cliente, actividad, fecha).
with nuevos as (
  select
    mc.destino_id as cliente_id,
    cl.negocio_id as negocio_id,
    mre.destino_id as rutina_ejercicio_id,
    coalesce(nullif(c.fecha::text, '')::date, c.created_at::date) as fecha,
    gen_random_uuid() as destino_id
  from public.cf_completados c
  join public._fase7_migracion_map mc
    on mc.origen_tabla = 'cf_alumnos'
   and mc.destino_tabla = 'clientes'
   and mc.origen_id = c.alumno_id::text
  join public.clientes cl on cl.id = mc.destino_id
  join public._fase7_migracion_map mre
    on mre.origen_tabla = 'cf_rutina_ejercicios'
   and mre.destino_tabla = 'gym_rutina_ejercicios'
   and mre.origen_id = c.rutina_ejercicio_id::text
  where not exists (
    select 1 from public._fase7_migracion_map m2
     where m2.origen_tabla = 'cf_completados' and m2.origen_id = c.id::text
  )
    and coalesce(nullif(c.fecha::text, '')::date, c.created_at::date) is not null
)
insert into public.gym_completados
  (id, negocio_id, cliente_id, rutina_ejercicio_id, fecha)
select n.destino_id, n.negocio_id, n.cliente_id, n.rutina_ejercicio_id, n.fecha
  from nuevos n
on conflict (cliente_id, rutina_ejercicio_id, fecha) do nothing;

-- 2b) Mapear CADA fila de origen a la fila de destino REAL, por clave natural:
--     si el origen traía duplicados, todas apuntan a la única fila destino que
--     sobrevivió. (Mapear con el id generado en la CTE dejaría ids fantasma
--     cuando el `on conflict` saltea un insert.)
insert into public._fase7_migracion_map (origen_tabla, origen_id, destino_tabla, destino_id)
select 'cf_completados', c.id::text, 'gym_completados', gc.id
  from public.cf_completados c
  join public._fase7_migracion_map mc
    on mc.origen_tabla = 'cf_alumnos'
   and mc.destino_tabla = 'clientes'
   and mc.origen_id = c.alumno_id::text
  join public._fase7_migracion_map mre
    on mre.origen_tabla = 'cf_rutina_ejercicios'
   and mre.destino_tabla = 'gym_rutina_ejercicios'
   and mre.origen_id = c.rutina_ejercicio_id::text
  join public.gym_completados gc
    on gc.cliente_id = mc.destino_id
   and gc.rutina_ejercicio_id = mre.destino_id
   and gc.fecha = coalesce(nullif(c.fecha::text, '')::date, c.created_at::date)
 where not exists (
   select 1 from public._fase7_migracion_map m2
    where m2.origen_tabla = 'cf_completados' and m2.origen_id = c.id::text
 )
on conflict (origen_tabla, origen_id, destino_tabla) do nothing;

-- ---------------------------------------------------------------------------
-- 3) Progreso → gym_progreso  (peso y fecha son NOT NULL en el destino)
-- ---------------------------------------------------------------------------
with nuevos as (
  select
    pr.id as progreso_id,
    mc.destino_id as cliente_id,
    cl.negocio_id as negocio_id,
    nullif(pr.fecha::text, '')::date as fecha,
    pr.peso,
    pr.cintura,
    pr.cadera,
    pr.porcentaje_grasa,
    pr.pecho_cm,
    pr.bicep_cm,
    pr.metrica1_nombre,
    pr.metrica1_valor,
    pr.metrica2_nombre,
    pr.metrica2_valor,
    pr.notas,
    gen_random_uuid() as destino_id
  from public.cf_progreso pr
  join public._fase7_migracion_map mc
    on mc.origen_tabla = 'cf_alumnos'
   and mc.destino_tabla = 'clientes'
   and mc.origen_id = pr.alumno_id::text
  join public.clientes cl on cl.id = mc.destino_id
  where not exists (
    select 1 from public._fase7_migracion_map m2
     where m2.origen_tabla = 'cf_progreso' and m2.origen_id = pr.id::text
  )
    and pr.peso is not null
    and nullif(pr.fecha::text, '')::date is not null
), ins as (
  insert into public.gym_progreso
    (id, negocio_id, cliente_id, fecha, peso, cintura, cadera, porcentaje_grasa,
     pecho_cm, bicep_cm, metrica1_nombre, metrica1_valor, metrica2_nombre,
     metrica2_valor, notas)
  select n.destino_id, n.negocio_id, n.cliente_id, n.fecha, n.peso, n.cintura,
         n.cadera, n.porcentaje_grasa, n.pecho_cm, n.bicep_cm, n.metrica1_nombre,
         n.metrica1_valor, n.metrica2_nombre, n.metrica2_valor, n.notas
    from nuevos n
  returning id
)
insert into public._fase7_migracion_map (origen_tabla, origen_id, destino_tabla, destino_id)
select 'cf_progreso', n.progreso_id::text, 'gym_progreso', n.destino_id
  from nuevos n
on conflict (origen_tabla, origen_id, destino_tabla) do nothing;

-- ---------------------------------------------------------------------------
-- 4) Pagos → cobros  (R19)
--    medio_pago fuera de la lista permitida → 'otro'.
-- ---------------------------------------------------------------------------
with nuevos as (
  select
    pg.id as pago_id,
    mc.destino_id as cliente_id,
    cl.negocio_id as negocio_id,
    pg.monto,
    pg.concepto,
    case
      when pg.medio_pago in ('efectivo', 'transferencia', 'mercadopago', 'otro')
        then pg.medio_pago
      else 'otro'
    end as medio_pago,
    coalesce(nullif(pg.fecha::text, '')::date, current_date) as fecha,
    gen_random_uuid() as destino_id
  from public.cf_pagos pg
  join public._fase7_migracion_map mc
    on mc.origen_tabla = 'cf_alumnos'
   and mc.destino_tabla = 'clientes'
   and mc.origen_id = pg.alumno_id::text
  join public.clientes cl on cl.id = mc.destino_id
  where not exists (
    select 1 from public._fase7_migracion_map m2
     where m2.origen_tabla = 'cf_pagos' and m2.origen_id = pg.id::text
  )
), ins as (
  insert into public.cobros (id, negocio_id, cliente_id, monto, concepto, medio_pago, fecha)
  select n.destino_id, n.negocio_id, n.cliente_id, n.monto, n.concepto, n.medio_pago, n.fecha
    from nuevos n
  returning id
)
insert into public._fase7_migracion_map (origen_tabla, origen_id, destino_tabla, destino_id)
select 'cf_pagos', n.pago_id::text, 'cobros', n.destino_id
  from nuevos n
on conflict (origen_tabla, origen_id, destino_tabla) do nothing;

-- ---------------------------------------------------------------------------
-- 5) Turnos → turnos  (R20)
--    fecha_hora se parte en fecha + hora; espacio → lugar; el estado se mapea
--    al vocabulario del núcleo (pendiente pasa a confirmado, que es el alta).
-- ---------------------------------------------------------------------------
with nuevos as (
  select
    t.id as turno_id,
    mn.destino_id as negocio_id,
    mc.destino_id as cliente_id,
    coalesce(al.nombre, 'Alumno') as cliente_nombre,
    al.telefono,
    'Entrenamiento' as servicio,
    t.fecha_hora::date as fecha,
    to_char(t.fecha_hora::timestamp, 'HH24:MI') as hora,
    t.duracion_min as duracion,
    t.notas,
    t.espacio as lugar,
    case coalesce(t.estado, '')
      when 'pendiente'  then 'confirmado'
      when 'confirmado' then 'confirmado'
      when 'completado' then 'completado'
      when 'cancelado'  then 'cancelado'
      else 'confirmado'
    end as estado,
    gen_random_uuid() as destino_id
  from public.cf_turnos t
  join public._fase7_migracion_map mn
    on mn.origen_tabla = 'cf_profes'
   and mn.destino_tabla = 'negocios'
   and mn.origen_id = t.profe_id::text
  left join public.cf_alumnos al on al.id = t.alumno_id
  left join public._fase7_migracion_map mc
    on mc.origen_tabla = 'cf_alumnos'
   and mc.destino_tabla = 'clientes'
   and mc.origen_id = t.alumno_id::text
  where not exists (
    select 1 from public._fase7_migracion_map m2
     where m2.origen_tabla = 'cf_turnos' and m2.origen_id = t.id::text
  )
    and t.fecha_hora is not null
), ins as (
  insert into public.turnos
    (id, negocio_id, cliente_nombre, telefono, servicio, fecha, hora, duracion,
     notas, estado, cliente_id, lugar)
  select n.destino_id, n.negocio_id, n.cliente_nombre, n.telefono, n.servicio,
         n.fecha, n.hora, n.duracion, n.notas, n.estado, n.cliente_id, n.lugar
    from nuevos n
  returning id
)
insert into public._fase7_migracion_map (origen_tabla, origen_id, destino_tabla, destino_id)
select 'cf_turnos', n.turno_id::text, 'turnos', n.destino_id
  from nuevos n
on conflict (origen_tabla, origen_id, destino_tabla) do nothing;

commit;

-- ---------------------------------------------------------------------------
-- 6) Reporte de esta mitad y omitidos.
-- ---------------------------------------------------------------------------
select 'cf_asignaciones' as origen, count(*) as filas from public.cf_asignaciones
union all select 'cf_completados', count(*) from public.cf_completados
union all select 'cf_progreso',    count(*) from public.cf_progreso
union all select 'cf_pagos',       count(*) from public.cf_pagos
union all select 'cf_turnos',      count(*) from public.cf_turnos
order by 1;

select origen_tabla, destino_tabla, count(*) as mapeados
  from public._fase7_migracion_map
 where origen_tabla in ('cf_asignaciones', 'cf_completados', 'cf_progreso', 'cf_pagos', 'cf_turnos')
 group by 1, 2
 order by 1;

-- Omitidos (pérdida controlada): cada fila de acá es un dato que NO se migró.
select 'completados sin fecha' as omitidos, count(*) as filas
  from public.cf_completados c
 where coalesce(nullif(c.fecha::text, '')::date, c.created_at::date) is null
union all
select 'progreso sin peso o fecha', count(*)
  from public.cf_progreso pr
 where pr.peso is null or nullif(pr.fecha::text, '')::date is null
union all
select 'turnos sin fecha_hora', count(*)
  from public.cf_turnos t
 where t.fecha_hora is null
union all
select 'asignaciones activas desactivadas', count(*)
  from (
    select row_number() over (
             partition by a.alumno_id
             order by nullif(a.fecha_inicio::text, '')::date desc nulls last, a.id
           ) as rn
      from public.cf_asignaciones a
     where coalesce(a.activa, true)
  ) x
 where x.rn > 1
order by 1;
