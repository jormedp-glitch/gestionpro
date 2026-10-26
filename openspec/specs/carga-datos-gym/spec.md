# Especificación: carga-datos-gym

## Purpose

Gobernar la carga del núcleo de datos de gimnasio para negocios con rubro profesor, reutilizando el mismo modelo sin tablas ni políticas de acceso adicionales.

## Requirements

### Requirement: Carga del núcleo de datos para profesor

Los negocios con rubro profesor DEBEN cargar el mismo núcleo de datos que los negocios gimnasio: alumnos, entrenamientos/rutinas, mediciones y progreso, cobros, agenda y portal.

#### Scenario: Carga de datos de un negocio profesor

- GIVEN un negocio con rubro profesor y datos del núcleo registrados
- WHEN un usuario autorizado accede al negocio
- THEN se cargan alumnos, entrenamientos/rutinas, mediciones, cobros y agenda del núcleo común

#### Scenario: Operación de un negocio profesor

- GIVEN un negocio profesor con datos cargados
- WHEN se registran o modifican alumnos, entrenamientos, mediciones o cobros
- THEN las operaciones se aplican sobre el núcleo común y persisten con consistencia

### Requirement: Sin esquema adicional para profesor

El núcleo de datos para profesor NO DEBE requerir tablas nuevas ni políticas de acceso nuevas; el acceso DEBE regirse por las reglas de membresía existentes (owner/editor).

#### Scenario: Migración sin nuevas tablas

- GIVEN la migración que incorpora la columna de disciplina
- WHEN el esquema se aplica
- THEN no se crean tablas nuevas ni políticas de acceso nuevas

#### Scenario: Acceso por membresía

- GIVEN un negocio profesor y un usuario owner o editor del mismo
- WHEN el usuario consulta o escribe datos del núcleo
- THEN el acceso se permite según las reglas de membresía existentes

#### Scenario: Edge — usuario no miembro

- GIVEN un negocio profesor y un usuario que no es owner ni editor
- WHEN el usuario intenta leer o escribir datos del núcleo
- THEN el acceso se deniega según las reglas de membresía existentes

### Requirement: Paridad de comportamiento entre gimnasio y profesor

Los flujos del núcleo DEBEN comportarse de forma idéntica para gimnasio y profesor; ningún flujo del núcleo DEBE bifurcarse por rubro.

#### Scenario: Paridad de flujos

- GIVEN un gimnasio y un profesor con los mismos datos sembrados
- WHEN se ejecuta el mismo flujo del núcleo en ambos
- THEN el resultado es equivalente en ambos rubros
