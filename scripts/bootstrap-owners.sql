-- scripts/bootstrap-owners.sql — Asignación de owners a negocios existentes
-- ============================================================================
-- Operación UNICA, ejecutada por el operador (rol privilegiado: postgres /
-- service_role) DESPUÉS de aplicar la migración 0001 y ANTES de liberar la app.
-- Hace que un administrador explícito (UUID pasado como argumento) sea owner de
-- TODOS los negocios existentes. Idempotente: no duplica membresías.
--
-- Uso:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v admin='<UUID-del-administrador>' \
--     -f scripts/bootstrap-owners.sql
--
-- Pre-requisito obligatorio (D-10): backup verificado ANTES de ejecutar.
-- Ver scripts/backup-bootstrap.md.
-- ============================================================================

\set ON_ERROR_STOP on

insert into public.negocio_miembros (negocio_id, user_id, rol)
select n.id, :'admin'::uuid, 'owner'
from public.negocios n
where not exists (
  select 1 from public.negocio_miembros m
  where m.negocio_id = n.id
    and m.user_id = :'admin'::uuid
);

-- Reporte de la operación: negocios que quedaron bajo el administrador.
select n.id as negocio_id, n.nombre, m.user_id, m.rol
from public.negocios n
join public.negocio_miembros m on m.negocio_id = n.id
where m.user_id = :'admin'::uuid
order by n.nombre;