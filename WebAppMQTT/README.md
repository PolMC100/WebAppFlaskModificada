# Interfaz de control de vuelo

La página mantiene el protocolo MQTT de la estación de tierra y muestra los datos que DronLink ya publica: estado, altitud relativa, velocidad terrestre, rumbo, modo de vuelo, latitud y longitud.

## Uso

1. Inicia el simulador o dron y la estación de tierra.
2. Activa **Permitir peticiones externas** en la estación de tierra.
3. Ejecuta `run.py` con el entorno Python del proyecto y abre la dirección de Flask.
4. Pulsa **Conectar dron**. La conexión se confirma al recibir telemetría.
5. Pulsa **Despegar a 1 metro**. El control manual se habilita cuando la telemetría confirma el estado `flying`. Después, introduce la altitud relativa deseada en metros enteros y pulsa el botón ✓ del selector **Altitud** para aplicarla.
6. Selecciona una dirección geográfica, pulsa **Detener** para detener el movimiento o **Aterrizar dron** para finalizar el vuelo.

## Comportamiento de la interfaz

- Mapa como superficie principal de toda la ventana. En escritorio, los controles de vuelo están a la izquierda, la telemetría a la derecha y las herramientas del mapa en el borde inferior.
- Conexión, despegue fijo a 1 metro, selector independiente de altitud en vuelo, dirección, velocidad y aterrizaje comparten un único panel **Vuelo**. La fila de preparación permanece visible dentro del panel, también durante el vuelo.
- **Altitud** envía `mobileFlask/demoDash/setAltitude` con una altura relativa positiva en metros enteros. La estación valida el estado de vuelo y utiliza `change_altitude` sin bloquear la recepción MQTT. Aplicar detiene la navegación horizontal para que sus comandos de velocidad no sobrescriban la nueva altura. La interfaz confirma el destino con telemetría a menos de 0,5 m de la altura solicitada; mientras espera, bloquea nuevas direcciones y cambios de velocidad y mantiene **Detener** y **Aterrizar** disponibles. El despegue de la web siempre se ejecuta a 1 metro también en la estación, independientemente del selector. Reinicia la estación tras actualizar.
- En móvil y tablet compacta, la barra **Vuelo / Datos / Mapa** abre un panel a la vez. Pulsar de nuevo la opción activa oculta el panel. El registro de actividad y la guía de iconos se pueden desplegar; los paneles tienen desplazamiento propio cuando falta espacio.
- Al centrar o seguir al dron se calcula el espacio visible entre los paneles para mantener su posición a la vista. El diseño respeta áreas seguras del dispositivo y vistas apaisadas de poca altura.
- Diseño en español, adaptable a móvil, con navegación mediante teclado y foco visible.
- Controles compactos con iconos SVG locales: ondas RF para conectar, flecha ascendente para despegar, dron descendiendo al suelo para aterrizar, diana para centrar, ruta para trayectoria y documento con flecha para exportar. Todos tienen nombres accesibles y títulos descriptivos; **Guía de iconos** ofrece una leyenda desplegable para dispositivos táctiles.
- Telemetría con etiquetas breves, valores y unidades visibles. Latitud y longitud se muestran siempre en la cuadrícula de datos, con grados y seis decimales cuando hay datos válidos. La actividad se despliega cuando hace falta. Los botones conservan sus iconos durante las solicitudes y muestran un indicador de operación pendiente.
- Estado del servicio MQTT separado del estado del dron.
- Solicitudes de conexión, despegue y aterrizaje diferenciadas de sus resultados confirmados. `landing` significa aterrizaje en curso; el estado posterior `connected` confirma que está en tierra.
- Telemetría marcada como desactualizada tras 10 segundos sin recepción o al perder la comunicación. Los valores anteriores permanecen identificados como datos de la última recepción.
- Acciones de vuelo deshabilitadas cuando falta telemetría reciente. Los comandos no se encolan para enviarse después de reconectar.
- Dirección solicitada resaltada hasta otra selección, un cambio de estado de vuelo o la pérdida de telemetría. El resaltado indica una solicitud enviada, no una confirmación del movimiento.
- Las ocho direcciones se distribuyen en una rosa de los vientos con norte arriba, puntas SVG orientadas hacia cada rumbo y abreviaturas en español (N, NE, E, SE, S, SO, O, NO). El botón de pausa permanece en el centro y detiene el movimiento; cada control conserva su nombre accesible y un área de pulsación de 44 × 44 px.
- Selector **Velocidad manual** de 0,5 a 5 m/s, con pasos de 0,5 y botón **Aplicar**. Puede ajustarse en tierra o en vuelo con telemetría reciente. El cambio mantiene la dirección actual, y Detener/Aterrizar siguen disponibles mientras se espera su confirmación.
- La estación acepta `mobileFlask/demoDash/setNavSpeed` y publica `navSpeed` en la telemetría para confirmar la configuración. Es necesario reiniciar la estación con el código actualizado. Este valor es la velocidad horizontal solicitada; `groundSpeed` sigue mostrando la velocidad medida. Las diagonales normalizan ambos ejes para mantener la magnitud seleccionada.
- Registro de los últimos 100 eventos de la sesión, exportable como CSV. Se borra al recargar la página.
- Mapa de OpenStreetMap con posición y flecha de orientación a partir de `lat`, `lon` y `heading`. El mapa mantiene el norte arriba; si falta el rumbo, el dron se representa con un punto.
- La rueda del ratón sobre el mapa permite acercar y alejar la vista alrededor del cursor. Sobre los paneles, el scroll desplaza su contenido.
- Primera posición válida centrada automáticamente. **Centrar en el dron** permite volver a la ubicación y **Seguir dron** mantiene la vista centrada. Arrastrar el mapa o desplazarlo con las flechas del teclado desactiva el seguimiento.
- **Mostrar trayectoria** es opcional y está desactivado inicialmente. Al activarlo registra y muestra el recorrido. Al apagarlo oculta el trazado y pausa el registro conservando los puntos; al reactivarlo comienza un tramo nuevo. Tampoco se unen los intervalos sin posición válida o con datos desactualizados.
- **Limpiar trayectoria** borra el recorrido de la sesión. Se conservan hasta 2000 puntos, omitiendo posiciones consecutivas a menos de medio metro. Recargar la página borra la trayectoria.
- La última posición conocida permanece visible en gris con un aviso cuando falta posición válida, se desconecta el dron o se interrumpe la telemetría.
- Aviso si no se confirma una conexión en 15 segundos o una operación de vuelo en 60 segundos. El aviso no cancela la operación del dron.

Los estilos y la lógica están en `app/static/css/control.css` y `app/static/js/control.js`. La composición del espacio de trabajo está en `app/static/css/workspace.css`, y la navegación de paneles en `app/static/js/workspace.js`. La integración del mapa está en `app/static/js/flight-map.js` y utiliza Leaflet 1.9.4 desde CDN. La plantilla usa las rutas estáticas de Flask y requiere servirse desde la aplicación. El mapa base requiere conexión a internet y mantiene visible la atribución a OpenStreetMap.

La presentación compacta se define en `app/static/css/compact.css`. El catálogo compartido de iconos está en `app/templates/macros/icons.html`, sin una librería de iconos externa.

La comunicación del navegador utiliza `wss://broker.hivemq.com:8884/mqtt`. Se conservan los topics `mobileFlask/demoDash/*` y `demoDash/mobileFlask/telemetryInfo` para ser compatibles con la estación actual. La librería MQTT del navegador se carga desde el CDN existente y requiere conexión a internet.

## Asistente de texto (PoC)

La barra **Asistente** al pie del mapa envía consultas a la estación de tierra y muestra respuestas de OpenAI. Funciona sin conectar el dron; requiere que estén activadas las peticiones externas. Cada mensaje es independiente y solo obtiene una respuesta de texto. La configuración de la clave y las dependencias se explica en [README-OpenAI.md](../EstacionTierra/README-OpenAI.md). La clave permanece en `EstacionTierra/.env`, fuera de la web y de Git.

## Actualizaciones y caché del navegador

La aplicación está orientada a sesiones experimentales de grupos pequeños. Todas las respuestas de Flask, incluido el HTML y los archivos JS/CSS locales, se sirven con `Cache-Control: no-store` para que el navegador no las almacene en su caché HTTP. Las URLs estáticas son normales, sin versionado. Las librerías externas del CDN y las teselas de OpenStreetMap siguen las reglas de caché de sus propios servicios; estas cabeceras de Flask no afectan a esas peticiones.

Tras instalar este cambio, reinicia Flask y realiza una recarga forzada una vez (`Ctrl+F5`) para sustituir las copias antiguas que ya estuvieran cacheadas con otras reglas. En futuras actualizaciones basta con recargar la página. Una pestaña abierta conserva su JavaScript en ejecución hasta recargarla. Los cambios en `EstacionDeTierra.py` requieren reiniciar la estación y no dependen de la caché del navegador.
