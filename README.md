# personal-web-site

Este repositorio contiene un prototipo de sitio web para mostrar la evolución de temperaturas y humedad en el hogar.

## Arquitectura

- `mqtt-broker`: broker MQTT con Eclipse Mosquitto
- `rtl433`: gateway RTL_433 que recibe señales 433 MHz y publica a MQTT
- `elasticsearch`: almacena series temporales de temperatura
- `backend`: API Node/Express que ingesta MQTT, guarda en Elasticsearch y expone datos
- `frontend`: app React con Vite para visualizar sensores, temperatura y humedad local, y clima AEMET

## Cómo arrancar

1. Copia el archivo de ejemplo `.env.example` a `.env` y añade tu clave AEMET si tienes una.
2. Ejecuta `docker compose up --build`.
3. Abre `http://localhost:5173` para ver la interfaz.
4. La API está disponible en `http://localhost:4000/api`.

## Notas MQTT

- El contenedor `rtl433` publica los datos del receptor 433 MHz en MQTT bajo `sensor/<id>`.
- El backend se suscribe a `sensor/+` y extrae `temperature` y `humidity` de los mensajes JSON.

## Configuración AEMET

- `AEMET_API_KEY`: clave para acceder a los datos de AEMET
- `AEMET_LOCATION_CODE`: código de municipio o estación para la predicción

## Datos de Elasticsearch

La ruta de datos se configura con `ES_DATA_PATH`. Si no se define, Docker Compose
utiliza `./.data/elasticsearch` dentro del proyecto.

Para desarrollo local, añade a `.env`:

```env
ES_DATA_PATH=./.data/elasticsearch
```

En un servidor Linux, usa una ruta absoluta en un archivo de entorno específico:

```env
ES_DATA_PATH=/srv/personal-web-site/data/elasticsearch
```

Y arranca el servicio con:

```bash
docker compose --env-file .env.linux up -d --build
```

Antes del primer arranque en Linux, crea el directorio y asigna permisos al usuario
que Elasticsearch usa dentro del contenedor:

```bash
sudo install -d -o 1000 -g 0 -m 0775 /srv/personal-web-site/data/elasticsearch
sudo sysctl -w vm.max_map_count=262144
```

## Notas

- El contenedor `rtl433` espera acceso al dispositivo USB del receptor SDR.
- Si no se configura AEMET, el backend devuelve datos de ejemplo de forma temporal.
