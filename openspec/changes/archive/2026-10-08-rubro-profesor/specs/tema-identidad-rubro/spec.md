# Especificación: tema-identidad-rubro

## Purpose

Gobernar la identidad visual por rubro: acento, bloque CSS por rubro y favicon sincronizados con el mapa único de rubros.

## Requirements

### Requirement: Acento del rubro profesor

El acento del rubro profesor DEBE ser el color `#F472B6` (rosa), y DEBE aplicarse a los elementos de identidad del negocio con ese rubro.

#### Scenario: Aplicación de acento a un negocio profesor

- GIVEN un negocio con rubro profesor
- WHEN se visualiza la interfaz del negocio
- THEN el acento aplicado es `#F472B6`

#### Scenario: Edge — acento de otros rubros sin cambios

- GIVEN negocios de rubros distintos de profesor
- WHEN se visualiza cada interfaz
- THEN el acento de cada rubro es el definido con anterioridad, sin alteraciones

### Requirement: Sincronía mapa de rubros, CSS y favicon

El mapa de rubros, el bloque CSS por rubro y el favicon DEBEN mantenerse sincronizados: para cada rubro del mapa, el acento declarado en el CSS correspondiente y en el favicon DEBE coincidir con el valor del mapa.

#### Scenario: Cobertura de rubros en sync

- GIVEN el mapa de rubros con sus cinco rubros
- WHEN se valida la sincronía contra el bloque CSS y el favicon
- THEN cada uno de los cinco rubros está representado y su acento coincide en las tres fuentes

#### Scenario: Edge — detección de desincronía

- GIVEN un acento en el mapa o el CSS divergente del resto
- WHEN se ejecuta la validación de sincronía
- THEN la validación falla señalando el rubro divergente

### Requirement: Aplicación del tema por atributo de rubro

La identidad visual DEBE activarse a partir del rubro del negocio, y un rubro desconocido DEBE caer al acento por defecto sin error.

#### Scenario: Negocio profesor con tema activo

- GIVEN un negocio con rubro profesor
- WHEN la interfaz resuelve el tema
- THEN el tema se activa a partir del rubro y aplica el acento rosa

#### Scenario: Edge — rubro sin acento definido

- GIVEN un negocio con un rubro sin acento en el mapa
- WHEN la interfaz resuelve el tema
- THEN se aplica el acento por defecto y no ocurre ningún error
