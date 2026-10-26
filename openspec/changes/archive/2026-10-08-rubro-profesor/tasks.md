# Tasks: Rubro Profesor / Entrenador

## Review Workload Forecast

| Field                   | Value                                                |
| ----------------------- | ---------------------------------------------------- |
| Estimated changed lines | ~420–500 (tests nuevos ~200 incluidos)               |
| 400-line budget risk    | Medium                                               |
| Chained PRs recommended | Yes                                                  |
| Suggested split         | PR único con `size:exception` (delivery `single-pr`) |
| Delivery strategy       | single-pr                                            |
| Chain strategy          | size-exception                                       |

Decision needed before apply: No (size:exception aprobado explícitamente por el maintainer, 2026-10-07)
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal                                  | Likely PR | Focused test command                                                                                              | Runtime harness                                                          | Rollback boundary                                                                        |
| ---- | ------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 1    | Migración `0010` + tipos DB           | PR 1      | `npm run build` (verifica tipos snapshot)                                                                         | N/A: RPC con sesión real → caso manual (docs), smoke no muta datos       | Drop columna + recrear firma de 3 params (rollback en comentarios) — base feature branch |
| 2    | Predicado `esRubroGymCore`            | PR 1      | `npx vitest run lib/domain/rubros.test.ts`                                                                        | N/A: unit puro                                                           | Revert de `rubros.ts` sin tocar migración                                                |
| 3    | Tema acento profesor                  | PR 1      | `npx vitest run lib/ui/theme.test.ts`                                                                             | N/A: visual → revisión manual del accent                                 | Revert `theme.ts` + `globals.css`; fallback sin error                                    |
| 4    | Header/shell: tabs, icono, disciplina | PR 1      | `npx vitest run features/admin/components/NegocioShell.test.tsx features/admin/components/NegocioHeader.test.tsx` | N/A: sesión real en app `[slug]` → `npm run dev` manual                  | Rama `profesor` removible sin alterar tabs gimnasio                                      |
| 5    | Form alta + disciplina condicional    | PR 1      | `npx vitest run components/crear-negocio-form.test.tsx`                                                           | alta con sesión real → caso manual docs                                  | Form default `gimnasio` intacto protege smoke E2E                                        |
| 6    | Selects + carga gym para profesor     | PR 1      | `npm test` (suite completa)                                                                                       | N/A: read de página requiere Supabase → cubierto por suite + caso manual | Revert `dal.ts`/`negocio.ts`/`page.tsx` es aditivo y aislado                             |

Decision needed before apply: No — `size:exception` aprobado explícitamente por el maintainer (2026-10-07); PR único autorizado.

## Fase 1: Fundación (DB + tipos + dominio)

- [x] 1.1 Crear `supabase/migrations/0010_rubro_profesor.sql` (D1/D2): `alter table negocios add column disciplina text;` — sin nuevas tablas ni RLS (spec carga-datos-gym, Req "Migración sin nuevas tablas").
- [x] 1.2 En `0010` (D1/D2): `drop function crear_negocio_con_owner(text,text,text);` + `create function crear_negocio_con_owner(p_nombre text, p_slug text, p_rubro text, p_disciplina text default null)` con `nullif(btrim(p_disciplina),'')` en el insert; grants `revoke from public/anon; grant execute to authenticated` espejando 0001:70-71 y 0009:43.
- [x] 1.3 Agregar rollback comentado al final de `0010`: drop column + drop firma de 4 params + recrear firma de 3 params con sus grants (design: Migration/Rollout).
- [x] 1.4 Editar `types/database.types.ts` (Row/Insert/Update de `negocios`, ~707-736): agregar `disciplina: string | null` manual (D8).
- [x] 1.5 Editar `Negocio` en `lib/auth/dal.ts:17-20`: agregar `"disciplina"` al `Pick` (D7).
- [x] 1.6 Escribir RED: `lib/domain/rubros.test.ts` agrega casos de `esRubroGymCore` — gimnasio y profesor true; peluquería y desconocido false (design: Testing Strategy, capa Unit domain).
- [x] 1.7 Implementar en `lib/domain/rubros.ts` (D3): `export function esRubroGymCore(rubro: string): boolean` (true solo `gimnasio`/`profesor`); GREEN de 1.6.

## Fase 2: Implementación (UI + carga de datos)

- [x] 2.1 Escribir RED en `lib/ui/theme.test.ts`: mapa con 5 rubros, `accentPorRubro("profesor") = "#F472B6"`, fallback de desconocidos intacto, sync mapa↔CSS (scenarios tema-identidad-rubro: Cobertura y Detección de desincronía).
- [x] 2.2 Editar `lib/ui/theme.ts:8-13`: `profesor: "#F472B6"` en `RUBRO_ACCENT` (D6); editar `app/globals.css:60`: `html[data-rubro="profesor"] { --accent: #f472b6; }` — ambos juntos, GREEN de 2.1.
- [x] 2.3 Escribir RED en `features/admin/components/NegocioHeader.test.tsx`: icono 🏃; "Ana — Patín" solo con profesor + disciplina; sin separador si falta; rubro no-profe nunca la muestra (spec navegacion-por-rubro, Req "Disciplina visible").
- [x] 2.4 Editar `features/admin/components/NegocioHeader.tsx` (D4/D5/D10): extraer `TABS_GYM` de ~~:106-118, `TABS_PROFESOR` con overrides `{ alumnos: "🏃 Alumnos", rutinas: "🏃 Entrenamientos" }`; rama `gimnasio` consume `TABS_GYM` sin overrides; `iconoRubro` → `if (rubro === "profesor") return "🏃";`; disciplina inline en la línea del nombre (~~:133) solo si `rubro === "profesor"` y no vacía; GREEN de 2.3.
- [x] 2.5 Escribir en `features/admin/components/NegocioShell.test.tsx`: escenario profesor — tabs Dashboard/Agenda/Alumnos/Entrenamientos/Cobros/Caja, sin tab "Rutinas"; navegación renderiza secciones gym; regresión gimnasio byte-idéntica (spec navegacion-por-rubro, Req "Pestañas" y scenario Regresión).
- [x] 2.6 Escribir RED `components/crear-negocio-form.test.tsx` (RTL mocking `@/lib/supabase/client`): default gimnasio; opción "Profesor / Entrenador"; input disciplina solo visible con profesor; RPC llama `p_disciplina` solo en rama profesor y omite/gestiona vacío→null (scenarios alta-negocio: Alta con disciplina, Edge disciplina vacía, Edge disciplina sin profesor; stub lean_tenant/theme como necesario). N/A harness: sesión real en caso manual doc.
- [x] 2.7 Editar `components/crear-negocio-form.tsx` (D9): `{ value: "profesor", label: "Profesor / Entrenador" }` en `RUBROS` (~~:17-22); `Input` disciplina condicional; trim UI; `p_disciplina` solo en esa rama del rpc (~~:52-56); default `gimnasio` inalterado; GREEN de 2.6.
- [x] 2.8 Editar `lib/auth/dal.ts:89` y `lib/server/negocio.ts:17` (D7): sumar `disciplina` a los select explícitos.
- [x] 2.9 Editar `app/[slug]/page.tsx:66` (D3): reemplazar flag inline `esGimnasio` por `esGymCore` consumiendo `esRubroGymCore(rubro)`; sin cambios en consultas.

## Fase 3: Verificación (suite completa)

- [x] 3.1 Ejecutar `npm test` — toda la suite verde, también los tests de regresión gimnasio sin cambios de expectativa (spec SUCCESS: tabs gym idénticos al previo).
- [x] 3.2 Ejecutar `npm run build` — sin errores de tipos (`disciplina`/`profesor` usables desde `database.types.ts`, SUCCESS: cobertura ≥80 en `lib/domain` y `lib/ui`).
- [x] 3.3 Revisar estáticamente `0010`: firma única (sin overload de 3 params), grants presentes, `nullif(btrim())` aplicada y rollback comentado (design: Interfaces/Contracts).

## Fase 4: Docs y cierre

- [x] 4.1 `docs/casos-de-prueba-manuales.md`: caso manual de alta profesor con sesión real — crear negocio con `disciplina " Patín "`, verificar header "Ana — Patín", disciplina en DB normalizada (`Patín`) y disciplina vacía persiste null (scenarios alta-negocio: Alta con disciplina y Edge — disciplina vacía); documentar `/[slug]/gym/*` visible como aceptado.
- [x] 4.2 Revisar proposal Success Criteria contra tasks completadas y anotar cualquier desvío en el PR.

---

**Fuente:** specs `alta-negocio` / `navegacion-por-rubro` / `tema-identidad-rubro` / `carga-datos-gym`; design D1–D10. Threat Matrix: N/A (no hay casos aplicables).
