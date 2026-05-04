// Hao Games API — Cloudflare Worker + D1
// Endpoints: auth, checkin, leaderboard, play-count, profile

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function err(msg, status = 400) {
  return json({ error: msg }, status);
}

async function readJson(req) {
  try { return await req.json(); }
  catch { return null; }
}

// Simple JWT (HS256-like using HMAC)
async function signToken(payload, secret) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({ ...payload, exp: Date.now() + 30 * 24 * 3600 * 1000 }));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(header + '.' + body));
  return header + '.' + body + '.' + btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function verifyToken(token, secret) {
  try {
    const [header, body, sig] = token.split('.');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const expected = Uint8Array.from(atob(sig), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, expected, new TextEncoder().encode(header + '.' + body));
    if (!valid) return null;
    const payload = JSON.parse(atob(body));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

async function getUser(req, env) {
  const auth = req.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const payload = await verifyToken(auth.slice(7), env.JWT_SECRET);
  if (!payload) return null;
  return payload;
}

// Generate short user ID
function genId() {
  return 'u_' + crypto.randomUUID().slice(0, 12);
}

// ── Achievements ──────────────────────────────────────────────
// Thresholds for incremental achievements; order matters for display.
// `tier` drives the frontend badge color (bronze|silver|gold|legend).
const ACHIEVEMENTS = {
  first_login:  { name: '初次見面',   desc: '首次登入 Hao0321 遊戲大廳', tier: 'bronze' },
  first_win:    { name: '首戰告捷',   desc: '第一次上傳分數',             tier: 'bronze' },
  streak_3:     { name: '三日堅持',   desc: '連續簽到 3 天',               tier: 'bronze' },
  streak_7:     { name: '七日達人',   desc: '連續簽到 7 天',               tier: 'silver' },
  streak_30:    { name: '月度玩家',   desc: '連續簽到 30 天',              tier: 'gold'   },
  coins_50:     { name: '小富翁',     desc: '累積 50 金幣',                tier: 'bronze' },
  coins_200:    { name: '金庫',       desc: '累積 200 金幣',               tier: 'silver' },
  coins_1000:   { name: '大戶',       desc: '累積 1000 金幣',              tier: 'gold'   },
  played_5:     { name: '玩家',       desc: '玩過 5 款不同遊戲',           tier: 'silver' },
  played_all:   { name: '收藏家',     desc: '玩過全部 14 款遊戲',          tier: 'legend' },
};

// Insert achievement if not already unlocked; returns achievement_id or null.
async function tryUnlock(env, uid, aid) {
  if (!ACHIEVEMENTS[aid]) return null;
  const res = await env.DB.prepare(
    'INSERT OR IGNORE INTO achievements (user_id, achievement_id) VALUES (?, ?)'
  ).bind(uid, aid).run();
  return res.meta && res.meta.changes > 0 ? aid : null;
}

// Check multiple achievements; returns array of newly unlocked IDs.
async function checkCoinAchievements(env, uid, coins) {
  const unlocked = [];
  if (coins >= 50)   { const r = await tryUnlock(env, uid, 'coins_50');   if (r) unlocked.push(r); }
  if (coins >= 200)  { const r = await tryUnlock(env, uid, 'coins_200');  if (r) unlocked.push(r); }
  if (coins >= 1000) { const r = await tryUnlock(env, uid, 'coins_1000'); if (r) unlocked.push(r); }
  return unlocked;
}

// Whitelist of known game IDs (used by /play and /score to prevent abuse)
const ALLOWED_GAMES = new Set([
  'cat-battle', 'dodge-master', 'pact-of-arcania', 'poker-fortune',
  'taiwan-monopoly', 'chess-master', 'color-match', 'snake-classic',
  'tetris-clone', 'memory-flip', '2048', 'minesweeper',
  'reaction-time', 'breakout',
]);

async function checkStreakAchievements(env, uid, streak) {
  const unlocked = [];
  if (streak >= 3)  { const r = await tryUnlock(env, uid, 'streak_3');  if (r) unlocked.push(r); }
  if (streak >= 7)  { const r = await tryUnlock(env, uid, 'streak_7');  if (r) unlocked.push(r); }
  if (streak >= 30) { const r = await tryUnlock(env, uid, 'streak_30'); if (r) unlocked.push(r); }
  return unlocked;
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    if (!env.JWT_SECRET) {
      return err('Server misconfigured: JWT_SECRET not set. Run `wrangler secret put JWT_SECRET`.', 500);
    }

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/+|\/+$/g, '');

    try {
      // ===== AUTH =====
      if (path === 'auth/google') {
        const body = await readJson(req);
        if (!body || !body.token) return err('token required');
        const { token } = body;
        // Verify Google ID token
        const gRes = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token));
        if (!gRes.ok) return err('Invalid Google token', 401);
        const gData = await gRes.json();

        // Critical: validate audience, expiry, subject — without these,
        // any Google ID token issued for ANY OAuth client could log in here.
        if (!env.GOOGLE_CLIENT_ID) return err('Server misconfigured: GOOGLE_CLIENT_ID not set', 500);
        if (gData.aud !== env.GOOGLE_CLIENT_ID) return err('Invalid token audience', 401);
        if (!gData.sub) return err('Invalid token subject', 401);
        if (!gData.exp || Number(gData.exp) * 1000 < Date.now()) return err('Token expired', 401);
        if (gData.email_verified === 'false' || gData.email_verified === false) return err('Email not verified', 401);

        const googleId = gData.sub;
        const name = gData.name || 'Player';
        const avatar = gData.picture || null;

        // Find or create user
        let user = await env.DB.prepare('SELECT * FROM users WHERE google_id = ?').bind(googleId).first();
        if (!user) {
          const id = genId();
          await env.DB.prepare('INSERT INTO users (id, google_id, name, avatar) VALUES (?, ?, ?, ?)').bind(id, googleId, name, avatar).run();
          user = { id, google_id: googleId, name, avatar, title: 'Newbie', coins: 0 };
        } else {
          await env.DB.prepare('UPDATE users SET last_login = datetime("now"), name = ?, avatar = ? WHERE id = ?').bind(name, avatar, user.id).run();
        }

        // Unlock first_login
        const unlocked = [];
        const u1 = await tryUnlock(env, user.id, 'first_login');
        if (u1) unlocked.push(u1);

        const jwt = await signToken({ uid: user.id, name: user.name }, env.JWT_SECRET);
        return json({ token: jwt, user: { id: user.id, name: user.name, avatar: user.avatar, title: user.title, coins: user.coins }, unlocked });
      }

      // ===== CHECK-IN =====
      if (path === 'checkin' && req.method === 'POST') {
        const u = await getUser(req, env);
        if (!u) return err('Unauthorized', 401);

        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // Check if already checked in today
        const existing = await env.DB.prepare('SELECT * FROM checkins WHERE user_id = ? AND date = ?').bind(u.uid, today).first();
        if (existing) return json({ already: true, streak: existing.streak, reward: 0 });

        // Get yesterday's check-in for streak
        const prev = await env.DB.prepare('SELECT streak FROM checkins WHERE user_id = ? AND date = ?').bind(u.uid, yesterday).first();
        const streak = prev ? prev.streak + 1 : 1;
        const reward = Math.min(10 + (streak - 1) * 5, 50); // 10, 15, 20, 25, ... max 50

        await env.DB.prepare('INSERT INTO checkins (user_id, date, streak, reward) VALUES (?, ?, ?, ?)').bind(u.uid, today, streak, reward).run();
        await env.DB.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').bind(reward, u.uid).run();

        // Check streak + coin achievements
        const userNow = await env.DB.prepare('SELECT coins FROM users WHERE id = ?').bind(u.uid).first();
        const unlocked = [
          ...await checkStreakAchievements(env, u.uid, streak),
          ...await checkCoinAchievements(env, u.uid, userNow.coins),
        ];

        return json({ streak, reward, already: false, unlocked });
      }

      if (path === 'checkin' && req.method === 'GET') {
        const u = await getUser(req, env);
        if (!u) return err('Unauthorized', 401);
        const today = new Date().toISOString().split('T')[0];
        const rec = await env.DB.prepare('SELECT * FROM checkins WHERE user_id = ? AND date = ?').bind(u.uid, today).first();
        const user = await env.DB.prepare('SELECT coins FROM users WHERE id = ?').bind(u.uid).first();
        return json({ checkedIn: !!rec, streak: rec ? rec.streak : 0, coins: user ? user.coins : 0 });
      }

      // ===== YOUTUBE PROXY =====
      // Forwards GET /yt/{channels|search|videos}?... to YouTube Data API v3,
      // injecting the secret key server-side. Restricted to hao0321.com origins
      // so quota cannot be burned from arbitrary callers.
      if (path.startsWith('yt/') && req.method === 'GET') {
        const refSrc = req.headers.get('Origin') || req.headers.get('Referer') || '';
        if (!/^https?:\/\/(?:[a-z0-9-]+\.)?hao0321\.com(?:[/:]|$)/i.test(refSrc)) {
          return err('Forbidden origin', 403);
        }
        if (!env.YT_API_KEY) return err('Server misconfigured: YT_API_KEY not set', 500);
        const ytPath = path.slice(3); // strip 'yt/'
        const allowed = new Set(['channels', 'search', 'videos', 'playlists', 'playlistItems']);
        if (!allowed.has(ytPath)) return err('Unsupported endpoint', 400);

        const target = new URL('https://www.googleapis.com/youtube/v3/' + ytPath);
        const reqUrl = new URL(req.url);
        reqUrl.searchParams.forEach((v, k) => {
          if (k.toLowerCase() !== 'key') target.searchParams.set(k, v);
        });
        target.searchParams.set('key', env.YT_API_KEY);

        const ytRes = await fetch(target.toString(), {
          headers: { 'Referer': 'https://hao0321.com/' },
        });
        const body = await ytRes.text();
        return new Response(body, {
          status: ytRes.status,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300',
            ...CORS,
          },
        });
      }

      // ===== PLAY COUNT =====
      if (path === 'play' && req.method === 'POST') {
        const body = await readJson(req);
        const game = body && body.game;
        if (!game) return err('game required');
        // Whitelist known game IDs to prevent counter spam against arbitrary rows
        if (typeof game !== 'string' || game.length > 64 || !ALLOWED_GAMES.has(game)) {
          return err('unknown game');
        }
        await env.DB.prepare('UPDATE play_counts SET count = count + 1 WHERE game_id = ?').bind(game).run();
        return json({ ok: true });
      }

      if (path === 'play-counts') {
        const { results } = await env.DB.prepare('SELECT game_id, count FROM play_counts').all();
        const counts = {};
        (results || []).forEach(r => { counts[r.game_id] = r.count; });
        return json(counts);
      }

      // ===== LEADERBOARD =====
      if (path === 'score' && req.method === 'POST') {
        const u = await getUser(req, env);
        if (!u) return err('Unauthorized', 401);
        const body = await readJson(req);
        if (!body) return err('body required');
        const { game, score } = body;
        if (!game || score === undefined) return err('game and score required');
        if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1e9) return err('invalid score');

        // Record score
        await env.DB.prepare('INSERT INTO scores (user_id, game_id, score) VALUES (?, ?, ?)').bind(u.uid, game, score).run();

        // Update best score
        const best = await env.DB.prepare('SELECT score FROM best_scores WHERE user_id = ? AND game_id = ?').bind(u.uid, game).first();
        if (!best || score > best.score) {
          await env.DB.prepare('INSERT OR REPLACE INTO best_scores (user_id, game_id, score, updated_at) VALUES (?, ?, ?, datetime("now"))').bind(u.uid, game, score).run();
        }

        // Award coins for playing
        await env.DB.prepare('UPDATE users SET coins = coins + 2 WHERE id = ?').bind(u.uid).run();

        // Check achievements
        const userNow = await env.DB.prepare('SELECT coins FROM users WHERE id = ?').bind(u.uid).first();
        const { results: bestRows } = await env.DB.prepare('SELECT DISTINCT game_id FROM best_scores WHERE user_id = ?').bind(u.uid).all();
        const gameCount = (bestRows || []).length;
        const unlocked = [];
        if (score > 0) {
          const r = await tryUnlock(env, u.uid, 'first_win');
          if (r) unlocked.push(r);
        }
        unlocked.push(...await checkCoinAchievements(env, u.uid, userNow.coins));
        if (gameCount >= 5)  { const r = await tryUnlock(env, u.uid, 'played_5');   if (r) unlocked.push(r); }
        if (gameCount >= 14) { const r = await tryUnlock(env, u.uid, 'played_all'); if (r) unlocked.push(r); }

        return json({ ok: true, newBest: !best || score > best.score, unlocked });
      }

      if (path.startsWith('leaderboard/')) {
        const game = path.split('/')[1];
        const { results } = await env.DB.prepare(
          'SELECT b.score, u.name, u.avatar, u.title FROM best_scores b JOIN users u ON b.user_id = u.id WHERE b.game_id = ? ORDER BY b.score DESC LIMIT 20'
        ).bind(game).all();
        return json(results || []);
      }

      if (path === 'leaderboard') {
        // Global leaderboard — top players by total best scores across all games
        const { results } = await env.DB.prepare(
          'SELECT u.name, u.avatar, u.title, SUM(b.score) as total_score, COUNT(b.game_id) as games_played FROM best_scores b JOIN users u ON b.user_id = u.id GROUP BY b.user_id ORDER BY total_score DESC LIMIT 20'
        ).all();
        return json(results || []);
      }

      // ===== ACHIEVEMENTS =====
      if (path === 'achievements/catalog') {
        return json(ACHIEVEMENTS);
      }

      if (path === 'achievements') {
        const u = await getUser(req, env);
        if (!u) return err('Unauthorized', 401);
        const { results } = await env.DB.prepare(
          'SELECT achievement_id, unlocked_at FROM achievements WHERE user_id = ? ORDER BY unlocked_at DESC'
        ).bind(u.uid).all();
        return json({ catalog: ACHIEVEMENTS, unlocked: results || [] });
      }

      // ===== PROFILE =====
      if (path === 'profile') {
        const u = await getUser(req, env);
        if (!u) return err('Unauthorized', 401);
        const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(u.uid).first();
        if (!user) return err('User not found', 404);

        const { results: scores } = await env.DB.prepare('SELECT game_id, score FROM best_scores WHERE user_id = ?').bind(u.uid).all();
        const { results: checkins } = await env.DB.prepare('SELECT date, streak, reward FROM checkins WHERE user_id = ? ORDER BY date DESC LIMIT 30').bind(u.uid).all();
        const { results: achs } = await env.DB.prepare('SELECT achievement_id, unlocked_at FROM achievements WHERE user_id = ? ORDER BY unlocked_at DESC').bind(u.uid).all();

        return json({
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          title: user.title,
          coins: user.coins,
          created_at: user.created_at,
          bestScores: scores || [],
          recentCheckins: checkins || [],
          achievements: achs || [],
          achievementCatalog: ACHIEVEMENTS,
        });
      }

      return err('Not found', 404);
    } catch (e) {
      return err('Server error: ' + e.message, 500);
    }
  },
};
