# Especificación: alta-negocio

## Purpose

Gobernar el alta de negocios por rubro vía RPC atómico: selección de rubro en el formulario, campo `disciplina` opcional exclusivo del rubro profesor, y validez de negocios existentes.

## Requirements

### Requirement: Selección de rubro Profesor en el alta

El formulario de alta de negocio DEBE permitir seleccionar el rubro `Profesor / Entrenador`, y el rubro por defecto del formulario DEBE seguir siendo gimnasio.

#### Scenario: Alta de negocio con rubro gimnasio

- GIVEN el formulario de alta
- WHEN se crea un negocio con rubro gimnasio
- THEN el negocio persiste con el rubro gimnasio y sin disciplina
- AND no se solicita el campo disciplina

#### Scenario: Default del formulario

- GIVEN el formulario de alta recién cargado
- WHEN se observa el rubro seleccionado
- THEN es gimnasio

#### Scenario: Selección del rubro profesor

- GIVEN el formulario de alta
- WHEN se selecciona el rubro profesor
- THEN la opción "Profesor / Entrenador" queda seleccionada válidamente

### Requirement: Disciplina opcional para el rubro profesor

El campo `disciplina` DEBE ser texto libre OPCIONAL y DEBE ser solicitado únicamente cuando el rubro seleccionado es profesor.

#### Scenario: Alta con disciplina

- GIVEN el rubro profesor seleccionado
- WHEN se completa disciplina "Patín" y se crea el negocio
- THEN el negocio persiste rubro profesor Y disciplina "Patín"

#### Scenario: Edge — disciplina vacía o solo whitespace

- GIVEN el rubro profesor seleccionado
- WHEN disciplina se envía vacía o solo con espacios y se crea el negocio
- THEN el alta es aceptada y el negocio persiste disciplina nula (o vacía normalizada)

#### Scenario: Edge — disciplina sin rubro profesor

- GIVEN el rubro gimnasio seleccionado
- WHEN se intenta completar disciplina
- THEN el campo disciplina no es disponible ni se envía en el alta

### Requirement: Atomicidad del alta por RPC

El alta de negocio debe crearse de forma atómica creando negocio y su owner en una única operación transaccional; un fallo en la creación del owner NO DEBE dejar el negocio persistido.

#### Scenario: Alta exitosa

- GIVEN los datos de negocio y owner válidos
- WHEN se ejecuta el alta
- THEN se crean negocio y owner en una única operación y el estado queda consistente

#### Scenario: Edge — fallo en creación del owner

- GIVEN el alta en curso con owner inválido
- WHEN la creación del owner falla
- THEN no queda negocio persistido

### Requirement: Validez de negocios sin disciplina

Los negocios existentes sin disciplina DEBEN permanecer válidos tras la incorporación del campo.

#### Scenario: Negocio preexistente sin disciplina

- GIVEN un negocio creado con anterioridad que no registra disciplina
- WHEN se carga el negocio
- THEN es válido y su disciplina es null
