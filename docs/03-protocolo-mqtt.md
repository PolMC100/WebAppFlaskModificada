# 03 · Protocolo MQTT

[Índice](README.md) · [Anterior](02-interfaz-web.md) · [Siguiente](04-estacion-y-dronlink.md)

## Conexiones y suscripciones

| Cliente | Conexión | Suscripciones |
| --- | --- | --- |
| Web / MQTT.js | `wss://broker.hivemq.com:8884/mqtt` | `demoDash/mobileFlask/telemetryInfo` y `demoDash/mobileFlask/aiReply/<session>`. |
| Estación / Paho | WebSocket a `broker.hivemq.com:8000` | `mobileFlask/demoDash/#`, también al reconectar. |

La web utiliza `clean: true`, `queueQoSZero: false`, reconexión cada 2 s y timeout de conexión de 10 s. Publica con QoS 0 y `retain: false`. La estación usa QoS 0 para este intercambio. MQTT no garantiza entrega con QoS 0; una publicación enviada no equivale a una operación ejecutada.

## Comandos web → estación

Prefijo: `mobileFlask/demoDash/`.

| Sufijo | Payload | Validación/ejecución en estación | Confirmación web |
| --- | --- | --- | --- |
| `connect` | Vacío | `dron.connect()` y `send_telemetry_info()`. | Telemetría con estado distinto de `disconnected` y `connecting`. |
| `arm_takeOff` | La web envía `1`. | Solo no retenido y `connected`; ignora la altura del payload, arma y despega a 1 m. | Estado `flying`. |
| `go` | Nombre de dirección o `Stop`. | Solo `flying`; llama a `dron.go()`. | Resaltado de solicitud; no hay ACK de movimiento en la web. |
| `Land` | Vacío | Solo `flying`; `Land(blocking=False)`. | Estado `connected` tras aterrizaje o solicitud pendiente. |
| `setNavSpeed` | Número textual, p. ej. `2.5`. | Rechaza retenidos; estado `connected` o `flying`; número finito en [0.5, 5]. | `navSpeed` igual al solicitado. |
| `setAltitude` | Entero textual, p. ej. `10`. | Rechaza retenidos; solo `flying`; entero ≥ 1; `change_altitude(blocking=False)`. | Estado `flying` y diferencia de altitud menor de 0,5 m. |
| `aiMessage` | JSON de sesión, ID y texto. | Validación del asistente; no requiere conexión con el dron. | `accepted`, después `done` o `error`. |

Direcciones utilizadas por la web: `North`, `NorthEast`, `East`, `SouthEast`, `South`, `SouthWest`, `West`, `NorthWest`, `Stop`.

La validación de retenidos no es global en el dispatcher: `connect`, `go` y `Land` no la comprueban explícitamente. El cliente web siempre envía sin retención. Tampoco existe una validación común exhaustiva de payload para todos los comandos de vuelo.

## Telemetría estación → web

Topic: `demoDash/mobileFlask/telemetryInfo`. Ejemplo ilustrativo, no datos de un vuelo real:

```json
{
  "lat": 41.275,
  "lon": 1.987,
  "alt": 3.0,
  "groundSpeed": 0.0,
  "heading": 90.0,
  "state": "flying",
  "flightMode": "GUIDED",
  "navSpeed": 2.5
}
```

| Campo | Unidad / significado |
| --- | --- |
| `lat`, `lon` | Grados decimales. |
| `alt` | Metros relativos publicados por DronLink. |
| `groundSpeed` | Velocidad horizontal medida, m/s. |
| `heading` | Rumbo en grados. |
| `state` | Estado de la fachada Dron. |
| `flightMode` | Modo de autopiloto obtenido del heartbeat. |
| `navSpeed` | Velocidad horizontal configurada en la estación, m/s. |

La web descarta paquetes retenidos y JSON incorrecto, y exige un objeto con estado reconocido. Marca como reciente el instante de recepción local; no existe timestamp de origen ni número de secuencia en el payload.

## Contrato del asistente

Petición en `mobileFlask/demoDash/aiMessage`:

```json
{"session":"0123456789abcdef0123456789abcdef","id":"abcdef0123456789abcdef0123456789","text":"Hola"}
```

Respuesta en `demoDash/mobileFlask/aiReply/<session>`:

```json
{"id":"abcdef0123456789abcdef0123456789","status":"done","text":"Hola, ¿en qué puedo ayudarte?"}
```

`session` identifica una carga de página y `id` una petición. No identifican a un usuario autenticado. El receptor solo atiende la respuesta correspondiente a su petición pendiente. Véase [asistente](07-asistente-openai.md).

## Solicitud y confirmación

```mermaid
sequenceDiagram
    participant W as Web
    participant B as Broker
    participant E as Estación
    participant D as DronLink
    W->>B: setNavSpeed / 2.5
    B->>E: on_message()
    E->>E: Validar número, estado y retain
    E->>D: changeNavSpeed(2.5)
    D->>D: navSpeed = 2.5 / actualizar go(direction)
    D-->>E: callback periódico de telemetría
    E->>B: telemetryInfo con navSpeed = 2.5
    B-->>W: receiveTelemetry()
    W->>W: Confirmar configuración y retirar espera
    Note over W,D: Confirma configuración; groundSpeed es la velocidad medida
```

## Topics de eventos heredados

`publish_event(event)` publica sin payload en `demoDash/mobileFlask/<event>`. El despegue usa `flying`; el callback de aterrizaje usa `landing` al terminar. La web actual no se suscribe a estos eventos y utiliza telemetría para las confirmaciones. Por ello, el nombre del evento `landing` no debe tomarse como contrato de «inicio de aterrizaje».

Todos los navegadores comparten los topics de vuelo y telemetría de `demoDash`. No hay separación entre drones o arbitraje de operadores en este protocolo.

## Fuentes

[Publicación y recepción web](../WebAppMQTT/app/static/js/control.js) · [Dispatcher](../EstacionTierra/EstacionDeTierra.py) · [Contrato IA](../EstacionTierra/openai_assistant.py).
