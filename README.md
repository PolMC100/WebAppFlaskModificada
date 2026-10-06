# WebAppFlask
## 1. Presentación
En este repositorio se describe cómo controlar un dron desde cualquier dispositivo conectado a internet, sin necesidad de instalar ninguna app en el dispositivo. Para ello se utiliza el framework Flask para implementer un servidor web en Python.   
El prepositorio proporciona códigos, vídeos y descripciones. También se proponen algunos retos que pueden ayudar a asentar los conceptos que se presentan.   
## 2. Demo    
El vídeo muestra una demo de la aplicación que ejemplifica el tema. El simulador del dron (SITL) se controla desde una aplicación de escritorio desarrollada e Python y Tkinter y también desde un teléfono movil, mediante una web app desarrollada en Flask.  
[![](https://markdown-videos-api.jorgenkh.no/url?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D38vVL23C8Fc)](https://www.youtube.com/watch?v=38vVL23C8Fc)     
## 3. Arquitectura software
Este vídeo explica cómo está organizado el código. La comunicación entre el dispositivo móvil y el servidor web se realiza usando el protocolo HTTP, mediante operaciones GET y POST. La comunicación entre el servidor web y la aplicación de escritorio (desde la que se controla el dron) se realiza usando un broker que implementa el protocolo MQTT, en el que la comunicación se articula mediante publicaciones y subscripciones.   
[![](https://markdown-videos-api.jorgenkh.no/url?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DsLvR_oKtdk0)](https://www.youtube.com/watch?v=sLvR_oKtdk0)    
Este vídeo es un pequeño paseo por el código de las aplicaciones.   
[![](https://markdown-videos-api.jorgenkh.no/url?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D9JBQAkh-0WQ)](https://www.youtube.com/watch?v=9JBQAkh-0WQ)    
## 4. Arquitectura alternativa
El vídeo muestra una arquitectura software alternativa en la que el dispositivo móvil solo se comunica con el servidor web para obtener la (única) página web. El script de esa página web permite al propio dispositivo móvil comunicarse comunicarse directamente con la aplicación de escritorio, a través del broker MQTT.    
[![](https://markdown-videos-api.jorgenkh.no/url?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Doi3SAmCxBuo)](https://www.youtube.com/watch?v=oi3SAmCxBuo)    
## 5. Instalación
Todo el código mostrado se puede descargar desde este repositorio. El código está organizado en tres carpetar: EstacionTierra, WebAppHTTP y WebAppMQTT.    
Para poner en marcha EstaciónTierra es necesario instalar las librerías *pymavlink* y *paho-mqtt*.    
Para poner en marcha WebAppHTTP es necesario instalar las librerías *Flask* y *paho-mqtt*. 
Para poner en marcha WebAppMQTT solo es necesario instalar la librería *Flask*.    
ATENCIÓN: En los tres casos debe instalarse la versión 1.6.1 de la librería *paho-mqtt*.    
## 6. Retos
Para consolidar los conocimientos que proporciona este repositorio se propone los tres retos siguientes:     
### Reto 1 ###
Hacer que en el dispositivo móvil se muestren más datos de telemetría, además de la altitud del dron (por ejemplo el heading, la velocidad o la posición). Además mejorar la estética de la página web que se muestra al usuario, manipulando los elementos html y los estilos.     
### Reto 2 ###
Introducir el código necesario para que el botón de aterrizar se muestre igual que el de despegar, es decir, se ponga en amarillo en el momento en que se inicie el aterrizaje y se ponga en verde cuando el dron tome tierra. Introducir también el codigo necesario para cambiar el color del botón clicado para marcar la dirección de vuelo, de manera que el botón permanezca en ese color hasta que se pulse otro botón para cambiar la dirección de vuelo.     
### Reto 3 ###
Implementar una arquitectura software alternativa en la que no sea necesario poner en marcha ninguna estación de tierra para controlar el dron desde el móvil.     
## 7. Materiales complementarios ##
En este repositorio [![DroneEngineeringEcosystem Badge](https://img.shields.io/badge/DEE-DronLink-blue.svg)](https://github.com/dronsEETAC/DronLink.git) puede encontrarse toda la información sobre la libreria DronLink, que se usa para controlar el dron (o el simulador SITL).   
En este repositorio [![DroneEngineeringEcosystem Badge](https://img.shields.io/badge/DEE-telecoRenta_taller_de_drones-blue.svg)](https://github.com/dronsEETAC/telecoRenta_taller_de_drones.git) puede encontrarse información sobre cómo trabajar con Mission Planner y el simulador SITL, y también sobre como construir una sencilla estación de tierra en Python como la que se usa en este repositorio.    
En este repositorio [![DroneEngineeringEcosystem Badge](https://img.shields.io/badge/DEE-Programacion_de_drones-blue.svg)](https://github.com/dronsEETAC/Programacion-de-drones.git) se puede encontrar abundante material sobre cómo desarrollar estaciones de tierra en Python mucho más sofisticadas que la que se ha usado aqui (incluyendo la visualización de mapas, trayectorias del dron o control del dron mediante poses el cuerpo).




