# Backup + Bootstrap previo a RLS (fase 1, WU-2)

Documento operativo para el mantenimiento de la base de datos ANTES de habilitar
Row Level Security (migración `0001_fase1_seguridad.sql`). La base de producción
tiene datos reales: **el backup es obligatorio y se verifica antes de tocar RLS**
(D-10). Ningún paso de este documento se ejecuta automáticamente en el repo; lo
corre el operador, deliberadamente.

## Orden de operaciones

1. Backup (abajo) + verificación.
2. Aplicar la migración `supabase/migrations/0001_fase1_seguridad.sql`
   (crea `negocio_miembros`, los RPCs, las policies y habilita RLS al final).
3. Ejecutar `scripts/bootstrap-owners.sql` con rol privilegiado para que un
   administrador explícito quede como owner de TODOS los negocios existentes.
   Debe correr **en la misma ventana de mantenimiento, antes de liberar la app**
   (el rol privilegiado del operador atraviesa RLS; un rol normal no podría
   insertar en `negocio_miembros`, que no tiene policy de insert).
4. Ejecutar `scripts/verify-rls.sql` y confirmar que termina con exit 0
   (anon=0, cross-tenant=0, owner=ok).

## Paso 0 — Backup (obligatorio, no salteable)

Opción A — `pg_dump` (backup lógico completo):

```bash
# Cadena de conexión: Supabase → Project Settings → Database → Connection
# string (session mode; usar el host directo, no el pooler transaccional).
pg_dump "$DATABASE_URL" --format=custom --file=backup-gestionpro-$(date +%Y%m%d).dump
pg_dump "$DATABASE_URL" --format=plain   --file=backup-gestionpro-$(date +%Y%m%d).sql
```

Opción B — Supabase Dashboard:

- Project → Database → Backups → crear un backup manual (o usar el backup
  programado más reciente) y descargarlo.

Verificación del backup (no continuar sin esto):

```bash
# El dump custom debe listar contenido y no estar vacío:
pg_restore --list backup-gestionpro-YYYYMMDD.dump | head -20
# El dump plain debe tener tamaño > 0 y poder leerse:
ls -lh backup-gestionpro-YYYYMMDD.sql
```

Guardar el backup fuera de la máquina de trabajo (otro equipo/almacenamiento).

## Paso 1 — Identificar el UUID del administrador

```sql
select id, email from auth.users order by email;
```

El UUID se pasa como argumento al script; **nunca se hardcodea en una migración**
(D-05).

## Paso 2 — Aplicar la migración 0001

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0001_fase1_seguridad.sql
```

## Paso 3 — Bootstrap de owners

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v admin='<UUID-del-administrador>' \
  -f scripts/bootstrap-owners.sql
```

El script es idempotente (no duplica membresías) y reporta los negocios
asignados al administrador.

## Paso 4 — Verificar la matriz RLS

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -v tenant='<UUID-de-un-negocio-con-datos>' \
  -v owner='<UUID-del-administrador>' \
  -v other='<UUID-de-otro-usuario-sin-membresía-en-ese-negocio>' \
  -f scripts/verify-rls.sql
```

Debe terminar con exit 0 y el mensaje `verify-rls: TODAS LAS COMPROBACIONES OK`.

## Rollback

- Restaurar el backup del Paso 0, o
- Revertir solo RLS (sin tocar datos):

```sql
-- Deshabilitar RLS en las 8 tablas
alter table public.negocios               disable row level security;
alter table public.clientes               disable row level security;
alter table public.turnos                 disable row level security;
alter table public.gastos                 disable row level security;
alter table public.equipos                disable row level security;
alter table public.reparaciones_historial disable row level security;
alter table public.reparaciones_repuestos disable row level security;
alter table public.negocio_miembros       disable row level security;

-- Quitar tabla y funciones (si se quiere deshacer la migración completa)
drop table if exists public.negocio_miembros;
drop function if exists public.crear_negocio_con_owner(text, text, text);
drop function if exists public.generar_numero_orden(uuid);
```

## Notas

- `verify-rls.sql` y `bootstrap-owners.sql` son idempotentes y no persisten
  cambios (solo lecturas / inserts controlados).
- Si la base ya tiene un formato de `numero_orden` distinto al secuencial
  zero-padded de 4 dígitos, ajustar `generar_numero_orden` en la migración 0001
  ANTES de aplicarla (el reemplazo en la migración mantiene el comportamiento
  actual solo si coincide).
