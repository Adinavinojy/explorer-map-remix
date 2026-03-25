// ================================================================
// GAME.JS — Discovery Engine, POI Data, Scoring
// ================================================================

const GAME = (() => {
  // ─── POI DATABASE (Kochi + generic expandable) ───
  // type → { icon, points, label }
  const POI_TYPES = {
    town:    { icon: '🏘️', points: 80,  label: 'Town' },
    city:    { icon: '🏙️', points: 150, label: 'City' },
    village: { icon: '🏡', points: 40,  label: 'Village' }
  };

  // ─── REGIONS DATA (Kottayam District) ───
  const POIS_RAW = [
    { id: 'r001', name: 'Paika', lat: 9.6517, lng: 76.7235, type: 'town', radiusMeters: 2500 },
    { id: 'r002', name: 'Kuruvikoodu', lat: 9.6250, lng: 76.7230, type: 'village', radiusMeters: 1800 },
    { id: 'r003', name: 'Poovarany', lat: 9.6663, lng: 76.7134, type: 'village', radiusMeters: 2000 },
    { id: 'r004', name: 'Pala', lat: 9.7083, lng: 76.6849, type: 'city', radiusMeters: 4000 },
    { id: 'r005', name: 'Ponkunnam', lat: 9.5750, lng: 76.7720, type: 'town', radiusMeters: 3000 },
    { id: 'r006', name: 'Kanjirappally', lat: 9.5510, lng: 76.7860, type: 'city', radiusMeters: 3500 },
    { id: 'r007', name: 'Erattupetta', lat: 9.6910, lng: 76.7830, type: 'town', radiusMeters: 3000 },
    { id: 'r008', name: 'Bharananganam', lat: 9.7120, lng: 76.7240, type: 'town', radiusMeters: 2000 },
    { id: 'r009', name: 'Kadanad', lat: 9.7390, lng: 76.6970, type: 'village', radiusMeters: 2200 },
    { id: 'r010', name: 'Elikkulam', lat: 9.6130, lng: 76.7260, type: 'village', radiusMeters: 2500 },
    { id: 'r011', name: 'Pallickathodu', lat: 9.5930, lng: 76.6570, type: 'town', radiusMeters: 2500 },
    { id: 'r012', name: 'Kidangoor', lat: 9.6840, lng: 76.6020, type: 'town', radiusMeters: 2500 },
    { id: 'r013', name: 'Uzhavoor', lat: 9.7710, lng: 76.5910, type: 'village', radiusMeters: 2000 },
    { id: 'r014', name: 'Ramapuram', lat: 9.8020, lng: 76.6660, type: 'town', radiusMeters: 2500 },
    { id: 'r015', name: 'Kuravilangad', lat: 9.7560, lng: 76.5680, type: 'town', radiusMeters: 2800 },
    // A few far away points for exploration
    { id: 'r016', name: 'Kottayam City', lat: 9.5916, lng: 76.5222, type: 'city', radiusMeters: 5000 },
    { id: 'r017', name: 'Ettumanoor', lat: 9.6644, lng: 76.5630, type: 'town', radiusMeters: 3000 }
  ];

  // Enrich POIs with type metadata and discovered state
  let pois = POIS_RAW.map(p => ({
    ...p,
    ...POI_TYPES[p.type],
    discovered: false,
    marker: null,
  }));

  // ─── HAVERSINE DISTANCE (meters) ───
  function distanceMt(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ─── CHECK DISCOVERIES ───
  // Returns array of newly-discovered POIs
  function checkDiscovery(playerLat, playerLng, thresholdMeters) {
    const found = [];
    pois.forEach(poi => {
      if (poi.discovered) return;
      const dist = distanceMt(playerLat, playerLng, poi.lat, poi.lng);
      // Region discovery: If player steps inside the region's radius bounds (plus margin)
      if (dist <= poi.radiusMeters) {
        poi.discovered = true;
        found.push({ ...poi });
      }
    });
    return found;
  }

  // ─── GET ALL POIS ───
  function getAllPois() { return pois; }

  // ─── GET UNDISCOVERED WITHIN RANGE (for map hint ring) ───
  function getNearbyUndiscovered(playerLat, playerLng, thresholdMeters) {
    return pois.filter(p => !p.discovered && distanceMt(playerLat, playerLng, p.lat, p.lng) <= thresholdMeters);
  }

  // ─── DISCOVERED POIS ───
  function getDiscovered() { return pois.filter(p => p.discovered); }

  // ─── RESET (for new game) ───
  function reset() {
    pois = POIS_RAW.map(p => ({ ...p, ...POI_TYPES[p.type], discovered: false, marker: null }));
  }

  return { checkDiscovery, getAllPois, getDiscovered, getNearbyUndiscovered, distanceMt, reset, POI_TYPES };
})();
