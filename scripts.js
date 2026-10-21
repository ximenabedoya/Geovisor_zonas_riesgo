var map = L.map('map', {
  zoomControl: false
}).setView([6.24, -75.58], 13);

L.control.zoom({ position: 'bottomright' }).addTo(map);
L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);

var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

var Esri_WorldStreetMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
});

Esri_WorldImagery.addTo(map);
var layerControl = L.control.layers({ 'Imagen satelital': Esri_WorldImagery, 'Mapa vial': Esri_WorldStreetMap }, null, { position: 'topright', collapsed: true }).addTo(map);
var villaLayerConfigs = [
  { id: 'villa-layer-toggle', statusId: 'villa-layer-status', name: 'Comuna Villa Hermosa', url: 'Data/Comuna%20Villa%20Hermosa.zip', color: '#b64f35', fill: false, pane: 'communePane', bounds: true },
  { id: 'lote-predio-toggle', statusId: 'lote-predio-status', name: 'Lote_Predio', url: 'Data/Lote_Predio.zip', color: '#000000', fill: false, pane: 'parcelsPane' },
  { id: 'amenaza-alta-toggle', statusId: 'amenaza-alta-status', name: 'Amenaza alta por movimiento en masa', url: 'Data/Amenaza_alta.zip', color: '#c62828', fillColor: '#e34d3d', pane: 'riskPane' },
  { id: 'amenaza-media-toggle', statusId: 'amenaza-media-status', name: 'Amenaza media por movimiento en masa', url: 'Data/Amenaza_media.zip', color: '#d97818', fillColor: '#efa43b', pane: 'riskPane' },
  { id: 'amenaza-baja-toggle', statusId: 'amenaza-baja-status', name: 'Amenaza baja por movimiento en masa', url: 'Data/Amenaza_baja.zip', color: '#fff200', fillColor: '#fff200', pane: 'riskPane' },
  { id: 'amenaza-muybaja-toggle', statusId: 'amenaza-muybaja-status', name: 'Amenaza muy baja por movimiento en masa', url: 'Data/Amenaza_muybaja.zip', color: '#39764b', fillColor: '#68a873', pane: 'riskPane' },
  { id: 'amenaza-inundacion-toggle', statusId: 'amenaza-inundacion-status', name: 'Amenaza por inundación', url: 'Data/Amenaza_inundacion.zip', color: '#216f9b', fillColor: '#52a8d1', pane: 'riskPane' },
  { id: 'buffer-toggle', statusId: 'buffer-status', name: 'Retiro obligatorio de vías', url: 'Data/buffer.zip', color: '#7b2cbf', fillColor: '#a78bfa', fillOpacity: 0.25, pane: 'riskPane' },
  { id: 'vias-toggle', statusId: 'vias-status', name: 'Vías', url: 'Data/Vias.zip', color: '#7b2cbf', pane: 'roadsPane', line: true }
];

map.createPane('riskPane').style.zIndex = 410;
map.createPane('roadsPane').style.zIndex = 420;
map.createPane('communePane').style.zIndex = 430;
map.createPane('parcelsPane').style.zIndex = 440;

function setLayerStatus(config, message, isError) {
  var status = document.getElementById(config.statusId);
  status.textContent = message;
  status.classList.toggle('layer-status-error', Boolean(isError));
}

function createFeaturePopup(feature, layer, layerName) {
  var properties = feature.properties || {};
  var content = document.createElement('div');
  var heading = document.createElement('strong');
  heading.textContent = layerName;
  content.appendChild(heading);
  Object.keys(properties).forEach(function (key) {
    var row = document.createElement('div');
    var label = document.createElement('strong');
    label.textContent = key + ': ';
    row.appendChild(label);
    row.appendChild(document.createTextNode(String(properties[key])));
    content.appendChild(row);
  });
  layer.bindPopup(content);
}

function renderAttributeTable(config) {
  var wrapper = document.getElementById('lote-predio-table-wrapper');
  if (!wrapper || !config || !config.layer || config.id !== 'lote-predio-toggle') return;

  var layers = config.layer.getLayers();
  if (!layers.length) {
    wrapper.innerHTML = '<div class="attribute-table-empty">Sin datos cargados.</div>';
    return;
  }

  var records = layers.map(function (layer) {
    var feature = layer.feature || {};
    return feature.properties || {};
  }).filter(function (item) {
    return item && Object.keys(item).length;
  });

  if (!records.length) {
    wrapper.innerHTML = '<div class="attribute-table-empty">La capa no tiene atributos disponibles.</div>';
    return;
  }

  var columns = [];
  records.forEach(function (record) {
    Object.keys(record).forEach(function (key) {
      if (!columns.includes(key)) columns.push(key);
    });
  });

  var table = document.createElement('table');
  table.className = 'attribute-table';

  var thead = document.createElement('thead');
  var headerRow = document.createElement('tr');
  columns.forEach(function (column) {
    var th = document.createElement('th');
    th.textContent = column;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  records.forEach(function (record) {
    var row = document.createElement('tr');
    columns.forEach(function (column) {
      var cell = document.createElement('td');
      var value = record[column];
      cell.textContent = value === null || value === undefined ? '' : String(value);
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  wrapper.innerHTML = '';
  wrapper.appendChild(table);
}

villaLayerConfigs.forEach(function (config) {
  var toggle = document.getElementById(config.id);

  shp(config.url).then(function (geojson) {
    var isLineLayer = Boolean(config.line);
    config.layer = L.geoJSON(geojson, {
      pane: config.pane,
      style: isLineLayer
        ? { color: config.color, weight: 1.5, opacity: 1 }
        : {
            color: config.color,
            weight: config.bounds ? 2.5 : 1,
            opacity: 1,
            fill: config.fill !== false && !config.bounds,
            fillColor: config.fillColor || config.color,
            fillOpacity: config.fillOpacity !== undefined ? config.fillOpacity : 1
          },
      onEachFeature: function (feature, layer) {
        createFeaturePopup(feature, layer, config.name);
      }
    });

    layerControl.addOverlay(config.layer, config.name);
    if (toggle.checked) config.layer.addTo(map);
    if (config.id === 'lote-predio-toggle') {
      renderAttributeTable(config);
    }
    setLayerStatus(config, 'Activa', false);

    if (config.bounds && config.layer.getLayers().length) {
      map.fitBounds(config.layer.getBounds(), { padding: [24, 24], maxZoom: 15 });
    }
  }).catch(function (error) {
    console.error('No se pudo cargar la capa ' + config.name + ':', error);
    toggle.checked = false;
    setLayerStatus(config, 'Error', true);
  });

  toggle.addEventListener('change', function () {
    if (!config.layer) return;
    if (toggle.checked) config.layer.addTo(map);
    else map.removeLayer(config.layer);
  });
});

map.on('overlayadd', function (event) {
  villaLayerConfigs.forEach(function (config) {
    if (event.layer === config.layer) document.getElementById(config.id).checked = true;
  });
});
map.on('overlayremove', function (event) {
  villaLayerConfigs.forEach(function (config) {
    if (event.layer === config.layer) document.getElementById(config.id).checked = false;
  });
});
var basemaps = {
  'Imagery ArcGIS': Esri_WorldImagery,
  'EsquemÃ¡tico ArcGIS': Esri_WorldStreetMap
};

var activeTool = 'move';
var coordinateReadout = document.getElementById('map-coordinate');
var toolHint = document.getElementById('tool-hint');
map.on('mousemove', function (event) { coordinateReadout.textContent = event.latlng.lat.toFixed(5) + '°, ' + event.latlng.lng.toFixed(5) + '°'; });
map.on('mouseout', function () { coordinateReadout.textContent = 'Seleccione una ubicación'; });
var drawLayerGroup = new L.FeatureGroup();
map.addLayer(drawLayerGroup);

var measureLine = null;
var measureStart = null;
var measurePopup = null;

function setActiveTool(tool) {
  activeTool = tool;

  document.querySelectorAll('.tool-btn').forEach(function (button) {
    button.classList.toggle('active', button.dataset.tool === tool);
  });

  var hints = { move: 'Arrastra el mapa para explorar el territorio.', measure: 'Selecciona dos ubicaciones para medir distancia.', marker: 'Haz clic en el mapa para agregar un punto.', polyline: 'Selecciona dos puntos para trazar una línea.', polygon: 'Selecciona tres puntos para trazar un polígono.' };
  if (toolHint) toolHint.textContent = hints[tool] || 'Selecciona una herramienta cartográfica.';

  if (tool === 'move') {
    map.getContainer().style.cursor = 'grab';
    map.dragging.enable();
    map.removeEventListener('click', handleMapClick);
    return;
  }

  map.getContainer().style.cursor = 'crosshair';
  map.dragging.disable();
  map.off('click', handleMapClick);
  map.on('click', handleMapClick);
}

function clearAllDrawings() {
  drawLayerGroup.clearLayers();
  if (measureLine) {
    map.removeLayer(measureLine);
    measureLine = null;
  }
  if (measurePopup) {
    measurePopup.remove();
    measurePopup = null;
  }
  measureStart = null;
}

function addMarker(latlng) {
  var marker = L.marker(latlng, {
    icon: L.divIcon({
      className: 'custom-pin',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    })
  }).addTo(drawLayerGroup);

  marker.bindPopup('<strong>Punto</strong><br>Marcador creado.');
  marker.openPopup();
}

function addPolyline(points) {
  var line = L.polyline(points, {
    color: '#d7263d',
    weight: 4,
    opacity: 0.95
  }).addTo(drawLayerGroup);

  var length = line.getLength();
  line.bindPopup('<strong>LÃ­nea</strong><br>Longitud: ' + length.toFixed(1) + ' m');
  line.openPopup();
}

function addPolygon(points) {
  var polygon = L.polygon(points, {
    color: '#7b2cbf',
    fillColor: '#a78bfa',
    fillOpacity: 0.25,
    weight: 2
  }).addTo(drawLayerGroup);

  polygon.bindPopup('<strong>PolÃ­gono</strong><br>Ãrea creada.');
  polygon.openPopup();
}

function handleMapClick(event) {
  var latlng = event.latlng;

  if (activeTool === 'marker') {
    addMarker(latlng);
    setActiveTool('move');
    return;
  }

  if (activeTool === 'measure') {
    if (!measureStart) {
      measureStart = latlng;
      measureLine = L.polyline([latlng, latlng], {
        color: '#d7263d',
        weight: 4,
        opacity: 0.9
      }).addTo(map);

      measurePopup = L.popup()
        .setLatLng(latlng)
        .setContent('MediciÃ³n iniciada')
        .openOn(map);
      return;
    }

    var distance = measureStart.distanceTo(latlng);
    measureLine.setLatLngs([measureStart, latlng]);
    if (measurePopup) {
      measurePopup.remove();
    }
    measurePopup = L.popup()
      .setLatLng(latlng)
      .setContent('<strong>Distancia</strong><br>' + distance.toFixed(1) + ' m')
      .openOn(map);

    measureStart = null;
    setActiveTool('move');
    return;
  }

  if (activeTool === 'polyline') {
    if (!map._polylineDraft) {
      map._polylineDraft = [latlng];
      var draftLine = L.polyline([latlng, latlng], {
        color: '#d7263d',
        weight: 4,
        opacity: 0.9
      }).addTo(drawLayerGroup);
      map._polylineDraftLayer = draftLine;
      return;
    }

    map._polylineDraft.push(latlng);
    map._polylineDraftLayer.setLatLngs(map._polylineDraft);

    if (map._polylineDraft.length >= 2) {
      addPolyline(map._polylineDraft);
      map._polylineDraft = null;
      map._polylineDraftLayer = null;
      setActiveTool('move');
    }
    return;
  }

  if (activeTool === 'polygon') {
    if (!map._polygonDraft) {
      map._polygonDraft = [latlng];
      map._polygonDraftLayer = L.polygon([latlng, latlng, latlng], {
        color: '#7b2cbf',
        fillColor: '#a78bfa',
        fillOpacity: 0.25,
        weight: 2
      }).addTo(drawLayerGroup);
      return;
    }

    map._polygonDraft.push(latlng);
    map._polygonDraftLayer.setLatLngs(map._polygonDraft);

    if (map._polygonDraft.length >= 3) {
      addPolygon(map._polygonDraft);
      map._polygonDraft = null;
      map._polygonDraftLayer = null;
      setActiveTool('move');
    }
  }
}

document.querySelectorAll('.tool-btn').forEach(function (button) {
  button.addEventListener('click', function () {
    var tool = button.dataset.tool;

    if (tool === 'clear') {
      clearAllDrawings();
      setActiveTool('move');
      return;
    }

    setActiveTool(tool);
  });
});








