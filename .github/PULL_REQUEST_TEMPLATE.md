## Descripción

<!-- Resumen breve de qué hace este PR (1-3 bullets). -->

## Issue relacionado

Closes #N

<!--
Reemplazar N por el número de issue aprobado (etiqueta status:approved).
Usar una de: Closes #N / Fixes #N / Resolves #N
-->

## Tipo de cambio

<!-- Marcar exactamente UNA opción -->

- [ ] feat: nueva funcionalidad
- [ ] fix: corrección de bug
- [ ] refactor: refactor de código existente (sin cambio de comportamiento)
- [ ] test: agregar o modificar tests
- [ ] chore: mantenimiento / tooling
- [ ] docs: solo documentación

## Cambios

| Archivo        | Acción                          | Descripción          |
| -------------- | ------------------------------- | -------------------- |
| `path/to/file` | Modificado / Creado / Eliminado | Qué cambió y por qué |

## Plan de test

- [ ] Comando: `npm test` — resultado esperado: suite verde (121 tests)
- [ ] Comando: `npm run test:coverage` — resultado esperado: cobertura ≥ 80 en lines/functions/branches/statements
- [ ] Comando: `npm run lint` — resultado esperado: sin errores
- [ ] Comando: `npm run typecheck` — resultado esperado: sin errores de tipos
- [ ] Comando: `npm run format:check` — resultado esperado: todos los archivos formateados
- [ ] CI: workflow `ci.yml` verde (lint, typecheck, test, build)

## Checklist del contributor

- [ ] El PR referencia un issue aprobado (`Closes #N`)
- [ ] `npm test` pasa en verde
- [ ] `npm run test:coverage` pasa en verde (umbrales ≥ 80)
- [ ] CI verde en todos los jobs
- [ ] Cero usos de `any` en el código agregado
- [ ] Commit messages en formato Conventional Commits
- [ ] Sin atribución de IA (sin `Co-Authored-By`) en los commits
