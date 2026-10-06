(() => {
    'use strict';

    const byId = id => document.getElementById(id);
    const directions = [...document.querySelectorAll('[data-direction]')];
    const labels = { disconnected: 'Desconectado', connecting: 'Conectando', connected: 'En tierra',
        arming: 'Armando', armed: 'Armado', takingOff: 'Despegando', flying: 'En vuelo',
        landing: 'Aterrizando', returning: 'Regresando' };
    const staleAfter = 10000;
    const events = [];
    let client;
    let serviceReady = false;
    let lastTelemetry = 0;
    let telemetryValid = false;
    let state = '';
    let pending = null;
    let freshness = 'missing';
    let selectedDirection = '';
    let configuredSpeed = null;
    let speedEdited = false;
    let pendingSpeed = null;
    let speedFeedback = '';

    function speedLabel(value) { return `${number(value, 1)} m/s`; }

    function actionLabel(id, label, busy = false) {
        const button = byId(id);
        button.setAttribute('aria-label', label);
        button.setAttribute('aria-busy', String(busy));
        button.title = label;
        button.querySelector('.action-label').textContent = label;
    }

    function renderSpeed(fresh) {
        const allowed = fresh && ['connected', 'flying'].includes(state) && !pending;
        const selected = Number(byId('nav-speed').value);
        byId('nav-speed').disabled = !allowed || configuredSpeed === null || Boolean(pendingSpeed);
        byId('apply-speed').disabled = byId('nav-speed').disabled || selected === configuredSpeed;
        actionLabel('apply-speed', pendingSpeed ? 'Aplicando velocidad…' : 'Aplicar velocidad', Boolean(pendingSpeed));
        byId('nav-speed-value').textContent = speedLabel(selected);
        byId('nav-speed').setAttribute('aria-valuetext', speedLabel(selected));
        byId('speed-status').textContent = !fresh
            ? 'Sin datos recientes.'
            : configuredSpeed === null ? 'Esperando configuración.'
                : pendingSpeed ? `Aplicando ${speedLabel(pendingSpeed.speed)}…`
                    : speedFeedback ? 'Cambio sin confirmar.' : `✓ ${speedLabel(configuredSpeed)}${speedEdited && selected !== configuredSpeed ? ' · Sin aplicar' : ''}`;
    }

    function notice(message, tone = '') {
        byId('notice').textContent = message;
        byId('notice').className = `notice ${tone}`;
    }

    function badge(id, text, tone = '') {
        const compact = { '● Datos recientes': '● En vivo', '⚠ Datos desactualizados': '⚠ Antiguos',
            '✓ Dron conectado': '✓ Conectado', '○ Sin conexión al dron': '○ Desconectado',
            '◌ Conectando dron': '◌ Conectando', '○ Dron desconectado': '○ Desconectado',
            '⚠ Sin confirmación reciente': '⚠ Sin confirmar' };
        byId(id).textContent = compact[text] || text;
        byId(id).title = text;
        byId(id).className = `status ${tone}`;
    }

    function log(message) {
        const entry = { date: new Date(), message };
        events.unshift(entry);
        if (events.length > 100) events.pop();
        const list = byId('activity-log');
        list.querySelector('.empty-log')?.remove();
        const item = document.createElement('li');
        const time = document.createElement('time');
        time.dateTime = entry.date.toISOString();
        time.textContent = entry.date.toLocaleTimeString('es-ES');
        const description = document.createElement('span');
        description.textContent = message;
        item.append(time, description);
        list.prepend(item);
        if (list.children.length > 100) list.lastElementChild.remove();
        byId('export-log').disabled = false;
    }

    function isFresh() {
        return serviceReady && telemetryValid && lastTelemetry > 0 && Date.now() - lastTelemetry < staleAfter;
    }

    function selectDirection(value = '') {
        selectedDirection = value;
        directions.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.direction === value)));
        const button = directions.find(button => button.dataset.direction === value);
        byId('direction-status').textContent = button
            ? `Solicitud enviada: ${button.lastElementChild.textContent}.`
            : 'Sin dirección solicitada.';
    }

    function render() {
        const fresh = isFresh();
        const droneAvailable = fresh && state !== 'disconnected' && state !== 'connecting';
        const flying = droneAvailable && state === 'flying' && !pending;
        renderSpeed(fresh);
        byId('botonConectar').disabled = !serviceReady || droneAvailable || Boolean(pending);
        actionLabel('botonConectar', pending?.kind === 'connect' ? 'Conectando…' : droneAvailable ? 'Dron conectado' : 'Conectar dron', pending?.kind === 'connect');
        byId('botonDespegar').disabled = !droneAvailable || state !== 'connected' || Boolean(pending);
        const takingOff = pending?.kind === 'takeoff' || state === 'takingOff' || state === 'arming';
        actionLabel('botonDespegar', takingOff ? 'Despegando…' : 'Despegar', takingOff);
        byId('altura').disabled = Boolean(pending) || (droneAvailable && state !== 'connected');
        directions.forEach(button => { button.disabled = !flying; });
        byId('botonAterrizar').disabled = !flying;
        const landing = pending?.kind === 'land' || state === 'landing';
        actionLabel('botonAterrizar', landing ? 'Aterrizando…' : 'Aterrizar dron', landing);
        byId('controls-help').textContent = flying
            ? 'Control disponible. La selección permanece hasta la siguiente solicitud.'
            : !fresh ? 'Se necesita telemetría reciente para habilitar las acciones de vuelo.'
                : 'El control manual estará disponible cuando el dron esté en vuelo.';
        if (pending?.kind === 'connect') badge('connection-status', '◌ Conectando dron', 'info');
        else if (droneAvailable) badge('connection-status', '✓ Dron conectado', 'success');
        else if (lastTelemetry) badge('connection-status', state === 'disconnected' ? '○ Dron desconectado' : '⚠ Sin confirmación reciente', 'warning');
        else badge('connection-status', '○ Sin conexión al dron');
        const current = fresh ? 'fresh' : lastTelemetry ? 'stale' : 'missing';
        badge('freshness', current === 'fresh' ? '● Datos recientes' : current === 'stale' ? '⚠ Datos desactualizados' : '○ Sin datos', current === 'fresh' ? 'success' : current === 'stale' ? 'warning' : '');
        if (lastTelemetry) {
            const seconds = Math.floor((Date.now() - lastTelemetry) / 1000);
            byId('last-update').textContent = `Hace ${seconds} s${fresh ? '' : ' · Datos antiguos'}`;
        }
        if (current === 'stale' && freshness !== 'stale') {
            selectDirection();
            notice('La telemetría está desactualizada. Comprueba el dron y la estación de tierra.', 'warning');
            log('Telemetría desactualizada. Acciones de vuelo deshabilitadas.');
        }
        freshness = current;
        window.flightMap?.setAvailability(fresh && state !== 'disconnected' && state !== 'connecting');
    }

    // MQTT QoS 0 with queueing disabled prevents replaying flight commands on reconnection.
    function publish(command, payload, description, kind = null) {
        if (!serviceReady || !client?.connected) {
            notice('El servicio de comunicación no está disponible. Espera a que se reconecte.', 'error');
            return false;
        }
        const operation = kind ? { kind, started: Date.now() } : null;
        if (operation) pending = operation;
        try {
            client.publish(`mobileFlask/demoDash/${command}`, payload, { qos: 0, retain: false }, error => {
                if (!error) return;
                if (pending === operation) pending = null;
                if (command === 'setNavSpeed') pendingSpeed = null;
                notice('No se pudo enviar la solicitud. Comprueba la conexión.', 'error');
                log('Error al enviar una solicitud.');
                selectDirection();
                render();
            });
        } catch {
            if (pending === operation) pending = null;
            if (command === 'setNavSpeed') pendingSpeed = null;
            notice('No se pudo enviar la solicitud. Comprueba la conexión.', 'error');
            render();
            return false;
        }
        log(description);
        if (kind) notice(`${description} Esperando confirmación del dron.`);
        render();
        return true;
    }

    function number(value, digits, min = -Infinity, max = Infinity) {
        return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
            ? value.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits })
            : 'Sin datos';
    }

    function receiveTelemetry(message, packet) {
        // Retained packets cannot establish whether the drone is currently available.
        if (packet?.retain) return;
        let data;
        try { data = JSON.parse(message.toString()); } catch { notice('Se recibió telemetría con formato incorrecto.', 'warning'); return; }
        if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.state !== 'string' || !Object.hasOwn(labels, data.state)) {
            notice('La telemetría no contiene un estado de vuelo reconocido.', 'warning');
            return;
        }
        const previous = state;
        const recovered = freshness === 'stale';
        lastTelemetry = Date.now();
        telemetryValid = true;
        state = data.state;
        window.flightMap?.update(data);
        byId('flight-state').textContent = labels[state];
        byId('alt').textContent = number(data.alt, 1);
        byId('speed').textContent = number(data.groundSpeed, 1, 0);
        configuredSpeed = typeof data.navSpeed === 'number' && Number.isFinite(data.navSpeed) && data.navSpeed >= 0.5 && data.navSpeed <= 5 ? data.navSpeed : null;
        if (pendingSpeed && configuredSpeed === pendingSpeed.speed) {
            const description = `Velocidad manual configurada en la estación: ${speedLabel(configuredSpeed)}.`;
            pendingSpeed = null;
            speedEdited = false;
            speedFeedback = '';
            log(description);
            notice(description, 'success');
        }
        if (configuredSpeed !== null && !speedEdited && !pendingSpeed) byId('nav-speed').value = String(configuredSpeed);
        if (speedFeedback && configuredSpeed === Number(byId('nav-speed').value)) {
            speedFeedback = '';
            speedEdited = false;
        }
        byId('heading').textContent = number(data.heading, 0, 0, 360);
        byId('latitude').textContent = number(data.lat, 6, -90, 90);
        byId('longitude').textContent = number(data.lon, 6, -180, 180);
        byId('flight-mode').textContent = typeof data.flightMode === 'string' && data.flightMode.trim() ? data.flightMode : 'Sin datos';
        if (previous !== state) {
            log(`Estado confirmado: ${labels[state]}.`);
            window.dispatchEvent(new CustomEvent('flight-state-change', { detail: { state } }));
        }
        if (state !== 'flying' && selectedDirection) selectDirection();
        let confirmation = '';
        if (pending?.kind === 'connect' && state !== 'disconnected' && state !== 'connecting') confirmation = 'Conexión con el dron confirmada.';
        if (pending?.kind === 'takeoff' && state === 'flying') confirmation = 'Despegue completado. Control manual disponible.';
        if ((pending?.kind === 'land' || previous === 'landing' || previous === 'returning') && state === 'connected') confirmation = 'Aterrizaje completado. El dron está en tierra.';
        if (confirmation) { pending = null; notice(confirmation, 'success'); log(confirmation); }
        else if (state === 'disconnected') { pending = null; notice('El dron está desconectado. Conecta de nuevo para continuar.', 'warning'); }
        else if (recovered) { notice('Se ha recuperado la recepción de telemetría.', 'success'); log('Telemetría recuperada.'); }
        else if (!previous && !pending) notice('Telemetría recibida. Estado del dron confirmado.', 'success');
        render();
    }

    byId('botonConectar').addEventListener('click', () => {
        if (!byId('botonConectar').disabled) publish('connect', '', 'Conexión solicitada.', 'connect');
    });
    byId('takeoff-form').addEventListener('submit', event => {
        event.preventDefault();
        const input = byId('altura');
        const height = input.valueAsNumber;
        const valid = Number.isSafeInteger(height) && height > 0;
        byId('altitude-error').hidden = valid;
        input.setAttribute('aria-invalid', String(!valid));
        if (!valid) { byId('altitude-error').textContent = 'Introduce un número entero mayor que cero.'; input.focus(); return; }
        if (!byId('botonDespegar').disabled) publish('arm_takeOff', String(height), `Despegue solicitado a ${height} m.`, 'takeoff');
    });
    byId('altura').addEventListener('input', () => { byId('altitude-error').hidden = true; byId('altura').removeAttribute('aria-invalid'); });
    byId('nav-speed').addEventListener('input', () => {
        speedEdited = true;
        speedFeedback = '';
        renderSpeed(isFresh());
    });
    byId('speed-form').addEventListener('submit', event => {
        event.preventDefault();
        if (byId('apply-speed').disabled) return;
        const speed = Number(byId('nav-speed').value);
        if (!Number.isFinite(speed) || speed < 0.5 || speed > 5) return;
        speedFeedback = '';
        pendingSpeed = { speed, started: Date.now() };
        if (!publish('setNavSpeed', String(speed), `Velocidad manual solicitada: ${speedLabel(speed)}.`)) pendingSpeed = null;
        renderSpeed(isFresh());
    });
    byId('botonAterrizar').addEventListener('click', () => {
        if (!byId('botonAterrizar').disabled && publish('Land', '', 'Aterrizaje solicitado.', 'land')) selectDirection();
    });
    directions.forEach(button => button.addEventListener('click', () => {
        if (button.disabled) return;
        const direction = button.dataset.direction;
        if (publish('go', direction, `Movimiento solicitado: ${button.lastElementChild.textContent}.`)) selectDirection(direction);
    }));
    byId('export-log').addEventListener('click', () => {
        const quote = value => `"${String(value).replace(/"/g, '""')}"`;
        const rows = [['Fecha (ISO)', 'Evento'], ...events.slice().reverse().map(entry => [entry.date.toISOString(), entry.message])];
        const blob = new Blob(['\uFEFF' + rows.map(row => row.map(quote).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `registro-vuelo-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    function serviceLost() {
        const wasReady = serviceReady;
        serviceReady = false;
        telemetryValid = false;
        pending = null;
        pendingSpeed = null;
        configuredSpeed = null;
        speedFeedback = '';
        selectDirection();
        byId('broker-status').textContent = 'Servicio sin conexión · Reintentando…';
        if (wasReady) { log('Conexión con el servicio perdida.'); notice('Se perdió la comunicación. Comprueba el dron y espera la reconexión.', 'warning'); }
        render();
        // Keep existing measurements explicitly marked as old, even after broker loss.
        if (state) { badge('freshness', '⚠ Datos desactualizados', 'warning'); byId('last-update').textContent = 'Servicio sin conexión · Valores de la última recepción.'; }
    }

    if (typeof mqtt === 'undefined') {
        byId('broker-status').textContent = 'Servicio no disponible';
        notice('No se pudo cargar la comunicación MQTT. Comprueba tu conexión y recarga la página.', 'error');
        return;
    }
    try {
        client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt', { reconnectPeriod: 2000, connectTimeout: 10000, queueQoSZero: false, clean: true });
    } catch {
        byId('broker-status').textContent = 'Error de comunicación';
        notice('No se pudo iniciar la conexión MQTT. Recarga la página para reintentar.', 'error');
        return;
    }
    client.on('connect', () => {
        client.subscribe('demoDash/mobileFlask/telemetryInfo', { qos: 0 }, (error, granted) => {
            if (error || !granted?.length || granted.some(item => item.qos === 128)) {
                serviceReady = false;
                notice('No se pudo suscribir a la telemetría. Recarga la página para reintentar.', 'error');
                byId('broker-status').textContent = 'Error al recibir telemetría';
                render();
                return;
            }
            if (!client.connected) return;
            serviceReady = true;
            byId('broker-status').textContent = 'Servicio MQTT conectado';
            log('Conexión con el servicio MQTT establecida.');
            notice('Servicio listo. Activa las peticiones externas en la estación de tierra y conecta el dron.');
            render();
        });
    });
    client.on('message', (topic, message, packet) => {
        if (topic === 'demoDash/mobileFlask/telemetryInfo' && serviceReady) receiveTelemetry(message, packet);
    });
    client.on('offline', serviceLost);
    client.on('close', serviceLost);
    client.on('error', () => {
        byId('broker-status').textContent = 'Error de comunicación · Reintentando…';
        notice('Error de comunicación con el servicio MQTT. Se reintentará la conexión.', 'error');
    });
    setInterval(() => {
        if (pendingSpeed && Date.now() - pendingSpeed.started > 10000) {
            pendingSpeed = null;
            speedFeedback = 'Cambio sin confirmar. Comprueba la estación antes de volver a aplicarlo.';
            log('No se ha confirmado el cambio de velocidad manual.');
        }
        if (pending && Date.now() - pending.started > (pending.kind === 'connect' ? 15000 : 60000)) {
            const kind = pending.kind;
            pending = null;
            notice('La solicitud no se ha confirmado a tiempo. Revisa el estado del dron antes de continuar.', 'warning');
            log(`Sin confirmación de ${kind === 'connect' ? 'conexión' : kind === 'takeoff' ? 'despegue' : 'aterrizaje'} dentro del plazo de espera.`);
        }
        render();
    }, 1000);
    render();
})();
