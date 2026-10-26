```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:01e4b0bb7b57e31cf0c547a3d6d5fc1f43a77dee64179c6723eb92c7810d0bea
verdict: pass
blockers: 0
critical_findings: 0
requirements: 13/13
scenarios: 28/28
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:eb35e3ddbc12fede213b99fff3972904a2694f2ebe5fd03204c7a0c8bd6d17de
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:01c23384ce95bc8287c9d9603c1e9d4b97bb10c1003d80d6676d735528b2bb63
```

# Verify Report: `rubro-profesor` (GestiónPro)

## Verification Report

**Change**: `rubro-profesor`
**Version**: N/A (primer change con store OpenSpec; `openspec/specs/` vacío)
**Mode**: Standard (strict_tdd `false` — verify estándar)
**Fecha**: 2026-10-07 · Verificador: sdd-verify (agente independiente; no aplica fixes)

### Contexto operativo

| Campo         | Valor                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Change root   | `openspec/changes/rubro-profesor`                                                                                                                   |
| Store         | openspec repo-local                                                                                                                                 |
| taskProgress  | 21/21 completas, applyState `all_done` (coincide con conteo directo de checkboxes en `tasks.md`: 7+9+3+2 = 21, todos `[x]` → sin tareas sin marcar) |
| actionContext | repo-local; allowedEditRoots: `C:\gestionpro`; sin git (cero commits/ramas realizados)                                                              |
| Review gate   | `disabled/unmanaged` (RDD/review OFF por clone-local): verificación sin transacción de review ni receipt, conforme al contexto operativo nativo     |

### Completeness

| Metric           | Value |
| ---------------- | ----- |
| Tasks total      | 21    |
| Tasks complete   | 21    |
| Tasks incomplete | 0     |

| Fase                                     | Alcance             | Evidencia de completitud                                                                                                                                                                                                                           |
| ---------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fase 1: Fundación (DB + tipos + dominio) | 1.1–1.7 (7/7 `[x]`) | `0010_rubro_profesor.sql` existe y cumple D1/D2; `esRubroGymCore` implementado y testeado; `disciplina` en `database.types.ts` (Row/Insert/Update, :707-736) y en `Negocio` (`dal.ts:19`)                                                          |
| Fase 2: Implementación (UI + carga)      | 2.1–2.9 (9/9 `[x]`) | `theme.ts`/`globals.css` con `#F472B6`; `NegocioHeader` con `TABS_GYM`/`TABS_PROFESOR`/icono 🏃/disciplina inline; tests Shell/Header/Form presentes; `dal.ts:89` + `negocio.ts:17` con `disciplina` en select; `page.tsx:69` usa `esRubroGymCore` |
| Fase 3: Verificación (suite)             | 3.1–3.3 (3/3 `[x]`) | Re-ejecutado en esta verificación (ver abajo); revisión estática de `0010` confirmada                                                                                                                                                              |
| Fase 4: Docs y cierre                    | 4.1–4.2 (2/2 `[x]`) | `docs/casos-de-prueba-manuales.md` con **TC-ADMIN-05** (alta profesor con/sin disciplina, normalización, URL `/gym/*` documentada como aceptado); desvíos anotados (Hallazgo H5)                                                                   |

### Build & Tests Execution

**Build**: ✅ Passed

```text
$ npm run build   (exit code 0)
▲ Next.js 16.2.2 (Turbopack)
- Environments: .env.local
  Creating an optimized production build ...
✓ Compiled successfully in 3.5s
  Running TypeScript ...
  Finished TypeScript in 4.5s ...
✓ Generating static pages (5/5)
Rutas: /, /[slug], /[slug]/gym/alumnos/[clienteId], /[slug]/gym/rutinas/[id], /[slug]/login, /[slug]/portal/[token], /[slug]/reparaciones*, /[slug]/seguimiento/[orden], /[slug]/usuarios, /login — Proxy (Middleware) activo
```

**Tests**: ✅ 423 passed / ❌ 0 failed / ⚠️ 0 skipped

```text
$ npm test   (exit code 0)
RUN v5.0.0 C:/gestionpro
Test Files  45 passed (45)
     Tests  423 passed (423)
  Duration  8.36s
```

Suites del change incluidas: `lib/domain/rubros.test.ts`, `lib/ui/theme.test.ts`, `features/admin/components/NegocioShell.test.tsx`, `features/admin/components/NegocioHeader.test.tsx`, `components/crear-negocio-form.test.tsx`.

**Coverage**: ✅ Above (threshold 80)

```text
$ npm run test:coverage   (exit code 0; v8, thresholds por glob ≥80 en lib/domain y lib/ui)
lib/domain (13 archivos): lines 100% (136/136) · stmts 99.35% (154/155) · funcs 100% (48/48) · branches 97.98% (97/99)
lib/ui (13 archivos): lines/stmts/funcs/branches 100%
Total: lines 100% (198/198) · stmts 99.53% (216/217) · branches 98.21% (110/112) · funcs 100% (77/77)
rubros.ts y theme.ts: 100% en las 4 métricas
```

**Lint**: ✅ Passed

```text
$ npm run lint   (exit code 0 — eslint . sin errores ni warnings)
```

**Output hashes (sha256)**: test `eb35e3ddbc12fede213b99fff3972904a2694f2ebe5fd03204c7a0c8bd6d17de` · build `01c23384ce95bc8287c9d9603c1e9d4b97bb10c1003d80d6676d735528b2bb63` · coverage `97686c3b547a09adc8455c93a3b0869dec38f4720ece32925ba35ea9914d66bb` · lint `e9d6b0e00c8cd0ed3fdbfc0aa21d6cd4f5e84f6324a537bee9929f35196834a8`. `evidence_revision` = sha256 de los 4 hashes concatenados (manifiesto de evidencia).

**Estatus de evidencia проекта**: automatizada primero (tests runtime); la política del proyecto (SDD sdd-init, 2026-09-25) acepta verificación manual documentada registrada en `docs/casos-de-prueba-manuales.md` para escenarios sin cobertura automatizada y validaciones de entorno real. Esas filas se marcan explícitamente **`MANUAL`/`ROLLOUT`** — ninguna quedó `UNTESTED` silencioso.

### Spec Compliance Matrix

Estado de escenarios: `COMPLIANT` (test automatizado pasa, o verificación manual documentada aceptada por la política y marcada) / `PARTIAL` (cubierto parcialmente: automatizado + componente MANUAL pendiente de entorno). Formula RFC 2119 verificada contra las 4 specs del change (**13 requisitos / 28 escenarios**, contados de los `### Requirement`/`#### Scenario` reales: 4+3+3+3 req = 13; 9+7+6+6 esc = 28).

#### Spec 1: `alta-negocio` (4 req / 9 esc)

| Requirement                                     | Scenario                                  | Test / Evidencia                                                                                                                                                                                                                             | Result                                                   |
| ----------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| REQ: Selección de rubro Profesor en el alta     | Alta de negocio con rubro gimnasio        | `components/crear-negocio-form.test.tsx` > "con gimnasio: no muestra el input disciplina ni lo envía al RPC" — RPC sin `p_disciplina` (`"p_disciplina" in args === false`), input Disciplina ausente                                         | ✅ COMPLIANT                                             |
| REQ: Selección de rubro Profesor en el alta     | Default del formulario                    | `crear-negocio-form.test.tsx` > "default del formulario: gimnasio" (`useState("gimnasio")`, `crear-negocio-form.tsx:42`; protege smoke E2E)                                                                                                  | ✅ COMPLIANT                                             |
| REQ: Selección de rubro Profesor en el alta     | Selección del rubro profesor              | `crear-negocio-form.test.tsx` > "opción 'Profesor / Entrenador' queda seleccionada válidamente" (`RUBROS` con `{ value: "profesor", label: "Profesor / Entrenador" }`)                                                                       | ✅ COMPLIANT                                             |
| REQ: Disciplina opcional para el rubro profesor | Alta con disciplina                       | RTL > con profesor RPC invocado con `p_disciplina: "Patín"` (trim de `"  Patín  "`); persistencia en DB con `nullif(btrim())` → `0010:46-53` (ESTÁTICO) + **MANUAL (TC-ADMIN-05 paso 2: `disciplina = 'QA-Patín'`)**                         | ⚠️ PARTIAL (client COMPLIANT + persistencia MANUAL)      |
| REQ: Disciplina opcional para el rubro profesor | Edge — disciplina vacía o solo whitespace | RTL > `"   "` → `p_disciplina: null` (alta aceptada); normalización server `nullif(btrim(p_disciplina),'')` en `0010:51` (ESTÁTICO) + **MANUAL (TC-ADMIN-05 paso 4)**                                                                        | ⚠️ PARTIAL (client COMPLIANT + persistencia MANUAL)      |
| REQ: Disciplina opcional para el rubro profesor | Edge — disciplina sin rubro profesor      | RTL > "disciplina sin rubro profesor no se envía aunque el input se hubiera tocado" — spread condicional `...(rubro === "profesor" && …)` (`crear-negocio-form.tsx:63-68`)                                                                   | ✅ COMPLIANT                                             |
| REQ: Atomicidad del alta por RPC                | Alta exitosa                              | **MANUAL/ROLLOUT + ESTÁTICO**: `0010:28-60` función plpgsql monolítica (insert negocio + owner en un solo cuerpo = transacción única; return `v_negocio`), espeja `0001:42-68`; firma única de 4 params con `p_disciplina text default null` | ⚠️ PARTIAL (estático COMPLIANT + runtime MANUAL/ROLLOUT) |
| REQ: Atomicidad del alta por RPC                | Edge — fallo en creación del owner        | **MANUAL/ROLLOUT + ESTÁTICO**: plpgsql — excepción en insert de owner aborta la transacción completa (no queda negocio persistido); TC-ADMIN-05 punto (5) documenta el caso de error del RPC                                                 | ⚠️ PARTIAL (estático COMPLIANT + runtime MANUAL/ROLLOUT) |
| REQ: Validez de negocios sin disciplina         | Negocio preexistente sin disciplina       | **MANUAL/ROLLOUT + ESTÁTICO**: `0010:23` `add column disciplina text` nullable, sin migración de datos → negocios existentes intactos; `database.types.ts:711,721,731` `disciplina: string \| null`                                          | ⚠️ PARTIAL (estático COMPLIANT + runtime MANUAL/ROLLOUT) |

#### Spec 2: `navegacion-por-rubro` (3 req / 7 esc)

| Requirement                                             | Scenario                                       | Test / Evidencia                                                                                                                                                                                                                                                                                                                  | Result       |
| ------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| REQ: Pestañas de navegación por rubro                   | Navegación de un negocio profesor              | `NegocioShell.test.tsx` > "profesor: tabs Dashboard/Agenda/Alumnos/Entrenamientos/Cobros/Caja e icono 🏃" (sin tab "Rutinas"); `NegocioHeader.test.tsx` > "profesor: icono del rubro 🏃" (`iconoRubro` → `if (rubro === "profesor") return "🏃"`)                                                                                 | ✅ COMPLIANT |
| REQ: Pestañas de navegación por rubro                   | Regresión — navegación de gimnasio sin cambios | Tests de gimnasio precedentes sin cambios de expectativa ("gimnasio: muestra Alumnos, Rutinas y Cobros, y no muestra Clientes") + regresión nueva ("Rutinas" presente, "Entrenamientos" ausente, icono 🏋️): la rama `gimnasio` consume `TABS_GYM` sin overrides (`NegocioHeader.tsx:132-135`) → labels idénticos al estado previo | ✅ COMPLIANT |
| REQ: Pestañas de navegación por rubro                   | Edge — acceso directo a vistas de profesor     | `NegocioShell.test.tsx` > "profesor: la navegación renderiza las secciones del core gym sin error" — vistas `alumnos`/`rutinas` (secciones rutina+biblioteca)/`cobros` responden sin error                                                                                                                                        | ✅ COMPLIANT |
| REQ: Terminología neutral solo para profesor            | Etiquetas por rubro                            | `NegocioHeader.test.tsx` > "Alumnos"/"Entrenamientos" con `?vista=` gym y "Rutinas" ausente para profesor; regresión gym confirma que gimnasio conserva "Rutinas" (overrides solo en `OVERRIDES_PROFESOR`)                                                                                                                        | ✅ COMPLIANT |
| REQ: Disciplina visible en el encabezado solo si existe | Header con disciplina                          | `NegocioHeader.test.tsx` > "profesor: 'Nombre — Disciplina'" — `screen.getByText("Ana — Patín")` (`NegocioHeader.tsx:158-160`)                                                                                                                                                                                                    | ✅ COMPLIANT |
| REQ: Disciplina visible en el encabezado solo si existe | Edge — negocio profesor sin disciplina         | `NegocioHeader.test.tsx` > "solo el nombre, sin separador" (disciplina `null` y `""` whitespace — `?.trim()` evita separador vacío)                                                                                                                                                                                               | ✅ COMPLIANT |
| REQ: Disciplina visible en el encabezado solo si existe | Edge — rubro no profesor                       | `NegocioHeader.test.tsx` > "rubro no profesor: la disciplina nunca se muestra aunque exista" (gimnasio + `disciplina: "CrossFit"` → oculto)                                                                                                                                                                                       | ✅ COMPLIANT |

#### Spec 3: `tema-identidad-rubro` (3 req / 6 esc)

| Requirement                                    | Scenario                                   | Test / Evidencia                                                                                                                                                                                                                    | Result                                                            |
| ---------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| REQ: Acento del rubro profesor                 | Aplicación de acento a un negocio profesor | `theme.test.ts` > "acento del rubro profesor: #F472B6 (rosa)"; `globals.css:54-56` `html[data-rubro="profesor"] { --accent: #f472b6; }`; render visual en negocio real → **MANUAL (TC-ADMIN-05)**                                   | ⚠️ PARTIAL (mapa+CSS COMPLIANT + visual MANUAL)                   |
| REQ: Acento del rubro profesor                 | Edge — acento de otros rubros sin cambios  | `theme.test.ts` > sync de los 5 rubros (`:23-33`): mapa↔CSS por rubro; los otros 4 acentos sin alteraciones (`theme.ts:9-13`)                                                                                                       | ✅ COMPLIANT                                                      |
| REQ: Sincronía mapa de rubros, CSS y favicon   | Cobertura de rubros en sync                | `theme.test.ts` > "define los 5 rubros" + sync mapa↔CSS de los 5; favicon sin poder diverger: `app/[slug]/icon.tsx:22` consume el mismo mapa vía `accentPorRubro` (fuente única, D6). Ver Hallazgo H2                               | ⚠️ PARTIAL (mapa↔CSS COMPLIANT + favicon por estructura ESTÁTICO) |
| REQ: Sincronía mapa de rubros, CSS y favicon   | Edge — detección de desincronía            | `theme.test.ts` (recorre cada rubro, aserción con mensaje guardando `bloque html[data-rubro="${rubro}"]` y `--accent <color>`): una divergencia hace fallar la validación señalando el rubro — por diseño del test. Ver Hallazgo H3 | ✅ COMPLIANT                                                      |
| REQ: Aplicación del tema por atributo de rubro | Negocio profesor con tema activo           | `RubroAccentSetter` intacto (`rubro in RUBRO_ACCENT` → `data-rubro="profesor"` → `--accent: #f472b6` — reuso del mecanismo existente sin ediciones); visual real → **MANUAL (TC-ADMIN-05)**                                         | ⚠️ PARTIAL (estructura COMPLIANT + visual MANUAL)                 |
| REQ: Aplicación del tema por atributo de rubro | Edge — rubro sin acento definido           | `theme.test.ts` > "cae al default ante rubro desconocido" sin error; `RubroAccentSetter` usa `DEFAULT_RUBRO` ante desconocidos                                                                                                      | ✅ COMPLIANT                                                      |

#### Spec 4: `carga-datos-gym` (3 req / 6 esc)

| Requirement                                              | Scenario                              | Test / Evidencia                                                                                                                                                                                                                                                        | Result                                                          |
| -------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| REQ: Carga del núcleo de datos para profesor             | Carga de datos de un negocio profesor | Unit `rubros.test.ts` (profesor `true`, gimnasio `true`, otros `false: 3 casos`) + `page.tsx:69` `const esGymCore = esRubroGymCore(negocio.rubro)` ramificando alumnos/progreso/rutinas/ejercicios (`:86-89`); carga real server-side → **MANUAL (TC-ADMIN-05 paso 3)** | ⚠️ PARTIAL (predicato COMPLIANT + carga runtime MANUAL/ROLLOUT) |
| REQ: Carga del núcleo de datos para profesor             | Operación de un negocio profesor      | Paridad estructural: Server Actions del core sin bifurcar por rubro — suites del mismo código compartido (`features/gym/actions/*.test.ts`, cobros, TC-GYM-02…TC-GYM-10 automatizados); operación real en negocio profesor → **MANUAL (TC-ADMIN-05 paso 3)**            | ⚠️ PARTIAL (código compartido COMPLIANT + entorno real MANUAL)  |
| REQ: Sin esquema adicional para profesor                 | Migración sin nuevas tablas           | ESTÁTICO: `0010` íntegro — solo `alter table negocios add column disciplina text` + drop/create del RPC; cero `create table`, cero `create policy` (y ninguna policy de 0001-0009 ata `gym_*` a `rubro = 'gimnasio'`)                                                   | ✅ COMPLIANT                                                    |
| REQ: Sin esquema adicional para profesor                 | Acceso por membresía                  | ESTÁTICO (→ ROLLOUT): modelo de acceso intocado — `requireMembership` (owner/editor, `dal.ts:59-64`) + RLS por membresía existente gobierna igual para profesor; 0010 no toca policies                                                                                  | ✅ COMPLIANT (ESTÁTICO; confirmación de entorno → ROLLOUT)      |
| REQ: Sin esquema adicional para profesor                 | Edge — usuario no miembro             | ESTÁTICO (→ ROLLOUT): RLS por `negocio_miembros` innatacada; los artefactos del rollout FASE 7 (`scripts/verify-rls.sql`, `harness/invariantes.sql`, TC-GYM-13) aplican al mismo contrato                                                                               | ✅ COMPLIANT (ESTÁTICO; confirmación de entorno → ROLLOUT)      |
| REQ: Paridad de comportamiento entre gimnasio y profesor | Paridad de flujos                     | ESTÁTICO: única ramificación nueva por rubro es `esRubroGymCore` (consumida solo en `app/[slug]/page.tsx`, 3 usos en la misma carga); `avisoTurnoPorDefecto` no bifurca; portal/RLS/`gym/*` y rutas compartidas sin ramas por rubro                                     | ✅ COMPLIANT                                                    |

**Compliance summary**: 28/28 escenarios cubiertos — 17 COMPLIANT con evidencia automatizada que pasa, 11 PARTIAL cuya parte no automatizada es 100% `MANUAL`/`ROLLOUT` documentada (TC-ADMIN-05 + revisión estática de `0010`), aceptada por la política del proyecto. `UNTESTED`: **0**.

### Correctness (Static Evidence)

| Requirement / Invariante                                                                                                                                                                                    | Status         | Notes                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------- |
| `TABS_PROFESOR` deriva del array del gym **sin copiar** (`TABS_GYM.map(([v,l]) => [v, OVERRIDES_PROFESOR[v] ?? l])`)                                                                                        | ✅ Implemented | `NegocioHeader.tsx:49-67,135,138`; cambios futuros del gym se propagan                              |
| Rama `gimnasio` consume `TABS_GYM` sin overrides → regresión byte-idéntica                                                                                                                                  | ✅ Implemented | `NegocioHeader.tsx:132-135`; tests gimnasio sin cambios de expectativa                              |
| `esRubroGymCore` única fuente de la unión gym-core (la page no duplica la unión)                                                                                                                            | ✅ Implemented | `rubros.ts:29-31`; 3 usos, todos en `app/[slug]/page.tsx`                                           |
| Normalización `disciplina` única server-side: `nullif(btrim(p_disciplina),'')`; el form solo trimea UI                                                                                                      | ✅ Implemented | `0010:51`; `crear-negocio-form.tsx:58,66`                                                           |
| RPC sin overload: `drop function …(text,text,text)` + firma de 4 params con grants que espejan `0001:70-71` (revoke from public + grant authenticated) y `0009:43` (revoke anon) sobre la firma de 4 params | ✅ Implemented | `0010:26-33,65-67` vs `0001_fase1_seguridad.sql:70-71` y `0009_seguridad_cierre_anon.sql:43`        |
| Acento `#F472B6` sincronizado mapa↔CSS (case-insensitive) + favicon por fuente única                                                                                                                        | ✅ Implemented | `theme.ts:11` ↔ `globals.css:54-56` (test sync GREEN); `icon.tsx:22` vía `accentPorRubro`           |
| `disciplina` en selects explícitos y en el `Pick` de `Negocio` (sin `select("*")`)                                                                                                                          | ✅ Implemented | `dal.ts:19,89`; `negocio.ts:17`                                                                     |
| Snapshot manual `database.types.ts`: `disciplina string \| null` en Row/Insert/Update de `negocios`                                                                                                         | ✅ Implemented | `database.types.ts:707-736`                                                                         |
| Default del form sigue `gimnasio` (smoke E2E intacto)                                                                                                                                                       | ✅ Implemented | `crear-negocio-form.tsx:42`; `e2e/` sin modificaciones (git status)                                 |
| Icono 🏃 vía if-chain patrón existente; `avisoTurnoPorDefecto` y `RubroAccentSetter` intactos                                                                                                               | ✅ Implemented | `NegocioHeader.tsx:40`; `rubros.ts:19-21`; git status (ambos archivos fuera de la lista de cambios) |
| Cero `any` en código nuevo/modificado                                                                                                                                                                       | ✅ Implemented | `npm run lint` exit 0 + inspección (tipos explícitos en todos los archivos del diff)                |
| Migración sin ejecutar contra ninguna DB                                                                                                                                                                    | ✅ Documented  | Decisión del maintainer; nota explícita en el encabezado de `0010:18-19`                            |

### Coherence (Design)

| Decision                                                                                       | Followed? | Notes                                                                |
| ---------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------- |
| D1 Drop+create del RPC con firma nueva + grants espejados                                      | ✅ Yes    | Sin overload; grants en la firma de 4 params (ver tabla Correctness) |
| D2 Normalización solo en RPC (`nullif(btrim())`)                                               | ✅ Yes    | Form solo `trim()` para UI; vacío/whitespace → null en server        |
| D3 Predicado `esRubroGymCore` en domain; flag `esGymCore` en page                              | ✅ Yes    | `page.tsx:69`; testeado en `lib/domain` (cobertura 100%)             |
| D4 Tabs por map de overrides sobre array base                                                  | ✅ Yes    | Reutilización por referencia; rama gym byte-idéntica                 |
| D5 Disciplina inline en línea del nombre, condicional por rubro y no vacía                     | ✅ Yes    | `NegocioHeader.tsx:155-160`; tests R3 de spec navegacion             |
| D6 Acento mapa+CSS juntos; favicon deriva del mapa                                             | ✅ Yes    | Sync GREEN de 5 rubros; `icon.tsx` sin cambios (deriva)              |
| D7 Selects explícitos + `Pick` de `Negocio` con `disciplina`                                   | ✅ Yes    | `dal.ts`/`negocio.ts` con select explícito                           |
| D8 Snapshot manual de tipos DB (regeneración aparte)                                           | ✅ Yes    | Row/Insert/Update correctos; build valida                            |
| D9 Form: opción profesor, input condicional, `p_disciplina` solo en esa rama, default gimnasio | ✅ Yes    | Tests 2.6/2.7 pasan; smoke E2E protegido                             |
| D10 Icono 🏃 vía if-chain                                                                      | ✅ Yes    | Patrón existente; reuso de `NegocioShell` intacto                    |

Desviaciones funcionales design↔código: **ninguna**. Nota menor: el design dice citar offsets de línea (`:106-118`, `:133`, `:52-56`) que se desplazaron al aplicar los cambios (inserciones propias del change) — el contenido contratado está presente en el archivo; drift documental, no un issue de producto.

### Issues Found

**CRITICAL**: Ninguno.

**WARNING**:

- H1 — Migración `0010` **no aplicada** a ninguna DB (decisión del maintainer, visible en el encabezado de la migración y confirmada por el contexto operativo). Los escenarios dependientes de runtime-DB (atomicidad real, persistencia/normalización, validez de negocios preexistentes, grants de la firma de 4 params, RLS intocada) quedaron cubiertos estáticamente y registrados como `MANUAL`/`ROLLOUT` en TC-ADMIN-05. Riesgo de rollout: imprevistos de entorno hasta aplicar 0010 y ejecutar su verificación post-aplicación (grants sobre la firma de 4 params, lección 0004/0009) y el propio TC-ADMIN-05. No bloquea archive.

**SUGGESTION**:

- H2 — El escenario "Cobertura de rubros en sync" exige coincidencia en tres fuentes (mapa, CSS, favicon). El test suma mapa↔CSS; el favicon coincide por construcción (consume el mapa vía `accentPorRubro` en `icon.tsx`) pero sin aserción propia. Evidencia estructural suficiente; extensión opcional del sync test.
- H3 — "Detección de desincronía" validada por diseño del test (falla asertiva señalando el rubro), sin test meta que mude un acento: la mutación probaría el framework de tests, no el producto. Aceptable.
- H4 — Escalado del caso manual: TC-ADMIN-05 usa datos QA (`QA Ana Profe`, `QA-Patín`) en lugar de los literales `Ana`/`Patín` del task 4.1 — misma sustancia (alta con disciplina con espacios de ID de rubro, header `nombre — disciplina` normalizado en la DB) más la corrida sin disciplina y el punto de atomicidad. Más robusto en un entorno real, sustancia íntegra.
- H5 — Checkboxes de Success Criteria en `proposal.md` sin tildar: la tarea 4.2 exige revisar y anotar desvíos (no tildar); no se encontraron desvíos funcionales en esta verificación. Tildar en el paso de archive si el flujo lo prevé.

### Verdict

**PASS WITH WARNINGS**
All automated evidence is green (423/423 tests, build+TS 0, lint 0, coverage 99–100% ≥80 in both contracted globs) and the matrix covers the 13 requirements / 28 scenarios counted from the specs with zero silent UNTESTED rows; the single warning (H1) is the maintainer-decision of not applying `0010` to any DB, handled by static verification of the migration plus the documented manual rollout case (TC-ADMIN-05), per accepted project policy.

**Próximo paso recomendado**: archive del change `rubro-profesor` (admitido por PASS WITH WARNINGS), dejando H1 como condición del rollout: aplicar `0010` con `scripts/backup-bootstrap.md` y ejecutar TC-ADMIN-05 + verificación de grants post-aplicación antes de habilitar el rubro en producción.
