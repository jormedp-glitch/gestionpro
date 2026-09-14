# Reingeniería GestiónPro — Plan maestro

> Documento vivo del proyecto. Fuente de verdad para el alcance, las fases y las decisiones.
> Se actualiza en cada hito. Cada decisión adoptada se registra en la sección [Log de decisiones](#4-log-de-decisiones).
> Los cambios grandes se ejecutan con SDD (explore → proposal → spec → design → tasks → apply → verify → archive) y entregas en PRs encadenados.
> Última actualización: 2026-09-14 (post-rollout a producción + verificación en producción).

---

## 0. Ficha del proyecto

| Campo             | Valor                                                                                                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nombre            | GestiónPro                                                                                                                                                                                          |
| Producto          | SaaS de abono mensual para **profesionales independientes** (peluqueros, profes de clases, servicio técnico). 3 capas: plataforma (dueño del SaaS) → profesional abonado → cliente final (celular)  |
| Stack actual      | Next.js 16.2.2 (App Router) · React 19.2.4 · TypeScript 5 · Tailwind 4 · Supabase (`@supabase/ssr`: clients browser/server/middleware)                                                              |
| Backend           | Supabase — Auth email+password + RLS por membresía (`negocio_miembros`); migraciones 0001–0003 aplicadas en producción (sa-east-1)                                                                  |
| Estado de git     | main `96a05ce`; batch fases 0–5 mergeado (33 PRs); commits convencionales; `.env.local` ignorado                                                                                                    |
| Dominio actual    | `negocios`, `negocio_miembros`, `clientes`, `turnos`, `gastos`, `equipos`, `reparaciones_historial`, `reparaciones_repuestos`                                                                       |
| Tests / lint / CI | ESLint + Prettier + Husky; Vitest (4 suites de dominio, cobertura ≥ 80 % en `lib/domain`); Playwright smoke (2 viewports); GitHub Actions `lint → typecheck → test → build` + job e2e no bloqueante |
| Producción        | Vercel `https://gestionpro-three.vercel.app` · Supabase `qjawdjzaokffhiqnixcx` (sa-east-1) · rollout 2026-09-11 · verificado 2026-09-14                                                             |

### Estado inicial (diagnóstico previo a la reingeniería, 2026-09-02)

- **App funcional en un solo producto**: 8 páginas (`/`, `/[slug]`, `/reparaciones`, `/reparaciones/nuevo`, `/reparaciones/[id]`, `/seguimiento/[orden]`) + `components/NegocioApp.tsx` (muerto, 657 líneas, no importado).
- **CRÍTICO — Sin seguridad**: el panel de administración (`/`) crea negocios sin login; todo el acceso a datos es directo desde el cliente con la anon key; no hay RLS. Cualquiera con la URL puede leer/escribir la base completa.
- **Arquitectura plana**: client components con `any`, consultas Supabase desde cada página, lógica de dominio duplicada (la máquina de estados de reparación está copiada en 3 archivos con variaciones).
- **Sin versionado de schema**: no hay carpeta `supabase/` ni migraciones.
- **Sin calidad**: no hay ESLint, no hay tests, no hay CI. UI con estilos inline + Tailwind mezclados.
- **IA del análisis**: fetch directo al cliente a Anthropic sin API key (hoy no funciona; si se le agrega key, queda expuesta).
- **WhatsApp**: deep links `wa.me` desde el cliente. Dependencia funcional fuerte (el producto gira alrededor de WhatsApp).

### Estado actual (2026-09-14)

- **Seguridad**: login email+password + RLS por membresía en todas las tablas del dominio; middleware de protección en `/` y `/[slug]`; seguimiento público por token (capability UUID, migración 0002). Verificado en producción.
- **Arquitectura**: `features/<dominio>` + `lib/{domain,server,ui,auth,supabase}`; Server Components para lecturas y Server Actions con zod para escrituras; 0 estilos inline en `app/` y `features/`.
- **Datos**: migraciones 0001–0003 aplicadas en producción; `numero_orden` normalizado a numérico puro con contador atómico por negocio; `types/database.types.ts` regenerado post-rollout.
- **Calidad**: ESLint + Prettier + Husky; 4 suites Vitest (cobertura ≥ 80 % en `lib/domain`); Playwright smoke (2 viewports); CI en cada PR.
- **Producción**: deploy Vercel con login real y smoke seguro verificados (2026-09-14); backup verificado post-rollout.
- **Pendientes**: dark mode, auditoría WCAG (axe), entorno e2e dedicado + job bloqueante, Fase 7 (CoachFlow).

### Hallazgos de pruebas manuales en producción (2026-09-14)

> Detectados durante la ronda de pruebas manuales en producción; se reparan en batch al cerrar la ronda.

- [ ] **Gestión de usuarios desde la app (FASE 6)**: alta/invitación de usuarios, membresías por negocio (asignar/quitar) y roles — hoy se hace a mano en Supabase (dashboard/SQL). Origen: TC-ADMIN-04 (segundo usuario creado por SQL).
- [ ] **Cerrar sesión desde el panel `/`**: `logout()` ya existe (`lib/auth/actions.ts`) pero el botón "Salir" solo está en `NegocioShell` (dentro de `/{slug}`). Agregar el botón al panel de administración. Relacionado: TC-AUTH-05.
- [ ] **Link "Reparaciones" visible en rubros que no son de reparaciones**: `NegocioShell` muestra "🔧 Reparaciones" en el branch de rubros no-`servicio_tecnico` (`features/admin/components/NegocioShell.tsx:128-133`); debe aparecer solo en rubros de reparaciones. Ojo: la condición usa `rubro === "servicio_tecnico"` (el seed viejo usa el valor `reparaciones`).
- [ ] **Estados de cliente por vencimiento nunca se calculan (y las "⚡ Alertas de cobro" no aparecen)**: `vence_pronto`/`vencido` existen en la UI pero nada los setea — `agregarCliente` inserta `activo` y `pagarCliente` vuelve a `activo` sin tocar `vence`; las alertas filtran `estado !== "activo"` (`features/admin/components/DashboardResumen.tsx:39`). Evidencia: clientes con `vence` 06/04 y 07/04/2026 (meses vencidos) siguen "Activo" → la tarjeta "⚡ Alertas de cobro" nunca aparece. Definir: derivar el estado al leer (desde `vence`) o trigger/cron, y si el pago debe extender `vence` (+1 mes). Afecta TC-CLI-05 y el loop de cuotas.

---

## 1. Objetivo y principios de la reingeniería

**Objetivo**: transformar el MVP en un producto profesional manteniendo la simplicidad operativa que hoy lo hace usable.

Principios:

1. **Seguridad primero**: autenticación por negocio + RLS como frontera real. Es la fase 1; no se construye nada nuevo sin esto.
2. **Servidor primero**: datos leídos con Server Components, mutaciones con Server Actions validados; el navegador nunca toca datos privados directo.
3. **Un solo dueño del dominio**: máquina de estados, mensajes WhatsApp y reglas en `lib/domain`; nada de listas duplicadas.
4. **Tipado de punta a punta**: tipos generados por Supabase; regla: cero `any` (salvo excepción documentada).
5. **Calidad como parte del trabajo**: lint, tests de dominio y CI en cada PR. Sin devs heroicos: herramientas.
6. **Mobile-first**: el usuario final es un dueño de comercio que trabaja desde el celular.
7. **No romper el flujo actual**: cada fase es un PR; la app queda funcional entre fases.

---

## 2. Qué conlleva la reingeniería — fases

> Cada fase tiene su propio PR (o cadena de PRs), criterios de aceptación y verificación independiente.
> Estimación: rango de trabajo de equipo chico; no incluye la fase 6 (producto, opcional).

### FASE 0 — Cimientos del proceso (1–2 días) — riesgo: Bajo — ✅ IMPLEMENTADA (2026-09-02, SDD `fase0-cimientos`, verify PASS)

- ESLint (`eslint.config.mjs` con `typescript-eslint` + plugins de Next) + Prettier + scripts `lint` / `format` / `typecheck`.
- Husky + lint-staged (pre-commit) + conventional commits (ya se usan; se automatizan).
- `.env.example` documentado y README de arranque actualizado.
- Nace convención de docs: este plan maestro + log de decisiones.

**Criterios de aceptación**: `npm run lint` y `npm run typecheck` pasan en CI local; commit limpio con hook.

### FASE 1 — Seguridad y acceso (3–5 días) — riesgo: ALTO (crítica) — ✅ IMPLEMENTADA (2026-09-03, SDD `fase1-seguridad`, WU-1..WU-4; migraciones 0001–0002; PRs mergeados 2026-09-11)

- `@supabase/ssr`: clients de browser/server/middleware; sesión por cookies.
- Auth: login por email+password (u OTP, ver decisión D-03); layout `/login`; middleware de protección en `/` y `/[slug]` (sin proteger `/seguimiento`).
- Modelo de permisos: tabla `negocio_miembros` (`negocio_id`, `user_id`, `rol: owner | editor`). El creador de un negocio queda de owner automático.
- **RLS en las 7 tablas** con policies por negocio/miembro.
- Acceso público controlado: `equipos.acceso_token` (UUID) → `/[slug]/seguimiento/[orden]` puede leer solo estado + historial público + presupuesto/precio de cara al cliente; **nunca** observaciones internas, costos de repuestos ni teléfonos de otros clientes.
- Tests manuales/automatizados de RLS: un anónimo y un usuario de otro negocio no pueden leer/escribir.

**Criterios de aceptación**: sin login no se puede crear ni leer datos; dos negocios no se ven entre sí; la página de seguimiento pública funciona solo con token válido.

### FASE 2 — Arquitectura y dominio (3–5 días) — riesgo: Medio — ✅ IMPLEMENTADA (2026-09-03, SDD `fase2-arquitectura`, verify PASS with warnings; PRs mergeados a main 2026-09-11)

- Reorganización por dominios:
  - `app/(auth)/login` · `app/page.tsx` (admin, protegido) · `app/[slug]/` (app del negocio, protegido) · `app/[slug]/seguimiento/[orden]` (público con token)
  - `features/<dominio>/` — `clientes`, `turnos`, `gastos`, `reparaciones`, `seguimiento`, `admin`
  - `lib/server/` — supabase server, sesión, server actions; `lib/domain/` — estados, mensajes, reglas; `lib/ui/` — primitivos
- Server Components para lecturas; **Server Actions con validación (zod)** para escrituras; `revalidatePath` después de mutar.
- Centralizar la máquina de estados: un único `estados-reparacion.ts` con `ESTADOS`, `TRANSICIONES` (mapa `estado → estados` permitidos), `siguientesEstados()`, `puedeTransicionar()`. Refactorizar las 3 listas duplicadas.
- Centralizar mensajes WhatsApp: un módulo `mensajes.ts` por evento (ingreso, presupuesto, aprobación, listo, sin reparación, recordatorio retiro, turno confirmado, demora, recordatorio turno, cobro).
- Número de orden con formato por negocio (`R-YYYY-NNNN`), único en `(negocio_id, numero_orden)`, generado en servidor (transacción o secuencia).
- Eliminar `components/NegocioApp.tsx` (dead code).

**Criterios de aceptación**: consultas de dominio en un solo lugar; las páginas usan los módulos de dominio; derrocar `any` de las nuevas capas.

### FASE 3 — Datos (2–3 días) — riesgo: Medio — ✅ IMPLEMENTADA (2026-09-03, SDD `fase3-datos`, verify PASS; migraciones aplicadas en producción 2026-09-11 (backup + verify-rls/verify-ordering OK); PRs mergeados 2026-09-11)

- Migraciones versionadas en `supabase/migrations/`: schema inicial (negocios, clientes, turnos, gastos, equipos, historial, repuestos, miembros), enums o checks de estado, constraints (`monto >= 0`, FK con cascada, unicidades).
- Ejecutado en producción con `supabase db push` / CI.
- Tipos generados: `supabase gen types typescript` → `types/database.types.ts`; refactor de los `any` existentes.
- Índices: `turnos(negocio_id, fecha)`, `clientes(negocio_id)`, `reparaciones_historial(equipo_id)`, `equipos(numero_orden)`, `equipos(negocio_id, created_at)`.
- Seeds de desarrollo + script de verificación de RLS.

**Criterios de aceptación**: `database.types.ts` generado y usado; migraciones aplicables desde cero en un entorno nuevo.

### FASE 4 — Calidad y CI (2–3 días) — riesgo: Bajo — ✅ IMPLEMENTADA (2026-09-10, SDD `fase4-calidad`, verify PASS with warnings; PRs mergeados a main 2026-09-11)

- Vitest + Testing Library: tests de máquina de estados (todas las transiciones válidas e inválidas), generación de orden, mensajes WhatsApp, formatos (ARS/fechas).
- Playwright smoke: login → crear negocio → crear turno → seguimiento público con token.
- GitHub Actions: `lint → typecheck → test → build` en cada PR; branch protection; bajar coverage a cero en dominio (umbral: ≥ 80% en `lib/domain`).
- Formatters/checks de calidad integrados al mismo pipeline.

**Criterios de aceptación**: el CI bloquea un PR con lint/typecheck/test fallando; suite de dominio verde.

### FASE 5 — UI / UX (3–5 días) — riesgo: Medio — ✅ IMPLEMENTADA (2026-09-10, SDD `fase5-ui`, apply P1–P9; verify PASS (2026-09-11; 15/15 req · 25/25 escenarios; CRITICAL e2e resuelto en P9); archivada (2026-09-11); PRs mergeados a main 2026-09-11)

- Primitivos propios en `lib/ui/` (base shadcn/ui sobre Radix + Tailwind 4, `cva` + `clsx` + `tailwind-merge`): Button, Input, Select, Card, Dialog, Toast, Badge, Table, EmptyState, Skeleton — 10 con barrel `index.ts` y tests RTL (Dialog con focus trap + ESC + `aria-modal`, Select operable por teclado con anuncio, Toast en `aria-live` con botón accesible).
- Tema unificado con tokens: paleta clara en `globals.css` (`@theme inline`), acento por rubro vía `html[data-rubro]` + `RUBRO_ACCENT` espejo para el favicon (ImageResponse); **0 estilos inline** en `app/` y `features/` (grep `style={|React.CSSProperties` = 0; 11 componentes migrados).
- Estados de framework en español: `loading.tsx`, `error.tsx` (reintento), `not-found.tsx`, `global-error.tsx`, `[slug]/loading.tsx`; `EmptyState` en las 5 vistas de listado (clientes, turnos, gastos, reparaciones, seguimiento).
- `metadata` por negocio: layout raíz con `title.template` + `lang="es"` + `viewport` separado (contrato Next 16); `[slug]/layout.tsx` fino y público (D1) con `generateMetadata` (título = negocio) + `icon.tsx` dinámico por rubro.
- Mobile-first: smoke Playwright en **2 viewports** (desktop 1280×800 + mobile 390×844) que verifica cada paso sin overflow horizontal ni errores de consola (REQ-E2E-2); job e2e **separado y no bloqueante** en CI con browsers cacheados (REQ-E2E-3).
- a11y progresiva (baseline D9): labels/aria en controles interactivos, `focus-visible` consistente, navegación por teclado en Select/Dialog/Toast.

**Criterios de aceptación**: ninguna página con estilos inline crudos; los flujos principales probados en viewport móvil y desktop.

**Follow-ups (fuera de Fase 5, documentados)**: dark mode (tokens dark-ready, sin rework); auditoría WCAG completa (axe runtime); entorno de test dedicado para el smoke completo (credenciales `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` + proyecto Supabase de test — el flujo muta datos y nunca debe correr contra producción); pasar el job e2e a bloqueante cuando exista ese entorno.

### Hito — Rollout a producción (2026-09-11)

Ejecutado con el operador presente. Secuencia real: backup verificado (`pg_dump` 17 vía Docker) → DROP de 11 policies legacy "acceso publico" → 0001 → admin en Dashboard (`auth.users` estaba vacío) + bootstrap de owners (2 negocios) → `verify-rls` OK → 0002 → normalización de `numero_orden` (`REP-2026-0001..0008` → `0001..0008`) → 0003 con 2 fixes (quote sin escapar en el gate + índices no idempotentes) → `verify-ordering` OK → types regenerados.

Fixes al repo derivados: PR #68 (`format:check`: CRLF de Windows + artefactos Playwright), PR #70 (robustez de 0003 + `verify-ordering`), PR #72 (types post-rollout + `.gitignore` de `supabase/.temp`).

Verificación en producción (2026-09-14): login real OK; smoke seguro verde en desktop y mobile (render, redirect sin sesión, error de credenciales, seguimiento público con token inválido); set de casos de prueba manuales creado (`docs/casos-de-prueba-manuales.md`).

**Lecciones**: los scripts SQL del repo tenían bugs que solo aparecieron en su primera ejecución real (gate con quote sin escapar, índices no idempotentes, `verify-ordering` leyendo una tabla revocada); `psql -1` (transacción única) evitó 3 estados parciales; `psql` no interpola `:'var'` dentro de bloques `DO $$`; el gate go/no-go por migración funcionó como red de seguridad.

### FASE 7 — Convergencia CoachFlow (post-Fase 5, por slices) — riesgo: Medio

> Decisión D-12 (2026-09-03): CoachFlow (C:\coachflow) — app de profes de gym con alumnos, rutinas y progreso — se ABSORBE al 100% dentro de GestiónPro. Comparten el mismo proyecto Supabase (qjawdjzaokffhiqnixcx); CoachFlow hoy no tiene RLS ni Auth real (password_hash en DB) → agujero de seguridad que esta fase cierra.

- Modelar la actividad gym como rubro configurado: `features/gym/` sobre el núcleo (alumnos con ficha/progreso, rutinas de N semanas con ejercicios y series/repeticiones, pagos de cuota, turnos con recurrencia).
- Migrar datos reales `cf_*` → núcleo (cf_profes → negocios + usuarios auth + negocio_miembros; cf_alumnos → clientes con campos de gym; cf_rutinas/cf_rutina_semanas/cf_rutina_ejercicios → tablas nuevas; cf_pagos → cobros; cf_turnos → turnos).
- Portar la UI de CoachFlow al patrón `features/` + Server Components/Server Actions (reuso de lib/domain).
- Retirar la app CoachFlow: drop de tablas `cf_*` DESPUÉS de la migración verificada (backup + script de verificación de datos).
- Asegurar RLS para las tablas nuevas (mismas políticas membership por negocio).

**Criterios de aceptación**: un profe de gym inicia sesión en GestiónPro, ve sus alumnos/rutinas/progreso migrados correctamente; cf_* desaparece; CoachFlow fuera de servicio; RLS cubre el rubro gym.

### FASE 6 — Producto y automatización (post-MVP, por slices) — riesgo: Medio

- Recordatorios automáticos (Supabase Edge Function + pg_cron): recordatorio de turno (día anterior), recordatorio de retiro (3 y 7 días), re-pedido de cuota (7 días antes).
- Reportes mensuales por negocio (CSV/PDF).
- Gestión de usuarios desde la app (no en la base): alta/invitación de usuarios, membresías por negocio (asignar/quitar) y roles (owner/editor). Hoy se hace a mano en Supabase (dashboard/SQL) — fricción detectada en las pruebas manuales 2026-09-14 (TC-ADMIN-04: segundo usuario creado por SQL).
- Onboarding wizard del negocio nuevo (plan, servicios, horarios, colores).
- Monetización (ver sección 3): facturación por negocio (Stripe) — según decisión D-01.
- Branding por negocio en la página pública de seguimiento (logo, colores) — el gancho de crecimiento.

---

## 3. Parte de negocio — producto y mercado

### 3.1 Dos públicos: el comprador y el usuario final

**Comprador (el que paga el abono)** — profesional independiente, sin pyme: peluquero que alquila un local, profe de patín que alquila un espacio y le da clases a 30 chicas, técnico que repara equipos. **No tiene empleados ni tiempo para "sistemas"**: vive en WhatsApp y agenda de papel/Excel. Dolor real:

- Turnos que se olvidan (cliente que no viene, hueco en la agenda).
- Cuotas que no se cobran a tiempo (incomodidad de pedir la plata cara a cara).
- Reparaciones sin seguimiento ("¿ya está listo mi equipo?") y presupuestos que se pierden en el chat.
- Insumos/repuestos no controlados (se compran, se cobran, no se sabe el margen).

**Usuario final (el cliente del profesional)** — consume todo desde el celular: reserva un turno, sigue el estado de su reparación, ve su cuota, recibe WhatsApp del servicio. Sin app que instalar: entra por link (web/PWA).

### 3.2 Propuesta de valor

> «Tu negocio manejado desde el celular, con WhatsApp automático para clientes y cobros al día.»

No es un ERP. Es la **caja + agenda + clientes** con comunicación por WhatsApp integrada y **cero fricción para el dueño**: los mensajes salen de los eventos del sistema (confirmación, demora, recordatorio, presupuesto, cobro).

### 3.3 Estrategia de producto: núcleo común horizontal + actividad configurable

El factor común de TODOS los clientes: **independientes que venden tiempo y servicios, cobran cuotas o pagos, y se comunican por WhatsApp**. Todo el sistema se construye alrededor del núcleo; la actividad se configura, no se programa aparte.

| Capa                             | Contenido                                                                                                                                                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Núcleo (todos los profes)**    | Agenda/turnos (con **recurrencia**: clases semanales), clientes con ficha e historial, cobros (cuotas recurrentes + pagos one-off), caja/gastos, WhatsApp automático, recordatorios, dashboard, reportes simples |
| **Actividad configurable**       | El profe define servicios, precios, duraciones y disponibilidad. Plantillas pre-cargadas: Peluquería · Clases/deporte (recurrencia) · Servicio técnico (presupuesto + repuestos + seguimiento) · Genérica        |
| **Cliente final (self-service)** | Acceso por link desde el celular, **sin cuenta** (token en la URL): reservar, ver estado de su servicio/reparación, saldo de cuota, historial. Pagos por fuera (D-08)                                            |
| **Plataforma (dueño del SaaS)**  | Alta/gestión de profesionales, estado de suscripción, cobro del abono mensual, métricas (profes activos, MRR)                                                                                                    |

> El código actual ya esboza las 3 capas: `/` = plataforma (alta de "negocios"), `/[slug]` = profesional, `/[slug]/seguimiento/[orden]` = cliente final.

**No es un producto genérico ni N productos distintos**: es un núcleo sólido + configuración por actividad.

### 3.4 Los 3 loops de valor (todo el producto gira alrededor de estos)

1. **Loop de turnos**: agendar → confirmación WA → recordatorio → demora → completar → (marcar por WhatsApp).
2. **Loop de cuotas**: vencimiento (vence pronto -7d) → cobro WA → marcar pagado → (renegar). Métrica: % cobrado de vencidas.
3. **Loop de reparación**: ingreso → diagnóstico → presupuesto WA → aprobación → reparación → listo + WA → entrega + cobro (con repuestos: costo vs. precio → margen).

Cada loop debe quedar medible en el dashboard: turnos creados/semana, cuotas cobradas/mes, reparaciones entregadas vs. en taller.

### 3.5 Métricas de negocio (producto)

- **Activación**: negocio nuevo con primer turno o primer cobro en < 48 h.
- **Actividad**: MAU por negocio (≥ 1 acción/semana = negocio vivo).
- **Retención M1**: ≥ 60 %.
- **Valor**: cuotas cobradas vs. vencidas; turnos completados vs. programados; tiempos de reparación.
- **NPS / opinión** del dueño (encuesta de 1 pregunta después de 2 semanas).

### 3.6 Monetización

- **Abono mensual por profesional** — la unidad de negocio es el profe abonado, no su cliente. Referencia local: precio ≲ costo de un turno perdido (ej. valor de 1-2 cortes/clases).
- **Trial/Starter**: 30 días gratis o plan limitado para bajar la fricción; el primer negocio de un profe cero-riesgo es la puerta de entrada.
- **Cobro del abono**: Mercado Pago (de facto en Argentina) — ver D-07.
- **Add-on IA** (post-MVP): análisis ejecutivo mensual. La vista "IA" actual no funciona (fetch a Anthropic sin key desde el cliente) — migrar a server action/edge function con la key en servidor.
- **Gancho de crecimiento orgánico**: cada `wa.me` y cada página pública exponen la marca GestiónPro al cliente final → el profe recomienda sin pedírselo.

### 3.7 Riesgos de negocio

- **Adopción**: dueños no técnicos → onboarding vía WhatsApp (primer mensaje de bienvenida) + wizard mínimo.
- **Competencia**: apps de agenda genéricas, Google Calendar, WhatsApp Business (sin foco en gestión integral) → diferenciador: seguimiento público + presupuestos + cuotas.
- **Deep links WA**: `window.open` puede ser bloqueado por el navegador en móvil (popup). Mitigación actual: abrir por `href`/navegación directa. Futuro con volumen: WhatsApp Business API (mensajes server-side) — costo por conversación.
- **Precio**: sensibilidad local → probar precio con los primeros 5 negocios reales.

### 3.8 No-objetivos (non-goals) iniciales

Inventario completo, facturación AFIP, RR. HH., multi-idioma, app nativa (PWA alcanza), multi-tienda en un negocio.

---

## 4. Log de decisiones

| ID   | Decisión                                                                                                                                                  | Contexto                                                                                                                                                                           | Estado                                                                                                                                             | Fecha      |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| D-00 | Reingeniería por fases (0-6) con PR encadenados, ejecutada con SDD                                                                                        | Proyecto hecho "suelto" necesita estructura; fase 1 = seguridad                                                                                                                    | ✅ Adoptada                                                                                                                                        | 2026-09-02 |
| D-01 | Modelo de negocio                                                                                                                                         | Producto a terceros: SaaS por **abono mensual** para profesionales independientes (peluquero, profe de clases, técnico). 3 capas: plataforma → profesional → cliente final         | ✅ Adoptada                                                                                                                                        | 2026-09-02 |
| D-02 | ¿Mantener Next.js 16 + Supabase como stack?                                                                                                               | Evaluación: stack correcto, mal usado                                                                                                                                              | ✅ Adoptada (no cambiar stack)                                                                                                                     | 2026-09-02 |
| D-03 | Auth: email+password vs OTP (¿magic link o código por celular?)                                                                                           | Los dueños suelen no usar email; evaluar según D-01                                                                                                                                | ✅ Adoptada — email+password (implementado en Fase 1: `app/login` + `lib/auth`)                                                                    | 2026-09-03 |
| D-04 | Seguimiento público: ¿visible presupuesto/precio o solo estado?                                                                                           | Depende de regla de negocio por rubro                                                                                                                                              | ✅ Adoptada — visible: estado, historial, presupuesto y precio final, nombre de cliente y negocio; nunca datos internos (allowlist migración 0002) | 2026-09-03 |
| D-05 | ¿`sin_reparacion` es terminal o puede pasar a `entregado`?                                                                                                | La máquina de estados final la define la operación real del taller                                                                                                                 | ✅ Adoptada — `sin_reparacion` es terminal (Fase 2, spec R1)                                                                                       | 2026-09-03 |
| D-06 | UI: primitivos propios estilo shadcn/ui vs. sistema de diseño enterprise (Chameleon/Mercury)                                                              | Depende de la ambición de producto (D-01)                                                                                                                                          | ✅ Adoptada — primitivas propias `lib/ui` (Fase 5, `fase5-ui`); enterprise (Chameleon/Mercury) queda como opción futura                            | 2026-09-10 |
| D-07 | Plataforma de pagos del abono: Mercado Pago vs Stripe                                                                                                     | Mercado Pago es de facto en Argentina; Stripe multi-país                                                                                                                           | ⏳ Abierta                                                                                                                                         | —          |
| D-08 | Alcance del self-service del cliente final (reservar y/o pagar en línea vs. solo consultar)                                                               | Define buena parte del alcance de la capa cliente                                                                                                                                  | ✅ Adoptada — consultar + reservar; pagos por fuera (el profe cobra y marca pagado)                                                                | 2026-09-02 |
| D-09 | Race condition de `generar_numero_orden` y decisión de formato                                                                                            | Exploración Fase 3: count(*)+1 sin lock; formato "0001" se mantiene; fix por tabla contador + upsert atómico + constraint único (negocio_id, numero_orden) — backfill con snapshot | ✅ Adoptada                                                                                                                                        | 2026-09-03 |
| D-10 | Backup antes de tocar RLS/migraciones con datos reales                                                                                                    | Producción tiene datos reales (negocios, equipos, etc.); todo cambio de schema va precedido de backup verificado                                                                   | ✅ Adoptada (implementada scripts/backup-bootstrap.md)                                                                                             | 2026-09-02 |
| D-11 | Seguimiento público: solo por token; link viejo → página "link desactualizado"                                                                            | `acceso_token` uuid como única capability; sin grace period por enumerabilidad de `numero_orden`                                                                                   | ✅ Adoptada (implementada migración 0002)                                                                                                          | 2026-09-03 |
| D-12 | ABSORBER CoachFlow al 100% dentro de GestiónPro (misma DB, sin RLS hoy)                                                                                   | CoachFlow = app de profes de gym (alumnos/rutinas/progreso), comparte proyecto Supabase y no tiene RLS/Auth real → agujero de seguridad; la convergencia cierra el gap             | ✅ Adoptada — FASE 7 (post-Fase 5)                                                                                                                 | 2026-09-03 |
| D-13 | Operación de schema en producción: backup verificado + `psql -1` (transacción única) + gates go/no-go por migración; scripts SQL probados antes en ensayo | El rollout real expuso bugs latentes en los scripts del repo y `psql -1` evitó 3 estados parciales                                                                                 | ✅ Adoptada (lecciones del rollout)                                                                                                                | 2026-09-11 |
| D-14 | `numero_orden` en producción: numérico puro `0001` (normalizado desde `REP-2026-0001..0008`); se descarta el formato `R-YYYY-NNNN` del plan de Fase 2     | El gate de 0003 exige numérico; consistente con D-09                                                                                                                               | ✅ Adoptada                                                                                                                                        | 2026-09-11 |

---

## 5. Supuestos abiertos (histórico — todos resueltos)

1. **D-08** ✅ resuelta (2026-09-02): cliente final = consultar + reservar (acceso por link/token, sin cuenta); pagos por fuera.
2. **D-03** ✅ resuelta (2026-09-03): email+password implementado en Fase 1 (`app/login` + `lib/auth`).
3. **D-04** ✅ resuelta (2026-09-03): la allowlist de la migración 0002 expone estado, historial, presupuesto y precio final; nunca datos internos.
4. ¿Hay datos reales en la base de producción? ✅ resuelto (2026-09-11): sí (negocios y equipos reales) → backup verificado + rollout con gates (D-10).

---

## 6. Proceso de trabajo con el agente

- **Cambios grandes** → SDD completo: cada fase es un _change_ con proposal/spec/design/tasks/apply/verify/archive. Artifact store: engram (default) u OpenSpec si se quiere trail de archivos compartibles.
- **PRs encadenados** si el forecast de líneas supera 400 (o `delivery_strategy: auto-chain` con slices por fase).
- **Commits por work unit** (una unidad de trabajo por commit: feature + tests + docs juntos), convencionales.
- **Documentación**: este archivo es el plan maestro; las decisiones se agregan acá con ID; las conclusiones de cada fase se registran también en engram (`reingenieria/gestionpro`). El set de pruebas manuales vive en `docs/casos-de-prueba-manuales.md`.
