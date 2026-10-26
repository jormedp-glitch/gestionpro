-- ============================================================================
-- Schema base de GestionPro (DDL puro, sin datos)
-- Generado desde el catalogo de PostgreSQL de qjawdjzaokffhiqnixcx.
-- Fecha: 2026-10-26
-- ============================================================================

-- 1) Tablas
create table public._fase3_duplicates_log (negocio_id uuid not null, numero_orden text not null, id uuid not null, ocurrencia integer not null, snapshot_at timestamp with time zone not null default now());

create table public.clientes (id uuid not null default gen_random_uuid(), negocio_id uuid, nombre text not null, telefono text, plan text, cuota numeric default 0, vence date, estado text default 'activo'::text, created_at timestamp with time zone default now(), email text);

create table public.cobros (id uuid not null default gen_random_uuid(), negocio_id uuid not null, cliente_id uuid not null, monto numeric not null, concepto text, medio_pago text not null, fecha date not null, created_at timestamp with time zone not null default now());

create table public.equipos (id uuid not null default gen_random_uuid(), negocio_id uuid, cliente_id uuid, numero_orden text not null, categoria text not null, marca text, modelo text, numero_serie text, problema_reportado text not null, accesorios text, fecha_ingreso timestamp with time zone default now(), fecha_estimada_entrega date, estado text default 'recibido'::text, tecnico_asignado text, presupuesto numeric(10,2), presupuesto_aceptado boolean, precio_final numeric(10,2), fecha_entrega timestamp with time zone, observaciones_internas text, created_at timestamp with time zone default now(), acceso_token uuid not null default gen_random_uuid());

create table public.gastos (id uuid not null default gen_random_uuid(), negocio_id uuid, descripcion text not null, monto numeric not null, fecha date not null, created_at timestamp with time zone default now());

create table public.gym_alumnos (cliente_id uuid not null, negocio_id uuid not null, objetivo text, notas text, altura_cm numeric(5,1), fecha_nac date, portal_token uuid not null default gen_random_uuid(), codigo_acceso text, created_at timestamp with time zone not null default now());

create table public.gym_asignaciones (id uuid not null default gen_random_uuid(), negocio_id uuid not null, cliente_id uuid not null, rutina_id uuid not null, sesion_actual integer not null default 1, fecha_inicio date not null default CURRENT_DATE, activa boolean not null default true);

create table public.gym_completados (id uuid not null default gen_random_uuid(), negocio_id uuid not null, cliente_id uuid not null, rutina_ejercicio_id uuid not null, fecha date not null, created_at timestamp with time zone not null default now());

create table public.gym_ejercicios (id uuid not null default gen_random_uuid(), negocio_id uuid, nombre text not null, grupo_muscular text, descripcion text, url_video text, activo boolean not null default true, created_at timestamp with time zone not null default now());

create table public.gym_progreso (id uuid not null default gen_random_uuid(), negocio_id uuid not null, cliente_id uuid not null, fecha date not null, peso numeric(5,1) not null, cintura numeric, cadera numeric, porcentaje_grasa numeric, pecho_cm numeric, bicep_cm numeric, metrica1_nombre text, metrica1_valor numeric, metrica2_nombre text, metrica2_valor numeric, notas text, created_at timestamp with time zone not null default now());

create table public.gym_rutina_ejercicios (id uuid not null default gen_random_uuid(), negocio_id uuid not null, sesion_id uuid not null, ejercicio_id uuid not null, series integer, repeticiones text, descanso_seg integer, notas text, orden integer not null default 0);

create table public.gym_rutina_sesiones (id uuid not null default gen_random_uuid(), negocio_id uuid not null, rutina_id uuid not null, numero_sesion integer not null);

create table public.gym_rutinas (id uuid not null default gen_random_uuid(), negocio_id uuid not null, nombre text not null, descripcion text, sesiones_total integer not null, activo boolean not null default true, created_at timestamp with time zone not null default now());

create table public.negocio_miembros (negocio_id uuid not null, user_id uuid not null, rol text not null, created_at timestamp with time zone not null default now());

create table public.negocio_orden_contadores (negocio_id uuid not null, ultimo bigint not null default 0);

create table public.negocios (id uuid not null default gen_random_uuid(), slug text not null, nombre text not null, rubro text not null, telefono_admin text, activo boolean default true, created_at timestamp with time zone default now(), disciplina text);

create table public.reparaciones_historial (id uuid not null default gen_random_uuid(), equipo_id uuid, negocio_id uuid, estado_anterior text, estado_nuevo text not null, comentario text, fecha timestamp with time zone default now(), usuario text);

create table public.reparaciones_repuestos (id uuid not null default gen_random_uuid(), equipo_id uuid, negocio_id uuid, descripcion text not null, costo numeric(10,2) default 0, precio_cobrado numeric(10,2) default 0, cantidad integer default 1);

create table public.turnos (id uuid not null default gen_random_uuid(), negocio_id uuid, cliente_nombre text not null, telefono text, servicio text not null, fecha date not null, hora time without time zone not null, duracion integer default 60, estado text default 'confirmado'::text, notas text default ''::text, created_at timestamp with time zone default now(), cliente_id uuid, lugar text);

-- 2) Constraints
alter table public.clientes add constraint clientes_pkey PRIMARY KEY (id);
alter table public.cobros add constraint cobros_pkey PRIMARY KEY (id);
alter table public.equipos add constraint equipos_pkey PRIMARY KEY (id);
alter table public.gastos add constraint gastos_pkey PRIMARY KEY (id);
alter table public.gym_alumnos add constraint gym_alumnos_pkey PRIMARY KEY (cliente_id);
alter table public.gym_asignaciones add constraint gym_asignaciones_pkey PRIMARY KEY (id);
alter table public.gym_completados add constraint gym_completados_pkey PRIMARY KEY (id);
alter table public.gym_ejercicios add constraint gym_ejercicios_pkey PRIMARY KEY (id);
alter table public.gym_progreso add constraint gym_progreso_pkey PRIMARY KEY (id);
alter table public.gym_rutina_ejercicios add constraint gym_rutina_ejercicios_pkey PRIMARY KEY (id);
alter table public.gym_rutina_sesiones add constraint gym_rutina_sesiones_pkey PRIMARY KEY (id);
alter table public.gym_rutinas add constraint gym_rutinas_pkey PRIMARY KEY (id);
alter table public.negocio_miembros add constraint negocio_miembros_pkey PRIMARY KEY (negocio_id, user_id);
alter table public.negocio_orden_contadores add constraint negocio_orden_contadores_pkey PRIMARY KEY (negocio_id);
alter table public.negocios add constraint negocios_pkey PRIMARY KEY (id);
alter table public.reparaciones_historial add constraint reparaciones_historial_pkey PRIMARY KEY (id);
alter table public.reparaciones_repuestos add constraint reparaciones_repuestos_pkey PRIMARY KEY (id);
alter table public.turnos add constraint turnos_pkey PRIMARY KEY (id);
alter table public.equipos add constraint equipos_numero_orden_key UNIQUE (numero_orden);
alter table public.gym_alumnos add constraint gym_alumnos_portal_token_key UNIQUE (portal_token);
alter table public.gym_completados add constraint uq_gym_completados_cliente_ejercicio_fecha UNIQUE (cliente_id, rutina_ejercicio_id, fecha);
alter table public.gym_rutina_sesiones add constraint uq_gym_rutina_sesiones_rutina_numero UNIQUE (rutina_id, numero_sesion);
alter table public.negocios add constraint negocios_slug_key UNIQUE (slug);
alter table public.clientes add constraint chk_clientes_cuota_no_negativa CHECK ((cuota >= (0)::numeric));
alter table public.cobros add constraint chk_cobros_medio_pago_valido CHECK ((medio_pago = ANY (ARRAY['efectivo'::text, 'transferencia'::text, 'mercadopago'::text, 'otro'::text])));
alter table public.cobros add constraint chk_cobros_monto_positivo CHECK ((monto >= (0)::numeric));
alter table public.gastos add constraint chk_gastos_monto_positivo CHECK ((monto >= (0)::numeric));
alter table public.gym_rutinas add constraint chk_gym_rutinas_sesiones_positivas CHECK ((sesiones_total > 0));
alter table public.negocio_miembros add constraint negocio_miembros_rol_check CHECK ((rol = ANY (ARRAY['owner'::text, 'editor'::text])));
alter table public.reparaciones_repuestos add constraint chk_repuestos_cantidad_positiva CHECK ((cantidad > 0));
alter table public.reparaciones_repuestos add constraint chk_repuestos_costo_no_negativo CHECK ((costo >= (0)::numeric));
alter table public.reparaciones_repuestos add constraint chk_repuestos_precio_no_negativo CHECK ((precio_cobrado >= (0)::numeric));
alter table public.clientes add constraint clientes_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE;
alter table public.cobros add constraint cobros_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.cobros add constraint cobros_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE;
alter table public.equipos add constraint equipos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;
alter table public.equipos add constraint equipos_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE;
alter table public.gastos add constraint gastos_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE;
alter table public.gym_alumnos add constraint gym_alumnos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.gym_alumnos add constraint gym_alumnos_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE;
alter table public.gym_asignaciones add constraint gym_asignaciones_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.gym_asignaciones add constraint gym_asignaciones_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE;
alter table public.gym_asignaciones add constraint gym_asignaciones_rutina_id_fkey FOREIGN KEY (rutina_id) REFERENCES gym_rutinas(id) ON DELETE RESTRICT;
alter table public.gym_completados add constraint gym_completados_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.gym_completados add constraint gym_completados_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE;
alter table public.gym_completados add constraint gym_completados_rutina_ejercicio_id_fkey FOREIGN KEY (rutina_ejercicio_id) REFERENCES gym_rutina_ejercicios(id) ON DELETE CASCADE;
alter table public.gym_ejercicios add constraint gym_ejercicios_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE;
alter table public.gym_progreso add constraint gym_progreso_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;
alter table public.gym_progreso add constraint gym_progreso_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE;
alter table public.gym_rutina_ejercicios add constraint gym_rutina_ejercicios_ejercicio_id_fkey FOREIGN KEY (ejercicio_id) REFERENCES gym_ejercicios(id) ON DELETE RESTRICT;
alter table public.gym_rutina_ejercicios add constraint gym_rutina_ejercicios_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE;
alter table public.gym_rutina_ejercicios add constraint gym_rutina_ejercicios_sesion_id_fkey FOREIGN KEY (sesion_id) REFERENCES gym_rutina_sesiones(id) ON DELETE CASCADE;
alter table public.gym_rutina_sesiones add constraint gym_rutina_sesiones_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE;
alter table public.gym_rutina_sesiones add constraint gym_rutina_sesiones_rutina_id_fkey FOREIGN KEY (rutina_id) REFERENCES gym_rutinas(id) ON DELETE CASCADE;
alter table public.gym_rutinas add constraint gym_rutinas_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE;
alter table public.negocio_miembros add constraint negocio_miembros_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE;
alter table public.negocio_miembros add constraint negocio_miembros_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.negocio_orden_contadores add constraint negocio_orden_contadores_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE;
alter table public.reparaciones_historial add constraint reparaciones_historial_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE;
alter table public.reparaciones_historial add constraint reparaciones_historial_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE;
alter table public.reparaciones_repuestos add constraint reparaciones_repuestos_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE;
alter table public.reparaciones_repuestos add constraint reparaciones_repuestos_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE;
alter table public.turnos add constraint turnos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;
alter table public.turnos add constraint turnos_negocio_id_fkey FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE;

-- 3) Indices
CREATE INDEX idx_equipos_negocio ON public.equipos USING btree (negocio_id);
CREATE INDEX idx_equipos_estado ON public.equipos USING btree (estado);
CREATE INDEX idx_equipos_numero_orden ON public.equipos USING btree (numero_orden);
CREATE UNIQUE INDEX idx_equipos_acceso_token ON public.equipos USING btree (acceso_token);
CREATE UNIQUE INDEX uq_equipos_negocio_orden ON public.equipos USING btree (negocio_id, numero_orden);
CREATE INDEX idx_equipos_negocio_created ON public.equipos USING btree (negocio_id, created_at);
CREATE INDEX idx_historial_equipo ON public.reparaciones_historial USING btree (equipo_id);
CREATE INDEX idx_repuestos_equipo ON public.reparaciones_repuestos USING btree (equipo_id);
CREATE UNIQUE INDEX uq_negocios_slug ON public.negocios USING btree (lower(TRIM(BOTH FROM slug)));
CREATE INDEX idx_clientes_negocio ON public.clientes USING btree (negocio_id);
CREATE INDEX idx_turnos_negocio_fecha ON public.turnos USING btree (negocio_id, fecha);
CREATE INDEX idx_negocio_miembros_user ON public.negocio_miembros USING btree (user_id);
CREATE INDEX idx_cobros_cliente_fecha ON public.cobros USING btree (cliente_id, fecha DESC);
CREATE INDEX idx_gym_ejercicios_negocio ON public.gym_ejercicios USING btree (negocio_id);
CREATE INDEX idx_gym_rutina_ejercicios_sesion_orden ON public.gym_rutina_ejercicios USING btree (sesion_id, orden);
CREATE UNIQUE INDEX uq_gym_asignaciones_activa_por_cliente ON public.gym_asignaciones USING btree (cliente_id) WHERE activa;
CREATE INDEX idx_gym_progreso_cliente_fecha ON public.gym_progreso USING btree (cliente_id, fecha DESC);

-- 4) Secuencias

-- 5) Funciones (antes de las policies: las referencian)
CREATE OR REPLACE FUNCTION public.agregar_miembro(p_negocio_id uuid, p_email text, p_rol text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_email   text;
  v_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesiÃ³n iniciada';
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
$function$
;
CREATE OR REPLACE FUNCTION public.avanzar_sesion_portal(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- La asignaciÃ³n se desactivÃ³ entre el select y el update (carrera con el
    -- profe): el portal no puede avanzar una rutina ya no activa.
    return jsonb_build_object('ok', false, 'motivo', 'no_disponible');
  end if;

  return jsonb_build_object('ok', true, 'sesion_actual', least(v_sesion_actual + 1, v_sesiones_total),
                            'sesiones_total', v_sesiones_total);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cambiar_rol_miembro(p_negocio_id uuid, p_user_id uuid, p_rol text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owners bigint;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesiÃ³n iniciada';
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
    raise exception 'No se puede quitar/demotar al Ãºltimo owner';
  end if;

  update public.negocio_miembros
     set rol = p_rol
   where negocio_id = p_negocio_id
     and user_id = p_user_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.crear_negocio_con_owner(p_nombre text, p_slug text, p_rubro text, p_disciplina text DEFAULT NULL::text)
 RETURNS negocios
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_negocio public.negocios;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesiÃÂ³n iniciada';
  end if;

  insert into public.negocios (nombre, slug, rubro, disciplina)
  values (
    p_nombre,
    p_slug,
    p_rubro,
    nullif(btrim(p_disciplina), '')
  )
  returning * into v_negocio;

  insert into public.negocio_miembros (negocio_id, user_id, rol)
  values (v_negocio.id, auth.uid(), 'owner');

  return v_negocio;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.desmarcar_completado_portal(p_token uuid, p_rutina_ejercicio_id uuid, p_fecha date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_cliente_id uuid;
begin
  -- Misma validaciÃ³n que marcar: la actividad debe pertenecer a la rutina ACTIVA
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
$function$
;
CREATE OR REPLACE FUNCTION public.generar_numero_orden(p_negocio_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end; $function$
;
CREATE OR REPLACE FUNCTION public.listar_miembros(p_negocio_id uuid)
 RETURNS TABLE(user_id uuid, email text, rol text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesiÃ³n iniciada';
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
$function$
;
CREATE OR REPLACE FUNCTION public.marcar_completado_portal(p_token uuid, p_rutina_ejercicio_id uuid, p_fecha date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Mismo retorno para token desconocido y actividad no autorizada (sin orÃ¡culo).
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_disponible');
  end if;

  -- Upsert idempotente (AD-5): repetir el marcado no duplica.
  insert into public.gym_completados (negocio_id, cliente_id, rutina_ejercicio_id, fecha)
  values (v_negocio_id, v_cliente_id, p_rutina_ejercicio_id, p_fecha)
  on conflict (cliente_id, rutina_ejercicio_id, fecha) do nothing;

  return jsonb_build_object('ok', true, 'completado', true, 'fecha', p_fecha);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.obtener_portal_alumno(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Token desconocido â null, sin excepciÃ³n (sin orÃ¡culo).
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
$function$
;
CREATE OR REPLACE FUNCTION public.obtener_seguimiento_publico(p_token uuid)
 RETURNS TABLE(estado text, numero_orden text, categoria text, marca text, modelo text, problema_reportado text, fecha_ingreso timestamp with time zone, fecha_estimada_entrega date, fecha_entrega timestamp with time zone, presupuesto numeric, precio_final numeric, cliente_nombre text, negocio_nombre text, historial jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return query
  select
    e.estado::text,
    e.numero_orden::text,
    e.categoria::text,
    e.marca::text,
    e.modelo::text,
    e.problema_reportado::text,
    e.fecha_ingreso::timestamptz,
    e.fecha_estimada_entrega::date,
    e.fecha_entrega::timestamptz,
    e.presupuesto::numeric,
    e.precio_final::numeric,
    c.nombre::text as cliente_nombre,
    n.nombre::text as negocio_nombre,
    coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'estado_nuevo', h.estado_nuevo,
                 'fecha',        h.fecha,
                 'comentario',   h.comentario
               )
               order by h.fecha asc
             )
        from public.reparaciones_historial h
       where h.equipo_id = e.id
    ), '[]'::jsonb) as historial
  from public.equipos e
  left join public.clientes c on c.id = e.cliente_id
  join public.negocios n on n.id = e.negocio_id
  where e.acceso_token = p_token
  limit 1;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.quitar_miembro(p_negocio_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owners bigint;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesiÃ³n iniciada';
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
    raise exception 'No se puede quitar/demotar al Ãºltimo owner';
  end if;

  delete from public.negocio_miembros
   where negocio_id = p_negocio_id
     and user_id = p_user_id;
end;
$function$
;

-- 6) RLS
alter table public._fase3_duplicates_log enable row level security;
alter table public.clientes enable row level security;
alter table public.cobros enable row level security;
alter table public.equipos enable row level security;
alter table public.gastos enable row level security;
alter table public.gym_alumnos enable row level security;
alter table public.gym_asignaciones enable row level security;
alter table public.gym_completados enable row level security;
alter table public.gym_ejercicios enable row level security;
alter table public.gym_progreso enable row level security;
alter table public.gym_rutina_ejercicios enable row level security;
alter table public.gym_rutina_sesiones enable row level security;
alter table public.gym_rutinas enable row level security;
alter table public.negocio_miembros enable row level security;
alter table public.negocio_orden_contadores enable row level security;
alter table public.negocios enable row level security;
alter table public.reparaciones_historial enable row level security;
alter table public.reparaciones_repuestos enable row level security;
alter table public.turnos enable row level security;

-- 7) Policies
create policy clientes_delete on public.clientes as PERMISSIVE for delete to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = clientes.negocio_id) AND (m.user_id = auth.uid())))));
create policy clientes_insert on public.clientes as PERMISSIVE for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = clientes.negocio_id) AND (m.user_id = auth.uid())))));
create policy clientes_select on public.clientes as PERMISSIVE for select to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = clientes.negocio_id) AND (m.user_id = auth.uid())))));
create policy clientes_update on public.clientes as PERMISSIVE for update to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = clientes.negocio_id) AND (m.user_id = auth.uid()))))) with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = clientes.negocio_id) AND (m.user_id = auth.uid())))));
create policy cobros_delete on public.cobros as PERMISSIVE for delete to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = cobros.negocio_id) AND (m.user_id = auth.uid())))));
create policy cobros_insert on public.cobros as PERMISSIVE for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = cobros.negocio_id) AND (m.user_id = auth.uid())))));
create policy cobros_select on public.cobros as PERMISSIVE for select to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = cobros.negocio_id) AND (m.user_id = auth.uid())))));
create policy cobros_update on public.cobros as PERMISSIVE for update to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = cobros.negocio_id) AND (m.user_id = auth.uid()))))) with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = cobros.negocio_id) AND (m.user_id = auth.uid())))));
create policy equipos_delete on public.equipos as PERMISSIVE for delete to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = equipos.negocio_id) AND (m.user_id = auth.uid())))));
create policy equipos_insert on public.equipos as PERMISSIVE for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = equipos.negocio_id) AND (m.user_id = auth.uid())))));
create policy equipos_select on public.equipos as PERMISSIVE for select to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = equipos.negocio_id) AND (m.user_id = auth.uid())))));
create policy equipos_update on public.equipos as PERMISSIVE for update to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = equipos.negocio_id) AND (m.user_id = auth.uid()))))) with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = equipos.negocio_id) AND (m.user_id = auth.uid())))));
create policy gastos_delete on public.gastos as PERMISSIVE for delete to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gastos.negocio_id) AND (m.user_id = auth.uid())))));
create policy gastos_insert on public.gastos as PERMISSIVE for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gastos.negocio_id) AND (m.user_id = auth.uid())))));
create policy gastos_select on public.gastos as PERMISSIVE for select to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gastos.negocio_id) AND (m.user_id = auth.uid())))));
create policy gastos_update on public.gastos as PERMISSIVE for update to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gastos.negocio_id) AND (m.user_id = auth.uid()))))) with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gastos.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_alumnos_delete on public.gym_alumnos as PERMISSIVE for delete to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_alumnos.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_alumnos_insert on public.gym_alumnos as PERMISSIVE for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_alumnos.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_alumnos_select on public.gym_alumnos as PERMISSIVE for select to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_alumnos.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_alumnos_update on public.gym_alumnos as PERMISSIVE for update to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_alumnos.negocio_id) AND (m.user_id = auth.uid()))))) with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_alumnos.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_asignaciones_delete on public.gym_asignaciones as PERMISSIVE for delete to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_asignaciones.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_asignaciones_insert on public.gym_asignaciones as PERMISSIVE for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_asignaciones.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_asignaciones_select on public.gym_asignaciones as PERMISSIVE for select to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_asignaciones.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_asignaciones_update on public.gym_asignaciones as PERMISSIVE for update to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_asignaciones.negocio_id) AND (m.user_id = auth.uid()))))) with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_asignaciones.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_completados_delete on public.gym_completados as PERMISSIVE for delete to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_completados.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_completados_insert on public.gym_completados as PERMISSIVE for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_completados.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_completados_select on public.gym_completados as PERMISSIVE for select to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_completados.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_completados_update on public.gym_completados as PERMISSIVE for update to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_completados.negocio_id) AND (m.user_id = auth.uid()))))) with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_completados.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_ejercicios_delete on public.gym_ejercicios as PERMISSIVE for delete to authenticated using (((negocio_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_ejercicios.negocio_id) AND (m.user_id = auth.uid()))))));
create policy gym_ejercicios_insert on public.gym_ejercicios as PERMISSIVE for insert to authenticated with check (((negocio_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_ejercicios.negocio_id) AND (m.user_id = auth.uid()))))));
create policy gym_ejercicios_select on public.gym_ejercicios as PERMISSIVE for select to authenticated using (((negocio_id IS NULL) OR (EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_ejercicios.negocio_id) AND (m.user_id = auth.uid()))))));
create policy gym_ejercicios_update on public.gym_ejercicios as PERMISSIVE for update to authenticated using (((negocio_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_ejercicios.negocio_id) AND (m.user_id = auth.uid())))))) with check (((negocio_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_ejercicios.negocio_id) AND (m.user_id = auth.uid()))))));
create policy gym_progreso_delete on public.gym_progreso as PERMISSIVE for delete to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_progreso.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_progreso_insert on public.gym_progreso as PERMISSIVE for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_progreso.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_progreso_select on public.gym_progreso as PERMISSIVE for select to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_progreso.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_progreso_update on public.gym_progreso as PERMISSIVE for update to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_progreso.negocio_id) AND (m.user_id = auth.uid()))))) with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_progreso.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_rutina_ejercicios_delete on public.gym_rutina_ejercicios as PERMISSIVE for delete to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_rutina_ejercicios.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_rutina_ejercicios_insert on public.gym_rutina_ejercicios as PERMISSIVE for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_rutina_ejercicios.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_rutina_ejercicios_select on public.gym_rutina_ejercicios as PERMISSIVE for select to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_rutina_ejercicios.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_rutina_ejercicios_update on public.gym_rutina_ejercicios as PERMISSIVE for update to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_rutina_ejercicios.negocio_id) AND (m.user_id = auth.uid()))))) with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_rutina_ejercicios.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_rutina_sesiones_delete on public.gym_rutina_sesiones as PERMISSIVE for delete to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_rutina_sesiones.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_rutina_sesiones_insert on public.gym_rutina_sesiones as PERMISSIVE for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_rutina_sesiones.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_rutina_sesiones_select on public.gym_rutina_sesiones as PERMISSIVE for select to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_rutina_sesiones.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_rutina_sesiones_update on public.gym_rutina_sesiones as PERMISSIVE for update to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_rutina_sesiones.negocio_id) AND (m.user_id = auth.uid()))))) with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_rutina_sesiones.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_rutinas_delete on public.gym_rutinas as PERMISSIVE for delete to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_rutinas.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_rutinas_insert on public.gym_rutinas as PERMISSIVE for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_rutinas.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_rutinas_select on public.gym_rutinas as PERMISSIVE for select to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_rutinas.negocio_id) AND (m.user_id = auth.uid())))));
create policy gym_rutinas_update on public.gym_rutinas as PERMISSIVE for update to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_rutinas.negocio_id) AND (m.user_id = auth.uid()))))) with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = gym_rutinas.negocio_id) AND (m.user_id = auth.uid())))));
create policy miembros_propios on public.negocio_miembros as PERMISSIVE for select to authenticated using ((user_id = auth.uid()));
create policy negocios_select on public.negocios as PERMISSIVE for select to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = negocios.id) AND (m.user_id = auth.uid())))));
create policy historial_delete on public.reparaciones_historial as PERMISSIVE for delete to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = reparaciones_historial.negocio_id) AND (m.user_id = auth.uid())))));
create policy historial_insert on public.reparaciones_historial as PERMISSIVE for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = reparaciones_historial.negocio_id) AND (m.user_id = auth.uid())))));
create policy historial_select on public.reparaciones_historial as PERMISSIVE for select to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = reparaciones_historial.negocio_id) AND (m.user_id = auth.uid())))));
create policy historial_update on public.reparaciones_historial as PERMISSIVE for update to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = reparaciones_historial.negocio_id) AND (m.user_id = auth.uid()))))) with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = reparaciones_historial.negocio_id) AND (m.user_id = auth.uid())))));
create policy repuestos_delete on public.reparaciones_repuestos as PERMISSIVE for delete to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = reparaciones_repuestos.negocio_id) AND (m.user_id = auth.uid())))));
create policy repuestos_insert on public.reparaciones_repuestos as PERMISSIVE for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = reparaciones_repuestos.negocio_id) AND (m.user_id = auth.uid())))));
create policy repuestos_select on public.reparaciones_repuestos as PERMISSIVE for select to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = reparaciones_repuestos.negocio_id) AND (m.user_id = auth.uid())))));
create policy repuestos_update on public.reparaciones_repuestos as PERMISSIVE for update to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = reparaciones_repuestos.negocio_id) AND (m.user_id = auth.uid()))))) with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = reparaciones_repuestos.negocio_id) AND (m.user_id = auth.uid())))));
create policy turnos_delete on public.turnos as PERMISSIVE for delete to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = turnos.negocio_id) AND (m.user_id = auth.uid())))));
create policy turnos_insert on public.turnos as PERMISSIVE for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = turnos.negocio_id) AND (m.user_id = auth.uid())))));
create policy turnos_select on public.turnos as PERMISSIVE for select to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = turnos.negocio_id) AND (m.user_id = auth.uid())))));
create policy turnos_update on public.turnos as PERMISSIVE for update to authenticated using ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = turnos.negocio_id) AND (m.user_id = auth.uid()))))) with check ((EXISTS ( SELECT 1
   FROM negocio_miembros m
  WHERE ((m.negocio_id = turnos.negocio_id) AND (m.user_id = auth.uid())))));

-- 8) Grants de tablas
revoke all on table public._fase3_duplicates_log from service_role;
grant select on table public._fase3_duplicates_log to service_role;
grant insert on table public._fase3_duplicates_log to service_role;
grant update on table public._fase3_duplicates_log to service_role;
grant delete on table public._fase3_duplicates_log to service_role;
revoke all on table public.clientes from anon;
grant select on table public.clientes to anon;
grant insert on table public.clientes to anon;
grant update on table public.clientes to anon;
grant delete on table public.clientes to anon;
revoke all on table public.clientes from authenticated;
grant select on table public.clientes to authenticated;
grant insert on table public.clientes to authenticated;
grant update on table public.clientes to authenticated;
grant delete on table public.clientes to authenticated;
revoke all on table public.clientes from service_role;
grant select on table public.clientes to service_role;
grant insert on table public.clientes to service_role;
grant update on table public.clientes to service_role;
grant delete on table public.clientes to service_role;
revoke all on table public.cobros from authenticated;
grant select on table public.cobros to authenticated;
grant insert on table public.cobros to authenticated;
grant update on table public.cobros to authenticated;
grant delete on table public.cobros to authenticated;
revoke all on table public.cobros from service_role;
grant select on table public.cobros to service_role;
grant insert on table public.cobros to service_role;
grant update on table public.cobros to service_role;
grant delete on table public.cobros to service_role;
revoke all on table public.equipos from anon;
grant select on table public.equipos to anon;
grant insert on table public.equipos to anon;
grant update on table public.equipos to anon;
grant delete on table public.equipos to anon;
revoke all on table public.equipos from authenticated;
grant select on table public.equipos to authenticated;
grant insert on table public.equipos to authenticated;
grant update on table public.equipos to authenticated;
grant delete on table public.equipos to authenticated;
revoke all on table public.equipos from service_role;
grant select on table public.equipos to service_role;
grant insert on table public.equipos to service_role;
grant update on table public.equipos to service_role;
grant delete on table public.equipos to service_role;
revoke all on table public.gastos from anon;
grant select on table public.gastos to anon;
grant insert on table public.gastos to anon;
grant update on table public.gastos to anon;
grant delete on table public.gastos to anon;
revoke all on table public.gastos from authenticated;
grant select on table public.gastos to authenticated;
grant insert on table public.gastos to authenticated;
grant update on table public.gastos to authenticated;
grant delete on table public.gastos to authenticated;
revoke all on table public.gastos from service_role;
grant select on table public.gastos to service_role;
grant insert on table public.gastos to service_role;
grant update on table public.gastos to service_role;
grant delete on table public.gastos to service_role;
revoke all on table public.gym_alumnos from authenticated;
grant select on table public.gym_alumnos to authenticated;
grant insert on table public.gym_alumnos to authenticated;
grant update on table public.gym_alumnos to authenticated;
grant delete on table public.gym_alumnos to authenticated;
revoke all on table public.gym_alumnos from service_role;
grant select on table public.gym_alumnos to service_role;
grant insert on table public.gym_alumnos to service_role;
grant update on table public.gym_alumnos to service_role;
grant delete on table public.gym_alumnos to service_role;
revoke all on table public.gym_asignaciones from authenticated;
grant select on table public.gym_asignaciones to authenticated;
grant insert on table public.gym_asignaciones to authenticated;
grant update on table public.gym_asignaciones to authenticated;
grant delete on table public.gym_asignaciones to authenticated;
revoke all on table public.gym_asignaciones from service_role;
grant select on table public.gym_asignaciones to service_role;
grant insert on table public.gym_asignaciones to service_role;
grant update on table public.gym_asignaciones to service_role;
grant delete on table public.gym_asignaciones to service_role;
revoke all on table public.gym_completados from authenticated;
grant select on table public.gym_completados to authenticated;
grant insert on table public.gym_completados to authenticated;
grant update on table public.gym_completados to authenticated;
grant delete on table public.gym_completados to authenticated;
revoke all on table public.gym_completados from service_role;
grant select on table public.gym_completados to service_role;
grant insert on table public.gym_completados to service_role;
grant update on table public.gym_completados to service_role;
grant delete on table public.gym_completados to service_role;
revoke all on table public.gym_ejercicios from authenticated;
grant select on table public.gym_ejercicios to authenticated;
grant insert on table public.gym_ejercicios to authenticated;
grant update on table public.gym_ejercicios to authenticated;
grant delete on table public.gym_ejercicios to authenticated;
revoke all on table public.gym_ejercicios from service_role;
grant select on table public.gym_ejercicios to service_role;
grant insert on table public.gym_ejercicios to service_role;
grant update on table public.gym_ejercicios to service_role;
grant delete on table public.gym_ejercicios to service_role;
revoke all on table public.gym_progreso from authenticated;
grant select on table public.gym_progreso to authenticated;
grant insert on table public.gym_progreso to authenticated;
grant update on table public.gym_progreso to authenticated;
grant delete on table public.gym_progreso to authenticated;
revoke all on table public.gym_progreso from service_role;
grant select on table public.gym_progreso to service_role;
grant insert on table public.gym_progreso to service_role;
grant update on table public.gym_progreso to service_role;
grant delete on table public.gym_progreso to service_role;
revoke all on table public.gym_rutina_ejercicios from authenticated;
grant select on table public.gym_rutina_ejercicios to authenticated;
grant insert on table public.gym_rutina_ejercicios to authenticated;
grant update on table public.gym_rutina_ejercicios to authenticated;
grant delete on table public.gym_rutina_ejercicios to authenticated;
revoke all on table public.gym_rutina_ejercicios from service_role;
grant select on table public.gym_rutina_ejercicios to service_role;
grant insert on table public.gym_rutina_ejercicios to service_role;
grant update on table public.gym_rutina_ejercicios to service_role;
grant delete on table public.gym_rutina_ejercicios to service_role;
revoke all on table public.gym_rutina_sesiones from authenticated;
grant select on table public.gym_rutina_sesiones to authenticated;
grant insert on table public.gym_rutina_sesiones to authenticated;
grant update on table public.gym_rutina_sesiones to authenticated;
grant delete on table public.gym_rutina_sesiones to authenticated;
revoke all on table public.gym_rutina_sesiones from service_role;
grant select on table public.gym_rutina_sesiones to service_role;
grant insert on table public.gym_rutina_sesiones to service_role;
grant update on table public.gym_rutina_sesiones to service_role;
grant delete on table public.gym_rutina_sesiones to service_role;
revoke all on table public.gym_rutinas from authenticated;
grant select on table public.gym_rutinas to authenticated;
grant insert on table public.gym_rutinas to authenticated;
grant update on table public.gym_rutinas to authenticated;
grant delete on table public.gym_rutinas to authenticated;
revoke all on table public.gym_rutinas from service_role;
grant select on table public.gym_rutinas to service_role;
grant insert on table public.gym_rutinas to service_role;
grant update on table public.gym_rutinas to service_role;
grant delete on table public.gym_rutinas to service_role;
revoke all on table public.negocio_miembros from authenticated;
grant select on table public.negocio_miembros to authenticated;
grant insert on table public.negocio_miembros to authenticated;
grant update on table public.negocio_miembros to authenticated;
grant delete on table public.negocio_miembros to authenticated;
revoke all on table public.negocio_miembros from service_role;
grant select on table public.negocio_miembros to service_role;
grant insert on table public.negocio_miembros to service_role;
grant update on table public.negocio_miembros to service_role;
grant delete on table public.negocio_miembros to service_role;
revoke all on table public.negocio_orden_contadores from service_role;
grant select on table public.negocio_orden_contadores to service_role;
grant insert on table public.negocio_orden_contadores to service_role;
grant update on table public.negocio_orden_contadores to service_role;
grant delete on table public.negocio_orden_contadores to service_role;
revoke all on table public.negocios from anon;
grant select on table public.negocios to anon;
grant insert on table public.negocios to anon;
grant update on table public.negocios to anon;
grant delete on table public.negocios to anon;
revoke all on table public.negocios from authenticated;
grant select on table public.negocios to authenticated;
grant insert on table public.negocios to authenticated;
grant update on table public.negocios to authenticated;
grant delete on table public.negocios to authenticated;
revoke all on table public.negocios from service_role;
grant select on table public.negocios to service_role;
grant insert on table public.negocios to service_role;
grant update on table public.negocios to service_role;
grant delete on table public.negocios to service_role;
revoke all on table public.reparaciones_historial from anon;
grant select on table public.reparaciones_historial to anon;
grant insert on table public.reparaciones_historial to anon;
grant update on table public.reparaciones_historial to anon;
grant delete on table public.reparaciones_historial to anon;
revoke all on table public.reparaciones_historial from authenticated;
grant select on table public.reparaciones_historial to authenticated;
grant insert on table public.reparaciones_historial to authenticated;
grant update on table public.reparaciones_historial to authenticated;
grant delete on table public.reparaciones_historial to authenticated;
revoke all on table public.reparaciones_historial from service_role;
grant select on table public.reparaciones_historial to service_role;
grant insert on table public.reparaciones_historial to service_role;
grant update on table public.reparaciones_historial to service_role;
grant delete on table public.reparaciones_historial to service_role;
revoke all on table public.reparaciones_repuestos from anon;
grant select on table public.reparaciones_repuestos to anon;
grant insert on table public.reparaciones_repuestos to anon;
grant update on table public.reparaciones_repuestos to anon;
grant delete on table public.reparaciones_repuestos to anon;
revoke all on table public.reparaciones_repuestos from authenticated;
grant select on table public.reparaciones_repuestos to authenticated;
grant insert on table public.reparaciones_repuestos to authenticated;
grant update on table public.reparaciones_repuestos to authenticated;
grant delete on table public.reparaciones_repuestos to authenticated;
revoke all on table public.reparaciones_repuestos from service_role;
grant select on table public.reparaciones_repuestos to service_role;
grant insert on table public.reparaciones_repuestos to service_role;
grant update on table public.reparaciones_repuestos to service_role;
grant delete on table public.reparaciones_repuestos to service_role;
revoke all on table public.turnos from anon;
grant select on table public.turnos to anon;
grant insert on table public.turnos to anon;
grant update on table public.turnos to anon;
grant delete on table public.turnos to anon;
revoke all on table public.turnos from authenticated;
grant select on table public.turnos to authenticated;
grant insert on table public.turnos to authenticated;
grant update on table public.turnos to authenticated;
grant delete on table public.turnos to authenticated;
revoke all on table public.turnos from service_role;
grant select on table public.turnos to service_role;
grant insert on table public.turnos to service_role;
grant update on table public.turnos to service_role;
grant delete on table public.turnos to service_role;

-- 9) Grants de funciones
revoke all on function agregar_miembro(uuid,text,text) from public;

grant execute on function agregar_miembro(uuid,text,text) to authenticated;
revoke all on function avanzar_sesion_portal(uuid) from public;
grant execute on function avanzar_sesion_portal(uuid) to anon;
grant execute on function avanzar_sesion_portal(uuid) to authenticated;
revoke all on function cambiar_rol_miembro(uuid,uuid,text) from public;

grant execute on function cambiar_rol_miembro(uuid,uuid,text) to authenticated;
revoke all on function crear_negocio_con_owner(text,text,text,text) from public;

grant execute on function crear_negocio_con_owner(text,text,text,text) to authenticated;
revoke all on function desmarcar_completado_portal(uuid,uuid,date) from public;
grant execute on function desmarcar_completado_portal(uuid,uuid,date) to anon;
grant execute on function desmarcar_completado_portal(uuid,uuid,date) to authenticated;
revoke all on function generar_numero_orden(uuid) from public;

grant execute on function generar_numero_orden(uuid) to authenticated;
revoke all on function listar_miembros(uuid) from public;

grant execute on function listar_miembros(uuid) to authenticated;
revoke all on function marcar_completado_portal(uuid,uuid,date) from public;
grant execute on function marcar_completado_portal(uuid,uuid,date) to anon;
grant execute on function marcar_completado_portal(uuid,uuid,date) to authenticated;
revoke all on function obtener_portal_alumno(uuid) from public;
grant execute on function obtener_portal_alumno(uuid) to anon;
grant execute on function obtener_portal_alumno(uuid) to authenticated;
revoke all on function obtener_seguimiento_publico(uuid) from public;
grant execute on function obtener_seguimiento_publico(uuid) to anon;
grant execute on function obtener_seguimiento_publico(uuid) to authenticated;
revoke all on function quitar_miembro(uuid,uuid) from public;

grant execute on function quitar_miembro(uuid,uuid) to authenticated;
