# Exploration — Change `rubro-profesor` (GestiónPro)

> Fase: explore (SDD). Artefacto de investigación, no de implementación.
> Convención: español neutro profesional. Evidencia citada como `archivo:línea`.

## 1. Resumen y objetivo del change

Generalizar GestiónPro para servir a **cualquier profe/entrenador independiente de cualquier disciplina** (patín, tenis, pádel, bici, running…) que no tiene espacio físico propio (le prestan las instalaciones). Hoy el sistema solo ofrece **4 rubros hardcodeados** y solo el rubro gimnasio tiene core de gestión (alumnos/rutinas/cobros).

Dirección ya confirmada con el usuario (no se re-litiga):

- Rubro genérico **"Profesor / Entrenador"** + campo **`disciplina`** (texto libre).
- Terminología **neutral** ("Alumnos", "Entrenamientos", "Cobros"); se descartaron presets por disciplina y un sistema de rubros abierto/por plantillas.
- **Gimnasio sigue funcionando igual** (sin regresiones).
- Fuera de alcance: packs, reserva/turnos online, cobro online, branding/white-label, recordatorios, self-service de instalaciones.

## 2. Estado actual VERIFICADO

### 2.1 Modelo actual de rubros

- **Lista de rubros (UI)**: constante `RUBROS` en `components/crear-negocio-form.tsx:17-22` — exactamente 4: `gimnasio`, `peluqueria`, `veterinaria`, `servicio_tecnico`. Es la única lista "formal"; es una constante local del form, no un módulo compartido.
- **Selección de rubro al crear negocio**: `CrearNegocioForm` con un `Select` (`crear-negocio-form.tsx:88-99`), default `gimnasio` (`:40`). El alta **pasa exclusivamente por el RPC `crear_negocio_con_owner`** (`crear-negocio-form.tsx:52-56`).
- **RPC de alta**: `supabase/migrations/0001_fase1_seguridad.sql:42-68` — `crear_negocio_con_owner(p_nombre text, p_slug text, p_rubro text)`, `security definer`, inserta negocio + membresía owner en una transacción. No valida valores de rubro.
- **Persistencia en DB**: `negocios.rubro` es **`text` sin ningún constraint** (no hay enum, ni CHECK sobre `negocios.rubro` en ninguna migración — grep de `supabase/` confirma: los únicos CHECKs son `rol in ('owner','editor')` en `0001:24`, montos/medios de pago en `0003:259-263` y `0006:63-66`, y `sesiones_total > 0` en `0006:123`). El tipo generado lo refleja: `types/database.types.ts:713` (`rubro: string`).
- **Tipo TS de dominio**: `Rubro = keyof typeof RUBRO_ACCENT` (`lib/ui/theme.ts:15`), derivado del mapa de acentos — no es un union explícito.

**Conclusión**: agregar el rubro `profesor` **no exige cambio de esquema de la tabla ni del RPC para el rubro en sí**; la base es tolerante. El cambio de DB real es solo el campo `disciplina` (ver §3).

### 2.2 Terminología condicionada por rubro

- **Tabs del nav**: `features/admin/components/NegocioHeader.tsx:90-128` — tres ramas hardcodeadas:
  - `servicio_tecnico`: Dashboard, Agenda, **Reparaciones** (ruta propia), Caja (`:91-105`).
  - `gimnasio`: Dashboard, Agenda, **Alumnos**, **Rutinas**, **Cobros**, Caja (`:106-118`).
  - default (peluquería/veterinaria): Dashboard, Agenda, **Clientes**, Caja (`:119-128`).
- **Icono por rubro**: `iconoRubro` en `NegocioHeader.tsx:36-41` (default `🏋️`); se reusa en `NegocioShell.tsx:16,87` y se renderiza en el header (`NegocioHeader.tsx:132`).
- **Labels dentro de cada feature**: `AlumnosGym.tsx:246` ("🏋️ Alumnos"), `RutinasGym` y `RutinaModal.tsx:76` ("Rutinas"), `ClientesLista` ("Clientes"), portal del alumno usa "profe"/"rutina" (`features/portal/components/PortalAlumno.tsx:63,439`, `:364` "Todavía no tenés una rutina asignada").
- **Otras condicionales por rubro**: default de aviso de turno `avisoTurnoPorDefecto` (`lib/domain/rubros.ts:15-16`: todo rubro ≠ `servicio_tecnico` avisa — tolerante a rubros nuevos), acento por rubro (`lib/ui/theme.ts:8-22` + `app/globals.css:44-60` con bloques `html[data-rubro="…"]`), island `RubroAccentSetter` (`components/rubro-accent-setter.tsx:14-24`, **cae al default `gimnasio` ante rubro desconocido**), favicon dinámico usa `accentPorRubro` (`app/[slug]/icon.tsx`, vía `theme.ts:3-6`).
- **Emails**: no existe feature de envío de emails en el código actual; el texto condicionado por rubro es casi todo UI (nav, headers de sección, modales, portal). El criterio de rubros se inyecta en pocas piezas.

**Implicancia de pasar a terminología neutral**: el texto condicionado por rubro está concentrado en `NegocioHeader` (tabs) y en los componentes de cada feature. No hay sistema de i18n ni catálogo de términos; los labels son literales en español dispersos. Hacer terminología neutral **global** implicaría renombrar "Rutinas"→"Entrenamientos" y "Clientes"→"Alumnos" también para gimnasio y peluquería/veterinaria, con costo en tests (ver §2.6) y en el portal del alumno. Hacerla neutral **solo para el rubro profesor** (gym conserva sus labels) es localizado y sin regresión.

### 2.3 Core reutilizable del gimnasio

Estructura `features/` (verificada):

```
features/
├── admin/     → NegocioShell, NegocioHeader, DashboardResumen (ensamblado)
├── clientes/  → ClientesLista, NuevoClienteModal (núcleo "clientes")
├── turnos/    → TurnosAgenda, NuevoTurnoModal (núcleo agenda; usa rubro para aviso default)
├── cobros/    → CobrosNegocio, CobrosCliente (NÚCLEO, AD-1: sirve a todos los rubros, 0006:11-12)
├── gastos/    → GastosCaja (núcleo "Caja")
├── gym/       → AlumnosGym, AlumnoModal, RutinasGym, RutinaModal, BibliotecaEjercicios,
│                DetalleAlumno, DetalleRutina, RegistrarMedicionModal, EjercicioModal
│                + actions/ (alumnos, rutinas, ejercicios, asignaciones) + data/gym.ts
├── portal/    → PortalAlumno + contrato.ts (portal público con token)
├── reparaciones/ → específico de servicio_tecnico (rutas propias)
├── seguimiento/  → público (taller)
└── miembros/  → gestión de usuarios del negocio
```

- **Qué es genérico (núcleo)**: clientes, turnos, cobros, gastos, miembros, RLS por membresía. Cobros fue diseñado "núcleo, no solo gimnasio" (`supabase/migrations/0006_fase7_gym_cobros.sql:11-12`).
- **Qué es gym-específico**: `features/gym/*` (ficha de alumno con IMC/altura/peso, rutinas + sesiones + ejercicios + biblioteca, progreso, portal del alumno con asignación activa). Tablas `gym_*` (`0006:87+`) con `negocio_id` denormalizado y RLS plano — **ninguna policy ni constraint ata las tablas `gym_*` al rubro `gimnasio`** (verificado en `0006:224-357`): cualquier negocio puede tener alumnos/rutinas.
- **Ensamblado del nav/tabs**: `app/[slug]/page.tsx` (server) lee negocio + datos y delega en `NegocioShell` (client) que cambia de vista por estado sin cambiar de ruta; `NegocioHeader` elige tabs por rubro (`:90-128`). Los datos de gym se cargan **solo si `rubro === "gimnasio"`** (`app/[slug]/page.tsx:64-87`, flag `esGimnasio`).

### 2.4 Puntos de entrada a tocar para agregar un rubro

1. `components/crear-negocio-form.tsx:17-22` — agregar opción al `Select` (+ campo `disciplina` condicional).
2. `features/admin/components/NegocioHeader.tsx:36-41,90-128` — rama de tabs + `iconoRubro`.
3. `lib/ui/theme.ts:8-13` — acento del rubro en `RUBRO_ACCENT` + bloque `html[data-rubro="profesor"]` en `app/globals.css:44-60` (el test `theme.test.ts:13-27` exige sincronía entre mapa y CSS).
4. `app/[slug]/page.tsx:64-87` — condicional de carga de datos gym (extender `esGimnasio`).
5. `lib/auth/dal.ts:89` y `lib/server/negocio.ts:17` — ambos hacen `select` con **lista explícita de columnas** (`id, nombre, slug, rubro, created_at`): sumar `disciplina` acá si se quiere mostrarla.
6. Rutas: reutilizar `app/[slug]/gym/*` (alumnos, rutinas, portal) y `app/[slug]/portal/[token]` tal cual — no requieren cambios por rubro.
7. Middleware/RLS: `proxy.ts` es agnóstico de rubro (gate optimista por sesión, `proxy.ts:23-43`); RLS por membresía (0001) no menciona rubros. Sin cambios.

### 2.5 DB: cambios requeridos

- **Rubro nuevo**: `negocios.rubro` es `text` sin CHECK → no hace falta migración para el valor.
- **Campo `disciplina`**: opción recomendada — `alter table public.negocios add column disciplina text;` (nullable, solo aplica al rubro profesor) **+ ajustar el RPC** `crear_negocio_con_owner` para aceptar `p_disciplina text default null` (el insert de `0001:59-60` pasa a incluir la columna si viene). Alternativa: columna nullable + update post-RPC — peor, rompe la atomicidad del alta (D-04).
- **Tipos TS**: `types/database.types.ts` es un **snapshot manual PRE-rollout** (documentado en `features/cobros/data/cobros.ts:8-10`: "no incluye `cobros`, regenerarlo es tarea posterior") → la columna nueva se agrega a mano en el snapshot o se regenera con `supabase gen types`.

### 2.6 Testing actual

- **Unit/componente (Vitest)**: 43 archivos `*.test.ts(x)` en `lib/domain`, `lib/ui`, `features/*`, más `proxy.test.ts`. Cobertura específica de rubros:
  - `lib/ui/theme.test.ts:13` — "define los 4 rubros del dominio" (rompería al agregar el 5°: actualizar).
  - `components/rubro-accent-setter.test.tsx` — normalización de rubros desconocidos al default.
  - `lib/domain/rubros.test.ts` — default de aviso por rubro (tolera desconocidos).
  - `features/admin/components/NegocioShell.test.tsx:83-110` — **tabs por rubro** (gym muestra Alumnos/Rutinas/Cobros y NO Clientes; otros rubros no ganan tabs de gym): el punto de regresión más importante.
  - `features/admin/components/NegocioHeader.test.tsx` — header por rubro.
- **E2E (Playwright)**: solo `e2e/smoke.spec.ts` — flujo `login → crear negocio → turno → seguimiento` (`smoke.spec.ts:57-85`); muta datos, gated para producción. Cubre crear negocio pero **no itera rubros** (crea con el default gimnasio).
- **Sin tests de** `crear-negocio-form.tsx` (codegraph: "no covering tests").

## 3. Modelo de datos: actual y propuesto

**Actual** (verificado):

```sql
negocios (id uuid pk, nombre text, slug text unique(ci), rubro text SIN constraint,
          activo bool legacy, telefono_admin text legacy, created_at)
gym_alumnos, gym_rutinas, gym_rutina_sesiones, gym_rutina_ejercicios,
gym_asignaciones, gym_completados, gym_progreso, gym_ejercicios   -- 0006
cobros (núcleo, AD-1)                                            -- 0006:54-67
```

**Propuesto** (migración aditiva, mínima):

```sql
alter table public.negocios add column if not exists disciplina text;
-- RPC: create or replace function crear_negocio_con_owner(
--   p_nombre text, p_slug text, p_rubro text, p_disciplina text default null)
-- → insert incluye disciplina.
```

- `disciplina` nullable: negocios de rubro gimnasio/peluquería/etc. quedan `null` (cero migración de datos).
- Tipos TS: `Rubro` (union) pasa a incluir `"profesor"`; `Negocio` (dal.ts:17-20) suma `disciplina: string | null`.

## 4. Mapa de impacto por capa

| Capa        | Archivo                                                                                                                                                    | Cambio                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| UI alta     | `components/crear-negocio-form.tsx:17-22,40-56`                                                                                                            | Opción "Profesor / Entrenador" + `Input` disciplina condicional + `p_disciplina` al RPC |
| Nav         | `features/admin/components/NegocioHeader.tsx:36-41,90-128`                                                                                                 | Rama `profesor` (tabs neutral) + `iconoRubro`                                           |
| Shell       | `features/admin/components/NegocioShell.tsx:152-176`                                                                                                       | Vista `alumnos`/`rutinas` reutilizada sin cambio estructural (ver §5)                   |
| Server page | `app/[slug]/page.tsx:64-87`                                                                                                                                | `esGimnasio` → "carga gym" incluye `profesor`                                           |
| Dal         | `lib/auth/dal.ts:89`, `lib/server/negocio.ts:17`                                                                                                           | Sumar `disciplina` al select                                                            |
| Tema        | `lib/ui/theme.ts:8-13`, `app/globals.css:44-60`, favicon `app/[slug]/icon.tsx`                                                                             | Acento `profesor` + bloque CSS                                                          |
| Dominio     | `lib/domain/rubros.ts`                                                                                                                                     | Sin cambio (default permisivo ya tolera nuevos)                                         |
| DB          | migración nueva `0010_*`                                                                                                                                   | `disciplina` + RPC con parámetro default                                                |
| Tipos       | `types/database.types.ts`, `lib/ui/theme.ts:15`                                                                                                            | `disciplina` en Row/Insert/Update; `"profesor"` en `Rubro`                              |
| Tests       | `theme.test.ts:13-27`, `NegocioShell.test.tsx`, `NegocioHeader.test.tsx`, `rubro-accent-setter.test.tsx` (regresión), + nuevo test de form/branch profesor | Actualizar "los 4 rubros", agregar escenario profesor                                   |

## 5. Approach recomendado

**Reutilizar el core de gym casi 1:1** — el rubro `profesor` es funcionalmente "gimnasio con otro vestidor". Es el enfoque más simple que cumple y el que menor riesgo de regresión tiene:

1. **DB**: `disciplina text` nullable + RPC con `p_disciplina default null` (un solo migración `0010`).
2. **Datos/UI server**: extender el flag de carga gym de `app/[slug]/page.tsx:66` a `rubro === "gimnasio" || rubro === "profesor"`; el shell reusa `AlumnosGym`, `RutinasGym`, `CobrosNegocio`, `TurnosAgenda` y las rutas `app/[slug]/gym/*` + portal intactas.
3. **Terminología neutral por rubro** (config mínima): tabs y headers del rubro profesor dicen "Alumnos / Entrenamientos / Cobros"; el gimnasio conserva "Rutinas" (ver pregunta abierta #1 sobre el alcance global del neutral). Implementable como un pequeño mapa `labelsPorRubro` en `features/admin` o rama de `NegocioHeader` — **no** sistema de plantillas (descartado).
4. **Tema**: acento propio para `profesor` + bloque CSS sincronizado (el test de sync de `theme.test.ts` obliga a tocar ambos juntos).

Alternativas descartadas:

- **Copiar `features/gym` a `features/profesor`**: duplicación masiva sin beneficio; viola la razón de ser del core reutilizable.
- **Rubros abiertos/plantillas por disciplina**: explícitamente fuera de alcance y descartado con el usuario.
- **Columna JSON de "config por negocio"**: sobre-ingeniería para un solo campo (`disciplina`).

Esfuerzo estimado: **bajo-medio** (~1 PR enfocado: migración + 8-10 archivos UI/types + tests).

## 6. Riesgos y preguntas abiertas

**Riesgos**

1. **Regresión en tabs del gym**: la rama por rubro de `NegocioHeader.tsx:106-118` y `NegocioShell.test.tsx:103-110` asumen "otros rubros no ganan tabs de gym"; la rama nueva debe reutilizar (no copiar) el array de tabs del gym para no divergir.
2. **Neutralización global de terminología**: si se decide que "Entrenamientos" reemplace a "Rutinas" también en el gimnasio, impacta el portal del alumno (`PortalAlumno.tsx:280,364`), `RutinasGym`/`RutinaModal` y sus tests; medible pero conviene separarlo del rubro nuevo.
3. **Rutas `/[slug]/gym/...` para un profe de patín**: el prefijo `gym` aparece en la URL (`app/[slug]/gym/alumnos/[clienteId]`) y en `AlumnosGym.tsx:318` (link hardcodeado). Es cosmético; renombrar la ruta es un cambio de mayor blast radius (redirects, links). Decidir conscientemente: conservar `gym` en v1.
4. **`database.types.ts` desactualizado** (snapshot manual sin `cobros`): el cambio de tipos se hace a mano; regenerar es tarea pendiente documentada, no de este change.
5. **Negocios existentes**: ninguno se toca (columna nullable, default de acento para rubros desconocidos ya cae a `gimnasio`). Riesgo de migración ~nulo.
6. **e2e smoke crea negocio con rubro default**: si el default del form cambia, el smoke podría crear un `profesor` sin `disciplina`; mantener default `gimnasio` o revisar el smoke.

**Preguntas abiertas (para la fase propose)**

1. ¿La terminología neutral ("Entrenamientos") aplica también al rubro gimnasio, o solo al rubro profesor? (La lectura conservadora: solo profesor; gym sin regresión.)
2. ¿Qué emoji/icono para el rubro profesor? (Propuesta: `🏃` o `🎧` genérico; el acento y el favicon necesitan un color decidido.)
3. ¿El campo `disciplina` se muestra en el header junto al nombre (ej. "Prof. Ana — Patín") o solo como metadata? (Afecta `NegocioHeader` y `dal`.)
4. ¿El `slugSeguro` del form sigue igual? (Sí por ahora; el placeholder "ej: gym-el-oso" podría generalizarse, cosmético.)

## 7. Alcance propuesto

**In**

- Migración `0010`: `negocios.disciplina` + RPC `crear_negocio_con_owner` con `p_disciplina default null`.
- Rubro `profesor` en form de alta con input `disciplina` (texto libre) cuando el rubro lo pida.
- Tabs neutral para profesor reutilizando el core gym (Alumnos, Entrenamientos, Cobros, Dashboard, Agenda, Caja); carga de datos gym para el rubro.
- Acento/tema e icono del rubro; icono del favicon via `accentPorRubro`.
- Tipos TS (`Rubro`, `Negocio`, `database.types.ts`) actualizados.
- Tests: sync de 5 rubros, tabs por rubro (profesor y regresión gym), form de alta con disciplina.

**Out (confirmado con el usuario)**

- Packs, reserva/turnos online, cobro online, branding/white-label, recordatorios, self-service de instalaciones.
- Renombrado de terminología dentro del rubro gimnasio (salvo decisión contraria en propose).
- Renombrar rutas `gym` en URLs.
- Sistema de rubros abierto/plantillas por disciplina.
- Regeneración completa de `database.types.ts` (tarea independiente ya documentada).

## 8. Ready for Proposal

**Sí** — el core reutilizable existe y es reutilizable casi sin cambios; la única decisión de producto pendiente es el alcance de la terminología neutral (pregunta #1) y el par icono/color. Nada de esto bloquea la fase propose.
