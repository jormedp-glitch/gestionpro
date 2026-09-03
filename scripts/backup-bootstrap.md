# Backup + Bootstrap previo a RLS (fase 1, WU-2) y rollout de fase 3

Documento operativo para el mantenimiento de la base de datos ANTES de habilitar
Row Level Security (migración `0001_fase1_seguridad.sql`) y de aplicar el
rollout de integridad de datos (`0003_fase3_datos.sql`, fase 3). La base de
producción tiene datos reales: **el backup es obligatorio y se verifica antes de
tocar RLS o datos** (D-10). Ningún paso de este documento se ejecuta
automáticamente en el repo; lo corre el operador, deliberadamente.

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
5. Aplicar `supabase/migrations/0002_fase1_token_seguimiento.sql` y luego
   `supabase/migrations/0003_fase3_datos.sql` **en la misma ventana** (0003 se
   apila sobre 0001+0002). 0003 es aditiva y sus gates abortan antes de tocar
   nada si los datos legacy no cumplen las precondiciones.
6. Ejecutar `scripts/verify-ordering.sql` y confirmar exit 0
   (`verify-ordering: TODAS LAS COMPROBACIONES OK`).
7. (Opcional, dev) `supabase/seed.sql` con rol privilegiado — datos demo
   idempotentes; NO se ejecuta en producción.
8. Regenerar `types/database.types.ts` **después del rollout** (ver abajo).

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

## Paso 5 — Aplicar la migración 0003 (fase 3)

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/migrations/0002_fase1_token_seguimiento.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/migrations/0003_fase3_datos.sql
```

`0003_fase3_datos.sql` es **aditiva** (create table/function/index/constraint;
no toca `cf_*` ni tipos). Su primer statement es un DO gate go/no-go que
**aborta antes de modificar nada** si detecta:

- slugs duplicados (`lower(trim(slug))`),
- `equipos.numero_orden` no numéricos,
- `gastos.monto < 0`, `reparaciones_repuestos.costo < 0` /
  `precio_cobrado < 0` / `cantidad <= 0`, o `clientes.cuota < 0`.

Si aborta, normalizar/deduplicar los datos y reintentar. El backfill de
duplicados de `numero_orden` guarda un snapshot de auditoría en
`_fase3_duplicates_log` antes de renumerar (solo filas duplicadas) y es
idempotente (re-ejecución con el índice ya creado → skip).

## Paso 6 — Verificar ordering

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -v tenant='<UUID-de-un-negocio-con-datos>' \
  -v owner='<UUID-del-administrador>' \
  -f scripts/verify-ordering.sql
```

Debe terminar con exit 0 y el mensaje
`verify-ordering: TODAS LAS COMPROBACIONES OK`. Requiere que el owner sea
miembro del tenant (Paso 3). Única mutación esperada: el contador del tenant
avanza +2 (la prueba del RPC secuencial).

## Paso 7 — Regenerar types después del rollout

`types/database.types.ts` está commiteado como snapshot **PRE-rollout** (sin
`negocio_miembros`, `acceso_token` ni `negocio_orden_contadores`). Después de
aplicar 0001 → 0002 → 0003 en producción, regenerar:

```bash
supabase gen types typescript --project-id qjawdjzaokffhiqnixcx --schema public \
  > types/database.types.ts
```

y commitear el resultado (fidelidad del escenario D3 de la spec).

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

### Rollback de 0003 (aditiva)

0003 es aditiva: revertir es quitar lo que agregó y restaurar el RPC de 0001.
El snapshot de duplicados queda en `_fase3_duplicates_log` para auditoría
(no se borra automáticamente).

```sql
-- Restaurar generar_numero_orden a la versión 0001 (count+1)
-- (sección 3 de supabase/migrations/0001_fase1_seguridad.sql)

-- Quitar CHECKs, índices y contador agregados por 0003
alter table public.clientes               drop constraint if exists chk_clientes_cuota_no_negativa;
alter table public.reparaciones_repuestos drop constraint if exists chk_repuestos_cantidad_positiva;
alter table public.reparaciones_repuestos drop constraint if exists chk_repuestos_precio_no_negativo;
alter table public.reparaciones_repuestos drop constraint if exists chk_repuestos_costo_no_negativo;
alter table public.gastos                 drop constraint if exists chk_gastos_monto_positivo;
drop index if exists uq_equipos_negocio_orden;
drop index if exists idx_equipos_negocio_created;
drop index if exists idx_equipos_numero_orden;
drop index if exists idx_historial_equipo;
drop index if exists idx_clientes_negocio;
drop index if exists idx_turnos_negocio_fecha;
drop index if exists uq_negocios_slug;
drop table if exists public.negocio_orden_contadores;
-- _fase3_duplicates_log se conserva como registro de auditoría (opcional: drop table if exists public._fase3_duplicates_log;)
```

Los `numero_orden` renumerados por el backfill NO se revierten automáticamente:
usar el snapshot de `_fase3_duplicates_log` (o el backup del Paso 0) para
restaurarlos si hace falta.

## Notas

- `verify-rls.sql` y `bootstrap-owners.sql` son idempotentes y no persisten
  cambios (solo lecturas / inserts controlados).
- `verify-ordering.sql` es de solo lectura salvo la prueba del RPC secuencial,
  que avanza el contador del tenant de prueba en +2 (deliberado).
- Si la base ya tiene un formato de `numero_orden` distinto al secuencial
  zero-padded de 4 dígitos, ajustar `generar_numero_orden` en la migración 0001
  ANTES de aplicarla (el reemplazo en la migración mantiene el comportamiento
  actual solo si coincide). El gate de 0003 aborta si encuentra `numero_orden`
  no numéricos.
