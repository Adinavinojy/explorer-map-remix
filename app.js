// ================================================================
// APP.JS — Main Application: Map, Fog-of-War, UI, GPS/Simulate
// ================================================================

(async function () {
  // ─── STATE ───────────────────────────────────────────────────
  let map, playerMarker, thresholdCircle;
  let playerLat = 9.6517, playerLng = 76.7235;  // Default: Paika (Kottayam)
  let thresholdMeters = 300; // "Torch" vision radius
  let simulateMode = true;   // Start in simulate mode by default
  let panMode = false;       // When true, clicks pan the map (don't move player)
  let watchId = null;
  let player, totalScore = 0;
  let poiMarkers = {};       // id → leaflet marker
  let allDiscovered = [];

  // ─── INIT PLAYER ─────────────────────────────────────────────
  player = LEADERBOARD.init();
  totalScore = player.points;

  // ─── MAP INIT ────────────────────────────────────────────────
  map = L.map('map', {
    center: [playerLat, playerLng],
    zoom: 15,
    zoomControl: true,
  });

  // ─── TILE LAYERS ───────────────────────────────────────────────
  // OSM tiles — pristine bright native maps
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  // ─── DAY/NIGHT THEME ENGINE ──────────────────────────────────
  const themeSelect = document.getElementById('themeSelect');
  const fogOverlay = document.getElementById('fogOverlay');

  function updateTheme() {
    let mode = themeSelect ? themeSelect.value : 'auto';
    if (mode === 'auto') {
      const hour = new Date().getHours();
      mode = (hour >= 6 && hour < 18) ? 'day' : 'night';
    }
    
    // Day mode: misty clouds. Night mode: dark hacker mood.
    if (mode === 'day') {
      if(fogOverlay) {
        fogOverlay.style.background = 'rgba(255, 255, 255, 0.45)';
        fogOverlay.style.backdropFilter = 'blur(10px) grayscale(0.5) brightness(1.2)';
        fogOverlay.style.webkitBackdropFilter = 'blur(10px) grayscale(0.5) brightness(1.2)';
      }
      map.getContainer().style.background = '#e5e3df';
    } else {
      if(fogOverlay) {
        fogOverlay.style.background = 'rgba(8, 10, 20, 0.4)';
        fogOverlay.style.backdropFilter = 'brightness(0.3) contrast(1.3) saturate(0.1)';
        fogOverlay.style.webkitBackdropFilter = 'brightness(0.3) contrast(1.3) saturate(0.1)';
      }
      map.getContainer().style.background = '#0e1220';
    }
  }

  if (themeSelect) themeSelect.addEventListener('change', updateTheme);
  updateTheme(); // Init theme



  // ─── PLAYER MARKER ───────────────────────────────────────────
  const playerIcon = L.divIcon({
    className: '',
    html: '<div class="player-dot"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
  playerMarker = L.marker([playerLat, playerLng], { icon: playerIcon, zIndexOffset: 1000 }).addTo(map);

  // ─── THRESHOLD CIRCLE ────────────────────────────────────────
  thresholdCircle = L.circle([playerLat, playerLng], {
    radius: thresholdMeters,
    color: '#6c63ff',
    fillColor: '#6c63ff',
    fillOpacity: 0.08,
    weight: 2,
    dashArray: '6 4',
  }).addTo(map);

  // ─── POI MARKERS (hidden initially) ──────────────────────────
  GAME.getAllPois().forEach(poi => {
    const icon = L.divIcon({
      className: '',
      html: `<div class="poi-marker hidden-poi" data-id="${poi.id}" title="${poi.name}">
               <div class="poi-inner">${poi.icon}</div>
             </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
    const marker = L.marker([poi.lat, poi.lng], { icon, opacity: 0 }).addTo(map);
    poiMarkers[poi.id] = marker;
  });

  // ─── SVG MASK ENGINE (FOG OF WAR) ────────────────────────────
  const fogHoles = document.getElementById('fog-holes');

  function drawFog() {
    if (!fogHoles) return;
    
    let svgRaw = '';
    
    // 1. Hole for Player "Torch Vision" (uses thresholdMeters)
    const playerPt = map.latLngToContainerPoint([playerLat, playerLng]);
    const pEdgeLng = playerLng + (thresholdMeters / 111320 * Math.cos(playerLat * Math.PI/180));
    const pEdgePt = map.latLngToContainerPoint([playerLat, pEdgeLng]);
    const pRadiusPx = Math.max(10, Math.abs(pEdgePt.x - playerPt.x));
    // SVG radial gradient simulated via opacity mask fading is possible, but solid circles look great for puzzle pieces.
    svgRaw += `<circle cx="${playerPt.x}" cy="${playerPt.y}" r="${pRadiusPx}" fill="black" />`;

    // 2. Huge Holes for Discovered Regions (Cities/Towns)
    GAME.getDiscovered().forEach(region => {
      const pt = map.latLngToContainerPoint([region.lat, region.lng]);
      const edgeLng = region.lng + (region.radiusMeters / 111320 * Math.cos(region.lat * Math.PI/180));
      const edgePt = map.latLngToContainerPoint([region.lat, edgeLng]);
      const rPx = Math.max(1, Math.abs(edgePt.x - pt.x));
      svgRaw += `<circle cx="${pt.x}" cy="${pt.y}" r="${rPx}" fill="black" />`;
    });

    fogHoles.innerHTML = svgRaw;
  }

  map.on('move zoom moveend zoomend', drawFog);
  drawFog();

  // ─── MOVE PLAYER ─────────────────────────────────────────────
  function movePlayer(lat, lng) {
    playerLat = lat;
    playerLng = lng;
    playerMarker.setLatLng([lat, lng]);
    thresholdCircle.setLatLng([lat, lng]);
    drawFog();
    runDiscovery();
    updateStatsBar();
  }

  // ─── RUN DISCOVERY ───────────────────────────────────────────
  function runDiscovery() {
    const found = GAME.checkDiscovery(playerLat, playerLng, thresholdMeters);
    found.forEach(poi => {
      // Show marker
      const marker = poiMarkers[poi.id];
      if (marker) {
        marker.setOpacity(1);
        marker.getElement().querySelector('.poi-marker')?.classList.remove('hidden-poi');
        marker.getElement().querySelector('.poi-marker')?.classList.add('discovered-poi');
      }

      // Award points
      player = LEADERBOARD.addPoints(poi.points);
      totalScore = player.points;
      updateScoreChip();

      // Add to discoveries panel
      allDiscovered.push(poi);
      renderDiscoveries();

      // Pulse animation on map
      spawnPulseAt(poi.lat, poi.lng);

      // Toast
      showToast(poi.icon, `Discovered: ${poi.name}`, `+${poi.points} pts • ${poi.label}`, 'discovery');
    });

    if (found.length > 0) {
      renderLeaderboard();
    }
  }

  // ─── GPS MODE ────────────────────────────────────────────────
  function startGPS() {
    if (!navigator.geolocation) {
      showToast('⚠️', 'GPS Unavailable', 'Your browser does not support location', 'warning');
      return;
    }

    if (window.location.protocol !== 'https:' && window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'localhost') {
      showToast('🔒', 'HTTPS Required', 'GPS only works on secure connections', 'warning');
      return;
    }

    showToast('⏳', 'Locating...', 'Searching for GPS signal...', 'discovery');

    if (watchId) navigator.geolocation.clearWatch(watchId);
    
    let firstLock = true;
    watchId = navigator.geolocation.watchPosition(
      pos => {
        movePlayer(pos.coords.latitude, pos.coords.longitude);
        
        // Auto-pan to location continuously during tracking, unless user activated Pan Mode
        if (!panMode) {
          map.panTo([pos.coords.latitude, pos.coords.longitude], { animate: true, duration: 1 });
        }
        
        if (firstLock) {
          showToast('📍', 'GPS Active', 'Tracking your real location', 'discovery');
          firstLock = false;
        }
      },
      err => {
        console.warn('GPS error', err);
        stopGPS();
        if (err.code === 1) {
          showToast('🚫', 'Permission Denied', 'Please allow location access in your browser', 'warning');
        } else if (err.code === 2) {
          showToast('📡', 'Signal Lost', 'Could not determine your location', 'warning');
        } else if (err.code === 3) {
          showToast('⏱️', 'Timeout', 'Taking too long to find GPS signal', 'warning');
        } else {
          showToast('⚠️', 'GPS Error', err.message, 'warning');
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
    
    simulateMode = false;
    document.getElementById('simHint').classList.add('hidden');
    document.getElementById('simToggle').checked = false;
  }

  function stopGPS() {
    if (watchId) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    simulateMode = true;
    document.getElementById('simHint').classList.remove('hidden');
    document.getElementById('simToggle').checked = true;
  }

  // ─── SIMULATE: Click-to-move (only in move mode, not pan mode) ───
  map.on('click', e => {
    if (!simulateMode || panMode) return;
    movePlayer(e.latlng.lat, e.latlng.lng);
  });

  // Double-tap / right-click always moves even in pan mode
  map.on('dblclick', e => {
    if (!simulateMode) return;
    e.originalEvent.preventDefault();
    movePlayer(e.latlng.lat, e.latlng.lng);
  });

  // ─── PAN/MOVE MODE TOGGLE ─────────────────────────────────────
  const panBtn = document.getElementById('panBtn');
  panBtn.addEventListener('click', () => {
    panMode = !panMode;
    panBtn.classList.toggle('active', panMode);
    panBtn.title = panMode ? 'Pan Mode ON (click on map to switch to Move Mode)' : 'Move Mode — click map to teleport';
    panBtn.textContent = panMode ? '✋' : '👆';
    showToast(panMode ? '✋' : '👆', panMode ? 'Pan Mode' : 'Move Mode', panMode ? 'Drag to explore map, double-tap to move' : 'Click anywhere to move your player', 'warning');
  });

  // ─── THRESHOLD CONTROL ───────────────────────────────────────
  // Update pan button initial state
  const panBtn2 = document.getElementById('panBtn');
  if (panBtn2) { panBtn2.textContent = '👆'; panBtn2.title = 'Move Mode — click map to teleport'; }

  const slider = document.getElementById('thresholdSlider');
  const threshDisplay = document.getElementById('thresholdDisplay');
  const presets = document.querySelectorAll('.preset-btn');

  function setThreshold(val) {
    thresholdMeters = parseInt(val);
    threshDisplay.textContent = thresholdMeters;
    slider.value = thresholdMeters;
    const pct = ((thresholdMeters - parseInt(slider.min)) / (parseInt(slider.max) - parseInt(slider.min))) * 100;
    slider.style.setProperty('--pct', pct + '%');
    thresholdCircle.setRadius(thresholdMeters);
    drawFog();
    updateStatsBar();

    // Update preset active state
    presets.forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.val) === thresholdMeters);
    });
  }

  slider.addEventListener('input', () => setThreshold(slider.value));
  presets.forEach(b => b.addEventListener('click', () => setThreshold(b.dataset.val)));
  setThreshold(thresholdMeters);

  // ─── PLAYER NAME ─────────────────────────────────────────────
  const nameInput = document.getElementById('playerNameInput');
  nameInput.value = player.name;
  nameInput.addEventListener('change', () => {
    player = LEADERBOARD.rename(nameInput.value);
    renderLeaderboard();
    updateScoreChip();
  });

  // ─── SIMULATE TOGGLE ─────────────────────────────────────────
  document.getElementById('simToggle').checked = simulateMode;
  document.getElementById('simToggle').addEventListener('change', e => {
    if (e.target.checked) { stopGPS(); }
    else { startGPS(); }
  });

  // ─── GPS BUTTON ──────────────────────────────────────────────
  document.getElementById('gpsBtn').addEventListener('click', () => {
    if (simulateMode) {
      startGPS();
    } else {
      map.panTo([playerLat, playerLng], { animate: true, duration: 0.5 });
    }
  });

  // ─── PANEL TOGGLES ───────────────────────────────────────────
  function togglePanel(panelId, btnId) {
    const panel = document.getElementById(panelId);
    const btn = document.getElementById(btnId);
    panel.classList.toggle('hidden');
    btn.classList.toggle('active');
  }

  document.getElementById('settingsBtn').addEventListener('click', () => togglePanel('settingsPanel', 'settingsBtn'));
  document.getElementById('settingsClose').addEventListener('click', () => togglePanel('settingsPanel', 'settingsBtn'));
  document.getElementById('leaderboardBtn').addEventListener('click', () => { togglePanel('leaderboardPanel', 'leaderboardBtn'); renderLeaderboard(); });
  document.getElementById('leaderboardClose').addEventListener('click', () => togglePanel('leaderboardPanel', 'leaderboardBtn'));
  document.getElementById('discoverBtn').addEventListener('click', () => togglePanel('discoveryPanel', 'discoverBtn'));
  document.getElementById('discoveryClose').addEventListener('click', () => togglePanel('discoveryPanel', 'discoverBtn'));
  document.getElementById('infoBtn').addEventListener('click', () => togglePanel('infoPanel', 'infoBtn'));
  document.getElementById('infoClose').addEventListener('click', () => togglePanel('infoPanel', 'infoBtn'));
  document.getElementById('scoreChip').addEventListener('click', () => { togglePanel('leaderboardPanel', 'leaderboardBtn'); renderLeaderboard(); });

  // ─── RESET DATA ──────────────────────────────────────────────
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm("Are you sure you want to reset all your progress? This deletes all discoveries and points. It cannot be undone.")) {
      localStorage.removeItem('explorer_lb_v2');
      location.reload();
    }
  });

  // ─── SCORE CHIP UPDATE ───────────────────────────────────────
  function updateScoreChip() {
    const state = LEADERBOARD.load();
    const pts = state?.player?.points ?? 0;
    const badge = LEADERBOARD.getBadge(pts);
    document.getElementById('scoreVal').textContent = pts.toLocaleString();
    document.getElementById('scoreBadge').textContent = badge.icon;
  }
  updateScoreChip();

  // ─── STATS BAR ───────────────────────────────────────────────
  function updateStatsBar() {
    const state = LEADERBOARD.load();
    const disc = state?.player?.discovered ?? 0;
    document.getElementById('statDiscovered').textContent = disc;
    document.getElementById('statTotal').textContent = GAME.getAllPois().length;
    document.getElementById('statThresh').textContent = thresholdMeters + 'm';
  }
  updateStatsBar();

  // ─── LEADERBOARD RENDER ──────────────────────────────────────
  function renderLeaderboard() {
    const lb = LEADERBOARD.getLeaderboard();
    const me = LEADERBOARD.load()?.player;
    const badge = LEADERBOARD.getBadge(me?.points ?? 0);

    // Me card
    document.getElementById('lbMeName').textContent = me?.name ?? 'Explorer';
    document.getElementById('lbMePts').textContent = (me?.points ?? 0).toLocaleString();
    document.getElementById('lbMeDisc').textContent = me?.discovered ?? 0;
    document.getElementById('lbMeBadge').textContent = badge.icon + ' ' + badge.label;
    const meAvatar = document.getElementById('lbMeAvatar');
    meAvatar.textContent = (me?.name ?? 'E')[0].toUpperCase();
    meAvatar.style.background = `linear-gradient(135deg, ${me?.avatar?.[0] ?? '#6c63ff'}, ${me?.avatar?.[1] ?? '#a29bfe'})`;

    // List
    const list = document.getElementById('lbList');
    list.innerHTML = '';
    lb.forEach((entry, idx) => {
      const rank = idx + 1;
      const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
      const badge = LEADERBOARD.getBadge(entry.points);
      const avatarColor = entry.avatar ? `linear-gradient(135deg, ${entry.avatar[0]}, ${entry.avatar[1]})` : 'linear-gradient(135deg, #6c63ff, #a29bfe)';
      const item = document.createElement('div');
      item.className = 'lb-item' + (entry.isMe ? ' is-me' : '');
      item.innerHTML = `
        <div class="lb-rank ${rankClass}">${rankClass ? {gold:'🥇',silver:'🥈',bronze:'🥉'}[rankClass] : rank}</div>
        <div class="lb-avatar" style="background:${avatarColor}">${entry.name[0].toUpperCase()}</div>
        <div class="lb-name">${entry.name}${entry.isMe ? ' <span style="color:var(--accent);font-size:0.7rem">(you)</span>' : ''}</div>
        <div class="lb-badge">${badge.icon}</div>
        <div class="lb-pts">${entry.points.toLocaleString()}</div>
      `;
      list.appendChild(item);
    });
  }
  renderLeaderboard();

  // ─── DISCOVERIES RENDER ──────────────────────────────────────
  function renderDiscoveries() {
    const panel = document.getElementById('discoveryPanel');
    const list = document.getElementById('discoveryList');
    if (allDiscovered.length === 0) {
      list.innerHTML = '<div class="empty-discover">Move around to discover new places!</div>';
      return;
    }
    panel.classList.remove('hidden');
    list.innerHTML = [...allDiscovered].reverse().map(poi => `
      <div class="discovery-card">
        <div class="dc-icon">${poi.icon}</div>
        <div class="dc-name">${poi.name}</div>
        <div class="dc-pts">+${poi.points} pts</div>
      </div>
    `).join('');
  }
  renderDiscoveries();

  // ─── PULSE ANIMATION ─────────────────────────────────────────
  function spawnPulseAt(lat, lng) {
    const pt = map.latLngToContainerPoint([lat, lng]);
    const ring = document.createElement('div');
    ring.className = 'pulse-ring';
    ring.style.cssText = `width:40px;height:40px;left:${pt.x - 20}px;top:${pt.y - 20}px`;
    document.getElementById('map').appendChild(ring);

    // Add a second delayed ring
    setTimeout(() => {
      const ring2 = document.createElement('div');
      ring2.className = 'pulse-ring';
      ring2.style.cssText = `width:40px;height:40px;left:${pt.x - 20}px;top:${pt.y - 20}px;animation-delay:0.25s`;
      document.getElementById('map').appendChild(ring2);
      setTimeout(() => ring2.remove(), 1800);
    }, 200);

    setTimeout(() => ring.remove(), 1400);
  }

  // ─── TOAST ───────────────────────────────────────────────────
  function showToast(icon, title, sub, type = '') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        <div class="toast-sub">${sub}</div>
      </div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('dismiss');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  // ─── INITIAL TOAST ───────────────────────────────────────────
  setTimeout(() => {
    showToast('🗺️', 'Welcome, Explorer!', simulateMode ? 'Click anywhere on the map to move' : 'GPS active — walk to discover!', 'discovery');
  }, 800);

  // Start with discoveries panel collapsed
  document.getElementById('discoveryPanel').classList.add('hidden');
  document.getElementById('settingsPanel').classList.remove('hidden');

  // POI marker style injection
  const style = document.createElement('style');
  style.textContent = `
    .poi-marker {
      width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%;
      border: 2px solid rgba(0,212,170,0.7);
      background: rgba(14,18,32,0.85);
      font-size: 1.2rem;
      box-shadow: 0 0 12px rgba(0,212,170,0.4), 0 2px 8px rgba(0,0,0,0.5);
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }
    .poi-marker:hover { transform: scale(1.15); box-shadow: 0 0 20px rgba(0,212,170,0.6); }
    .discovered-poi { border-color: var(--accent2) !important; animation: poiPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
    @keyframes poiPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  `;
  document.head.appendChild(style);

})();
