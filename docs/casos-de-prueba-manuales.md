# Casos de prueba manuales — GestiónPro

> Set de pruebas funcionales para ejecutar contra un entorno desplegado (producción o preview).
> Base: revisión del código en `main` (96a05ce) + verificación en producción del 2026-09-14.
> Los casos marcados 🤖 ya tienen cobertura automatizada (Vitest / Playwright) — se listan igual para verificación end-to-end en el entorno real.

---

## Cómo usar este set

1. Seguir los casos **en orden por sección**; cada sección asume la anterior.
2. Prioridad: **P1** crítico (bloquea la operación) · **P2** importante · **P3** deseable.
3. Resultado por caso: `OK` · `FALLA` · `PARCIAL` · `BLOQUEADO` (no se pudo probar).
4. Al reportar una falla incluir: **ID del caso**, qué se esperaba, qué pasó, screenshot, y hora aproximada.
5. Los casos con datos **mutan la base** — usar siempre el negocio de pruebas (ver abajo).

## Datos de prueba

- Crear **un negocio QA por rubro** desde el panel (ej. `QA Taller` rubro servicio técnico, `QA Gym` rubro gimnasio). Así no se ensucian los negocios reales.
- Prefijar con `QA-` todo dato creado (clientes, turnos, gastos, equipos).
- Limpieza: clientes y gastos se eliminan; los turnos se completan; **los equipos no tienen borrado** (por eso conviene el negocio QA).
- Flujo de reparaciones completo: usar el negocio QA de rubro **servicio técnico**.

---

## 1. Autenticación (AUTH)

**TC-AUTH-01 · Login con credenciales válidas · P1** 🤖(parcial)
Pasos: abrir `/login` → completar Email y Contraseña válidos → `Ingresar`.
Esperado: redirige a `/` y se ve "Panel de administración". Sin errores en consola.

**TC-AUTH-02 · Login con credenciales inválidas · P1**
Pasos: abrir `/login` → email inexistente + contraseña cualquiera → `Ingresar`.
Esperado: se muestra "Credenciales incorrectas. Verificá email y contraseña." y **no** navega. Sin crash ni error 500.

**TC-AUTH-03 · Campos vacíos · P2**
Pasos: abrir `/login` → `Ingresar` sin completar campos.
Esperado: el navegador bloquea el envío (campos `required`); no se llama al servidor.

**TC-AUTH-04 · Ruta protegida sin sesión · P1**
Pasos: en ventana incógnito, abrir `/{slug}` de un negocio propio.
Esperado: redirige a `/login?next=...`; al loguearse vuelve al destino original.

**TC-AUTH-05 · Logout · P2**
Pasos: logueado, click en `Salir`.
Esperado: vuelve a `/login`. El botón "atrás" del navegador no restaura la sesión (abrir `/` redirige a login).

**TC-AUTH-06 · Persistencia de sesión · P3**
Pasos: logueado, recargar `/`; cerrar y reabrir el navegador.
Esperado: la sesión se mantiene (cookie).

---

## 2. Panel de administración (ADMIN)

**TC-ADMIN-01 · Lista de negocios · P1**
Pasos: logueado, abrir `/`.
Esperado: se listan los negocios del usuario con icono de rubro, nombre y `/{slug}`; si no hay, "No hay negocios todavía. Crea el primer negocio."

**TC-ADMIN-02 · Crear negocio · P1**
Pasos: completar "Nombre del negocio" + "slug (ej: gym-el-oso)" → `Crear`.
Esperado: el negocio aparece en la lista; `Abrir app` abre `/{slug}` correctamente.

**TC-ADMIN-03 · Validaciones al crear negocio · P2**
Pasos: (a) crear sin nombre/slug; (b) crear con un slug ya existente.
Esperado: (a) no crea; (b) error controlado (sin crash ni pantalla rota).

**TC-ADMIN-04 · Lista scopeada a membresía · P2** _(requiere un segundo usuario)_
Pasos: loguearse con un usuario sin membresía en un negocio X.
Esperado: X no aparece en la lista.

---

## 3. Navegación del negocio (SHELL)

**TC-SHELL-01 · Tabs según rubro · P1**
Pasos: abrir un negocio `servicio_técnico` y uno de otro rubro (gimnasio/peluquería/veterinaria).
Esperado: servicio técnico → Dashboard, Reparaciones, Caja. Otros → Dashboard, Agenda, Clientes, Caja, Reparaciones.

**TC-SHELL-02 · Slug inexistente · P1**
Pasos: abrir `/no-existe-123`.
Esperado: página 404 (not-found), sin filtrar información.

**TC-SHELL-03 · Slug ajeno sin membresía · P1**
Pasos: logueado como usuario A, abrir `/{slug}` de un negocio donde A no es miembro.
Esperado: 404 (sin datos del negocio).

**TC-SHELL-04 · Identidad visual · P3**
Pasos: abrir el negocio.
Esperado: nombre y emoji del rubro correctos en el header; favicon acorde.

---

## 4. Dashboard (DASH)

**TC-DASH-01 · KPIs del mes · P1**
Pasos: comparar los 4 KPIs contra los datos reales del negocio.
Esperado: **Activos** = clientes con estado `activo`; **Turnos hoy** = turnos con fecha de hoy; **Ingreso mes** = suma de cuotas de clientes con estado ≠ `vencido`; **Neto mes** = Ingreso − Gastos del mes (gastos por fecha del mes actual).
Nota: si hay clientes en estado `moroso`, hoy **suman** al ingreso mes (revisar si es lo deseado).

**TC-DASH-02 · Turnos de hoy · P1**
Pasos: con 0 turnos para hoy y luego con ≥1.
Esperado: "Sin turnos para hoy" cuando no hay; lista con hora, cliente y servicio cuando hay.

**TC-DASH-03 · Alertas de cobro · P1**
Pasos: con un cliente en estado ≠ `activo`, revisar la tarjeta "⚡ Alertas de cobro" y el botón `📲 WA`.
Esperado: aparece el cliente con plan y cuota; el botón abre WhatsApp con el mensaje de cobro (nombre del negocio + cliente).

**TC-DASH-04 · Atajo nuevo turno · P2**
Pasos: click en `+ Nuevo turno hoy`.
Esperado: se abre el modal de turno con la fecha de hoy precargada.

---

## 5. Agenda / Turnos (TURN)

**TC-TURN-01 · Crear turno · P1**
Pasos: tab `📅 Agenda` → `+ Nuevo turno` → completar nombre, teléfono, servicio, fecha, hora → `Guardar`.
Esperado: toast "Turno creado ✓" y el turno aparece en la agenda del día.

**TC-TURN-02 · WhatsApp de confirmación · P1**
Pasos: crear un turno **con** teléfono.
Esperado: se abre WhatsApp (`wa.me`) con el mensaje de confirmación (negocio, cliente, fecha, hora). El popup no debe romper la app.

**TC-TURN-03 · Turno sin teléfono · P2**
Pasos: crear un turno **sin** teléfono.
Esperado: se crea igual; no se abre WhatsApp.

**TC-TURN-04 · Validaciones · P2**
Pasos: intentar guardar sin nombre y sin servicio.
Esperado: error visible ("Completá el nombre" / "Completá el servicio" / "Completá todos los campos"); no se crea nada.

**TC-TURN-05 · Completar turno · P2**
Pasos: en un turno del día, click en `✓ Listo`.
Esperado: toast "Completado ✓"; el turno queda completado (verificar cómo se refleja en agenda y dashboard).

**TC-TURN-06 · Persistencia · P2**
Pasos: recargar la página tras crear un turno.
Esperado: el turno sigue ahí, con los mismos datos.

---

## 6. Clientes (CLI)

**TC-CLI-01 · Alta de cliente · P1**
Pasos: tab `👥 Clientes` → `+ Agregar` → nombre, teléfono, plan, cuota, vence → guardar.
Esperado: toast de alta y el cliente aparece con badge **Activo**; la cuota se muestra en formato ARS.

**TC-CLI-02 · Validaciones · P2**
Pasos: intentar cuota vacía / 0 / negativa; nombre o plan vacíos.
Esperado: error visible; no se crea el cliente.

**TC-CLI-03 · Registrar pago · P2**
Pasos: en un cliente con estado ≠ `activo`, click en `✓ Pagó`.
Esperado: toast "Pagado ✓"; el cliente pasa a **Activo** y desaparece de "Alertas de cobro" del dashboard.

**TC-CLI-04 · Eliminar cliente · P2**
Pasos: click en `✕` de un cliente QA.
Esperado: toast "Eliminado"; desaparece de la lista y persiste la baja al recargar.

**TC-CLI-05 · Exploratorio: estados por vencimiento · P2**
Pasos: crear un cliente QA con `vence` en el pasado y observar el badge (Activo / Vence pronto / Vencido) y las alertas.
Esperado: documentar el comportamiento real. **Pregunta abierta**: nada en el código actual setea `vence_pronto`/`vencido` — si el cliente sigue "Activo", registrar como hallazgo (las alertas de cobro dependerían de un cambio manual o de un trigger externo).

---

## 7. Caja / Gastos (CAJA)

**TC-CAJA-01 · Alta de gasto · P1**
Pasos: tab `💸 Caja` → descripción + monto (+ fecha) → `+ Agregar`.
Esperado: toast "Gasto registrado ✓"; aparece en la lista con `- $monto`; los KPIs de Caja y el Neto del dashboard bajan.

**TC-CAJA-02 · Validaciones · P2**
Pasos: monto vacío / 0 / negativo; descripción vacía.
Esperado: error visible; no se guarda.

**TC-CAJA-03 · Eliminar gasto · P2**
Pasos: click en `✕` de un gasto QA.
Esperado: toast "Eliminado"; desaparece y los KPIs se actualizan.

**TC-CAJA-04 · Coherencia de totales · P2**
Pasos: comparar Ingresos / Gastos / Neto de Caja contra Dashboard.
Esperado: mismos números (mismo cálculo del mes).

---

## 8. Reparaciones (REP)

> Negocio QA de rubro **servicio técnico**. Estados: Recibido → En diagnóstico → Presupuesto enviado → Esperando aprobación → Aprobado → En reparación → Listo para retirar → Entregado (y desvío terminal Sin reparación).

**TC-REP-01 · Alta con cliente nuevo · P1**
Pasos: `🔧 Reparaciones` → nueva → categoría (PC, Notebook, Celular, …), problema reportado, nombre de cliente nuevo, marca/modelo/serie/accesorios/técnico/fecha estimada.
Esperado: se crea con estado **Recibido**, número de orden visible y link de seguimiento disponible.

**TC-REP-02 · Número de orden · P1**
Pasos: crear dos reparaciones seguidas en el mismo negocio.
Esperado: formato `0001`, `0002`, … incremental **por negocio** (no global); sin prefijos tipo `REP-2026-`.

**TC-REP-03 · Alta con cliente existente · P2**
Pasos: crear una reparación seleccionando un cliente ya cargado.
Esperado: no duplica el cliente; la reparación queda asociada al existente.

**TC-REP-04 · Flujo completo de estados · P1**
Pasos: recorrer el camino feliz completo (8 pasos), cargando presupuesto en "Presupuesto enviado" y precio final al entregar.
Esperado: cada cambio actualiza el estado, agrega una entrada al historial (con fecha y comentario) y la vista de seguimiento refleja el avance.

**TC-REP-05 · Transiciones ofrecidas · P1**
Pasos: en cada estado, revisar qué destinos ofrece la UI de cambio de estado.
Esperado: solo los permitidos — p. ej. desde Recibido: En diagnóstico y Sin reparación; desde Listo para retirar: solo Entregado; desde Entregado/Sin reparación: ninguno.

**TC-REP-06 · WhatsApp en hitos · P1**
Pasos: con cliente con teléfono: (a) cargar presupuesto; (b) pasar a Listo para retirar; (c) pasar a Sin reparación.
Esperado: (a) WA con monto del presupuesto; (b) WA "listo" con precio; (c) WA de sin reparación. Sin teléfono: no abre WA.

**TC-REP-07 · Sin reparación es terminal · P2**
Pasos: pasar un equipo a Sin reparación y volver a intentar cambiar estado.
Esperado: no se ofrecen más transiciones.

**TC-REP-08 · Presupuesto restringido · P2**
Pasos: intentar cargar presupuesto desde un estado que no lo permite (p. ej. Recibido, si la UI lo ofreciera).
Esperado: rechazado con mensaje ("El presupuesto no se puede cargar desde este estado."). Desde En diagnóstico sí lo permite.

**TC-REP-09 · Repuestos · P2**
Pasos: en el detalle, agregar un repuesto (descripción, costo, precio cobrado, cantidad) y luego eliminarlo.
Esperado: se agrega a la lista con sus totales; al eliminar desaparece; el total del equipo se actualiza.

**TC-REP-10 · Entrega · P1**
Pasos: con el equipo en Listo para retirar, marcar entregado indicando precio final.
Esperado: exige el precio; pasa a **Entregado**, registra fecha de entrega y agrega historial "Equipo entregado. Cobrado: $X".

**TC-REP-11 · Listado de reparaciones · P2**
Pasos: revisar la lista con equipos en varios estados.
Esperado: contadores por estado (Recibido, En reparación, Listo para retirar, Entregado) y datos del cliente correctos.

**TC-REP-12 · Validaciones de alta · P2**
Pasos: intentar crear sin problema reportado o sin categoría.
Esperado: error visible; no se crea.

---

## 9. Seguimiento público (SEG)

> Ruta `/{slug}/seguimiento/{orden}?token=UUID`. El **token es la capacidad de acceso**; el número de orden en la URL es solo informativo.

**TC-SEG-01 · Token válido · P1**
Pasos: abrir el link de seguimiento de una reparación QA (copiado del alta o del detalle).
Esperado: muestra estado actual, datos del equipo (categoría, marca, modelo), fechas, presupuesto/precio y el **historial** completo. La barra de progreso del flujo avanza acorde.

**TC-SEG-02 · Token inválido o ausente · P1**
Pasos: abrir la ruta con `?token=token-invalido` y también sin token.
Esperado: EmptyState "Enlace no válido"; sin datos de ninguna reparación.

**TC-SEG-03 · Privacidad de la vista pública · P1**
Pasos: revisar qué muestra la vista con token válido.
Esperado: **NO** expone teléfono del cliente, observaciones internas ni técnico asignado. Solo: estado, número de orden, categoría, marca, modelo, problema reportado, fechas, presupuesto, precio final, nombre del cliente y del negocio, e historial (estado, fecha, comentario).

**TC-SEG-04 · El token manda · P2**
Pasos: con un token válido, cambiar el `{orden}` de la URL por otro número.
Esperado: sigue mostrando la reparación del token (el orden no da acceso).

**TC-SEG-05 · Sin sesión y en mobile · P2** 🤖(parcial)
Pasos: abrir el link en incógnito y en un viewport de 390 px.
Esperado: funciona sin login; sin overflow horizontal ni errores de consola.

**TC-SEG-06 · Historial público · P3**
Pasos: comparar el historial público contra el interno.
Esperado: el público muestra solo los campos de la allowlist; los comentarios internos cargados en el flujo aparecen como texto del historial (verificar que no haya filtraciones de datos sensibles).

---

## 10. Multi-tenant y seguridad (SEC)

**TC-SEC-01 · Aislamiento entre negocios · P1**
Pasos: crear dos negocios QA; cargar clientes/turnos/gastos/reparaciones en QA-1 y abrir QA-2.
Esperado: QA-2 no muestra ningún dato de QA-1 (listas vacías).

**TC-SEC-02 · Sin sesión no hay datos · P1**
Pasos: incógnito → abrir `/{slug}` y `/{slug}/reparaciones`.
Esperado: redirige a login; nunca renderiza datos.

**TC-SEC-03 · ID cruzado · P2**
Pasos: logueado en QA-1, abrir `/{slug-qa-1}/reparaciones/{id-de-equipo-de-otro-negocio}`.
Esperado: 404 (no filtra el equipo ajeno).

**TC-SEC-04 · Usuario sin membresía · P2** _(requiere un segundo usuario)_
Pasos: con usuario B (sin membresía en el negocio de A), abrir `/{slug-de-A}`.
Esperado: 404.

---

## 11. UX / Responsive (UX)

**TC-UX-01 · Mobile sin overflow · P1** 🤖(parcial)
Pasos: viewport 390×844; recorrer Dashboard, Agenda, Clientes, Caja, Reparaciones (lista y detalle), Seguimiento.
Esperado: ninguna vista con scroll horizontal; contenido legible.

**TC-UX-02 · Toasts · P2**
Pasos: provocar confirmaciones y errores (alta ok, validación fallida).
Esperado: toasts visibles, legibles y no bloqueantes.

**TC-UX-03 · Estados de pantalla · P3**
Pasos: revisar carga (loading), lista vacía (EmptyState), 404 y error.
Esperado: diseño consistente y mensajes claros en todos.

**TC-UX-04 · Accesibilidad básica · P3**
Pasos: navegar con teclado (Tab/Enter) y revisar labels de formularios.
Esperado: foco visible, labels asociados, botones alcanzables por teclado.

---

## 12. Regresión post-rollout (REG)

**TC-REG-01 · Login real en producción · P1** ✅ (validado 2026-09-14)
Pasos: login con el usuario admin real.
Esperado: entra al panel. Ya verificado.

**TC-REG-02 · Numeración normalizada · P1**
Pasos: revisar reparaciones existentes y crear una nueva en un negocio con historial.
Esperado: las existentes muestran `0001`..`0008` (sin prefijo `REP-2026-`) y el contador continúa desde el último sin colisionar.

**TC-REG-03 · Calidad automatizada · P2** 🤖
Pasos: `npm run typecheck && npm run lint && npm test`.
Esperado: todo verde (CI ya lo valida en cada PR).

**TC-REG-04 · RLS en producción · P2**
Pasos: con sesión, verificar que se ven solo los datos de los negocios propios; sin sesión, nada.
Esperado: consistente con `scripts/verify-rls.sql` (ya ejecutado OK en el rollout).

---

## Automatización (estado actual)

| Cobertura          | Qué corre                                                 | Cómo                                                                                     |
| ------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Dominio            | 4 suites de `lib/domain` (estados, mensajes, wa, formato) | `npm test` (Vitest)                                                                      |
| E2E no destructivo | Seguimiento público con token inválido (desktop + mobile) | `npx playwright test`                                                                    |
| E2E destructivo    | Login → crear negocio → turno → seguimiento               | Requiere `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` de un entorno de TEST (nunca producción) |
| Prod check         | Login renderiza, `/` redirige, credenciales inválidas     | Verificado 2026-09-14 (script temporal, no commiteado)                                   |

**Próximos candidatos a automatizar** (seguros, sin mutación): TC-AUTH-01/02/04, TC-SHELL-02/03, TC-SEG-02/03/05, TC-UX-01 sobre las vistas públicas.
