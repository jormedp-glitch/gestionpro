# Reingeniería GestiónPro — Plan maestro

> Documento vivo del proyecto. Fuente de verdad para el alcance, las fases y las decisiones.
> Se actualiza en cada hito. Cada decisión adoptada se registra en la sección [Log de decisiones](#4-log-de-decisiones).
> Los cambios grandes se ejecutan con SDD (explore → proposal → spec → design → tasks → apply → verify → archive) y entregas en PRs encadenados.

---

## 0. Ficha del proyecto

| Campo             | Valor                                                                                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nombre            | GestiónPro                                                                                                                                                                                         |
| Producto          | SaaS de abono mensual para **profesionales independientes** (peluqueros, profes de clases, servicio técnico). 3 capas: plataforma (dueño del SaaS) → profesional abonado → cliente final (celular) |
| Stack actual      | Next.js 16.2.2 (App Router) · React 19.2.4 · TypeScript 5 · Tailwind 4 · Supabase (supabase-js v2, solo cliente)                                                                                   |
| Backend           | Supabase (anónimo, sin Auth/RLS configurados)                                                                                                                                                      |
| Estado de git     | Limpio; commits convencionales; `.env.local` correctamente ignorado                                                                                                                                |
| Dominio actual    | `negocios`, `clientes`, `turnos`, `gastos`, `equipos`, `reparaciones_historial`, `reparaciones_repuestos`                                                                                          |
| Tests / lint / CI | No existen                                                                                                                                                                                         |

### Estado actual (diagnóstico)

- **App funcional en un solo producto**: 8 páginas (`/`, `/[slug]`, `/reparaciones`, `/reparaciones/nuevo`, `/reparaciones/[id]`, `/seguimiento/[orden]`) + `components/NegocioApp.tsx` (muerto, 657 líneas, no importado).
- **CRÍTICO — Sin seguridad**: el panel de administración (`/`) crea negocios sin login; todo el acceso a datos es directo desde el cliente con la anon key; no hay RLS. Cualquiera con la URL puede leer/escribir la base completa.
- **Arquitectura plana**: client components con `any`, consultas Supabase desde cada página, lógica de dominio duplicada (la máquina de estados de reparación está copiada en 3 archivos con variaciones).
- **Sin versionado de schema**: no hay carpeta `supabase/` ni migraciones.
- **Sin calidad**: no hay ESLint, no hay tests, no hay CI. UI con estilos inline + Tailwind mezclados.
- **IA del análisis**: fetch directo al cliente a Anthropic sin API key (hoy no funciona; si se le agrega key, queda expuesta).
- **WhatsApp**: deep links `wa.me` desde el cliente. Dependencia funcional fuerte (el producto gira alrededor de WhatsApp).

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

### FASE 1 — Seguridad y acceso (3–5 días) — riesgo: ALTO (crítica)

- `@supabase/ssr`: clients de browser/server/middleware; sesión por cookies.
- Auth: login por email+password (u OTP, ver decisión D-03); layout `/login`; middleware de protección en `/` y `/[slug]` (sin proteger `/seguimiento`).
- Modelo de permisos: tabla `negocio_miembros` (`negocio_id`, `user_id`, `rol: owner | editor`). El creador de un negocio queda de owner automático.
- **RLS en las 7 tablas** con policies por negocio/miembro.
- Acceso público controlado: `equipos.acceso_token` (UUID) → `/[slug]/seguimiento/[orden]` puede leer solo estado + historial público + presupuesto/precio de cara al cliente; **nunca** observaciones internas, costos de repuestos ni teléfonos de otros clientes.
- Tests manuales/automatizados de RLS: un anónimo y un usuario de otro negocio no pueden leer/escribir.

**Criterios de aceptación**: sin login no se puede crear ni leer datos; dos negocios no se ven entre sí; la página de seguimiento pública funciona solo con token válido.

### FASE 2 — Arquitectura y dominio (3–5 días) — riesgo: Medio — ✅ IMPLEMENTADA (2026-09-03, SDD `fase2-arquitectura`, verify PASS with warnings; PRs pendientes de creación al cierre del ciclo)

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

### FASE 3 — Datos (2–3 días) — riesgo: Medio

- Migraciones versionadas en `supabase/migrations/`: schema inicial (negocios, clientes, turnos, gastos, equipos, historial, repuestos, miembros), enums o checks de estado, constraints (`monto >= 0`, FK con cascada, unicidades).
- Ejecutado en producción con `supabase db push` / CI.
- Tipos generados: `supabase gen types typescript` → `types/database.types.ts`; refactor de los `any` existentes.
- Índices: `turnos(negocio_id, fecha)`, `clientes(negocio_id)`, `reparaciones_historial(equipo_id)`, `equipos(numero_orden)`, `equipos(negocio_id, created_at)`.
- Seeds de desarrollo + script de verificación de RLS.

**Criterios de aceptación**: `database.types.ts` generado y usado; migraciones aplicables desde cero en un entorno nuevo.

### FASE 4 — Calidad y CI (2–3 días) — riesgo: Bajo

- Vitest + Testing Library: tests de máquina de estados (todas las transiciones válidas e inválidas), generación de orden, mensajes WhatsApp, formatos (ARS/fechas).
- Playwright smoke: login → crear negocio → crear turno → seguimiento público con token.
- GitHub Actions: `lint → typecheck → test → build` en cada PR; branch protection; bajar coverage a cero en dominio (umbral: ≥ 80% en `lib/domain`).
- Formatters/checks de calidad integrados al mismo pipeline.

**Criterios de aceptación**: el CI bloquea un PR con lint/typecheck/test fallando; suite de dominio verde.

### FASE 5 — UI / UX (3–5 días) — riesgo: Medio

- Primitivos propios (base shadcn/ui sobre Radix + Tailwind 4): Button, Input, Select, Card, Dialog, Toast, Badge, Table, EmptyState, Skeleton.
- Unificar el tema: tokens por rubro (color de acento), una sola paleta, remover estilos inline de `app/[slug]/page.tsx`.
- Estados de carga/error/vacío en todas las vistas + `loading.tsx`, `not-found.tsx`, error boundary global.
- `metadata` por negocio (title dinámico, favicon).
- Mobile-first en todos los flujos (los dueños usan el celular).

**Criterios de aceptación**: ninguna página con estilos inline crudos; los flujos principales probados en viewport móvil y desktop.

### FASE 6 — Producto y automatización (post-MVP, por slices) — riesgo: Medio

- Recordatorios automáticos (Supabase Edge Function + pg_cron): recordatorio de turno (día anterior), recordatorio de retiro (3 y 7 días), re-pedido de cuota (7 días antes).
- Reportes mensuales por negocio (CSV/PDF).
- Multi-usuario por negocio: invitaciones y roles.
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

| ID   | Decisión                                                                                     | Contexto                                                                                                                                                                   | Estado                                                                              | Fecha      |
| ---- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------- |
| D-00 | Reingeniería por fases (0-6) con PR encadenados, ejecutada con SDD                           | Proyecto hecho "suelto" necesita estructura; fase 1 = seguridad                                                                                                            | ✅ Adoptada                                                                         | 2026-09-02 |
| D-01 | Modelo de negocio                                                                            | Producto a terceros: SaaS por **abono mensual** para profesionales independientes (peluquero, profe de clases, técnico). 3 capas: plataforma → profesional → cliente final | ✅ Adoptada                                                                         | 2026-09-02 |
| D-02 | ¿Mantener Next.js 16 + Supabase como stack?                                                  | Evaluación: stack correcto, mal usado                                                                                                                                      | ✅ Adoptada (no cambiar stack)                                                      | 2026-09-02 |
| D-03 | Auth: email+password vs OTP (¿magic link o código por celular?)                              | Los dueños suelen no usar email; evaluar según D-01                                                                                                                        | ⏳ Abierta                                                                          | —          |
| D-04 | Seguimiento público: ¿visible presupuesto/precio o solo estado?                              | Depende de regla de negocio por rubro                                                                                                                                      | ⏳ Abierta                                                                          | —          |
| D-05 | ¿`sin_reparacion` es terminal o puede pasar a `entregado`?                                   | La máquina de estados final la define la operación real del taller                                                                                                         | ✅ Adoptada — `sin_reparacion` es terminal (Fase 2, spec R1)                        | 2026-09-03 |
| D-06 | UI: primitivos propios estilo shadcn/ui vs. sistema de diseño enterprise (Chameleon/Mercury) | Depende de la ambición de producto (D-01)                                                                                                                                  | ⏳ Abierta — primitivas UI → Fase 5                                                 | —          |
| D-07 | Plataforma de pagos del abono: Mercado Pago vs Stripe                                        | Mercado Pago es de facto en Argentina; Stripe multi-país                                                                                                                   | ⏳ Abierta                                                                          | —          |
| D-08 | Alcance del self-service del cliente final (reservar y/o pagar en línea vs. solo consultar)  | Define buena parte del alcance de la capa cliente                                                                                                                          | ✅ Adoptada — consultar + reservar; pagos por fuera (el profe cobra y marca pagado) | 2026-09-02 |

---

## 5. Supuestos abiertos (contestar antes de planificar la fase 1)

1. **D-08** ✅ resuelta (2026-09-02): cliente final = consultar + reservar (acceso por link/token, sin cuenta); pagos por fuera.
2. **D-03**: ¿Cómo entra el profesional a su backend? ¿Email o celular + código? — por D-01, el celular/OTP es la hipótesis fuerte por confirmar.
3. **D-04**: reglas operativas del taller (validar con un caso real: ¿qué ve el cliente en seguimiento?).
4. ¿Hay datos reales en la base de producción? (afecta cómo corremos las migraciones: respaldo + modo mantenimiento).

---

## 6. Proceso de trabajo con el agente

- **Cambios grandes** → SDD completo: cada fase es un _change_ con proposal/spec/design/tasks/apply/verify/archive. Artifact store: engram (default) u OpenSpec si se quiere trail de archivos compartibles.
- **PRs encadenados** si el forecast de líneas supera 400 (o `delivery_strategy: auto-chain` con slices por fase).
- **Commits por work unit** (una unidad de trabajo por commit: feature + tests + docs juntos), convencionales.
- **Documentación**: este archivo es el plan maestro; las decisiones se agregan acá con ID; las conclusiones de cada fase se registran también en engram (`reingenieria/gestionpro`).
