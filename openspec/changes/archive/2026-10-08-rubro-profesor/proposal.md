# Proposal: Rubro Profesor / Entrenador

## Intent

GestiónPro solo sirve a gimnasios con espacio propio. Un profe/entrenador independiente de otra disciplina (patín, tenis, pádel…) no tiene forma de gestionar alumnos, entrenamientos ni cobros. Se agrega el rubro `profesor` reutilizando íntegramente el core de gym, con terminología neutral y `disciplina` opcional visible en el header. Gimnasio y demás rubros quedan sin regresiones.

## Scope

### In Scope

- Migración aditiva `0010`: `negocios.disciplina text` nullable + RPC `crear_negocio_con_owner` con `p_disciplina text default null`.
- Rubro `profesor` en el alta (`crear-negocio-form.tsx`) con input `disciplina` opcional condicional al rubro.
- Tabs neutral para profesor (Dashboard, Agenda, **Alumnos**, **Entrenamientos**, **Cobros**, Caja) reutilizando el array de tabs del gym; icono `🏃`.
- Carga de datos gym extendida a `profesor` en `app/[slug]/page.tsx` (flag `esGimnasio` → `esGymCore`).
- Header muestra `disciplina` junto al nombre cuando exista (ej. "Ana — Patín").
- Acento rosa `#F472B6` + bloque `html[data-rubro="profesor"]` + favicon vía `accentPorRubro`.
- Tipos TS: `Rubro` incluye `"profesor"`; `disciplina` en `Negocio` y snapshot manual de `database.types.ts`.
- Tests: sync de 5 rubros en `theme.test.ts`, tabs por rubro (profesor + regresión gym) en `NegocioShell.test.tsx`, form de alta con disciplina.

### Out of Scope

- Packs, reserva/turnos online, cobro online, branding/white-label, recordatorios, self-service.
- Renombrar terminología dentro del gym ("Rutinas") ni rutas `/[slug]/gym/*` (cosmético, se conservan).
- Sistema de rubros abierto/plantillas por disciplina; regeneración completa de `database.types.ts` (tarea documentada aparte).

## Capabilities

### New Capabilities

- `alta-negocio`: alta de negocio por rubro vía RPC; selección de rubro, `disciplina` opcional para profesor, atomicidad del alta.
- `navegacion-por-rubro`: tabs, icono, labels y header por rubro; terminología neutral para profesor, gym sin cambios.
- `tema-identidad-rubro`: acento, bloque CSS `data-rubro` y favicon sincronizados con el mapa de rubros.
- `carga-datos-gym`: condicional server de carga de datos gym (alumnos/rutinas/cobros) compartida entre `gimnasio` y `profesor`.

### Modified Capabilities

- Ninguna (`openspec/specs/` está vacío; primer change con store OpenSpec).

## Approach

El rubro `profesor` es funcionalmente "gimnasio con otro vestidor": sin tablas ni RLS nuevas (ninguna policy ata `gym_*` a `gimnasio`), la DB solo gana `disciplina`. En UI, una rama nueva en `NegocioHeader` reutiliza el array de tabs del gym (sin copiarlo) con labels neutral; el shell y las rutas `gym/*` + portal quedan intactos. ~1 PR enfocado: migración + 8–10 archivos UI/types + tests.

## Affected Areas

| Área                                                        | Impacto  | Descripción                                       |
| ----------------------------------------------------------- | -------- | ------------------------------------------------- |
| `supabase/migrations/0010_*`                                | New      | Columna `disciplina` + RPC con `p_disciplina`     |
| `components/crear-negocio-form.tsx`                         | Modified | Opción profesor + input disciplina                |
| `features/admin/components/NegocioHeader.tsx`               | Modified | Rama tabs profesor + icono + disciplina en header |
| `features/admin/components/NegocioShell.test.tsx`           | Modified | Escenario profesor + regresión gym                |
| `app/[slug]/page.tsx`                                       | Modified | Carga gym para `profesor`                         |
| `lib/auth/dal.ts`, `lib/server/negocio.ts`                  | Modified | `disciplina` en select                            |
| `lib/ui/theme.ts`, `app/globals.css`, `app/[slug]/icon.tsx` | Modified | Acento `profesor` sincronizado                    |
| `types/database.types.ts`                                   | Modified | Snapshot manual: `disciplina` + `profesor`        |

## Risks

| Riesgo                                                      | Prob.            | Mitigación                                                            |
| ----------------------------------------------------------- | ---------------- | --------------------------------------------------------------------- |
| Regresión de tabs gym (`NegocioHeader`/`NegocioShell.test`) | Media            | Rama profesor reutiliza el array del gym; test de regresión explícito |
| Desync mapa acentos ↔ CSS                                   | Baja             | Test de sync de `theme.test.ts` actualizado a 5 rubros                |
| `database.types.ts` desactualizado (snapshot manual)        | Media            | Agregar a mano y verificar en build; regeneración queda documentada   |
| Smoke E2E crea negocio default                              | Baja             | Mantener default `gimnasio` en el form                                |
| Rutas `gym` visibles para un profe                          | Alta (cosmética) | Aceptado conscientemente; renombrado fuera de alcance                 |

## Rollback Plan

Migración aditiva y reversible: `alter table negocios drop column if exists disciplina;` + `drop function crear_negocio_con_owner(...)` y recrear la firma de 3 parámetros. En UI, revertir el PR elimina rama `profesor` de tabs, form y tema; rubros `profesor` pre-existentes en DB caerían al default de acento `gimnasio` sin error (comportamiento verificado en `rubro-accent-setter`). Negocios existentes no se modifican (columna nullable, cero migración de datos).

## Dependencies

- Sin dependencias externas. Supuestos: `negocios.rubro` sigue sin CHECK; default del form sigue `gimnasio` para no afectar el smoke E2E.

## Success Criteria

- [ ] Un negocio `profesor` con `disciplina` se crea vía RPC y ve tabs neutral (Alumnos/Entrenamientos/Cobros) con alumnos, entrenamientos, mediciones, cobros y portal funcionales. — **NO TILDADO: condicionado al rollout de la migración `0010` (Hallazgo H1)**; verificado estáticamente, requiere aplicar `0010` y ejecutar TC-ADMIN-05 antes de habilitar el rubro en producción (verify-report: PASS WITH WARNINGS, 2026-10-07).
- [x] `disciplina` visible en el header solo cuando existe; alta sin disciplina válida igualmente. — Verificado en UI por tests (header "Ana — Patín", trim, null sin separador; parte de persistencia en DB queda como caso manual TC-ADMIN-05, per verify-report).
- [x] Tabs del gym y labels del gym idénticos al estado previo (test de regresión pasa sin cambios de expectativa). — Verificado (tests de regresión gym GREEN, `NegocioShell`/`NegocioHeader`, rama gimnasio consume `TABS_GYM` sin overrides).
- [x] `theme.test.ts` valida 5 rubros con sync mapa↔CSS; favicon y acento `#F472B6` aplicados. — Verificado (sync de 5 rubros GREEN; favicon deriva del mapa vía `accentPorRubro`; render visual real → MANUAL TC-ADMIN-05).
- [x] `npm test` verde y cobertura ≥80 en `lib/domain` y `lib/ui`; `npm run build` sin errores de tipos. — Verificado: 423/423 tests, build exit 0, lint 0, cobertura lib/domain 100% y lib/ui 100% (≥80).

_Marcado en archive (2026-10-08) según evidencia del verify-report. SC1 pendiente: runtime-DB condicionado al rollout de `0010` (H1)._
