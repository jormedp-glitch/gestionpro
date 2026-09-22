-- scripts/rollback-coachflow.sql — Rollback de la migración de CoachFlow
-- (fase 7, PR 4 / task 2.7)
-- ============================================================================
-- Qué hace:
--   Borra EXCLUSIVAMENTE las filas que creó la migración, identificadas por
--   _fase7_migracion_map, en orden inverso al de la migración. Las tablas cf_*
--   quedan INTACTAS: se puede volver a migrar después.
--
-- NO toca:
--   · las filas preexistentes de las tablas del núcleo (clientes, turnos,
--     negocios, negocio_miembro) que no estén en el map;
--   · las cuentas de auth.users que YA existían antes de migrar (registradas
--     en _fase7_profes_reusados): solo borra las creadas por la migración.
--
-- ASIMETRÍA CONOCIDA (benigna): si la migración le agregó la identidad 'email'
-- a una cuenta preexistente que no la tenía, el rollback NO la borra. No se
-- puede distinguir de una identidad que la cuenta ya tuviera, y tocar una
-- cuenta preexistente es peor que dejarla con una identidad de más (la cuenta
-- sigue funcionando igual; solo gana una forma de iniciar sesión).
--
-- Orden (inverso al de la migración): turnos → cobros → gym_progreso →
--   gym_completados → gym_asignaciones → gym_rutina_ejercicios →
--   gym_rutina_sesiones → gym_rutinas → gym_ejercicios → gym_alumnos →
--   clientes → negocio_miembros → negocios → auth.identities → auth.users →
--   filas del map.
--
-- Idempotente: re-ejecutarlo no hace nada (el map queda vacío al final).
-- Transaccional: todo o nada.
--
-- Uso (rol con privilegios, p. ej. postgres/service_role):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/rollback-coachflow.sql
--
-- Nota: _fase7_profes_reusados NO se dropea acá (lo hace 0007). Queda vacía de
-- sentido después del rollback, pero es inofensiva y sirve de bitácora.
-- ============================================================================

\set ON_ERROR_STOP on

begin;

-- La bitácora de cuentas preexistentes tiene que existir para poder excluirla.
create table if not exists public._fase7_profes_reusados (
  user_id    uuid primary key,
  email      text not null,
  created_at timestamptz not null default now()
);

-- 0) Aviso si no hay nada que revertir.
do $$
declare
  n bigint;
begin
  select count(*) into n from public._fase7_migracion_map;
  if n = 0 then
    raise warning 'El map esta vacio: no hay nada para revertir.';
  else
    raise notice 'Revirtiendo % filas mapeadas...', n;
  end if;
end $$;

-- 1) turnos (tabla del núcleo: SOLO las filas migradas).
delete from public.turnos t
 using public._fase7_migracion_map m
 where m.origen_tabla = 'cf_turnos' and m.destino_tabla = 'turnos'
   and t.id = m.destino_id;

-- 2) cobros (tabla del núcleo: SOLO las filas migradas).
delete from public.cobros c
 using public._fase7_migracion_map m
 where m.origen_tabla = 'cf_pagos' and m.destino_tabla = 'cobros'
   and c.id = m.destino_id;

-- 3) Actividad del alumno (hijos primero).
delete from public.gym_progreso g
 using public._fase7_migracion_map m
 where m.origen_tabla = 'cf_progreso' and m.destino_tabla = 'gym_progreso'
   and g.id = m.destino_id;

delete from public.gym_completados g
 using public._fase7_migracion_map m
 where m.origen_tabla = 'cf_completados' and m.destino_tabla = 'gym_completados'
   and g.id = m.destino_id;

delete from public.gym_asignaciones g
 using public._fase7_migracion_map m
 where m.origen_tabla = 'cf_asignaciones' and m.destino_tabla = 'gym_asignaciones'
   and g.id = m.destino_id;

-- 4) Catálogo y rutinas.
delete from public.gym_rutina_ejercicios g
 using public._fase7_migracion_map m
 where m.origen_tabla = 'cf_rutina_ejercicios'
   and m.destino_tabla = 'gym_rutina_ejercicios'
   and g.id = m.destino_id;

delete from public.gym_rutina_sesiones g
 using public._fase7_migracion_map m
 where m.origen_tabla = 'cf_rutina_semanas'
   and m.destino_tabla = 'gym_rutina_sesiones'
   and g.id = m.destino_id;

delete from public.gym_rutinas g
 using public._fase7_migracion_map m
 where m.origen_tabla = 'cf_rutinas' and m.destino_tabla = 'gym_rutinas'
   and g.id = m.destino_id;

-- Incluye el catálogo global: en la base real también vino de cf_ejercicios.
delete from public.gym_ejercicios g
 using public._fase7_migracion_map m
 where m.origen_tabla = 'cf_ejercicios' and m.destino_tabla = 'gym_ejercicios'
   and g.id = m.destino_id;

-- 5) Fichas y clientes.
delete from public.gym_alumnos g
 using public._fase7_migracion_map m
 where m.origen_tabla = 'cf_alumnos' and m.destino_tabla = 'clientes'
   and g.cliente_id = m.destino_id;

delete from public.clientes c
 using public._fase7_migracion_map m
 where m.origen_tabla = 'cf_alumnos' and m.destino_tabla = 'clientes'
   and c.id = m.destino_id;

-- 6) Membresías y negocios.
delete from public.negocio_miembros nm
 using public._fase7_migracion_map mn, public._fase7_migracion_map mu
 where mn.origen_tabla = 'cf_profes' and mn.destino_tabla = 'negocios'
   and mu.origen_tabla = 'cf_profes' and mu.origen_id = mn.origen_id
   and mu.destino_tabla = 'auth.users'
   and nm.negocio_id = mn.destino_id
   and nm.user_id = mu.destino_id;

delete from public.negocios n
 using public._fase7_migracion_map m
 where m.origen_tabla = 'cf_profes' and m.destino_tabla = 'negocios'
   and n.id = m.destino_id;

-- 7) Auth: SOLO las cuentas creadas (las reusadas se respetan).
delete from auth.identities i
 using public._fase7_migracion_map m
 where m.origen_tabla = 'cf_profes' and m.destino_tabla = 'auth.users'
   and i.user_id = m.destino_id
   and i.provider = 'email'
   and not exists (select 1 from public._fase7_profes_reusados r
                    where r.user_id = m.destino_id);

delete from auth.users u
 using public._fase7_migracion_map m
 where m.origen_tabla = 'cf_profes' and m.destino_tabla = 'auth.users'
   and u.id = m.destino_id
   and not exists (select 1 from public._fase7_profes_reusados r
                    where r.user_id = m.destino_id);

-- 8) El map, al final: sin él, nada de lo anterior es alcanzable.
delete from public._fase7_migracion_map;

commit;

-- ---------------------------------------------------------------------------
-- Reporte: qué quedó en las tablas del núcleo y en las del rubro.
-- ---------------------------------------------------------------------------
select 'negocios' as tabla, count(*) as filas from public.negocios
union all select 'clientes',      count(*) from public.clientes
union all select 'turnos',        count(*) from public.turnos
union all select 'cobros',        count(*) from public.cobros
union all select 'gym_alumnos',   count(*) from public.gym_alumnos
union all select 'gym_ejercicios', count(*) from public.gym_ejercicios
union all select 'gym_rutinas',   count(*) from public.gym_rutinas
union all select 'gym_asignaciones', count(*) from public.gym_asignaciones
union all select 'gym_completados', count(*) from public.gym_completados
union all select 'gym_progreso',  count(*) from public.gym_progreso
union all select 'auth.users',    count(*) from auth.users
union all select 'map',           count(*) from public._fase7_migracion_map
order by 1;

select 'rollback-coachflow: LISTO (las cf_* quedaron intactas)' as resultado;
