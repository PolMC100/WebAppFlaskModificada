# Documentación de la aplicación

Descripción del código actual, organizada por módulos y flujos. Fecha de referencia: **7 de octubre de 2026**.

La aplicación permite controlar un dron o SITL desde una web, observar su telemetría y posición en un mapa y consultar una PoC de asistente OpenAI. El asistente actualmente devuelve texto; no ejecuta acciones sobre el dron.

## Índice y orden de lectura

| Documento | Qué explica | Diagramas |
| --- | --- | --- |
| [01 · Arquitectura](01-arquitectura.md) | Componentes, despliegue, responsabilidades y carga de la página. | Componentes, despliegue, secuencia. |
| [02 · Interfaz web](02-interfaz-web.md) | Flask, HTML/CSS, controles, estado local y adaptación móvil. | Dependencias, estados de la UI. |
| [03 · Protocolo MQTT](03-protocolo-mqtt.md) | Topics, payloads, suscripciones y confirmaciones. | Secuencia, contratos de datos. |
| [04 · Estación y DronLink](04-estacion-y-dronlink.md) | Tkinter, despacho de comandos, clases y concurrencia. | Clases, componentes e hilos. |
| [05 · Control de vuelo](05-control-de-vuelo.md) | Conexión, despegue, navegación, velocidad, altitud y aterrizaje. | Estados y secuencias. |
| [06 · Telemetría y mapa](06-telemetria-y-mapa.md) | Datos MAVLink, disponibilidad, orientación y trayectoria opcional. | Secuencia, actividad, estados. |
| [07 · Asistente OpenAI](07-asistente-openai.md) | Consulta completa, validación, sesión, errores y configuración. | Clases, secuencia y estados. |
| [08 · Operación y límites](08-operacion-y-limites.md) | Arranque, memoria, caché, fallos y alcance actual. | Actividad y ciclo de vida. |

## Cómo leer los diagramas

Se utilizan bloques `mermaid` editables dentro de los Markdown. Los diagramas de secuencia, clases y estados siguen la notación UML compatible con Mermaid; los de componentes, despliegue y actividad son representaciones equivalentes mediante nodos y relaciones. No constituyen un modelo UML formal exportado desde una herramienta CASE.

Abre los documentos en un visor Markdown con soporte Mermaid. Si el visor no lo soporta, el bloque muestra el código del diagrama. Los identificadores corresponden a funciones, clases y topics reales cuando procede. Los nombres de capas, procesos y grupos son descriptivos, no clases adicionales del programa.

Los enlaces a fuentes son relativos al repositorio. Las transiciones explican el flujo esperado del código; no certifican tiempos, comportamiento de un autopiloto concreto ni validación mediante vuelos.

## Estructura principal

```text
WebAppMQTT/
  run.py                       Arranque Flask
  app/__init__.py              Factoría y cabeceras sin caché
  app/routes.py                GET /
  app/templates/control.html   UI y formularios
  app/templates/macros/        Catálogo de iconos SVG
  app/static/css/              Tema, mapa y presentación compacta
  app/static/js/control.js     MQTT, controles, telemetría y chat
  app/static/js/flight-map.js  Mapa, marcador y trayectoria
  app/static/js/workspace.js   Paneles móviles
EstacionTierra/
  EstacionDeTierra.py           Tkinter, MQTT y despacho
  openai_assistant.py          Puente de texto a OpenAI
  .env.example                Plantilla de configuración sin secretos
  requirements-ai.txt         Dependencias adicionales del asistente
  dronLink/Dron.py             Fachada del dron
  dronLink/modules/            Operaciones MAVLink y gestión de mensajes
```

El README raíz conserva referencias históricas a una variante HTTP. Esta documentación describe la aplicación actual `WebAppMQTT` y `EstacionTierra` que están presentes en el árbol de trabajo.
