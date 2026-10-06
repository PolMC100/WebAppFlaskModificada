import json
import math
import tkinter as tk
from dronLink.Dron import Dron
import random
import paho.mqtt.client as mqtt




def allowExternal ():
    global client
    clientName = "demoDash" + str(random.randint(1000, 9000))
    client = mqtt.Client(clientName, transport="websockets")

    broker_address = 'broker.hivemq.com'
    broker_port = 8000

    client.on_message = on_message
    client.on_connect = on_connect
    client.connect(broker_address, broker_port)
    print('Conectado a broker.hivemq.com:8000')

    # me subscribo a cualquier mensaje  que venga del mobileFlask
    client.subscribe('mobileFlask/demoDash/#')
    print('demoDash esperando peticiones ')
    client.loop_start()


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("connected OK Returned code=", rc)
    else:
        print("Bad connection Returned code=", rc)


def procesarTelemetria(telemetryInfo):
    # cada vez que recibo un paquete de telemetría del dron lo envio al broker
    data = dict(telemetryInfo)
    data['navSpeed'] = dron.navSpeed
    client.publish('demoDash/mobileFlask/telemetryInfo', json.dumps(data))


def publish_event ( event):
    # publico en el broker el evento, que en este caso será 'flying' porque es el único que se
    # considera en esta aplicación
    print ('en el aire')
    client.publish('demoDash/mobileFlask/'+event)

# aqui recibimos los mensajes de la web app
def on_message(client, userdata, message):
        global dron
        # el formato del topic siempre será:
        # mobileFlask/demoDash/comando

        parts = message.topic.split ('/')
        command = parts[2]
        print ('recibo ', command)
        if command == 'setNavSpeed':
            # Velocidad horizontal del control manual, expresada en m/s.
            if message.retain or dron.state not in ('connected', 'flying'):
                return
            try:
                speed = float(message.payload.decode('utf-8'))
            except (ValueError, UnicodeDecodeError):
                return
            if not math.isfinite(speed) or not 0.5 <= speed <= 5:
                return
            dron.changeNavSpeed(speed)
            return
        if command == 'connect':
            # me conecto al simulador
            connection_string = 'tcp:127.0.0.1:5763'
            baud = 115200
            dron.connect(connection_string, baud)
            print ('conectado')
            # le pido los datos de telemetria y le indico la función a ejecutar cada vez que tenga un nuevo
            # paquete de datos
            print ('pido datos de telemetria')
            dron.send_telemetry_info(procesarTelemetria)


        if command == 'arm_takeOff':
            if dron.state == 'connected':
                # recupero la altura a alcanzar, que viene como payload del mensaje
                alt = int( message.payload.decode("utf-8"))
                dron.arm()
                print ('armado')
                # operación no bloqueante. Cuando acabe publicará el evento correspondiente
                dron.takeOff(alt, blocking=False, callback=publish_event, params='flying')

        if command == 'go':
            if dron.state == 'flying':
                direction = message.payload.decode("utf-8")
                print ('vamos al: ', direction)
                dron.go(direction)

        if command == 'Land':
            if dron.state == 'flying':
                print ('voy a aterrizar')
                # operación no bloqueante
                dron.Land(blocking=False, callback=publish_event, params='landing')






dron = Dron()

ventana = tk.Tk()
ventana.geometry ('350x400')
ventana.title("Pequeña estación de tierra")

# La interfaz tiene 10 filas y una columna

ventana.rowconfigure(0, weight=1)
ventana.rowconfigure(1, weight=1)
ventana.rowconfigure(2, weight=1)
ventana.rowconfigure(3, weight=1)
ventana.rowconfigure(4, weight=1)
ventana.rowconfigure(5, weight=1)
ventana.rowconfigure(6, weight=1)
ventana.rowconfigure(7, weight=1)
ventana.rowconfigure(8, weight=1)
ventana.rowconfigure(9, weight=1)
ventana.rowconfigure(10, weight=1)

ventana.columnconfigure(0, weight=1)

# Disponemos ahora los 9 botones
connectBtn = tk.Button(ventana, text="Conectar", bg="dark orange", command = lambda: dron.connect('tcp:127.0.0.1:5763', 115200))
connectBtn.grid(row=0, column=0, padx=3, pady=5, sticky=tk.N + tk.S + tk.E + tk.W)

armBtn = tk.Button(ventana, text="Armar", bg="dark orange", command=lambda: dron.arm())
armBtn.grid(row=1, column=0, padx=5, pady=5, sticky=tk.N + tk.S + tk.E + tk.W)

takeOffBtn = tk.Button(ventana, text="Despegar", bg="dark orange", command=lambda: dron.takeOff(3))
takeOffBtn.grid(row=2, column=0,  padx=5, pady=5, sticky=tk.N + tk.S + tk.E + tk.W)

NorthBtn = tk.Button(ventana, text="Norte", bg="dark orange", command=lambda: dron.go('North'))
NorthBtn.grid(row=3, column=0, padx=5, pady=5, sticky=tk.N + tk.S + tk.E + tk.W)

SouthBtn = tk.Button(ventana, text="Sur", bg="dark orange", command=lambda: dron.go('South'))
SouthBtn.grid(row=4, column=0, padx=5, pady=5, sticky=tk.N + tk.S + tk.E + tk.W)

EastBtn = tk.Button(ventana, text="Este", bg="dark orange", command=lambda: dron.go('East'))
EastBtn.grid(row=5, column=0, padx=5, pady=5, sticky=tk.N + tk.S + tk.E + tk.W)

WestBtn = tk.Button(ventana, text="Oeste", bg="dark orange", command=lambda: dron.go('West'))
WestBtn.grid(row=6, column=0, padx=5, pady=5, sticky=tk.N + tk.S + tk.E + tk.W)

StopBtn = tk.Button(ventana, text="Para", bg="dark orange", command=lambda: dron.go('Stop'))
StopBtn.grid(row=7, column=0, padx=5, pady=5, sticky=tk.N + tk.S + tk.E + tk.W)

RTLBtn = tk.Button(ventana, text="RTL", bg="dark orange", command=lambda: dron.RTL())
RTLBtn.grid(row=8, column=0, padx=5, pady=5, sticky=tk.N + tk.S + tk.E + tk.W)

disconnectBtn = tk.Button(ventana, text="Desconectar", bg="dark orange", command=lambda: dron.disconnect())
disconnectBtn.grid(row=9, column=0, padx=5, pady=5, sticky=tk.N + tk.S + tk.E + tk.W)

allowExternalBtn = tk.Button(ventana, text="Permitir peticiones externas", bg="dark orange", command= allowExternal)
allowExternalBtn.grid(row=10, column=0, padx=5, pady=5, sticky=tk.N + tk.S + tk.E + tk.W)

##### Código para la recepción de peticiones a través de MQTT



'''client.on_message = on_message
client.on_connect = on_connect
client.connect(broker_address, broker_port)
print('Conectado a broker.hivemq.com:8000')

# me subscribo a cualquier mensaje  que venga del mobileFlask
client.subscribe('mobileFlask/demoDash/#')
print('demoDash esperando peticiones ')
client.loop_start()'''

ventana.mainloop()
