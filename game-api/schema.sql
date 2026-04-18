-- Users table (Google OAuth)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  title TEXT DEFAULT 'Newbie',
  coins INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  last_login TEXT DEFAULT (datetime('now'))
);

-- Daily check-in
CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  streak INTEGER DEFAULT 1,
  reward INTEGER DEFAULT 10,
  UNIQUE(user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Game scores (leaderboard)
CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Best scores per user per game (for leaderboard ranking)
CREATE TABLE IF NOT EXISTS best_scores (
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, game_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Play counts
CREATE TABLE IF NOT EXISTS play_counts (
  game_id TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0
);

-- Initialize play counts for all games
INSERT OR IGNORE INTO play_counts (game_id, count) VALUES
  ('cat-battle', 0), ('dodge-master', 0), ('frost-survival', 0),
  ('hao-survivor', 0), ('poker-suite', 0), ('save-the-dog', 0),
  ('taiwan-monopoly', 0), ('water-sort', 0), ('werewolf', 0),
  ('poker-fortune', 0), ('downstairs', 0), ('splat-ring', 0),
  ('chess-master', 0), ('pact-of-arcania', 0);
