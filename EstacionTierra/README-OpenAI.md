# PoC de consultas a OpenAI

La web envía texto por MQTT a la estación de tierra. La estación llama a la Responses API con el SDK oficial de OpenAI y devuelve el texto al navegador. No se conectan herramientas ni se ejecutan órdenes de vuelo.

## Configuración

1. Usa el entorno Python del proyecto. Las dependencias adicionales están en `requirements-ai.txt` y ya se han instalado en `.venv` durante la implementación. En otro equipo, desde la raíz del repositorio:

   ```powershell
   .\.venv\Scripts\python.exe -m pip install -r .\EstacionTierra\requirements-ai.txt
   ```

2. Abre `EstacionTierra/.env`. Se ha creado localmente con la clave vacía; en un clon nuevo, copia `.env.example` a `.env`. Escribe:

   ```dotenv
   OPENAI_API_KEY=tu_clave_real
   OPENAI_MODEL=gpt-4.1-mini
   ```

   La estación carga este archivo junto a `EstacionDeTierra.py`, independientemente del directorio desde el que se ejecute. Las variables de entorno tienen prioridad. La clave nunca se envía al navegador ni por MQTT. `.env` está excluido de Git. No introduzcas la clave en el campo del asistente.

3. Reinicia la estación de tierra y activa **Permitir peticiones externas**.
4. Inicia Flask y recarga la página. En **Asistente**, escribe «Hola, responde con una frase» y pulsa enviar o Enter.
5. La barra mostrará el envío, la consulta a OpenAI y la respuesta o un error explicativo. No necesitas conectar el dron ni iniciar el simulador para conversar, aunque la estación necesita sus dependencias habituales para arrancar.

Puedes cambiar `OPENAI_MODEL` por un modelo de texto al que tu cuenta tenga acceso; reinicia la estación tras modificar la configuración. Las consultas utilizan tu cuenta de la API y su cuota, independientemente de una suscripción a ChatGPT.

## Comportamiento

- Cada consulta es independiente: no se envían historial, telemetría ni archivos.
- Hasta 1500 caracteres por mensaje y 512 tokens de salida; `store=False` en la petición. Esto no cambia las políticas de tratamiento de datos del proveedor.
- Dos consultas simultáneas y 30 consultas por minuto como máximo por estación. La saturación devuelve un error; no se mantiene una cola.
- La petición HTTP se ejecuta en un hilo separado, con timeout de 30 segundos y sin reintentos automáticos. La web deja de esperar tras 45 segundos. Una consulta cuya respuesta se pierde puede haber sido procesada por OpenAI.
- Los mensajes MQTT utilizan QoS 0 y `retain=False`, y no se reenvían automáticamente al reconectar. Las consultas duplicadas recientes se descartan por sesión e identificador.
- La estación recibe `mobileFlask/demoDash/aiMessage` con `{ "session": "...", "id": "...", "text": "..." }` y responde a `demoDash/mobileFlask/aiReply/<session>` con `{ "id": "...", "status": "accepted|done|error", "text": "..." }`.
- El identificador de sesión permite asociar respuestas a cada navegador; no es autenticación. Se mantiene el broker público existente, sin control de acceso: otros clientes pueden observar los mensajes y enviar consultas. Esta PoC no ofrece un canal privado; para un uso continuado con una clave de pago hay que configurar un broker con autenticación y permisos.
- El módulo `openai_assistant.py` está separado de DronLink. Las respuestas no se interpretan como HTML, ni se convierten en comandos MQTT de vuelo.
- No se ha realizado una llamada real a OpenAI durante la implementación: falta la clave del usuario.

Documentación oficial: [SDK de Python](https://developers.openai.com/api/reference/python), [Responses API](https://developers.openai.com/api/reference/python/resources/responses/methods/create), [modelo predeterminado](https://developers.openai.com/api/docs/models/gpt-4.1-mini).
