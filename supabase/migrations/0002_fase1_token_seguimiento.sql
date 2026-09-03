-- 0002_fase1_token_seguimiento.sql — Token público de seguimiento (fase 1, WU-3)
-- ============================================================================
-- PRERREQUISITOS (no saltear):
--   1. La migración 0001 debe estar aplicada (negocio_miembros + RLS).
--   2. Backup verificado ANTES de tocar cualquier cosa (pg_dump / Supabase
--      Dashboard). Ver scripts/backup-bootstrap.md.
--   3. En producción hay datos reales: esta migración se ejecuta DESPUÉS de
--      0001 + bootstrap + verify-rls, en la ventana de rollout documentada.
--
-- CONTRATO DE SEGURIDAD (spec, Domain 3):
--   - acceso_token es la CAPACIDAD de acceso al seguimiento público. El
--     numero_orden NO otorga acceso ([orden] es solo informativo).
--   - obtener_seguimiento_publico() devuelve SOLO los campos públicos de la
--     allowlist: estado, numero_orden, equipo básico, fechas, historial
--     público, presupuesto, precio_final, cliente_nombre, negocio_nombre.
--     NUNCA devuelve: observaciones_internas, costos, técnico, teléfonos,
--     otros clientes ni datos de membresía.
--   - Sin verificación de membresía: el acceso se concede POR TOKEN SOLO.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Columna acceso_token (WU3-1)
--    Orden crítico: agregar nullable → backfill → default → NOT NULL.
--    gen_random_uuid() es nativo (PostgreSQL 13+); no requiere pgcrypto.
-- ---------------------------------------------------------------------------
alter table public.equipos add column acceso_token uuid;

update public.equipos
   set acceso_token = gen_random_uuid()
 where acceso_token is null;

alter table public.equipos alter column acceso_token set default gen_random_uuid();
alter table public.equipos alter column acceso_token set not null;

create unique index idx_equipos_acceso_token on public.equipos (acceso_token);

-- ---------------------------------------------------------------------------
-- 2) RPC público de seguimiento (WU3-2)
--    SECURITY DEFINER + allowlist: proyecta únicamente los campos públicos
--    declarados en el RETURNS TABLE. El historial se limita a las columnas
--    públicas del cliente (estado_nuevo, fecha, comentario); se excluye el
--    usuario interno y el estado anterior.
--    Token desconocido o revocado → 0 filas (sin excepción: no hay oráculo
--    que distinga token válido de inválido).
--    GRANT: anon + authenticated (un visitante con sesión consulta su propio
--    seguimiento con el mismo allowlist; la membresía no interviene).
-- ---------------------------------------------------------------------------
create or replace function public.obtener_seguimiento_publico(p_token uuid)
returns table (
  estado                 text,
  numero_orden           text,
  categoria              text,
  marca                  text,
  modelo                 text,
  problema_reportado     text,
  fecha_ingreso          timestamptz,
  fecha_estimada_entrega date,
  fecha_entrega          timestamptz,
  presupuesto            numeric,
  precio_final           numeric,
  cliente_nombre         text,
  negocio_nombre         text,
  historial              jsonb
)
language plpgsql
security definer
set search_path = public
as $$
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
$$;

revoke all on function public.obtener_seguimiento_publico(uuid) from public;
grant execute on function public.obtener_seguimiento_publico(uuid) to anon, authenticated;