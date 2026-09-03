-- supabase/seed.sql — Datos demo de desarrollo (fase 3, WU-1)
-- ============================================================================
-- EJECUTAR CON ROL PRIVILEGIADO (postgres / service_role): atraviesa RLS.
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql
--
-- CONTRATO (spec Domain 4, D-08):
--   - SOLO uso de desarrollo; no correr contra producción.
--   - Idempotente: UUIDs FIJOS deterministas + on conflict (id) do nothing;
--     re-ejecutar NO duplica filas.
--   - Respetar 0003: slugs únicos (uq_negocios_slug), numero_orden único por
--     negocio (uq_equipos_negocio_orden; cross-negocio igual permitido),
--     monto/cuota >= 0, cantidad > 0 (CHECKs), contadores sembrados con
--     ultimo = max para que el RPC continúe en max + 1.
--   - NO inserta en auth.users.
--   - negocio_miembros NO se siembra: el link de membresías se hace con
--     scripts/bootstrap-owners.sql (UUID del usuario dev como argumento).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Negocios demo
-- ---------------------------------------------------------------------------
insert into public.negocios (id, nombre, rubro, slug, activo)
values
  ('10000000-0000-4000-8000-000000000001', 'Servicio Técnico Centro', 'reparaciones', 'servicio_tecnico', true),
  ('10000000-0000-4000-8000-000000000002', 'Peluquería Glam',          'peluqueria',    'peluqueria',      true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2) Clientes (servicio_tecnico: 3 · peluqueria: 2) — cuota >= 0 (0003)
-- ---------------------------------------------------------------------------
insert into public.clientes (id, negocio_id, nombre, telefono, plan, cuota, estado, vence)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Juan Pérez',      '+54 11 5555-0101', 'plan_basico',  25000, 'activo', '2026-09-30'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'María González',  '+54 11 5555-0102', 'plan_premium', 40000, 'activo', '2026-09-15'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Carlos Ruiz',     '+54 11 5555-0103', 'plan_basico',  25000, 'moroso', '2026-08-31'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'Ana Fernández',   '+54 11 5555-0201', 'plan_mensual', 18000, 'activo', '2026-09-20'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 'Laura Martínez',  '+54 11 5555-0202', 'plan_mensual',     0, 'activo', null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 3) Turnos (servicio_tecnico: 3 · peluqueria: 2)
-- ---------------------------------------------------------------------------
insert into public.turnos (id, negocio_id, cliente_nombre, telefono, fecha, hora, servicio, duracion, estado, notas)
values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Juan Pérez',    '+54 11 5555-0101', '2026-09-04', '09:30', 'Diagnóstico',    60, 'confirmado', 'Trae el equipo sin cargador'),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'María González', '+54 11 5555-0102', '2026-09-04', '11:00', 'Reparación',     120, 'confirmado', null),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Carlos Ruiz',    '+54 11 5555-0103', '2026-09-05', '15:30', 'Consulta',        30, 'pendiente',  null),
  ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'Ana Fernández',  '+54 11 5555-0201', '2026-09-04', '10:00', 'Corte y peinado', 90, 'confirmado', null),
  ('40000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 'Laura Martínez', '+54 11 5555-0202', '2026-09-05', '17:00', 'Colorimetría',    120, 'pendiente', null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 4) Gastos (servicio_tecnico: 3 · peluqueria: 2) — monto >= 0 (0003)
-- ---------------------------------------------------------------------------
insert into public.gastos (id, negocio_id, descripcion, fecha, monto)
values
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Repuesto pantalla',     '2026-09-01', 45000),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Alquiler local',        '2026-09-01', 120000),
  ('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Herramientas de precisión', '2026-09-02', 18000),
  ('50000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'Productos de peluquería', '2026-09-01', 60000),
  ('50000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 'Limpieza del salón',    '2026-09-02', 8000)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 5) Equipos (servicio_tecnico: 3 con 0001..0003 · peluqueria: 2 con 0001..0002)
--    numero_orden único POR negocio (0003); acceso_token se autogenera (0002).
-- ---------------------------------------------------------------------------
insert into public.equipos (
  id, negocio_id, cliente_id, categoria, numero_orden, estado, marca, modelo,
  problema_reportado, fecha_ingreso, fecha_estimada_entrega, presupuesto,
  precio_final, presupuesto_aceptado, tecnico_asignado, observaciones_internas,
  accesorios, numero_serie
)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   'celular', '0001', 'en_reparacion', 'Samsung', 'Galaxy S22', 'Pantalla rota y batería drena rápido',
   '2026-09-01T14:00:00Z', '2026-09-08', 220000, 220000, true, 'Pablo', 'Pantalla ya pedida al proveedor', 'Funda transparente', 'SN-0001'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002',
   'notebook', '0002', 'presupuestado', 'Lenovo', 'ThinkPad T14', 'No enciende, sospecha de fuente',
   '2026-09-02T10:30:00Z', '2026-09-09', 95000, null, false, 'Pablo', 'Esperando aprobación del presupuesto', null, 'SN-0002'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003',
   'tablet', '0003', 'recibido', 'Apple', 'iPad 9', 'Táctil no responde en una zona',
   '2026-09-03T09:00:00Z', '2026-09-10', null, null, false, null, 'Pendiente de diagnóstico', null, 'SN-0003'),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000004',
   'otros', '0001', 'recibido', null, null, 'Secador de pelo profesional con olor a quemado',
   '2026-09-02T16:00:00Z', '2026-09-06', 15000, null, false, null, null, null, null),
  ('30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000005',
   'otros', '0002', 'entregado', null, null, 'Plancha de pelo que no calienta',
   '2026-08-28T11:00:00Z', '2026-09-02', 9000, 9000, true, 'Luis', null, null, null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 6) Historial inicial (un alta por equipo) — estado_nuevo obligatorio
-- ---------------------------------------------------------------------------
insert into public.reparaciones_historial (id, negocio_id, equipo_id, estado_anterior, estado_nuevo, fecha, comentario, usuario)
values
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', null, 'recibido',      '2026-09-01T14:00:00Z', 'Ingreso del equipo', 'Pablo'),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'recibido', 'en_reparacion', '2026-09-01T15:30:00Z', 'Inicia reparación', 'Pablo'),
  ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', null, 'recibido',      '2026-09-02T10:30:00Z', 'Ingreso del equipo', 'Pablo'),
  ('60000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', null, 'recibido',      '2026-09-03T09:00:00Z', 'Ingreso del equipo', 'Pablo'),
  ('60000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000004', null, 'recibido',      '2026-09-02T16:00:00Z', 'Ingreso del equipo', 'Luis'),
  ('60000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000005', null, 'recibido',      '2026-08-28T11:00:00Z', 'Ingreso del equipo', 'Luis'),
  ('60000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000005', 'en_reparacion', 'entregado', '2026-09-02T12:00:00Z', 'Entrega al cliente', 'Luis')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 7) Repuestos (servicio_tecnico: 3 · peluqueria: 1) — cantidad > 0, costos
--    y precio_cobrado >= 0 (0003)
-- ---------------------------------------------------------------------------
insert into public.reparaciones_repuestos (id, negocio_id, equipo_id, descripcion, cantidad, costo, precio_cobrado)
values
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Display Samsung S22',     1,  130000, 160000),
  ('70000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Batería Samsung S22',     1,  45000,  60000),
  ('70000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'Fuente ThinkPad T14',     1,  52000,  75000),
  ('70000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000004', 'Resistencia secador',     2,  3000,    5000)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 8) Contadores sembrados (ultimo = max numero_orden por negocio): el RPC
--    continúa en max + 1 ('0004' servicio_tecnico, '0003' peluqueria)
-- ---------------------------------------------------------------------------
insert into public.negocio_orden_contadores (negocio_id, ultimo)
values
  ('10000000-0000-4000-8000-000000000001', 3),
  ('10000000-0000-4000-8000-000000000002', 2)
on conflict (negocio_id) do nothing;