"""Puente de texto MQTT → OpenAI. No importa ni controla DronLink."""

import json
import os
import re
import threading
from collections import OrderedDict, deque
from pathlib import Path
from time import monotonic


class OpenAIAssistant:
    def __init__(self):
        try:
            from dotenv import load_dotenv
            load_dotenv(Path(__file__).with_name('.env'), override=False)
        except ImportError:
            pass  # La configuración por variables de entorno también funciona.
        self.api_key = os.environ.get('OPENAI_API_KEY', '').strip()
        self.model = os.environ.get('OPENAI_MODEL', 'gpt-4.1-mini').strip() or 'gpt-4.1-mini'
        self.slots = threading.BoundedSemaphore(2)
        self.seen = OrderedDict()
        self.requests = deque()

    def handle(self, mqtt_client, message):
        # No procesar consultas retenidas ni aceptar topics de respuesta arbitrarios.
        if message.retain or len(message.payload) > 8192:
            return
        try:
            data = json.loads(message.payload.decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            return
        if not isinstance(data, dict):
            return
        session, request_id = data.get('session'), data.get('id')
        if any(not isinstance(value, str) or not re.fullmatch(r'[a-zA-Z0-9-]{16,64}', value)
               for value in (session, request_id)):
            return
        topic = f'demoDash/mobileFlask/aiReply/{session}'

        def reply(status, text):
            mqtt_client.publish(topic, json.dumps({
                'id': request_id, 'status': status, 'text': text,
            }, ensure_ascii=False), qos=0, retain=False)

        identity = (session, request_id)
        if identity in self.seen:
            return
        self.seen[identity] = True
        if len(self.seen) > 256:
            self.seen.popitem(last=False)
        text = data.get('text')
        if not isinstance(text, str) or not text.strip() or len(text) > 1500:
            reply('error', 'Escribe un mensaje de entre 1 y 1500 caracteres.')
            return
        if not self.api_key:
            reply('error', 'Falta OPENAI_API_KEY en EstacionTierra/.env. Configúrala y reinicia la estación.')
            return
        now = monotonic()
        while self.requests and now - self.requests[0] >= 60:
            self.requests.popleft()
        if len(self.requests) >= 30 or not self.slots.acquire(blocking=False):
            reply('error', 'La estación está ocupada. Espera un momento y vuelve a enviar.')
            return
        self.requests.append(now)
        reply('accepted', 'Consultando OpenAI…')

        def ask():
            try:
                import openai
                with openai.OpenAI(api_key=self.api_key, timeout=30.0, max_retries=0) as api:
                    response = api.responses.create(
                        model=self.model,
                        instructions=(
                            'Eres el asistente de una PoC de una estación de drones. '
                            'Responde brevemente en español. Solo conversas: no tienes acceso '
                            'al dron, no ejecutas instrucciones ni conoces su telemetría. '
                            'Si te piden un movimiento, indica que has recibido la petición '
                            'y que esta PoC todavía no la ejecuta. Nunca afirmes haber movido el dron.'
                        ),
                        input=text.strip(),
                        max_output_tokens=512,
                        store=False,
                    )
                answer = response.output_text.strip()
                if answer:
                    reply('done', answer)
                else:
                    reply('error', 'OpenAI no devolvió texto. Prueba con otro mensaje.')
            except ImportError:
                reply('error', 'Instala las dependencias de EstacionTierra/requirements-ai.txt y reinicia la estación.')
            except Exception as error:
                # No reenviar excepciones HTTP: pueden contener datos de la petición.
                name = type(error).__name__
                errors = {
                    'AuthenticationError': 'La API key no es válida. Revisa la configuración de la estación.',
                    'PermissionDeniedError': 'La API key no tiene permiso para utilizar el modelo configurado.',
                    'NotFoundError': 'El modelo configurado no está disponible para esta cuenta.',
                    'RateLimitError': 'OpenAI ha rechazado la consulta por cuota o límite de peticiones.',
                    'APITimeoutError': 'OpenAI no respondió a tiempo. Puedes enviar de nuevo el mensaje.',
                    'APIConnectionError': 'La estación no puede conectar con OpenAI. Revisa su conexión a Internet.',
                }
                print(f'Consulta OpenAI fallida: {name}')
                reply('error', errors.get(name, 'No se pudo completar la consulta a OpenAI. Revisa la estación.'))
            finally:
                self.slots.release()

        try:
            threading.Thread(target=ask, name='openai-poc', daemon=True).start()
        except RuntimeError:
            self.slots.release()
            reply('error', 'No se pudo iniciar la consulta. Vuelve a intentarlo.')
