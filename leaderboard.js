// ================================================================
// LEADERBOARD.JS — Player Profile, Scoring, Leaderboard State
// ================================================================

const LEADERBOARD = (() => {
  const STORAGE_KEY = 'explorer_lb_v2';

  // Avatar colour palette
  const AVATAR_COLORS = [
    ['#6c63ff','#a29bfe'], ['#00d4aa','#00b894'], ['#f5c842','#e17055'],
    ['#fd79a8','#e84393'], ['#74b9ff','#0984e3'], ['#a29bfe','#6c5ce7'],
    ['#55efc4','#00cec9'], ['#ffeaa7','#fdcb6e'],
  ];

  // Simulated rival players
  const RIVALS = [
    { id: 'r1', name: 'AnaKochi',    points: 940,  discovered: 18, avatar: AVATAR_COLORS[1] },
    { id: 'r2', name: 'Mapster_X',   points: 820,  discovered: 15, avatar: AVATAR_COLORS[2] },
    { id: 'r3', name: 'WanderlustK', points: 650,  discovered: 12, avatar: AVATAR_COLORS[3] },
    { id: 'r4', name: 'ExploreKL',   points: 580,  discovered: 11, avatar: AVATAR_COLORS[4] },
    { id: 'r5', name: 'StreetSage',  points: 460,  discovered: 9,  avatar: AVATAR_COLORS[5] },
    { id: 'r6', name: 'GeoHunter',   points: 380,  discovered: 7,  avatar: AVATAR_COLORS[6] },
    { id: 'r7', name: 'RoamingR',    points: 220,  discovered: 5,  avatar: AVATAR_COLORS[7] },
    { id: 'r8', name: 'CitySeeker',  points: 90,   discovered: 2,  avatar: AVATAR_COLORS[0] },
  ];

  // Badge thresholds
  const BADGES = [
    { min: 0,    icon: '🌱', label: 'Sprout'     },
    { min: 100,  icon: '🚶', label: 'Wanderer'   },
    { min: 300,  icon: '🔍', label: 'Scout'      },
    { min: 600,  icon: '🗺️', label: 'Explorer'  },
    { min: 1000, icon: '⚡', label: 'Trailblazer'},
    { min: 1500, icon: '🏆', label: 'Legend'     },
  ];

  function getBadge(points) {
    let current = BADGES[0];
    for (const b of BADGES) {
      if (points >= b.min) current = b;
    }
    return current;
  }

  // ─── LOAD / SAVE ───
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // ─── INIT ───
  function init(playerName) {
    let state = load();
    if (!state) {
      state = {
        player: {
          id: 'me',
          name: playerName || 'Explorer',
          points: 0,
          discovered: 0,
          avatar: AVATAR_COLORS[0],
          totalSessions: 1,
        }
      };
      save(state);
    }
    if (playerName) {
      state.player.name = playerName;
      save(state);
    }
    return state.player;
  }

  // ─── ADD POINTS ───
  function addPoints(amount) {
    let state = load();
    if (!state) state = { player: init() };
    state.player.points += amount;
    state.player.discovered = (state.player.discovered || 0) + 1;
    save(state);
    return state.player;
  }

  // ─── GET FULL LEADERBOARD (rivals + me, sorted) ───
  function getLeaderboard() {
    const state = load();
    const me = state ? state.player : { id: 'me', name: 'Explorer', points: 0, discovered: 0, avatar: AVATAR_COLORS[0] };

    const all = [
      { ...me, isMe: true },
      ...RIVALS.map(r => ({ ...r, isMe: false })),
    ].sort((a, b) => b.points - a.points);

    return all;
  }

  // ─── RENAME PLAYER ───
  function rename(newName) {
    let state = load();
    if (!state) return;
    state.player.name = newName.trim() || state.player.name;
    save(state);
    return state.player;
  }

  return { init, addPoints, getLeaderboard, rename, getBadge, AVATAR_COLORS, load };
})();
