# Design: Rubro Profesor / Entrenador

## Technical Approach

El rubro `profesor` reutiliza el core de gym sin copiarlo: migración aditiva `0010` (solo `disciplina` + RPC con firma nueva), tabs como mapa de labels override sobre el array base del gym, predicado compartido de carga gym en `lib/domain/rubros.ts`, acento rosa sincronizado mapa↔CSS y disciplina condicional en el header. Cubre las 4 specs del change.

## Architecture Decisions

| #   | Decisión                   | Choice                                                                                                                                                                                                                                   | Alternativas                                  | Rationale                                                                                                                                                                                                                                                                                                                             |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | RPC                        | Drop + create con firma nueva: `drop function public.crear_negocio_con_owner(text,text,text);` + `create function ...(p_nombre text, p_slug text, p_rubro text, p_disciplina text default null)`                                         | `create or replace`                           | Con firma distinta, `or replace` crea un **overload**: la firma de 3 params queda viva con sus grants (0009:43). Reaplicar permisos espejando 0001:70-71 + 0009:43 (`revoke from public/anon; grant to authenticated`: los default privileges de Supabase reotorgan EXECUTE a `anon` al crear la función — lección 0004, 0009:17-21). |
| D2  | Normalización `disciplina` | Solo en el RPC: `nullif(btrim(p_disciplina), '')`                                                                                                                                                                                        | También en el cliente                         | Fuente única server-side; cubre cualquier caller y resuelve el edge vacío/whitespace → `null` sin lógica duplicada. El form solo trimea para UI.                                                                                                                                                                                      |
| D3  | Predicado gym-core         | `esRubroGymCore(rubro)` en `lib/domain/rubros.ts`; en `app/[slug]/page.tsx:66` el flag pasa a `esGymCore`                                                                                                                                | Extender el inline `esGimnasio`               | Testable en `lib/domain` (coverage ≥80); no duplica la unión `["gimnasio","profesor"]` en la page.                                                                                                                                                                                                                                    |
| D4  | Tabs profesor              | Constantes module-level en `NegocioHeader.tsx`: `TABS_GYM` (array extraído de `:106-118`) y `TABS_PROFESOR = TABS_GYM.map(([v, l]) => [v, OVERRIDES[v] ?? l])`, overrides `{ alumnos: "🏃 Alumnos", rutinas: "🏃 Entrenamientos" }`      | Copiar el array; sistema de labels global     | Reutilización por referencia: la rama `gimnasio` consume `TABS_GYM` sin overrides → byte-idéntico; overrides mínimos para la terminología neutral, sin i18n (descartado en proposal).                                                                                                                                                 |
| D5  | Disciplina en header       | Inline en la línea del nombre (`NegocioHeader.tsx:133`): renderiza `" — " + negocio.disciplina` solo si `rubro === "profesor"` y `disciplina` no vacía                                                                                   | Componente aparte; mostrar a todos los rubros | La spec exige condicionar por rubro y evitar separador/texto vacío; un `&&` inline cumple ambos con mínima superficie.                                                                                                                                                                                                                |
| D6  | Tema                       | `profesor: "#F472B6"` en `RUBRO_ACCENT` (`theme.ts:8-13`) + `html[data-rubro="profesor"] { --accent: #f472b6; }` en `globals.css:60` + favicon sin cambios (deriva vía `accentPorRubro`, `icon.tsx:22`)                                  | Unificar mapa↔CSS en una sola fuente          | El contrato actual (test de sync `theme.test.ts:22-32`) obliga a editar ambos juntos; mantener el espejo manual es más simple que reescribir el mecanismo. `Rubro` (`theme.ts:15`) se deriva del mapa → `"profesor"` entra gratis.                                                                                                    |
| D7  | Lectura de `disciplina`    | Sumar `disciplina` a los selects explícitos (`lib/auth/dal.ts:89`, `lib/server/negocio.ts:17`) y al `Pick` de `Negocio` (`dal.ts:17-20`)                                                                                                 | `select("*")`                                 | Convención del repo: snapshot manual con columnas recortadas; `*` rompería el tipo `Negocio`.                                                                                                                                                                                                                                         |
| D8  | Tipos DB                   | Agregar `disciplina: string \| null` a mano en `Row/Insert/Update` de `negocios` (`types/database.types.ts:707-736`)                                                                                                                     | Regenerar con `supabase gen types`            | Regeneración completa es tarea documentada aparte (proposal, Out of Scope); verify con `npm run build`.                                                                                                                                                                                                                               |
| D9  | Form de alta               | `{ value: "profesor", label: "Profesor / Entrenador" }` en `RUBROS` (`crear-negocio-form.tsx:17-22`) + `Input` disciplina condicional a ese rubro + `p_disciplina` solo en esa rama del RPC (`:52-56`); default sigue `gimnasio` (`:40`) | Mover `RUBROS` a módulo compartido            | Constante local con un solo caller (codegraph: blast radius 1) — moverla agrega un archivo sin valor; default inalterado protege el smoke E2E.                                                                                                                                                                                        |
| D10 | Icono rubro                | `if (rubro === "profesor") return "🏃";` en `iconoRubro` (`NegocioHeader.tsx:36-41`)                                                                                                                                                     | Mapa de iconos                                | Caso único; patrón if-chain existente. Reuso actual intacto en `NegocioShell.tsx:16,87`.                                                                                                                                                                                                                                              |

## Data Flow

    Form (client) ── rpc(crear_negocio_con_owner, p_disciplina: " Patín ")
                      ── nullif(btrim(...)) ──► negocios.disciplina = "Patín"
                      └─► negocio_miembros (owner)          (atómico, 0001:42-68)
    page.tsx ──esGymCore──► carga gym (alumnos/rutinas/progreso/ejercicios)
          └────► NegocioShell ──► NegocioHeader (tabs profesor + "Nombre — Patín")
                    └─► RubroAccentSetter ──► html[data-rubro="profesor"] ──► acento rosa

## File Changes

| File                                               | Action | Description                                                        |
| -------------------------------------------------- | ------ | ------------------------------------------------------------------ |
| `supabase/migrations/0010_rubro_profesor.sql`      | Create | D1 + D2: columna, drop/create RPC, grants, rollback en comentarios |
| `components/crear-negocio-form.tsx`                | Modify | D9                                                                 |
| `components/crear-negocio-form.test.tsx`           | Create | Cobertura del form                                                 |
| `features/admin/components/NegocioHeader.tsx`      | Modify | D4, D5, D6 (icono)                                                 |
| `features/admin/components/NegocioShell.test.tsx`  | Modify | Escenario profesor + regresión gym (expectativas sin cambios)      |
| `features/admin/components/NegocioHeader.test.tsx` | Modify | Disciplina en header + tabs `?vista=` profesor                     |
| `app/[slug]/page.tsx`                              | Modify | D3                                                                 |
| `lib/domain/rubros.ts` + `rubros.test.ts`          | Modify | D3 + sus casos                                                     |
| `lib/ui/theme.ts` + `theme.test.ts`                | Modify | D6 + sync de 5 rubros                                              |
| `app/globals.css`                                  | Modify | D6: bloque CSS                                                     |
| `lib/auth/dal.ts`, `lib/server/negocio.ts`         | Modify | D7                                                                 |
| `types/database.types.ts`                          | Modify | D8                                                                 |
| `docs/casos-de-prueba-manuales.md`                 | Modify | Caso manual de alta profesor con sesión real                       |

Sin cambios: `rubro-accent-setter.tsx` y `app/[slug]/icon.tsx` (derivan del mapa), `NegocioShell.tsx` (vistas genéricas), `avisoTurnoPorDefecto` (`rubros.ts:16` ya tolera `profesor`), portal, RLS, rutas `gym/*`.

## Interfaces / Contracts

- RPC (firma única sin overload): `crear_negocio_con_owner(p_nombre text, p_slug text, p_rubro text, p_disciplina text default null) returns public.negocios`.
- `type Negocio = Pick<Tables<"negocios">, "id" | "nombre" | "slug" | "rubro" | "disciplina" | "created_at">`.
- `esRubroGymCore(rubro: string): boolean` — true solo para `gimnasio` y `profesor`.
- Contrato UI: único label divergente para profesor es "Entrenamientos"; el resto del array gym se hereda.

## Testing Strategy

| Layer               | What to Test                                                                                                  | Approach                                                                                                                                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (`lib/domain`) | `esRubroGymCore`: gimnasio/profesor true; peluquería y desconocido false                                      | Vitest                                                                                                                                                                                                                                                                                                      |
| Unit (`lib/ui`)     | Sync mapa↔CSS con 5 rubros; `accentPorRubro("profesor") = "#F472B6"`; fallback de desconocidos intacto        | `theme.test.ts`                                                                                                                                                                                                                                                                                             |
| Component (shell)   | Profesor: tabs Alumnos/Entrenamientos/Cobros y **sin** tab "Rutinas"; navegación renderiza secciones gym      | `NegocioShell.test.tsx`                                                                                                                                                                                                                                                                                     |
| Component (header)  | Icono 🏃; "Ana — Patín" solo profesor con disciplina; sin separador si falta; rubro no-profe nunca la muestra | `NegocioHeader.test.tsx`                                                                                                                                                                                                                                                                                    |
| Component (form)    | RPC con y sin `p_disciplina`; input solo visible con profesor; default gimnasio                               | RTL mockeando `@/lib/supabase/client` en test colocalizado. Rationale: el envío condicional (spec `alta-negocio`) no está cubierto en ningún nivel — el smoke no itera rubros (exploration §2.6) y muta datos; el test unitario es barato y determinista. Flujos con sesión real → caso manual documentado. |
| E2E                 | Sin cambios: smoke crea con default `gimnasio`                                                                | `e2e/smoke.spec.ts` intacto                                                                                                                                                                                                                                                                                 |

## Threat Matrix

N/A — el change no toca routing de shell, subprocesos, automatización VCS/PR, clasificación de ejecutables ni integración de procesos: solo DB aditiva, Server Components/Actions existentes y UI client.

## Migration / Rollout

`0010` es aditiva y reversible: columna nullable, negocios existentes no se tocan (`disciplina = null`, válidos por spec). Rollback documentado en la migración: drop column + drop de la firma de 4 params + recrear la de 3 con sus grants. Revertir el PR hace caer negocios `profesor` al acento default sin error (fallback ya verificado en `rubro-accent-setter`).

## Open Questions

- [ ] Ninguna bloqueante. Pendientes aceptadas: URL `/[slug]/gym/*` visible para profes (cosmético, proposal) y regeneración de `database.types.ts` (tarea aparte).
