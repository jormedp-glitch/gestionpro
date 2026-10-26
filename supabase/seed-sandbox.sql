-- supabase/seed-sandbox.sql — Datos de QA para el entorno de pruebas (sandbox)
-- ============================================================================
-- PROPOSITO: dejar el sandbox con datos en TODOS los dominios de la app
-- (negocios por rubro, clientes, turnos, cobros, gastos, reparaciones, core de
-- gym) para poder recorrer la aplicación completa sin tocar producción.
--
-- REQUISITOS:
--   1. El schema debe existir: aplicar `supabase/base-schema.sql` (DDL puro,
--      extraído del catálogo) o el bootstrap completo del sandbox.
--   2. `negocio_miembros` NO se siembra acá: necesita el id de auth.users, que
--      no se conoce desde SQL (ver scripts/bootstrap-sandbox.sql).
--
-- CONTRATO (mismo criterio que supabase/seed.sql):
--   - SOLO uso de desarrollo/sandbox: nunca contra producción.
--   - Idempotente: UUIDs FIJOS deterministas + on conflict do nothing;
--     re-ejecutar NO duplica filas.
--   - Respeta los CHECKs: cuota >= 0, monto >= 0, cantidad > 0,
--     sesiones_total > 0, medio_pago en el set válido.
--   - Respeta los UNIQUE: negocios.slug, equipos.numero_orden,
--     gym_alumnos.portal_token, uq_gym_rutina_sesiones(rutina_id, numero_sesion),
--     uq_gym_completados(cliente_id, rutina_ejercicio_id, fecha).
--   - Los contadores de orden quedan sembrados con `ultimo = max` para que el
--     RPC `generar_numero_orden` continue en max + 1.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Negocios (6: los 5 rubros del dominio + un segundo gimnasio)
-- ---------------------------------------------------------------------------
insert into public.negocios (id, nombre, slug, rubro, telefono_admin, activo, disciplina)
values
  ('9a000000-0000-4000-8000-000000000001', 'Gym El Oso',      'gym-el-oso',       'gimnasio',        '+54 11 5555-0101', true, null),
  ('9a000000-0000-4000-8000-000000000002', 'QA Ana Profe',    'qa-ana-profe',     'profesor',        '+54 11 5555-0102', true, 'Patín'),
  ('9a000000-0000-4000-8000-000000000003', 'Peluquería Lum',  'peluqueria-lum',  'peluqueria',      '+54 11 5555-0103', true, null),
  ('9a000000-0000-4000-8000-000000000004', 'Veterinaria Patitas', 'veterinaria-patas', 'veterinaria', '+54 11 5555-0104', true, null),
  ('9a000000-0000-4000-8000-000000000005', 'Taller Eme',      'taller-eme',       'servicio_tecnico', '+54 11 5555-0105', true, null),
  ('9a000000-0000-4000-8000-000000000006', 'Pepe GYM',        'pepe-gym',         'gimnasio',        '+54 11 5555-0106', true, null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2) Clientes (11)
--    `vence` en el pasado en uno a propósito: la UI deriva vencido/vence_pronto
--    del vencimiento (fix #82) y sirve para ver la tarjeta de alertas.
-- ---------------------------------------------------------------------------
insert into public.clientes (id, negocio_id, nombre, telefono, email, plan, cuota, vence, estado)
values
  ('9a100000-0000-4000-8000-000000000001', '9a000000-0000-4000-8000-000000000001', 'Juana Gómez',   '+54 11 5555-1001', 'juana@example.test',  'plan_basico',  25000, '2026-11-15', 'activo'),
  ('9a100000-0000-4000-8000-000000000002', '9a000000-0000-4000-8000-000000000001', 'Martín Suárez', '+54 11 5555-1002', 'martin@example.test', 'plan_premium', 40000, '2026-10-10', 'activo'),
  ('9a100000-0000-4000-8000-000000000003', '9a000000-0000-4000-8000-000000000001', 'Sofía Díaz',    '+54 11 5555-1003', 'sofia@example.test',  'plan_basico',  25000, '2026-12-01', 'activo'),
  ('9a100000-0000-4000-8000-000000000004', '9a000000-0000-4000-8000-000000000002', 'Bruno Alvarez', '+54 11 5555-1004', 'bruno@example.test',  'plan_basico',  20000, '2026-11-20', 'activo'),
  ('9a100000-0000-4000-8000-000000000005', '9a000000-0000-4000-8000-000000000002', 'Carla Mendez',  '+54 11 5555-1005', 'carla@example.test',  'plan_basico',  20000, '2026-11-25', 'activo'),
  ('9a100000-0000-4000-8000-000000000006', '9a000000-0000-4000-8000-000000000003', 'Lucía Ferrari', '+54 11 5555-1006', 'lucia@example.test',  'plan_mensual', 18000, '2026-11-18', 'activo'),
  ('9a100000-0000-4000-8000-000000000007', '9a000000-0000-4000-8000-000000000003', 'Nico Russo',    '+54 11 5555-1007', 'nico@example.test',   'plan_mensual',     0, null,        'activo'),
  ('9a100000-0000-4000-8000-000000000008', '9a000000-0000-4000-8000-000000000004', 'Ana Paula',     '+54 11 5555-1008', 'anapaula@example.test', 'plan_basico', 22000, '2026-11-12', 'activo'),
  ('9a100000-0000-4000-8000-000000000009', '9a000000-0000-4000-8000-000000000004', 'Tomás Ríos',    '+54 11 5555-1009', 'tomas@example.test', 'plan_basico',  22000, '2026-11-30', 'activo'),
  ('9a100000-0000-4000-8000-000000000010', '9a000000-0000-4000-8000-000000000005', 'Diego Paz',     '+54 11 5555-1010', 'diego@example.test',  'plan_basico',  30000, '2026-11-22', 'activo'),
  ('9a100000-0000-4000-8000-000000000011', '9a000000-0000-4000-8000-000000000006', 'Pedro Lan',     '+54 11 5555-1011', 'pedro@example.test',  'plan_basico',  25000, '2026-11-28', 'activo')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 3) Turnos (9) — con fechas alrededor de hoy (2026-10-26) para que el
--    dashboard muestre "turnos hoy" y "próximos 7 días"
-- ---------------------------------------------------------------------------
insert into public.turnos (id, negocio_id, cliente_id, cliente_nombre, telefono, servicio, fecha, hora, duracion, estado, notas, lugar)
values
  ('9a200000-0000-4000-8000-000000000001', '9a000000-0000-4000-8000-000000000001', '9a100000-0000-4000-8000-000000000001', 'Juana Gómez',   '+54 11 5555-1001', 'Entrenamiento', '2026-10-26', '09:30', 60,  'confirmado', 'Primer turno del día',   'Sala 1'),
  ('9a200000-0000-4000-8000-000000000002', '9a000000-0000-4000-8000-000000000001', '9a100000-0000-4000-8000-000000000003', 'Sofía Díaz',    '+54 11 5555-1003', 'Entrenamiento', '2026-10-26', '18:00', 60,  'pendiente',  null,                      'Sala 2'),
  ('9a200000-0000-4000-8000-000000000003', '9a000000-0000-4000-8000-000000000001', '9a100000-0000-4000-8000-000000000002', 'Martín Suárez', '+54 11 5555-1002', 'Evaluación',   '2026-10-28', '10:00', 45,  'confirmado', 'Medición de progresión',          'Sala 1'),
  ('9a200000-0000-4000-8000-000000000004', '9a000000-0000-4000-8000-000000000002', '9a100000-0000-4000-8000-000000000004', 'Bruno Alvarez', '+54 11 5555-1004', 'Clase de patín', '2026-10-27', '17:00', 60,  'confirmado', 'Traer el equipo',          'Cancha 1'),
  ('9a200000-0000-4000-8000-000000000005', '9a000000-0000-4000-8000-000000000003', '9a100000-0000-4000-8000-000000000006', 'Lucía Ferrari', '+54 11 5555-1006', 'Corte + color',  '2026-10-26', '11:00', 120, 'confirmado', null,                    'Sucursal Centro'),
  ('9a200000-0000-4000-8000-000000000006', '9a000000-0000-4000-8000-000000000003', '9a100000-0000-4000-8000-000000000007', 'Nico Russo',    '+54 11 5555-1007', 'Colorimetría',    '2026-10-30', '16:00', 90,  'pendiente',  null,                    'Sucursal Centro'),
  ('9a200000-0000-4000-8000-000000000007', '9a000000-0000-4000-8000-000000000004', '9a100000-0000-4000-8000-000000000008', 'Ana Paula',     '+54 11 5555-1008', 'Vacunación',     '2026-10-26', '15:00', 30,  'confirmado', 'Control anual',          'Consultorio 1'),
  ('9a200000-0000-4000-8000-000000000008', '9a000000-0000-4000-8000-000000000005', '9a100000-0000-4000-8000-000000000010', 'Diego Paz',     '+54 11 5555-1010', 'Retiro de equipo','2026-10-27', '10:00', 15,  'confirmado', 'Notebook con Display',    null),
  ('9a200000-0000-4000-8000-000000000009', '9a000000-0000-4000-8000-000000000006', '9a100000-0000-4000-8000-000000000011', 'Pedro Lan',     '+54 11 5555-1011', 'Entrenamiento', '2026-10-29', '08:00', 60,  'pendiente',  null,                      'Sala 1')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 4) Gastos (6)
-- ---------------------------------------------------------------------------
insert into public.gastos (id, negocio_id, descripcion, monto, fecha)
values
  ('9a300000-0000-4000-8000-000000000001', '9a000000-0000-4000-8000-000000000001', 'Alquiler del local',       120000, '2026-10-01'),
  ('9a300000-0000-4000-8000-000000000002', '9a000000-0000-4000-8000-000000000001', 'Limpieza de la sala',        18000, '2026-10-14'),
  ('9a300000-0000-4000-8000-000000000003', '9a000000-0000-4000-8000-000000000002', 'Alquiler del rink',          90000, '2026-10-01'),
  ('9a300000-0000-4000-8000-000000000004', '9a000000-0000-4000-8000-000000000003', 'Productos de peluquería',    60000, '2026-10-08'),
  ('9a300000-0000-4000-8000-000000000005', '9a000000-0000-4000-8000-000000000005', 'Herramientas de precisión',  22000, '2026-10-05'),
  ('9a300000-0000-4000-8000-000000000006', '9a000000-0000-4000-8000-000000000006', 'Alquiler del gym',           85000, '2026-10-01')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 5) Cobros (9) — ingresos reales del mes (dashboard: total del mes)
-- ---------------------------------------------------------------------------
insert into public.cobros (id, negocio_id, cliente_id, monto, concepto, medio_pago, fecha)
values
  ('9a400000-0000-4000-8000-000000000001', '9a000000-0000-4000-8000-000000000001', '9a100000-0000-4000-8000-000000000001', 25000, 'Cuota octubre',        'efectivo',     '2026-10-03'),
  ('9a400000-0000-4000-8000-000000000002', '9a000000-0000-4000-8000-000000000001', '9a100000-0000-4000-8000-000000000003', 25000, 'Cuota octubre',        'transferencia', '2026-10-06'),
  ('9a400000-0000-4000-8000-000000000003', '9a000000-0000-4000-8000-000000000001', '9a100000-0000-4000-8000-000000000002', 40000, 'Plan premium + clase extra', 'mercadopago', '2026-10-12'),
  ('9a400000-0000-4000-8000-000000000004', '9a000000-0000-4000-8000-000000000002', '9a100000-0000-4000-8000-000000000004', 20000, 'Cuota octubre',        'efectivo',     '2026-10-04'),
  ('9a400000-0000-4000-8000-000000000005', '9a000000-0000-4000-8000-000000000003', '9a100000-0000-4000-8000-000000000006', 18000, 'Cuota octubre',        'efectivo',     '2026-10-09'),
  ('9a400000-0000-4000-8000-000000000006', '9a000000-0000-4000-8000-000000000004', '9a100000-0000-4000-8000-000000000008', 22000, 'Cuota octubre',        'transferencia', '2026-10-07'),
  ('9a400000-0000-4000-8000-000000000007', '9a000000-0000-4000-8000-000000000005', '9a100000-0000-4000-8000-000000000010', 30000, 'Reparación + repuesto', 'efectivo',     '2026-10-15'),
  ('9a400000-0000-4000-8000-000000000008', '9a000000-0000-4000-8000-000000000006', '9a100000-0000-4000-8000-000000000011', 25000, 'Cuota octubre',        'efectivo',     '2026-10-10'),
  ('9a400000-0000-4000-8000-000000000009', '9a000000-0000-4000-8000-000000000001', '9a100000-0000-4000-8000-000000000001', 25000, 'Cuota noviembre (anticipo)', 'efectivo', '2026-10-25')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 6) Reparaciones: equipos + historial + repuestos (Taller Eme)
-- ---------------------------------------------------------------------------
insert into public.equipos (id, negocio_id, cliente_id, numero_orden, categoria, marca, modelo, numero_serie, problema_reportado, accesorios, fecha_ingreso, fecha_estimada_entrega, estado, tecnico_asignado, presupuesto, presupuesto_aceptado, precio_final, fecha_entrega, observaciones_internas, acceso_token)
values
  ('9a500000-0000-4000-8000-000000000001', '9a000000-0000-4000-8000-000000000005', '9a100000-0000-4000-8000-000000000010', '0001', 'Notebook', 'Apple', 'MacBook Air M1', 'C02XG1FFMD6T', 'No enciende y hace un zumbido raro', 'Cargador', '2026-10-10 09:00:00+00', '2026-10-20', 'listo_para_retirar', 'Eme', 45000, true, 45000, null, 'Batería swollen: revisar antes de entregar', '9a510000-0000-4000-8000-000000000001'),
  ('9a500000-0000-4000-8000-000000000002', '9a000000-0000-4000-8000-000000000005', '9a100000-0000-4000-8000-000000000010', '0002', 'Celular',  'Samsung', 'Galaxy A54', 'RF8X92ABKLM', 'Pantalla con líneas verticales', 'Funda', '2026-10-18 14:30:00+00', '2026-10-28', 'recibido', null, null, false, null, null, null, '9a510000-0000-4000-8000-000000000002'),
  ('9a500000-0000-4000-8000-000000000003', '9a000000-0000-4000-8000-000000000005', '9a100000-0000-4000-8000-000000000010', '0003', 'Impresora', 'HP', 'LaserJet M1136', 'SN-9F2K-0011', 'Imprime en blanco', null, '2026-10-05 11:00:00+00', '2026-10-12', 'entregado', 'Eme', 30000, true, 30000, '2026-10-12 18:00:00+00', null, '9a510000-0000-4000-8000-000000000003')
on conflict (id) do nothing;

insert into public.reparaciones_historial (id, equipo_id, negocio_id, estado_anterior, estado_nuevo, comentario, fecha, usuario)
values
  ('9a600000-0000-4000-8000-000000000001', '9a500000-0000-4000-8000-000000000001', '9a000000-0000-4000-8000-000000000005', null, 'recibido', 'Equipo ingresado al taller', '2026-10-10 09:00:00+00', 'sistema'),
  ('9a600000-0000-4000-8000-000000000002', '9a500000-0000-4000-8000-000000000001', '9a000000-0000-4000-8000-000000000005', 'recibido', 'diagnosticado', 'Batería swollen: se reemplaza', '2026-10-13 12:00:00+00', 'Eme'),
  ('9a600000-0000-4000-8000-000000000003', '9a500000-0000-4000-8000-000000000001', '9a000000-0000-4000-8000-000000000005', 'diagnosticado', 'listo_para_retirar', 'Listo para retirar', '2026-10-16 16:30:00+00', 'Eme'),
  ('9a600000-0000-4000-8000-000000000004', '9a500000-0000-4000-8000-000000000002', '9a000000-0000-4000-8000-000000000005', null, 'recibido', 'Equipo ingresado al taller', '2026-10-18 14:30:00+00', 'sistema'),
  ('9a600000-0000-4000-8000-000000000005', '9a500000-0000-4000-8000-000000000003', '9a000000-0000-4000-8000-000000000005', null, 'recibido', 'Equipo ingresado al taller', '2026-10-05 11:00:00+00', 'sistema'),
  ('9a600000-0000-4000-8000-000000000006', '9a500000-0000-4000-8000-000000000003', '9a000000-0000-4000-8000-000000000005', 'recibido', 'listo_para_retirar', 'Repuesto instalado', '2026-10-10 15:00:00+00', 'Eme'),
  ('9a600000-0000-4000-8000-000000000007', '9a500000-0000-4000-8000-000000000003', '9a000000-0000-4000-8000-000000000005', 'listo_para_retirar', 'entregado', 'Entregado al cliente', '2026-10-12 18:00:00+00', 'Eme')
on conflict (id) do nothing;

insert into public.reparaciones_repuestos (id, equipo_id, negocio_id, descripcion, costo, precio_cobrado, cantidad)
values
  ('9a700000-0000-4000-8000-000000000001', '9a500000-0000-4000-8000-000000000001', '9a000000-0000-4000-8000-000000000005', 'Batería original', 25000, 30000, 1),
  ('9a700000-0000-4000-8000-000000000002', '9a500000-0000-4000-8000-000000000003', '9a000000-0000-4000-8000-000000000005', 'Toner TN-227', 12000, 18000, 1)
on conflict (id) do nothing;

-- Contador de órdenes del taller: `ultimo = max(numero_orden)` para que el RPC
-- `generar_numero_orden` siga en max + 1 (0003, D-01).
insert into public.negocio_orden_contadores (negocio_id, ultimo)
values ('9a000000-0000-4000-8000-000000000005', 3)
on conflict (negocio_id) do nothing;

-- ---------------------------------------------------------------------------
-- 7) Core de gym — Gym El Oso (alumnos, ejercicios, rutinas, sesiones,
--    asignaciones, progreso, completados)
-- ---------------------------------------------------------------------------
insert into public.gym_alumnos (cliente_id, negocio_id, objetivo, notas, altura_cm, fecha_nac, portal_token, codigo_acceso)
values
  ('9a100000-0000-4000-8000-000000000001', '9a000000-0000-4000-8000-000000000001', 'Bajar 5 kg', 'Lesión de rodilla en 2025: cuidado con el saltón', 168, '1993-04-12', '9a810000-0000-4000-8000-000000000001', 'OSO-0001'),
  ('9a100000-0000-4000-8000-000000000003', '9a000000-0000-4000-8000-000000000001', 'Ganar masa muscular', null, 175, '1997-11-30', '9a810000-0000-4000-8000-000000000002', 'OSO-0002')
on conflict (cliente_id) do nothing;

insert into public.gym_ejercicios (id, negocio_id, nombre, grupo_muscular, descripcion, url_video, activo)
values
  ('9a820000-0000-4000-8000-000000000001', '9a000000-0000-4000-8000-000000000001', 'Sentadilla trasera',   'Pierna',  'Con barra, espalda recta', null, true),
  ('9a820000-0000-4000-8000-000000000002', '9a000000-0000-4000-8000-000000000001', 'Peso muerto rumano',   'Espalda', 'Bisagra de cadera, agarre neutro', null, true),
  ('9a820000-0000-4000-8000-000000000003', '9a000000-0000-4000-8000-000000000001', 'Press de banca',       'Pecho',   'Barra, escápulas retraídas', null, true),
  ('9a820000-0000-4000-8000-000000000004', '9a000000-0000-4000-8000-000000000001', 'Remo con mancuerna',   'Espalda', 'Un brazo por vez', null, true),
  ('9a820000-0000-4000-8000-000000000005', '9a000000-0000-4000-8000-000000000001', 'Sentadilla búlgaro',   'Pierna',  'Para activación de cadera', null, true)
on conflict (id) do nothing;

insert into public.gym_rutinas (id, negocio_id, nombre, descripcion, sesiones_total, activo)
values
  ('9a830000-0000-4000-8000-000000000001', '9a000000-0000-4000-8000-000000000001', 'Fuerza 3x por semana', 'Ciclo de fuerza para 3 sesiones semanales', 3, true),
  ('9a830000-0000-4000-8000-000000000002', '9a000000-0000-4000-8000-000000000001', 'Full body',             'Rutina corta de cuerpo completo', 2, true)
on conflict (id) do nothing;

insert into public.gym_rutina_sesiones (id, negocio_id, rutina_id, numero_sesion)
values
  ('9a840000-0000-4000-8000-000000000001', '9a000000-0000-4000-8000-000000000001', '9a830000-0000-4000-8000-000000000001', 1),
  ('9a840000-0000-4000-8000-000000000002', '9a000000-0000-4000-8000-000000000001', '9a830000-0000-4000-8000-000000000001', 2),
  ('9a840000-0000-4000-8000-000000000001', '9a000000-0000-4000-8000-000000000001', '9a830000-0000-4000-8000-000000000002', 1)
on conflict (id) do nothing;

insert into public.gym_rutina_ejercicios (id, negocio_id, sesion_id, ejercicio_id, series, repeticiones, descanso_seg, notas, orden)
values
  ('9a850000-0000-4000-8000-000000000001', '9a000000-0000-4000-8000-000000000001', '9a840000-0000-4000-8000-000000000001', '9a820000-0000-4000-8000-000000000001', 4, '8-10', 120, null, 1),
  ('9a850000-0000-4000-8000-000000000002', '9a000000-0000-4000-8000-000000000001', '9a840000-0000-4000-8000-000000000001', '9a820000-0000-4000-8000-000000000002', 4, '6-8',  150, null, 2),
  ('9a850000-0000-4000-8000-000000000003', '9a000000-0000-4000-8000-000000000001', '9a840000-0000-4000-8000-000000000001', '9a820000-0000-4000-8000-000000000005', 2, '15',   60,  'Activación', 3),
  ('9a850000-0000-4000-8000-000000000004', '9a000000-0000-4000-8000-000000000001', '9a840000-0000-4000-8000-000000000002', '9a820000-0000-4000-8000-000000000003', 4, '8-10', 120, null, 1),
  ('9a850000-0000-4000-8000-000000000005', '9a000000-0000-4000-8000-000000000001', '9a840000-0000-4000-8000-000000000002', '9a820000-0000-4000-8000-000000000004', 3, '10-12', 90,  null, 2)
on conflict (id) do nothing;

insert into public.gym_asignaciones (id, negocio_id, cliente_id, rutina_id, sesion_actual, fecha_inicio, activa)
values
  ('9a860000-0000-4000-8000-000000000001', '9a000000-0000-4000-8000-000000000001', '9a100000-0000-4000-8000-000000000001', '9a830000-0000-4000-8000-000000000001', 2, '2026-10-06', true),
  ('9a860000-0000-4000-8000-000000000002', '9a000000-0000-4000-8000-000000000001', '9a100000-0000-4000-8000-000000000003', '9a830000-0000-4000-8000-000000000002', 1, '2026-10-13', true)
on conflict (id) do nothing;

insert into public.gym_progreso (id, negocio_id, cliente_id, fecha, peso, cintura, cadera, porcentaje_grasa, pecho_cm, bicep_cm, notas, created_at)
values
  ('9a870000-0000-4000-8000-000000000001', '9a000000-0000-4000-8000-000000000001', '9a100000-0000-4000-8000-000000000001', '2026-10-06', 68.4, 82.0, 98.0, 24.1, null, null, 'Toma inicial', '2026-10-06 10:00:00+00'),
  ('9a870000-0000-4000-8000-000000000002', '9a000000-0000-4000-8000-000000000001', '9a100000-0000-4000-8000-000000000001', '2026-10-20', 67.1, 80.5, 96.5, 23.4, null, null, 'Buena progresión', '2026-10-20 10:00:00+00'),
  ('9a870000-0000-4000-8000-000000000003', '9a000000-0000-4000-8000-000000000001', '9a100000-0000-4000-8000-000000000003', '2026-10-13', 82.0, null, null, 16.8, 102.0, 36.5, null, '2026-10-13 10:00:00+00')
on conflict (id) do nothing;

insert into public.gym_completados (id, negocio_id, cliente_id, rutina_ejercicio_id, fecha, created_at)
values
  ('9a880000-0000-4000-8000-000000000001', '9a000000-0000-4000-8000-000000000001', '9a100000-0000-4000-8000-000000000001', '9a850000-0000-4000-8000-000000000001', '2026-10-13', '2026-10-13 19:00:00+00'),
  ('9a880000-0000-4000-8000-000000000002', '9a000000-0000-4000-8000-000000000001', '9a100000-0000-4000-8000-000000000001', '9a850000-0000-4000-8000-000000000002', '2026-10-13', '2026-10-13 19:05:00+00'),
  ('9a880000-0000-4000-8000-000000000003', '9a000000-0000-4000-8000-000000000001', '9a100000-0000-4000-8000-000000000001', '9a850000-0000-4000-8000-000000000001', '2026-10-20', '2026-10-20 19:00:00+00')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 8) Core de gym — QA Ana Profe (rubro `profesor`): un alumno, una rutina de
--    1 sesión con 2 ejercicios, una asignación y un progreso
-- ---------------------------------------------------------------------------
insert into public.gym_alumnos (cliente_id, negocio_id, objetivo, notas, altura_cm, fecha_nac, portal_token, codigo_acceso)
values
  ('9a100000-0000-4000-8000-000000000004', '9a000000-0000-4000-8000-000000000002', 'Aprender skate', null, 170, '2000-06-05', '9a810000-0000-4000-8000-000000000003', 'PRO-0001')
on conflict (cliente_id) do nothing;

insert into public.gym_ejercicios (id, negocio_id, nombre, grupo_muscular, descripcion, url_video, activo)
values
  ('9a820000-0000-4000-8000-000000000006', '9a000000-0000-4000-8000-000000000002', 'Rodaje al llano', 'Cardio',  'Rodaje en llano, Alternateos', null, true),
  ('9a820000-0000-4000-8000-000000000007', '9a000000-0000-4000-8000-000000000002', 'Freno en curva', 'Cardio',  'Frenar yPivotar', null, true)
on conflict (id) do nothing;

insert into public.gym_rutinas (id, negocio_id, nombre, descripcion, sesiones_total, activo)
values
  ('9a830000-0000-4000-8000-000000000003', '9a000000-0000-4000-8000-000000000002', 'Inicial patín', 'Rutina de 1 sesión para arrancar', 1, true)
on conflict (id) do nothing;

insert into public.gym_rutina_sesiones (id, negocio_id, rutina_id, numero_sesion)
values
  ('9a840000-0000-4000-8000-000000000003', '9a000000-0000-4000-8000-000000000002', '9a830000-0000-4000-8000-000000000003', 1)
on conflict (id) do nothing;

insert into public.gym_rutina_ejercicios (id, negocio_id, sesion_id, ejercicio_id, series, repeticiones, descanso_seg, notas, orden)
values
  ('9a850000-0000-4000-8000-000000000006', '9a000000-0000-4000-8000-000000000002', '9a840000-0000-4000-8000-000000000003', '9a820000-0000-4000-8000-000000000006', 3, '2 min', 120, null, 1),
  ('9a850000-0000-4000-8000-000000000007', '9a000000-0000-4000-8000-000000000002', '9a840000-0000-4000-8000-000000000003', '9a820000-0000-4000-8000-000000000007', 3, '1 min', 90, null, 2)
on conflict (id) do nothing;

insert into public.gym_asignaciones (id, negocio_id, cliente_id, rutina_id, sesion_actual, fecha_inicio, activa)
values
  ('9a860000-0000-4000-8000-000000000003', '9a000000-0000-4000-8000-000000000002', '9a100000-0000-4000-8000-000000000004', '9a830000-0000-4000-8000-000000000003', 1, '2026-10-19', true)
on conflict (id) do nothing;

insert into public.gym_progreso (id, negocio_id, cliente_id, fecha, peso, notas, created_at)
values
  ('9a870000-0000-4000-8000-000000000004', '9a000000-0000-4000-8000-000000000002', '9a100000-0000-4000-8000-000000000004', '2026-10-19', 72.3, 'Primera clase', '2026-10-19 19:00:00+00')
on conflict (id) do nothing;
