# 01 · Arquitectura

[Índice](README.md) · [Siguiente: interfaz web](02-interfaz-web.md)

## Componentes

```mermaid
flowchart LR
    Usuario([Operador]) --> Web
    subgraph Navegador[Dispositivo del operador]
        Web[HTML y CSS]
        Control[control.js]
        Mapa[flight-map.js / Leaflet]
        Paneles[workspace.js]
        Web --- Control
        Web --- Paneles
        Control --> Mapa
    end
    Flask[Flask / WebAppMQTT] -->|HTML, JS y CSS vía HTTP| Web
    CDN[CDN de MQTT.js y Leaflet] --> Navegador
    OSM[Teselas OpenStreetMap] --> Mapa
    Control <-->|MQTT sobre WebSocket seguro| Broker[Broker HiveMQ]
    subgraph Estacion[Estación de tierra / Python]
        Tk[Tkinter]
        Dispatcher[EstacionDeTierra.py]
        Dron[DronLink / Dron]
        IA[OpenAIAssistant]
        Tk --> Dron
        Tk -->|Permitir peticiones externas| Dispatcher
        Dispatcher --> Dron
        Dispatcher --> IA
    end
    Broker <-->|MQTT sobre WebSocket| Dispatcher
    Dron <-->|MAVLink| Vehiculo[Autopiloto o SITL]
    IA <-->|HTTPS / Responses API| OpenAI[OpenAI]
```

## Responsabilidades

| Componente | Responsabilidad |
| --- | --- |
| Flask | Renderizar `control.html`, servir archivos estáticos y desactivar su caché HTTP. |
| Navegador | Publicar solicitudes MQTT, recibir telemetría y respuestas IA, actualizar la UI y mantener datos de sesión. |
| Broker | Distribuir mensajes por suscripción a topics. No interpreta instrucciones del dron. |
| Estación de tierra | Ofrecer controles locales y traducir comandos MQTT a llamadas DronLink o al asistente. |
| DronLink | Gestionar conexión, estado, comandos y mensajes MAVLink. |
| Autopiloto/SITL | Ejecutar el control del vehículo y emitir telemetría. |
| OpenAI | Generar una respuesta de texto a cada consulta independiente. |

Flask no participa en cada comando de vuelo o consulta del chat: tras servir la página, el navegador habla directamente con MQTT.

## Despliegue actual

```mermaid
flowchart TB
    subgraph Operador[PC o móvil del operador]
        Browser[Navegador]
    end
    subgraph HostWeb[Host del servidor web]
        Flask[run.py / Flask]
    end
    subgraph HostTierra[Host de estación y simulador]
        Tierra[EstacionDeTierra.py]
        SITL[SITL en TCP 5763]
        Config[.env local de la estación]
        Tierra -->|TCP MAVLink / 127.0.0.1:5763| SITL
        Config --> Tierra
    end
    Broker[broker.hivemq.com]
    API[api.openai.com]
    Browser -->|HTTP / servidor Flask| Flask
    Browser <-->|WSS :8884 /mqtt| Broker
    Tierra <-->|WS :8000| Broker
    Tierra -->|HTTPS :443| API
```

Los nodos representan roles que pueden compartir un mismo ordenador. La dirección `127.0.0.1` de la estación exige que el SITL esté en ese host salvo modificación de la configuración. `baud=115200` se pasa a DronLink aunque la conexión configurada sea TCP.

## Carga de la página

```mermaid
sequenceDiagram
    actor U as Operador
    participant B as Navegador
    participant F as Flask
    participant C as CDN
    participant M as Broker
    U->>B: Abrir URL de Flask
    B->>F: GET /
    F-->>B: control.html / Cache-Control: no-store
    B->>F: GET CSS y JS locales
    F-->>B: Archivos / Cache-Control: no-store
    B->>C: Cargar Leaflet y MQTT.js
    C-->>B: Librerías
    B->>B: Inicializar mapa, controles y paneles
    B->>M: Conectar WSS
    B->>M: Suscribir telemetría y aiReply de la sesión
    M-->>B: Suscripción aceptada
    B->>B: serviceReady = true
    Note over B,M: La conexión MQTT no confirma conexión con el dron
```

## Fuentes

- [Arranque](../WebAppMQTT/run.py), [factoría Flask](../WebAppMQTT/app/__init__.py), [ruta](../WebAppMQTT/app/routes.py).
- [Cliente web](../WebAppMQTT/app/static/js/control.js), [estación](../EstacionTierra/EstacionDeTierra.py), [asistente](../EstacionTierra/openai_assistant.py).
