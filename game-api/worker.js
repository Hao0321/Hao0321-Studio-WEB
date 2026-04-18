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

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/+|\/+$/g, '');

    try {
      // ===== AUTH =====
      if (path === 'auth/google') {
        const { token } = await req.json();
        // Verify Google ID token
        const gRes = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + token);
        if (!gRes.ok) return err('Invalid Google token', 401);
        const gData = await gRes.json();
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

        const jwt = await signToken({ uid: user.id, name: user.name }, env.JWT_SECRET);
        return json({ token: jwt, user: { id: user.id, name: user.name, avatar: user.avatar, title: user.title, coins: user.coins } });
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

        return json({ streak, reward, already: false });
      }

      if (path === 'checkin' && req.method === 'GET') {
        const u = await getUser(req, env);
        if (!u) return err('Unauthorized', 401);
        const today = new Date().toISOString().split('T')[0];
        const rec = await env.DB.prepare('SELECT * FROM checkins WHERE user_id = ? AND date = ?').bind(u.uid, today).first();
        const user = await env.DB.prepare('SELECT coins FROM users WHERE id = ?').bind(u.uid).first();
        return json({ checkedIn: !!rec, streak: rec ? rec.streak : 0, coins: user ? user.coins : 0 });
      }

      // ===== PLAY COUNT =====
      if (path === 'play' && req.method === 'POST') {
        const { game } = await req.json();
        if (!game) return err('game required');
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
        const { game, score } = await req.json();
        if (!game || score === undefined) return err('game and score required');

        // Record score
        await env.DB.prepare('INSERT INTO scores (user_id, game_id, score) VALUES (?, ?, ?)').bind(u.uid, game, score).run();

        // Update best score
        const best = await env.DB.prepare('SELECT score FROM best_scores WHERE user_id = ? AND game_id = ?').bind(u.uid, game).first();
        if (!best || score > best.score) {
          await env.DB.prepare('INSERT OR REPLACE INTO best_scores (user_id, game_id, score, updated_at) VALUES (?, ?, ?, datetime("now"))').bind(u.uid, game, score).run();
        }

        // Award coins for playing
        await env.DB.prepare('UPDATE users SET coins = coins + 2 WHERE id = ?').bind(u.uid).run();

        return json({ ok: true, newBest: !best || score > best.score });
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

      // ===== PROFILE =====
      if (path === 'profile') {
        const u = await getUser(req, env);
        if (!u) return err('Unauthorized', 401);
        const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(u.uid).first();
        if (!user) return err('User not found', 404);

        const { results: scores } = await env.DB.prepare('SELECT game_id, score FROM best_scores WHERE user_id = ?').bind(u.uid).all();
        const { results: checkins } = await env.DB.prepare('SELECT date, streak, reward FROM checkins WHERE user_id = ? ORDER BY date DESC LIMIT 30').bind(u.uid).all();

        return json({
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          title: user.title,
          coins: user.coins,
          created_at: user.created_at,
          bestScores: scores || [],
          recentCheckins: checkins || [],
        });
      }

      return err('Not found', 404);
    } catch (e) {
      return err('Server error: ' + e.message, 500);
    }
  },
};
