-- 0007_fase7_portal.sql — Portal público del alumno: RPCs por token (fase 7, WU-7a)
-- ============================================================================
-- PRERREQUISITOS: migraciones 0001 → 0006 aplicadas (negocio_miembros + RLS por
--   membresía y tablas gym_* / cobros) + backup verificado (ver backup-bootstrap.md).
--
-- CONTRATO DE SEGURIDAD (design "RPCs del portal", spec R13–R15):
--   - portal_token (uuid v4, no enumerable) es la CAPACIDAD de acceso (AD-2);
--     codigo_acceso es un dato legacy y NO otorga acceso.
--   - Los 4 RPC son security definer + set search_path = public: el acceso
--     anónimo pasa SOLO por acá (la página no lee tablas con la anon key).
--   - SIN ORÁCULO: ninguna respuesta distingue un token válido de uno inválido.
--     `obtener_portal_alumno` devuelve NULL sin excepción; los mutadores
--     devuelven {ok:false, motivo:'no_disponible'} para cualquier caso no
--     autorizado (token inexistente, actividad de otra rutina o negocio, sin
--     asignación activa).
--   - ALLOWLIST ESTRICTA (R14): alumno(nombre, objetivo, altura_cm) ·
--     profe(nombre) · negocio(nombre, rubro) · asignación activa con sus sesiones
--     y actividades · completados · progreso · pagos. NUNCA email, teléfono,
--     notas internas (gym_alumnos.notas), otros alumnos ni membresías. Todo se
--     scopea por el negocio_id del alumno del token.
--   - Desvío del design documentado: `cf_profes.deporte` no tiene destino en el
--     esquema nuevo, así que `profe` expone `nombre` y la disciplina viaja como
--     `negocio.rubro`.
--
-- CONTRATO DE RETORNO (jsonb):
--   obtener_portal_alumno(p_token uuid) → { alumno:{nombre,objetivo,altura_cm},
--     profe:{nombre}, negocio:{nombre,rubro}, asignacion:{id, rutina:{id,nombre},
--     sesiones_total, sesion_actual, fecha_inicio, sesiones:[{numero_sesion,
--     actividades:[{id, nombre, grupo_muscular, url_video, series, repeticiones,
--     descanso_seg, notas, orden}]}]} | null, completados:[{rutina_ejercicio_id,
--     fecha}], progreso:[{id,fecha,peso,cintura,cadera,porcentaje_grasa,pecho_cm,
--     bicep_cm,metrica1_nombre,metrica1_valor,metrica2_nombre,metrica2_valor,
--     notas}], pagos:[{id,fecha,monto,concepto,medio_pago}] }.
--     Token desconocido → NULL.
--   marcar_completado_portal(p_token, p_rutina_ejercicio_id, p_fecha) →
--     {ok:true, completado:true, fecha} | {ok:false, motivo:'no_disponible'}.
--     La actividad debe pertenecer a la rutina ACTIVA del alumno del token;
--     upsert idempotente por (cliente_id, rutina_ejercicio_id, fecha) (AD-5).
--   desmarcar_completado_portal(...) → {ok:true, completado:false, fecha} |
--     {ok:false, motivo:'no_disponible'}. Idempotente (borrar lo que no estaba es ok).
--   avanzar_sesion_portal(p_token) → {ok:true, sesion_actual, sesiones_total} |
--     {ok:false, motivo:'plan_completo', sesion_actual, sesiones_total} (R6) |
--     {ok:false, motivo:'no_disponible'}.
--     sesion_actual = least(sesion_actual + 1, sesiones_total).
--
-- GRANTS: las funciones nuevas nacen con EXECUTE para PUBLIC (lección 0004): se revoca.
--
-- ROLLBACK (ver también scripts/backup-bootstrap.md):
--   drop function public.obtener_portal_alumno(uuid);
--   drop function public.marcar_completado_portal(uuid, uuid, date);
--   drop function public.desmarcar_completado_portal(uuid, uuid, date);
--   drop function public.avanzar_sesion_portal(uuid);
--   Las tablas y los datos de 0006 persisten intactos.
--
-- Verificación post-aplicación (maintainer): psql -v ON_ERROR_STOP=1 -f scripts/verify-portal.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) obtener_portal_alumno: lectura pública del portal (R13)
-- ---------------------------------------------------------------------------
create or replace function public.obtener_portal_alumno(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alumno record;
begin
  select ga.cliente_id, ga.negocio_id, ga.objetivo, ga.altura_cm,
         c.nombre as alumno_nombre, n.nombre as negocio_nombre, n.rubro as negocio_rubro
    into v_alumno
    from public.gym_alumnos ga
    join public.clientes c on c.id = ga.cliente_id
    join public.negocios n on n.id = ga.negocio_id
   where ga.portal_token = p_token;

  -- Token desconocido → null, sin excepción (sin oráculo).
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'alumno', jsonb_build_object('nombre', v_alumno.alumno_nombre, 'objetivo', v_alumno.objetivo, 'altura_cm', v_alumno.altura_cm),
    'profe', jsonb_build_object('nombre', v_alumno.negocio_nombre),
    'negocio', jsonb_build_object('nombre', v_alumno.negocio_nombre, 'rubro', v_alumno.negocio_rubro),
    'asignacion', (
      select jsonb_build_object(
        'id', a.id, 'rutina', jsonb_build_object('id', r.id, 'nombre', r.nombre),
        'sesiones_total', r.sesiones_total, 'sesion_actual', a.sesion_actual, 'fecha_inicio', a.fecha_inicio,
        'sesiones', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'numero_sesion', s.numero_sesion,
                   'actividades', coalesce((
                     select jsonb_agg(jsonb_build_object(
                              'id', re.id, 'nombre', e.nombre, 'grupo_muscular', e.grupo_muscular,
                              'url_video', e.url_video, 'series', re.series, 'repeticiones', re.repeticiones,
                              'descanso_seg', re.descanso_seg, 'notas', re.notas, 'orden', re.orden)
                            order by re.orden, re.id)
                       from public.gym_rutina_ejercicios re
                       join public.gym_ejercicios e on e.id = re.ejercicio_id
                      where re.sesion_id = s.id and re.negocio_id = v_alumno.negocio_id
                     ), '[]'::jsonb))
                 order by s.numero_sesion)
          from public.gym_rutina_sesiones s
         where s.rutina_id = r.id and s.negocio_id = v_alumno.negocio_id
        ), '[]'::jsonb))
        from public.gym_asignaciones a
        join public.gym_rutinas r on r.id = a.rutina_id and r.negocio_id = v_alumno.negocio_id
       where a.cliente_id = v_alumno.cliente_id and a.negocio_id = v_alumno.negocio_id and a.activa
    ),
    'completados', coalesce((
      select jsonb_agg(jsonb_build_object('rutina_ejercicio_id', gc.rutina_ejercicio_id, 'fecha', gc.fecha)
                       order by gc.fecha desc, gc.created_at desc)
        from public.gym_completados gc
       where gc.cliente_id = v_alumno.cliente_id and gc.negocio_id = v_alumno.negocio_id), '[]'::jsonb),
    'progreso', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', gp.id, 'fecha', gp.fecha, 'peso', gp.peso, 'cintura', gp.cintura,
               'cadera', gp.cadera, 'porcentaje_grasa', gp.porcentaje_grasa, 'pecho_cm', gp.pecho_cm,
               'bicep_cm', gp.bicep_cm, 'metrica1_nombre', gp.metrica1_nombre, 'metrica1_valor', gp.metrica1_valor,
               'metrica2_nombre', gp.metrica2_nombre, 'metrica2_valor', gp.metrica2_valor, 'notas', gp.notas)
             order by gp.fecha desc, gp.created_at desc)
        from public.gym_progreso gp
       where gp.cliente_id = v_alumno.cliente_id and gp.negocio_id = v_alumno.negocio_id), '[]'::jsonb),
    'pagos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', cb.id, 'fecha', cb.fecha, 'monto', cb.monto, 'concepto', cb.concepto, 'medio_pago', cb.medio_pago)
             order by cb.fecha desc, cb.created_at desc)
        from public.cobros cb
       where cb.cliente_id = v_alumno.cliente_id and cb.negocio_id = v_alumno.negocio_id), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) marcar_completado_portal: alta idempotente (AD-5, R8)
-- ---------------------------------------------------------------------------
create or replace function public.marcar_completado_portal(
  p_token uuid, p_rutina_ejercicio_id uuid, p_fecha date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_negocio_id uuid;
begin
  -- Token + actividad de la rutina ACTIVA del alumno, todo en el mismo negocio.
  select ga.cliente_id, ga.negocio_id
    into v_cliente_id, v_negocio_id
    from public.gym_alumnos ga
    join public.gym_asignaciones a on a.cliente_id = ga.cliente_id and a.negocio_id = ga.negocio_id and a.activa
    join public.gym_rutina_sesiones s on s.rutina_id = a.rutina_id and s.negocio_id = ga.negocio_id
    join public.gym_rutina_ejercicios re on re.sesion_id = s.id and re.negocio_id = ga.negocio_id
   where ga.portal_token = p_token and re.id = p_rutina_ejercicio_id;

  -- Mismo retorno para token desconocido y actividad no autorizada (sin oráculo).
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_disponible');
  end if;

  -- Upsert idempotente (AD-5): repetir el marcado no duplica.
  insert into public.gym_completados (negocio_id, cliente_id, rutina_ejercicio_id, fecha)
  values (v_negocio_id, v_cliente_id, p_rutina_ejercicio_id, p_fecha)
  on conflict (cliente_id, rutina_ejercicio_id, fecha) do nothing;

  return jsonb_build_object('ok', true, 'completado', true, 'fecha', p_fecha);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) desmarcar_completado_portal: baja idempotente (R8)
-- ---------------------------------------------------------------------------
create or replace function public.desmarcar_completado_portal(
  p_token uuid, p_rutina_ejercicio_id uuid, p_fecha date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
begin
  -- Misma validación que marcar: la actividad debe pertenecer a la rutina ACTIVA
  -- del alumno del token (y del mismo negocio).
  select ga.cliente_id
    into v_cliente_id
    from public.gym_alumnos ga
    join public.gym_asignaciones a on a.cliente_id = ga.cliente_id and a.negocio_id = ga.negocio_id and a.activa
    join public.gym_rutina_sesiones s on s.rutina_id = a.rutina_id and s.negocio_id = ga.negocio_id
    join public.gym_rutina_ejercicios re on re.sesion_id = s.id and re.negocio_id = ga.negocio_id
   where ga.portal_token = p_token and re.id = p_rutina_ejercicio_id;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_disponible');
  end if;

  delete from public.gym_completados
   where cliente_id = v_cliente_id and rutina_ejercicio_id = p_rutina_ejercicio_id and fecha = p_fecha;

  return jsonb_build_object('ok', true, 'completado', false, 'fecha', p_fecha);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) avanzar_sesion_portal: avance con tope (R6)
-- ---------------------------------------------------------------------------
create or replace function public.avanzar_sesion_portal(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asignacion_id  uuid;
  v_sesion_actual  integer;
  v_sesiones_total integer;
begin
  select a.id, a.sesion_actual, r.sesiones_total
    into v_asignacion_id, v_sesion_actual, v_sesiones_total
    from public.gym_alumnos ga
    join public.gym_asignaciones a on a.cliente_id = ga.cliente_id and a.negocio_id = ga.negocio_id and a.activa
    join public.gym_rutinas r on r.id = a.rutina_id and r.negocio_id = ga.negocio_id
   where ga.portal_token = p_token;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_disponible');
  end if;

  -- R6: en el tope no avanza y avisa.
  if v_sesion_actual >= v_sesiones_total then
    return jsonb_build_object('ok', false, 'motivo', 'plan_completo',
                              'sesion_actual', v_sesion_actual, 'sesiones_total', v_sesiones_total);
  end if;

  -- least() como defensa en profundidad: aunque dos llamadas concurrentes pasaran
  -- el chequeo, el valor persistido nunca supera sesiones_total.
  update public.gym_asignaciones
     set sesion_actual = least(sesion_actual + 1, v_sesiones_total)
   where id = v_asignacion_id and activa;

  if not found then
    -- La asignación se desactivó entre el select y el update (carrera con el
    -- profe): el portal no puede avanzar una rutina ya no activa.
    return jsonb_build_object('ok', false, 'motivo', 'no_disponible');
  end if;

  return jsonb_build_object('ok', true, 'sesion_actual', least(v_sesion_actual + 1, v_sesiones_total),
                            'sesiones_total', v_sesiones_total);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Grants: anon (portal sin sesión) + authenticated; nunca PUBLIC
-- ---------------------------------------------------------------------------
revoke all on function public.obtener_portal_alumno(uuid) from public;
grant execute on function public.obtener_portal_alumno(uuid) to anon, authenticated;

revoke all on function public.marcar_completado_portal(uuid, uuid, date) from public;
grant execute on function public.marcar_completado_portal(uuid, uuid, date) to anon, authenticated;

revoke all on function public.desmarcar_completado_portal(uuid, uuid, date) from public;
grant execute on function public.desmarcar_completado_portal(uuid, uuid, date) to anon, authenticated;

revoke all on function public.avanzar_sesion_portal(uuid) from public;
grant execute on function public.avanzar_sesion_portal(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Verificación post-aplicación:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/verify-portal.sql
--   (grants, security definer + search_path, no-oráculo e invariantes de
--   allowlist sin fixtures; la matriz RLS sigue en scripts/verify-rls.sql)
-- ---------------------------------------------------------------------------
