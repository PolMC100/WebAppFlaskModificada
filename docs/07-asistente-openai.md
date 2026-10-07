# 07 · Asistente OpenAI

[Índice](README.md) · [Anterior](06-telemetria-y-mapa.md) · [Siguiente](08-operacion-y-limites.md)

## Alcance actual

La PoC conecta texto de la web con OpenAI a través de la estación. Cada consulta es independiente, sin historial ni telemetría. Las respuestas son texto completo, sin streaming. El modelo no dispone de herramientas que llamen a DronLink y el código no interpreta su respuesta como una orden.

Las instrucciones enviadas al modelo indican que responda brevemente en español y que, ante una petición de movimiento, explique que la PoC todavía no la ejecuta. El aislamiento funcional también está en el código: `OpenAIAssistant` no importa `Dron` ni publica comandos de vuelo.

## Estructura del asistente

```mermaid
classDiagram
    class OpenAIAssistant {
        +model
        +slots : BoundedSemaphore
        +seen : OrderedDict
        +requests : deque
        +handle(mqtt_client, message)
    }
    class OpenAI {
        +responses
    }
    class Responses {
        +create(model, instructions, input, max_output_tokens, store)
    }
    class PahoClient {
        +publish(topic, payload, qos, retain)
    }
    OpenAIAssistant ..> OpenAI : crea cliente en hilo ask
    OpenAI --> Responses
    OpenAIAssistant ..> PahoClient : reply
```

`reply()` y `ask()` son funciones anidadas en `handle()`. Capturan el cliente MQTT, ID y topic de la petición; no son métodos adicionales de la clase. El semáforo limita las llamadas simultáneas, el diccionario recuerda peticiones recientes y la cola temporal limita admisiones por minuto.

## Secuencia completa

```mermaid
sequenceDiagram
    actor U as Operador
    participant W as Web / control.js
    participant B as Broker
    participant E as EstacionDeTierra.py
    participant A as OpenAIAssistant
    participant O as OpenAI
    U->>W: Texto y enviar / Enter
    W->>W: Generar ID / guardar pendingAI
    W->>B: aiMessage con session, id y text
    B->>E: on_message()
    E->>A: handle(client, message)
    A->>A: Validar y reservar slot
    alt Petición válida y capacidad disponible
        A->>B: aiReply/session / accepted
        B-->>W: Consultando OpenAI
        A->>A: Lanzar hilo daemon ask
        A->>O: responses.create()
        O-->>A: response.output_text
        A->>B: aiReply/session / done y texto
        B-->>W: receiveAI()
        W->>W: Comprobar ID / mostrar con textContent
        A->>A: Liberar slot
    else Error de configuración, datos o saturación
        A->>B: aiReply/session / error
        B-->>W: Mostrar mensaje explicativo
    end
```

Si la consulta HTTP falla, el hilo publica `error` y libera el slot mediante `finally`. Peticiones malformadas sin identificadores válidos, retenidas o demasiado grandes se descartan sin respuesta. Una repetición reciente del mismo par sesión/ID también se descarta sin reenviar el resultado anterior.

## Sesión y correlación

| Identificador | Creación | Duración | Uso |
| --- | --- | --- | --- |
| `aiSession` | En el navegador, al ejecutar la página. | Hasta recargar o cerrar esa carga de página. | Sufijo del topic de respuesta. |
| `id` | En el navegador, en cada envío. | Una petición. | Emparejar respuesta con `pendingAI`. |
| `(session, id)` | Combinación en la estación. | Últimas 256 admisiones/validaciones recordadas. | Descartar duplicados recientes. |

Se usa `crypto.randomUUID()` cuando está disponible, con alternativa basada en `crypto.getRandomValues()`. Los IDs sirven para enrutar y correlacionar; no representan autenticación ni confidencialidad.

## Estados de la UI

```mermaid
stateDiagram-v2
    [*] --> SinServicio
    SinServicio --> Listo: MQTT y suscripciones disponibles
    Listo --> Enviando: formulario válido
    Enviando --> Consultando: accepted
    Enviando --> Respuesta: done
    Consultando --> Respuesta: done
    Enviando --> Error: error o fallo de publicación
    Consultando --> Error: error
    Enviando --> Error: 45 s o conexión perdida
    Consultando --> Error: 45 s o conexión perdida
    Respuesta --> Enviando: nueva consulta
    Error --> Enviando: reenvío manual con servicio listo
    Listo --> SinServicio: conexión perdida
    Respuesta --> SinServicio: conexión perdida
```

Mientras hay una consulta pendiente se deshabilitan el input y enviar. Una nueva consulta oculta la respuesta previa. No hay lista de mensajes ni almacenamiento de conversaciones. Las respuestas tardías tras retirar `pendingAI` se ignoran, aunque OpenAI haya procesado la petición.

## Configuración y límites

| Ajuste | Implementación actual |
| --- | --- |
| Clave | `OPENAI_API_KEY`, cargada por la estación. |
| Modelo | `OPENAI_MODEL`; valor predeterminado en código: `gpt-4.1-mini`. |
| Archivo | `.env` junto a `openai_assistant.py`, con variables de entorno prioritarias. |
| Texto | Entre 1 y 1500 caracteres; payload total MQTT máximo 8192 bytes. |
| IDs admitidos | 16–64 caracteres alfanuméricos o guion. |
| Concurrencia | Máximo 2 consultas simultáneas. |
| Frecuencia | Hasta 30 consultas admitidas por minuto en esa instancia de estación. |
| Timeout HTTP | 30 s configurados en el SDK; sin reintentos automáticos. |
| Espera UI | 45 s, comprobada cada segundo. |
| Salida | Máximo 512 tokens configurados. |
| Almacenamiento API solicitado | `store=False`; no se encadenan respuestas anteriores. |

La estación carga la configuración al construir el asistente. Modificar el archivo requiere reiniciar el proceso. La clave no entra en HTML, payloads MQTT ni respuestas. El campo del asistente es para consultas, no para credenciales.

La ausencia del SDK o de la clave devuelve un error explicativo al consultar y no impide por sí misma los controles manuales del dron. La estación necesita sus otras dependencias habituales para iniciar.

## Tratamiento de errores

El código traduce autenticación inválida, permisos, modelo inexistente, cuota/límite, timeout y conexión fallida a mensajes comprensibles. Para otros fallos utiliza una respuesta genérica. No publica la excepción HTTP completa; en consola escribe el nombre de su clase. Una respuesta sin texto también produce `error`.

El broker público permite observar mensajes y publicar solicitudes. El canal por sesión no es privado y el límite de concurrencia no es control de acceso. Los IDs permiten que la UI descarte mensajes ajenos por correlación, pero no prueban quién los ha publicado.

## Funciones futuras no implementadas

Todavía no hay memoria conversacional, geocodificación de lugares, planificación de rutas, interpretación estructurada de órdenes, acceso del modelo a telemetría ni ejecución/confirmación de herramientas del dron. Solicitar «dirígete al Canal Olímpic» actualmente obtiene una respuesta de texto.

## Fuentes y guía de uso

[Asistente](../EstacionTierra/openai_assistant.py) · [Despacho MQTT](../EstacionTierra/EstacionDeTierra.py) · [Cliente web](../WebAppMQTT/app/static/js/control.js) · [Configuración paso a paso](../EstacionTierra/README-OpenAI.md) · [Plantilla sin secretos](../EstacionTierra/.env.example).
