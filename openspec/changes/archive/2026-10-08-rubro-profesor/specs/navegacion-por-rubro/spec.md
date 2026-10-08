# Especificación: navegacion-por-rubro

## Purpose

Gobernar la navegación por rubro: pestañas, icono, etiquetas y encabezado según el rubro del negocio, con terminología neutral para profesor y preservación sin cambios del comportamiento de gimnasio.

## Requirements

### Requirement: Pestañas de navegación por rubro

La navegación principal DEBE derivarse del rubro del negocio. Para el rubro profesor DEBE mostrar las pestañas: Dashboard, Agenda, Alumnos, Entrenamientos, Cobros y Caja, con icono del rubro `🏃`.

#### Scenario: Navegación de un negocio profesor

- GIVEN un negocio con rubro profesor
- WHEN se visualiza la navegación principal
- THEN se muestran Dashboard, Agenda, Alumnos, Entrenamientos, Cobros y Caja
- AND el icono del rubro es 🏃

#### Scenario: Regresión — navegación de gimnasio sin cambios

- GIVEN un negocio con rubro gimnasio
- WHEN se visualiza la navegación principal
- THEN las pestañas y etiquetas son idénticas al comportamiento previo a este cambio
- AND el rubro gimnasio conserva su etiqueta "Rutinas" y sus pestañas actuales

#### Scenario: Edge — acceso directo a vistas de profesor

- GIVEN un negocio profesor
- WHEN se navega a Alumnos, Entrenamientos o Cobros
- THEN cada vista responde con su funcionalidad correspondiente sin error

### Requirement: Terminología neutral solo para profesor

Las etiquetas neutras (Alumnos, Entrenamientos) DEBEN aplicarse exclusivamente al rubro profesor; los demás rubros DEBEN conservar sus etiquetas existentes.

#### Scenario: Etiquetas por rubro

- GIVEN un negocio profesor
- WHEN se visualizan las pestañas
- THEN se leen "Alumnos" y "Entrenamientos" en vez de la terminología de gimnasio

### Requirement: Disciplina visible en el encabezado solo si existe

El encabezado DEBE mostrar la disciplina junto al nombre del negocio únicamente cuando la disciplina exista; si no existe, DEBE mostrarse solo el nombre.

#### Scenario: Header con disciplina

- GIVEN un negocio profesor con disciplina "Patín" y nombre "Ana"
- WHEN se visualiza el encabezado
- THEN se muestra "Ana — Patín"

#### Scenario: Edge — negocio profesor sin disciplina

- GIVEN un negocio profesor sin disciplina
- WHEN se visualiza el encabezado
- THEN se muestra solo el nombre, sin separador ni texto vacío

#### Scenario: Edge — rubro no profesor

- GIVEN un negocio con rubro distinto de profesor que registra disciplina
- WHEN se visualiza el encabezado
- THEN la disciplina NO se muestra
