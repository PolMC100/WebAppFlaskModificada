(() => {
    'use strict';

    const byId = id => document.getElementById(id);
    const container = byId('flight-map');
    const follow = byId('follow-drone');
    const trace = byId('show-trajectory');
    const clear = byId('clear-trajectory');
    const center = byId('center-drone');
    const maxPoints = 2000;
    const staleAfter = 10000;
    let map;
    let marker;
    let position = null;
    let positionTime = 0;
    let positionValid = false;
    let heading = null;
    let available = false;
    let segments = [];
    let pointCount = 0;
    let newSegment = true;
    let firstPosition = true;

    function status(text, tone = '') {
        byId('map-status').textContent = text;
        byId('map-status').className = `status ${tone}`;
    }

    if (!container || typeof L === 'undefined') {
        if (container) {
            status('⚠ Mapa no disponible', 'warning');
            byId('map-description').textContent = 'No se pudo cargar el mapa. Comprueba tu conexión y recarga la página. Las coordenadas siguen disponibles en la telemetría.';
        }
        return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
        map = L.map(container, { scrollWheelZoom: false, zoomAnimation: !reducedMotion,
            fadeAnimation: !reducedMotion, markerZoomAnimation: !reducedMotion }).setView([20, 0], 2);
        const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        tiles.on('tileerror', () => { byId('map-tile-error').hidden = false; });
        // A new viewport load can recover after a temporary network error.
        let tileErrors = false;
        tiles.on('loading', () => { tileErrors = false; });
        tiles.on('tileerror', () => { tileErrors = true; });
        tiles.on('load', () => { byId('map-tile-error').hidden = !tileErrors; });
        L.control.scale({ imperial: false }).addTo(map);
    } catch {
        status('⚠ Mapa no disponible', 'warning');
        byId('map-description').textContent = 'No se pudo iniciar el mapa. Las coordenadas siguen disponibles en la telemetría.';
        return;
    }

    const route = L.polyline([], { color: '#2563eb', weight: 3, opacity: 0.8, interactive: false });
    trace.disabled = false;

    function centerPosition(zoom = map.getZoom(), animate = false) {
        if (!position) return;
        const bounds = container.getBoundingClientRect();
        const visibleBounds = selector => {
            const element = document.querySelector(selector);
            const rect = element?.getBoundingClientRect();
            return rect && rect.width && rect.height ? rect : null;
        };
        const header = visibleBounds('.page-header');
        const notice = visibleBounds('#notice');
        let left = 16;
        let right = bounds.width - 16;
        const top = Math.max(header?.bottom || 0, notice?.bottom || 0) - bounds.top + 16;
        let bottom = bounds.height - 32;
        if (window.matchMedia('(min-width: 1024px)').matches) {
            const controls = visibleBounds('.controls');
            const data = visibleBounds('.flight-data');
            const tools = visibleBounds('#map-tools');
            if (controls) left = controls.right - bounds.left + 16;
            if (data) right = data.left - bounds.left - 16;
            if (tools) bottom = tools.top - bounds.top - 16;
        } else {
            const dock = visibleBounds('.mobile-dock');
            if (dock) bottom = dock.top - bounds.top - 12;
            const panel = visibleBounds('.controls') || visibleBounds('.flight-data') || visibleBounds('#map-tools');
            if (panel) {
                if (window.matchMedia('(max-height: 500px)').matches) right = panel.left - bounds.left - 12;
                else bottom = panel.top - bounds.top - 12;
            }
        }
        // Keep the drone in the map area left visible by the surrounding panels.
        const target = L.point((left + Math.max(left, right)) / 2, (top + Math.max(top, bottom)) / 2);
        const offset = map.getSize().divideBy(2).subtract(target);
        const viewCenter = map.unproject(map.project(position, zoom).add(offset), zoom);
        map.setView(viewCenter, zoom, { animate });
    }

    function traceDescription() {
        byId('trajectory-help').textContent = trace.checked
            ? `Activada · ${pointCount} puntos registrados (máximo ${maxPoints}). Los intervalos sin datos no se unen.`
            : pointCount ? 'Desactivada. Recorrido oculto y registro pausado; se conserva hasta limpiar o recargar.'
                : 'Desactivada. Actívala para registrar y mostrar el recorrido desde ese momento.';
        clear.disabled = pointCount === 0;
    }

    function refreshMarker(fresh) {
        if (!marker) return;
        const element = marker.getElement();
        if (!element) return;
        element.classList.toggle('outdated', !fresh);
        const arrow = element.querySelector('.drone-arrow');
        const dot = element.querySelector('.drone-dot');
        arrow.hidden = heading === null;
        dot.hidden = heading !== null;
        if (heading !== null) arrow.style.transform = `rotate(${heading}deg)`;
        element.setAttribute('aria-label', `Dron${fresh ? '' : ', última posición conocida'}${heading === null ? ', sin rumbo' : `, rumbo ${Math.round(heading)} grados`}`);
    }

    function setAvailability(value) {
        available = value;
        const fresh = available && positionValid && Date.now() - positionTime < staleAfter;
        if (!fresh) newSegment = true;
        refreshMarker(fresh);
        if (!position) {
            status('○ Sin posición');
            byId('map-description').textContent = 'Esperando una posición válida. El mapa mantiene el norte arriba.';
        } else if (!fresh) {
            status('⚠ Última posición', 'warning');
            byId('map-description').textContent = 'Posición sin confirmar o desactualizada. Se conserva la última ubicación conocida.';
        } else {
            status('● Posición reciente', 'success');
            byId('map-description').textContent = heading === null
                ? 'Posición actual · Sin rumbo disponible. Norte arriba.'
                : `Rumbo ${Math.round(heading)}° · Norte arriba${follow.checked ? ' · Siguiendo al dron' : ' · Vista libre'}.`;
        }
    }

    function validNumber(value, min, max) {
        return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
    }

    function appendPoint(next) {
        let segment = segments[segments.length - 1];
        const previous = segment?.[segment.length - 1];
        // Do not draw a line across the entire map when crossing the date line.
        if (newSegment || !segment || (previous && Math.abs(previous.lng - next.lng) > 180)) {
            segment = [];
            segments.push(segment);
            newSegment = false;
        }
        if (segment.length && segment[segment.length - 1].distanceTo(next) < 0.5) return;
        segment.push(next);
        pointCount++;
        while (pointCount > maxPoints) {
            segments[0].shift();
            pointCount--;
            if (!segments[0].length) segments.shift();
        }
        route.setLatLngs(segments);
        traceDescription();
    }

    function update(data) {
        const now = Date.now();
        if (!positionValid || now - positionTime >= staleAfter) newSegment = true;
        positionValid = validNumber(data.lat, -90, 90) && validNumber(data.lon, -180, 180)
            && data.state !== 'disconnected' && data.state !== 'connecting';
        if (!positionValid) { newSegment = true; setAvailability(available); return; }
        position = L.latLng(data.lat, data.lon);
        positionTime = now;
        heading = validNumber(data.heading, 0, 360) ? data.heading % 360 : null;
        if (!marker) {
            // Rotate the inner arrow only; Leaflet owns the outer positioning transform.
            const icon = L.divIcon({ className: 'drone-marker', iconSize: [40, 40], iconAnchor: [20, 20],
                html: '<span class="drone-arrow" aria-hidden="true"><svg viewBox="0 0 40 40" width="40" height="40"><path d="M20 4 L33 33 L20 26 L7 33 Z" fill="currentColor" stroke="white" stroke-width="2.5" stroke-linejoin="round"/></svg></span><span class="drone-dot" hidden aria-hidden="true"></span>' });
            marker = L.marker(position, { icon, title: 'Posición del dron', alt: 'Dron', keyboard: false, interactive: false }).addTo(map);
        } else marker.setLatLng(position);
        center.disabled = false;
        follow.disabled = false;
        if (firstPosition) {
            // The first location establishes the useful view, even if following is off.
            centerPosition(17);
            firstPosition = false;
        } else if (follow.checked) centerPosition();
        if (trace.checked) appendPoint(position);
    }

    function stopFollowing() {
        follow.checked = false;
        setAvailability(available);
    }
    map.on('dragstart', stopFollowing);
    container.addEventListener('keydown', event => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) stopFollowing();
    });
    center.addEventListener('click', () => {
        centerPosition(Math.max(map.getZoom(), 17), !reducedMotion);
    });
    follow.addEventListener('change', () => {
        if (follow.checked) centerPosition(map.getZoom(), !reducedMotion);
        setAvailability(available);
    });
    trace.addEventListener('change', () => {
        newSegment = true;
        if (trace.checked) {
            route.addTo(map);
            // Start at the latest location only when it is still current.
            if (available && positionValid && Date.now() - positionTime < staleAfter) appendPoint(position);
        } else route.remove();
        traceDescription();
    });
    clear.addEventListener('click', () => {
        segments = [];
        pointCount = 0;
        newSegment = true;
        route.setLatLngs([]);
        traceDescription();
    });
    if (typeof ResizeObserver !== 'undefined') {
        let scheduled = false;
        const observer = new ResizeObserver(() => {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(() => {
                scheduled = false;
                map.invalidateSize({ pan: false });
                if (follow.checked) centerPosition();
            });
        });
        [container, ...document.querySelectorAll('.page-header, #notice, .controls, .flight-data, #map-tools, .mobile-dock')]
            .forEach(element => observer.observe(element));
    }
    window.flightMap = { update, setAvailability };
})();
