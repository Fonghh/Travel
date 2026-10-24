-- 旅行
CREATE TABLE trips (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  destination TEXT NOT NULL DEFAULT '',
  theme TEXT NOT NULL DEFAULT 'generic',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  invite_token TEXT NOT NULL UNIQUE,
  settings TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

-- 成員（每趟旅行各自一組，未來加 Google 登入時再對應到 users）
CREATE TABLE members (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id),
  name TEXT NOT NULL,
  animal TEXT NOT NULL,
  color TEXT NOT NULL,
  pin_hash TEXT,
  pin_salt TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  fail_count INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  removed_at INTEGER
);
CREATE INDEX members_trip ON members(trip_id);
CREATE UNIQUE INDEX members_animal ON members(trip_id, animal) WHERE removed_at IS NULL;

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id),
  trip_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX sessions_member ON sessions(member_id);

-- 行程、航班、住宿、待辦、記帳……都是 entity，內容放 JSON
CREATE TABLE entities (
  trip_id TEXT NOT NULL REFERENCES trips(id),
  id TEXT NOT NULL,
  kind TEXT NOT NULL,
  data TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  PRIMARY KEY (trip_id, id)
);
CREATE INDEX entities_kind ON entities(trip_id, kind);

CREATE TABLE activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  text TEXT NOT NULL,
  ref_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX activity_trip ON activity(trip_id, id);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
