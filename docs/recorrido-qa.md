# Recorrido de QA — GestiónPro

> Checklist manual para recorrer la app completa contra el **sandbox** (datos de
> QA, nunca producción). Cada rubro tiene su propia identidad visual, sus
> pestañas y sus módulos: el recorrido verifica que la app se comporte según el
> rubro del negocio, no solo que "no se rompa".

## Entorno

|                 |                                                                                |
| --------------- | ------------------------------------------------------------------------------ |
| URL             | `http://localhost:3000` (dev local) o el deploy que quieras probar             |
| Login           | `jormedp@gmail.com` / `Sandbox-GestionPro-2026!`                               |
| Second password | `qa.editor@gestionpro.test` y `qa.owner2@gestionpro.test` / `Sandbox-QA-2026!` |
| Datos           | sandbox con paridad total de esquema + semilla de QA (ver `docs/sandbox.md`)   |

> Para apuntar al sandbox: `Copy-Item .env.sandbox .env.local` (backup de prod en
> `.env.local.bak`). Ojo: el sandbox es plan free y **se pausa por inactividad**;
> si deja de responder, se restaura con `POST /v1/projects/{ref}/restore`.

## Los 6 negocios del sandbox

| Negocio             | Rubro                 | Acento            | Qué tiene                                                                                                                     |
| ------------------- | --------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `gym-el-oso`        | Gimnasio              | naranja `#FF6B35` | 3 clientes, 3 turnos, 4 cobros, 2 gastos, 2 alumnos con portal, 2 rutinas, progresos y completados. Es el más completo.       |
| `pepe-gym`          | Gimnasio              | naranja           | 1 cliente, 1 alumno, 1 rutina de resistencia, 1 progreso. Para ver el rubro sin ruido.                                        |
| `peluqueria-lum`    | Peluquería            | violeta `#A78BFA` | 2 clientes, 2 turnos, 1 cobro, 1 gasto. Rubro "Clientes".                                                                     |
| `qa-ana-profe`      | Profesor / Entrenador | rosa `#F472B6`    | 2 clientes, 1 alumno, 1 rutina de patín, 1 progreso. Header con disciplina.                                                   |
| `taller-eme`        | Servicio técnico      | azul `#60A5FA`    | 1 cliente, **3 reparaciones** en estados distintos (`recibido`, `listo_para_retirar`, `entregado`) con historial y repuestos. |
| `veterinaria-patas` | Veterinaria           | verde `#34D399`   | 2 clientes, 1 turno, 1 cobro, 1 gasto. Rubro "Clientes".                                                                      |

## 1. Por rubro (lo primero que hay que ver)

- [ ] **Gimnasio** (`gym-el-oso`): acento **naranja**, ícono 🏋️, pestañas
      **Dashboard · Agenda · Alumnos · Rutinas · Cobros · Caja** — _sin_ "Clientes".
- [ ] **Profesor** (`qa-ana-profe`): acento **rosa**, ícono 🏃, header
      `QA Ana Profe — Patín`, pestañas **Dashboard · Agenda · Alumnos ·
      Entrenamientos · Cobros · Caja** — la de Rutinas dice **"Entrenamientos"**.
- [ ] **Peluquería** (`peluqueria-lum`): acento **violeta**, ícono ✂️, pestañas
      **Dashboard · Agenda · Clientes · Caja** — sin Alumnos ni Cobros.
- [ ] **Veterinaria** (`veterinaria-patas`): acento **verde**, ícono 🐾, mismas
      pestañas que peluquería.
- [ ] **Servicio técnico** (`taller-eme`): acento **azul**, ícono 🔧, pestañas
      **Dashboard · Agenda · Reparaciones · Caja** — sin Clientes.
- [ ] **Identidad por rubro**: el favicon del navegador y el acento de la
      interfaz cambian con el negocio. El logo del header conserva el del rubro.

## 2. Dashboard (todos los rubros)

- [ ] "Resumen — <fecha de hoy>".
- [ ] 4 tarjetas: **Activos**, **Turnos hoy**, **Ingreso mes**, **Neto mes**. En
      `gym-el-oso` el ingreso y el neto **no** son 0 (4 cobros cargados).
- [ ] "PRÓXIMOS 7 DÍAS" con los turnos de la semana.
- [ ] En `gym-el-oso` debería verse la **alerta de cobro** (el cliente con
      `vence` vencido): es el fix #82 (el vencimiento se deriva al leer).

## 3. Agenda y turnos

- [ ] La agenda muestra la semana con LUN/MAR/... y los turnos por día.
- [ ] "+ Nuevo turno" abre el modal con cliente, teléfono, servicio, fecha y
      hora (combobox). Guardar muestra el toast "Turno creado ✓".
- [ ] Si creás un turno en una hora que ya hay otro, aparece el aviso "⚠️ Ya
      tenés un turno a esa hora" (issue #190).
- [ ] El aviso por WhatsApp es un **checkbox** que arranca **encendido** en todos
      los rubros salvo servicio técnico (arranca apagado a propósito).

## 4. Clientes (gimnasio no tiene; peluquería, veterinaria y servicio técnico sí)

- [ ] Lista con nombre, teléfono, plan, cuota y **estado** (Activo / Vence
      pronto / Vencido / Moroso).
- [ ] "Pagar" cambia el estado y extiende el `vence` (fix #82).
- [ ] El plan de un cliente con cuota 0 no rompe nada (Nico Russo en
      `peluqueria-lum`).

## 5. Core de gym (`gym-el-oso` y `pepe-gym`)

- [ ] **Alumnos**: ficha con IMC, código de acceso y **link al portal**.
- [ ] El **portal del alumno** (público, por token) abre con la ficha y deja
      marcar sesion, marcar ejercicio y avanzar sesión. Es el único flujo
      público con escritura: probalo con un alumno del sandbox.
- [ ] **Alumnos** → abrir un alumno: ficha con mediciones (peso, cintura,
      cadera, % grasa) y el botón de registrar medición.
- [ ] **Entrenamientos/Rutinas**: biblioteca de ejercicios + rutina con sesiones
      y actividades (orden, series, repeticiones, descanso).
- [ ] Asignar una rutina a un alumno y ver el avance de la sesión actual.

## 6. Cobros y Caja

- [ ] **Cobros**: historial con monto, concepto, medio de pago y fecha; el total
      del mes se ve arriba. Registrar un cobro con un cliente existente.
- [ ] **Caja**: ingresos, gastos y neto del mes, con el listado de gastos y el
      alta de un gasto (descripción, monto, fecha). El **Neto** se calcula con
      los cobros reales, no con cuotas proyectadas (fix #177).

## 7. Reparaciones (`taller-eme`)

- [ ] **Reparaciones**: 3 equipos en estados distintos, con su número de orden
      (0001, 0002, 0003).
- [ ] Abrir un equipo: historial de estados, presupuesto, repuestos y el
      **link de seguimiento** (público por token).
- [ ] Cambiar el estado desde el detalle (transiciones válidas del mapa del
      dominio) y ver el toast + el enlace de WhatsApp.
- [ ] En **listo_para_retirar** y **entregado** hay que **aceptar el
      presupuesto** antes de poder cobrar.
- [ ] El link de seguimiento público (público, con token) muestra el estado,
      el historial y **no** filtra datos internos.

## 8. Usuarios (solo owner)

- [ ] `/gym-el-oso/usuarios`: tabla con los 3 miembros y el badge "Vos" en tu
      fila. En **tu propia fila** no hay botones de Guardar ni Quitar.
- [ ] Dar de alta un usuario: pide email y rol, y devuelve una **contraseña
      temporal que se muestra una sola vez** (con botón de copiar). Al recargar
      la página, ya no está.
- [ ] Cambiar el rol de un editor a owner y al revés.
- [ ] Quitar a un miembro (pide confirmación).
- [ ] **No** te podés quitar ni demotar a vos mismo: es el último owner.
- [ ] Entrá como `qa.editor@gestionpro.test`: **no** ve el link "Usuarios" en el
      header y si escribís la URL a mano te redirige al panel.

## 9. General (todos los rubros)

- [ ] Logueado, en `/`: los 6 negocios con su ícono de rubro y su nombre; el
      formulario de alta (nombre, slug, rubro) y el **input de Disciplina que
      solo aparece con el rubro "Profesor / Entrenador"**.
- [ ] Crear un negocio con rubro Profesor y disciplina con espacios: la DB
      guarda la disciplina **normalizada** (sin espacios sobrantes).
- [ ] Crear un negocio con un slug repetido: error controlado y **no** queda
      el negocio a medias.
- [ ] "Salir" desloguea.
- [ ] Con el celular (390 px): sin scroll horizontal en ninguna pantalla.
- [ ] Con la preferencia del sistema en **dark mode**: todo se ve en oscuro y
      los acentos siguen distinguiéndose.
- [ ] En el login, con la contraseña incorrecta, el error se muestra en la
      pantalla (sin pantalla rota).

## Si algo falla

Anotá la pantalla, el paso y el mensaje. Los datos del sandbox son
descartables: se reconstruye con `scripts/bootstrap-sandbox.ps1` y la
documentación de `docs/sandbox.md`.
