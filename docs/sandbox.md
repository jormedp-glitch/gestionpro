# Sandbox de QA — GestiónPro

> Entorno de pruebas con **paridad total de esquema** con producción y datos
> de QA en todos los dominios. Sirve para recorrer la app completa sin tocar
> datos reales y para el E2E automatizado.

## Qué es

|          | Producción                                                           | Sandbox                                     |
| -------- | -------------------------------------------------------------------- | ------------------------------------------- |
| Supabase | `qjawdjzaokffhiqnixcx` (sa-east-1)                                   | proyecto nuevo (plan free, mismo región)    |
| Esquema  | 19 tablas · 11 funciones · 62 policies · 19 con RLS · 64 constraints | **idéntico** (verificado)                   |
| Datos    | reales                                                               | semilla de QA (`supabase/seed-sandbox.sql`) |
| Uso      | producción                                                           | desarrollo local, E2E, demos                |

El sandbox se construye con el **mismo DDL que producción**: `supabase/base-schema.sql`
es una extracción del catálogo de PostgreSQL (DDL puro, sin datos). Es el schema
base que el repo **no tenía**: las migraciones de `supabase/migrations/` son
incrementales (`0001` asume que `public.negocios` ya existe) y el DDL original se
había creado ad hoc, fuera del repo. Con este archivo, un entorno se puede
reconstruir desde cero.

## Datos de la semilla

- **6 negocios** (los 5 rubros del dominio + un segundo gimnasio):
  `gym-el-oso` (gimnasio), `qa-ana-profe` (profesor, disciplina `Patín`),
  `peluqueria-lum`, `veterinaria-patas`, `taller-eme` (servicio técnico),
  `pepe-gym`.
- 11 clientes (uno con `vence` vencido a propósito, para ver la alerta de cobro),
  9 turnos (hoy y próximos 7 días), 6 gastos, 9 cobros.
- **Reparaciones**: 3 equipos del taller en estados distintos (`recibido`,
  `listo_para_retirar`, `entregado`) + historial de estados + repuestos.
- **Core de gym** (Gym El Oso y QA Ana Profe): alumnos con `portal_token` y
  código de acceso, 7 ejercicios, 3 rutinas con sesiones y ejercicios,
  asignaciones, 4 mediciones de progreso y completados.

## Cómo crearlo

```powershell
$env:SUPABASE_ACCESS_TOKEN = "sbp_..."   # https://supabase.com/dashboard/account/tokens
pwsh -File scripts/bootstrap-sandbox.ps1
```

El script crea el proyecto, aplica el schema base, corre la semilla, crea los
usuarios de Auth con sus membresías y escribe **`.env.sandbox`** (no toca
`.env.local`).

## Cómo correr la app contra el sandbox

```powershell
Copy-Item .env.local .env.local.prod      # backup
Copy-Item .env.sandbox .env.local         # apuntar al sandbox
npm run dev                               # http://localhost:3000
```

Para volver a producción: `Copy-Item .env.local.prod .env.local`.

### Usuarios

| Email                       | Contraseña                 | Rol                                                 |
| --------------------------- | -------------------------- | --------------------------------------------------- |
| `jormedp@gmail.com`         | `Sandbox-GestionPro-2026!` | owner de `gym-el-oso`, `qa-ana-profe`, `taller-eme` |
| `qa.editor@gestionpro.test` | `Sandbox-QA-2026!`         | editor de `gym-el-oso`                              |
| `qa.owner2@gestionpro.test` | `Sandbox-QA-2026!`         | 2º owner de `gym-el-oso`                            |

Los dos QA existen para ejercitar la gestión de usuarios (`/{slug}/usuarios`):
cambiar rol, quitar miembro y el guard de "último owner".

## Gotchas operationales

- **El proyecto free se pausa por inactividad.** Si el sandbox deja de
  responder, el error es "Database is possibly not accessible" (parece un
  problema de red, pero no lo es). Se restaura con:
  ```powershell
  Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/<ref>/restore" -Method Post -Headers @{ Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN" } -ContentType "application/json" -Body "{}"
  ```
  Tarda ~2 min (`COMING_UP` → `RESTORING` → `ACTIVE_HEALTHY`).
- **La CLI no puede ejecutar SQL desde redes IPv4-only**: `supabase db query
--linked` intenta una conexión directa IPv6 y falla. La Management API
  (`POST /v1/projects/{ref}/database/query`) sí funciona por HTTP.
- **`supabase db push` nunca**: el historial remoto de migraciones no está
  garantizado (las migraciones se aplicaron a mano) y re-aplicaría desde 0001.
- **`supabase-js` no lanza ante errores de PostgREST**: un `42703` (columna
  inexistente) llega como `{data: null}`, no como excepción. Un HTTP 200 no
  prueba que un select haya funcionado.

## Relación con las migraciones

El sandbox ya tiene el estado **final** del esquema (incluidas `0001`–`0010`).
Para probar una migración nueva contra el sandbox: aplicarla con la Management
API sobre el sandbox y verificar, sin tocar producción.

Para reconstruirlo desde cero con la historia de migraciones completa haría
falta el DDL base _anterior_ a `0001` (no existe en el repo): por eso
`base-schema.sql` es una instantánea del estado final y no una replay.
