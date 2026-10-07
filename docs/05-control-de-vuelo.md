# 05 · Control de vuelo

[Índice](README.md) · [Anterior](04-estacion-y-dronlink.md) · [Siguiente](06-telemetria-y-mapa.md)

## Estados del dron

```mermaid
stateDiagram-v2
    [*] --> disconnected
    disconnected --> connected: connect / heartbeat recibido
    connected --> arming: arm()
    arming --> armed: motores armados
    armed --> takingOff: takeOff()
    takingOff --> flying: altura dentro de tolerancia
    flying --> flying: go / velocidad / altitud
    flying --> landing: Land()
    landing --> connected: altura menor de 0.5 m y motores desarmados
    flying --> returning: RTL() desde estación local
    returning --> connected: vuelta y aterrizaje completados
    connected --> disconnected: disconnect() local
    armed --> connected: heartbeat de desarmado reconocido
    connected --> flying: telemetría con altitud mayor de 0.5 m
    flying --> connected: telemetría con altitud menor de 0.5 m
```

Es un resumen de las transiciones implementadas en DronLink, no una máquina formal del autopiloto. `connecting` figura entre las etiquetas aceptadas por la web, pero `connect()` de esta fachada no asigna ese estado: «Conectando» en la UI se representa mediante una solicitud pendiente.

La frescura de datos y las solicitudes pendientes son estados de la web independientes de `dron.state`.

## Conectar, armar y despegar

```mermaid
sequenceDiagram
    actor U as Operador
    participant W as Web
    participant B as Broker
    participant E as Estación
    participant D as DronLink
    participant V as SITL
    U->>W: Conectar
    W->>B: connect
    B->>E: on_message()
    E->>D: connect(tcp:127.0.0.1:5763, 115200)
    D->>V: Abrir conexión y esperar heartbeat
    V-->>D: HEARTBEAT
    D->>D: connected / crear MessageHandler
    E->>D: send_telemetry_info(procesarTelemetria)
    D-->>E: Telemetría periódica
    E->>B: telemetryInfo
    B-->>W: Confirmar conexión
    U->>W: Despegar
    W->>B: arm_takeOff / 1
    B->>E: on_message()
    E->>D: arm() bloqueante
    D->>V: GUIDED y armado
    V-->>D: Confirmación de motores armados
    E->>D: takeOff(1, blocking=False)
    D->>V: MAV_CMD_NAV_TAKEOFF / 1 m
    V-->>D: Altura próxima al destino
    D->>D: state = flying
    D-->>E: Telemetría flying
    E->>B: telemetryInfo
    B-->>W: Habilitar controles de vuelo
```

La estación fija 1 m para el despegue web aunque otro payload indique una altura distinta. `_checkAltitudeReached()` utiliza una tolerancia alrededor del destino de aproximadamente ±0,5 m. La altura seleccionada en la UI se aplica posteriormente mediante otro comando.

## Navegación geográfica y pausa

`go(direction)` prepara velocidades en ejes norte/este y arranca el hilo de navegación si es necesario. Este hilo envía `self.cmd` aproximadamente cada segundo mientras `going` sea verdadero.

| Dirección | Componentes horizontales conceptuales |
| --- | --- |
| Norte / Sur | ± velocidad en eje norte. |
| Este / Oeste | ± velocidad en eje este. |
| Diagonal | Ambos ejes a ± `navSpeed / sqrt(2)`. |
| Stop / pausa | Velocidad horizontal y vertical nulas. |

La normalización evita que una diagonal tenga una magnitud mayor que la velocidad seleccionada. La rosa de los vientos representa direcciones geográficas; no gira con el heading. El resaltado muestra la última solicitud enviada.

`go('Stop')` mantiene el modo de navegación enviando velocidad cero. `_stopGo()` hace otra cosa: pone `going=False` para parar el bucle de envío, como parte del cambio de altura o aterrizaje.

## Cambio de altitud

```mermaid
sequenceDiagram
    participant W as Web
    participant E as Estación vía MQTT
    participant D as DronLink
    participant V as Autopiloto
    W->>E: setAltitude / metros enteros positivos
    E->>E: Validar flying, payload y retain
    E->>D: direction = Stop
    E->>D: change_altitude(altura, blocking=False)
    D->>D: Parar bucle go / reaching_waypoint = true
    D->>V: Destino global con lat/lon actuales y altura relativa
    Note over W,D: La web bloquea nuevas direcciones y velocidad<br/>Mantiene pausa y aterrizaje disponibles
    V-->>D: GLOBAL_POSITION_INT
    D-->>E: Telemetría
    E-->>W: alt próxima al destino
    W->>W: Confirmar si diferencia menor de 0.5 m
```

El destino usa la latitud y longitud almacenadas por DronLink al construir el comando. Pausa o aterrizaje pueden sustituir el control durante la espera. La web cancela su espera al solicitar estas acciones; no hay un token de cancelación que retire la espera interna de `change_altitude()`.

## Cambio de velocidad

La estación acepta valores finitos entre 0,5 y 5 m/s en tierra o en vuelo. `changeNavSpeed()` guarda el valor y vuelve a invocar `go(self.direction)`. La web confirma cuando recibe ese mismo `navSpeed` en telemetría. `groundSpeed` continúa siendo la velocidad medida.

## Aterrizaje

```mermaid
sequenceDiagram
    participant W as Web
    participant E as Estación vía MQTT
    participant D as DronLink
    participant V as Autopiloto
    W->>E: Land
    E->>D: Land(blocking=False)
    D->>D: state = landing / parar navegación
    D->>V: Cambiar modo a LAND
    V-->>D: Altura relativa menor de 0.5 m
    D->>V: Esperar motores desarmados
    D->>D: state = connected
    D-->>E: Telemetría
    E-->>W: connected
    W->>W: Confirmar aterrizaje
```

## Plazos en la UI

| Espera | Plazo | Resultado al agotarse |
| --- | --- | --- |
| Conexión | 15 s | Aviso de falta de confirmación y retirada de espera local. |
| Despegue / aterrizaje | 60 s | Aviso y retirada de espera local. |
| Altitud | 60 s | «Altitud sin confirmar». |
| Velocidad | 10 s | «Cambio sin confirmar». |

Estos plazos se revisan con un temporizador de 1 s. No cancelan operaciones en el autopiloto ni sus hilos DronLink. Si falta telemetría reciente, la UI deshabilita acciones de vuelo, incluida pausa/aterrizaje; los controles locales de estación siguen siendo otra vía.

## Fuentes

[Control web](../WebAppMQTT/app/static/js/control.js) · [Dispatcher](../EstacionTierra/EstacionDeTierra.py) · [Armado](../EstacionTierra/dronLink/modules/dron_arm.py) · [Despegue](../EstacionTierra/dronLink/modules/dron_takeOff.py) · [Navegación](../EstacionTierra/dronLink/modules/dron_nav.py) · [Altitud](../EstacionTierra/dronLink/modules/dron_altitude.py) · [Aterrizaje](../EstacionTierra/dronLink/modules/dron_RTL_Land.py).
