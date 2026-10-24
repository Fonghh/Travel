import { Hono } from 'hono'
import type { Context } from 'hono'
import { extractCoordsFromMapsHtml, extractTitle, isShortMapsUrl, parseGoogleMapsUrl } from '../shared/urlparse.ts'
import { KINDS, RESTORE_WINDOW_MS } from '../shared/types.ts'
import type { Entity, Kind, Participants, TripSettings, TripState } from '../shared/types.ts'

interface Env {
  DB: D1Database
  ASSETS: Fetcher
  CREATE_CODE?: string
}

interface MemberRow {
  id: string
  trip_id: string
  name: string
  animal: string
  color: string
  pin_hash: string | null
  pin_salt: string | null
  role: 'leader' | 'member'
  fail_count: number
  locked_until: number
  removed_at: number | null
}

interface TripRow {
  id: string
  name: string
  destination: string
  theme: string
  start_date: string
  end_date: string
  invite_token: string
  settings: string
  version: number
}

type Vars = { me: MemberRow; trip: TripRow }
type C = Context<{ Bindings: Env; Variables: Vars }>

const app = new Hono<{ Bindings: Env; Variables: Vars }>().basePath('/api')

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}
const fail = (status: number, message: string): never => {
  throw new HttpError(status, message)
}

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status as 400)
  console.error(err)
  return c.json({ error: '伺服器出了點問題，請稍後再試' }, 500)
})

// ---------- 小工具 ----------

const now = () => Date.now()

function randomId(bytes = 9): string {
  const b = crypto.getRandomValues(new Uint8Array(bytes))
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 2000 },
    key,
    256,
  )
  return btoa(String.fromCharCode(...new Uint8Array(bits)))
}

function checkPin(pin: unknown): string {
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) fail(400, 'PIN 要是 4 位數字')
  return pin as string
}

function str(v: unknown, max: number, field: string, required = true): string {
  if (typeof v !== 'string' || (required && !v.trim())) return fail(400, `請填寫${field}`)
  const s = (v as string).trim()
  if (s.length > max) fail(400, `${field}太長了`)
  return s
}

const DATE = /^\d{4}-\d{2}-\d{2}$/

async function rateLimit(db: D1Database, key: string, max: number, windowMs: number) {
  const t = now()
  const row = await db.prepare('SELECT count, window_start FROM rate_limits WHERE key = ?').bind(key).first<{ count: number; window_start: number }>()
  if (!row || t - row.window_start > windowMs) {
    await db.prepare('INSERT OR REPLACE INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)').bind(key, t).run()
    return
  }
  if (row.count >= max) fail(429, '嘗試太多次了，請稍後再試')
  await db.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?').bind(key).run()
}

async function bump(db: D1Database, tripId: string) {
  await db.prepare('UPDATE trips SET version = version + 1 WHERE id = ?').bind(tripId).run()
}

async function logActivity(db: D1Database, tripId: string, memberId: string, text: unknown, refId: string | null) {
  if (typeof text !== 'string' || !text.trim()) return
  await db
    .prepare('INSERT INTO activity (trip_id, member_id, text, ref_id, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(tripId, memberId, text.trim().slice(0, 200), refId, now())
    .run()
}

const memberOut = (m: MemberRow) => ({
  id: m.id,
  name: m.name,
  animal: m.animal,
  color: m.color,
  role: m.role,
  hasPin: !!m.pin_hash,
})

async function activeMembers(db: D1Database, tripId: string) {
  const { results } = await db
    .prepare('SELECT * FROM members WHERE trip_id = ? AND removed_at IS NULL ORDER BY created_at')
    .bind(tripId)
    .all<MemberRow>()
  return results
}

async function newSession(db: D1Database, m: MemberRow) {
  const token = randomId(24)
  await db.prepare('INSERT INTO sessions (token, member_id, trip_id, created_at) VALUES (?, ?, ?, ?)').bind(token, m.id, m.trip_id, now()).run()
  return { token, memberId: m.id, tripId: m.trip_id }
}

function validMemberProfile(body: Record<string, unknown>) {
  return {
    name: str(body.name, 20, '名字'),
    animal: str(body.animal, 30, '動物'),
    color: str(body.color, 20, '顏色'),
  }
}

async function animalTaken(db: D1Database, tripId: string, animal: string, exceptId = '') {
  const row = await db
    .prepare('SELECT id FROM members WHERE trip_id = ? AND animal = ? AND removed_at IS NULL AND id != ?')
    .bind(tripId, animal, exceptId)
    .first()
  return !!row
}

// ---------- 建立旅行 ----------

app.post('/trips', async (c) => {
  const body = await c.req.json<Record<string, unknown>>()
  const ip = c.req.header('cf-connecting-ip') ?? 'local'
  await rateLimit(c.env.DB, `create:${ip}`, 10, 3600_000)
  if (!c.env.CREATE_CODE) fail(503, '網站還沒設定開團密碼（CREATE_CODE）')
  if (body.createCode !== c.env.CREATE_CODE) fail(403, '開團密碼不正確')

  const name = str(body.name, 40, '旅行名稱')
  const destination = str(body.destination ?? '', 40, '目的地', false)
  const theme = str(body.theme, 20, '主題')
  const startDate = str(body.startDate, 10, '出發日')
  const endDate = str(body.endDate, 10, '回程日')
  if (!DATE.test(startDate) || !DATE.test(endDate) || endDate < startDate) fail(400, '日期不正確')
  const profile = validMemberProfile((body.member ?? {}) as Record<string, unknown>)
  const pin = checkPin(body.pin)

  const tripId = randomId(6)
  const memberId = randomId(6)
  const salt = randomId(8)
  const t = now()
  await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT INTO trips (id, name, destination, theme, start_date, end_date, invite_token, settings, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(tripId, name, destination, theme, startDate, endDate, randomId(12), JSON.stringify({ fx: { JPY: 0.21 } }), t),
    c.env.DB.prepare(
      "INSERT INTO members (id, trip_id, name, animal, color, pin_hash, pin_salt, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'leader', ?)",
    ).bind(memberId, tripId, profile.name, profile.animal, profile.color, await hashPin(pin, salt), salt, t),
  ])
  await logActivity(c.env.DB, tripId, memberId, `建立了旅行「${name}」🎉`, null)
  const m = await c.env.DB.prepare('SELECT * FROM members WHERE id = ?').bind(memberId).first<MemberRow>()
  return c.json(await newSession(c.env.DB, m!))
})

// ---------- 加入旅行 ----------

async function tripByInvite(db: D1Database, token: string) {
  const trip = await db.prepare('SELECT * FROM trips WHERE invite_token = ?').bind(token).first<TripRow>()
  if (!trip) fail(404, '邀請連結無效，請跟團長要新的連結')
  return trip!
}

app.get('/join/:invite', async (c) => {
  const trip = await tripByInvite(c.env.DB, c.req.param('invite'))
  const members = await activeMembers(c.env.DB, trip.id)
  return c.json({
    trip: { id: trip.id, name: trip.name, destination: trip.destination, theme: trip.theme, startDate: trip.start_date, endDate: trip.end_date },
    members: members.map(memberOut),
  })
})

app.post('/join/:invite', async (c) => {
  const trip = await tripByInvite(c.env.DB, c.req.param('invite'))
  const body = await c.req.json<Record<string, unknown>>()
  const db = c.env.DB

  if (typeof body.memberId === 'string') {
    // 以既有成員身分登入
    const m = await db.prepare('SELECT * FROM members WHERE id = ? AND trip_id = ? AND removed_at IS NULL').bind(body.memberId, trip.id).first<MemberRow>()
    if (!m) fail(404, '找不到這位成員')
    const pin = checkPin(body.pin)
    if (!m!.pin_hash) {
      // 團長重設過 PIN：這次輸入的就是新 PIN
      const salt = randomId(8)
      await db.prepare('UPDATE members SET pin_hash = ?, pin_salt = ?, fail_count = 0 WHERE id = ?').bind(await hashPin(pin, salt), salt, m!.id).run()
      return c.json(await newSession(db, m!))
    }
    if (m!.locked_until > now()) fail(429, '錯太多次了，15 分鐘後再試，或請團長幫你重設 PIN')
    if ((await hashPin(pin, m!.pin_salt!)) !== m!.pin_hash) {
      const fails = m!.fail_count + 1
      await db
        .prepare('UPDATE members SET fail_count = ?, locked_until = ? WHERE id = ?')
        .bind(fails >= 5 ? 0 : fails, fails >= 5 ? now() + 15 * 60_000 : 0, m!.id)
        .run()
      fail(403, fails >= 5 ? '錯太多次了，15 分鐘後再試' : `PIN 不對喔（還可以試 ${5 - fails} 次）`)
    }
    await db.prepare('UPDATE members SET fail_count = 0 WHERE id = ?').bind(m!.id).run()
    return c.json(await newSession(db, m!))
  }

  // 新成員
  const profile = validMemberProfile(body)
  const pin = checkPin(body.pin)
  const members = await activeMembers(db, trip.id)
  if (members.length >= 30) fail(400, '這趟旅行人數已滿（30 人）')
  if (await animalTaken(db, trip.id, profile.animal)) fail(409, '這隻動物已經有人選了，換一隻吧')
  const id = randomId(6)
  const salt = randomId(8)
  await db
    .prepare('INSERT INTO members (id, trip_id, name, animal, color, pin_hash, pin_salt, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, trip.id, profile.name, profile.animal, profile.color, await hashPin(pin, salt), salt, 'member', now())
    .run()
  await logActivity(db, trip.id, id, '加入了旅行 👋', null)
  await bump(db, trip.id)
  const m = await db.prepare('SELECT * FROM members WHERE id = ?').bind(id).first<MemberRow>()
  return c.json(await newSession(db, m!))
})

// ---------- 旅行內（需登入） ----------

const t = new Hono<{ Bindings: Env; Variables: Vars }>()

t.use('*', async (c, next) => {
  const token = c.req.header('authorization')?.replace(/^Bearer /, '')
  if (!token) fail(401, '請重新加入旅行')
  const row = await c.env.DB.prepare(
    'SELECT m.* FROM sessions s JOIN members m ON m.id = s.member_id WHERE s.token = ? AND s.trip_id = ? AND m.removed_at IS NULL',
  )
    .bind(token, c.req.param('tripId'))
    .first<MemberRow>()
  if (!row) fail(401, '登入已失效，請用邀請連結重新加入')
  const trip = await c.env.DB.prepare('SELECT * FROM trips WHERE id = ?').bind(row!.trip_id).first<TripRow>()
  if (!trip) fail(404, '找不到這趟旅行')
  c.set('me', row!)
  c.set('trip', trip!)
  await next()
})

const settingsOf = (trip: TripRow): TripSettings => JSON.parse(trip.settings || '{}')
const isLeader = (c: C) => c.get('me').role === 'leader'
function requireLeader(c: C) {
  if (!isLeader(c)) fail(403, '只有團長可以這麼做')
}
function requireOpen(c: C) {
  if (settingsOf(c.get('trip')).closed) fail(423, '這趟旅行已經結案，只能查看')
}

t.get('/state', async (c) => {
  const trip = c.get('trip')
  const me = c.get('me')
  const since = Number(c.req.query('v') ?? 0)
  if (since && since === trip.version) return c.json({ unchanged: true, version: trip.version })
  const db = c.env.DB
  const [members, ents, acts] = await Promise.all([
    activeMembers(db, trip.id),
    db
      .prepare('SELECT * FROM entities WHERE trip_id = ? AND (deleted_at IS NULL OR deleted_at > ?)')
      .bind(trip.id, now() - RESTORE_WINDOW_MS)
      .all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM activity WHERE trip_id = ? ORDER BY id DESC LIMIT 150').bind(trip.id).all<Record<string, unknown>>(),
  ])
  const entities: Entity[] = []
  for (const r of ents.results) {
    const data = JSON.parse(r.data as string)
    if (r.kind === 'todo' && data.type === 'private' && data.owner !== me.id) continue
    entities.push({
      id: r.id as string,
      kind: r.kind as Kind,
      data,
      createdBy: r.created_by as string,
      updatedBy: r.updated_by as string,
      createdAt: r.created_at as number,
      updatedAt: r.updated_at as number,
      deletedAt: (r.deleted_at as number | null) ?? null,
    })
  }
  const state: TripState = {
    version: trip.version,
    trip: {
      id: trip.id,
      name: trip.name,
      destination: trip.destination,
      theme: trip.theme,
      startDate: trip.start_date,
      endDate: trip.end_date,
      inviteToken: trip.invite_token,
      settings: settingsOf(trip),
    },
    me: me.id,
    members: members.map(memberOut),
    entities,
    activity: acts.results.map((a) => ({
      id: a.id as number,
      memberId: a.member_id as string,
      text: a.text as string,
      refId: (a.ref_id as string | null) ?? null,
      createdAt: a.created_at as number,
    })),
  }
  return c.json(state)
})

function inParticipants(p: Participants | undefined, id: string) {
  return !p || p === 'all' || (Array.isArray(p) && p.includes(id))
}

/** 依種類判斷能不能寫（old 為 null 代表新增；data 為 null 代表刪除） */
function canWrite(c: C, kind: Kind, id: string, old: { data: any; created_by: string } | null, data: any | null) {
  const me = c.get('me').id
  const leader = isLeader(c)
  const s = settingsOf(c.get('trip'))
  switch (kind) {
    case 'item':
    case 'flight':
    case 'stay':
      if (leader) return
      if (old && !inParticipants(old.data.participants, me)) fail(403, '這是別人的支線，只有參加的人可以修改')
      if (data && !inParticipants(data.participants, me)) fail(403, '支線要包含你自己才能建立')
      return
    case 'todo':
      if (old?.data.type === 'private' && old.data.owner !== me) fail(403, '這是別人的私人待辦')
      if (data?.type === 'private' && data.owner !== me) fail(400, '私人待辦只能是自己的')
      return
    case 'check':
    case 'checkin':
      if (!id.endsWith(':' + me) || (data && data.memberId !== me)) fail(403, '只能幫自己打勾')
      return
    case 'expense':
      if (s.expensesLocked) fail(423, '團長已鎖定結算，不能再改記帳')
      if (old && !leader && old.data.payer !== me && old.created_by !== me) fail(403, '只有付款人或建立的人可以修改這筆')
      return
    case 'payment':
      if (!leader && data && data.from !== me && data.to !== me) fail(403, '只能記錄自己的還款')
      if (!leader && old && old.data.from !== me && old.data.to !== me) fail(403, '只能修改自己的還款')
      return
    case 'announce':
      if (old && !leader && old.created_by !== me) fail(403, '只有發布的人或團長可以修改公告')
      return
  }
}

function validData(kind: Kind, data: any) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail(400, '資料格式不正確')
  const size = JSON.stringify(data).length
  if (size > 8000) fail(400, '內容太長了')
  if (kind === 'item' && (!DATE.test(data.date) || typeof data.title !== 'string' || !data.title.trim())) fail(400, '行程要有日期和名稱')
  if (kind === 'expense' && (!(data.amount > 0) || typeof data.payer !== 'string')) fail(400, '金額要大於 0')
  if (kind === 'payment' && !(data.amount > 0)) fail(400, '金額要大於 0')
}

t.post('/entities', async (c) => {
  requireOpen(c)
  const body = await c.req.json<{ kind: Kind; id?: string; data: unknown; activity?: string }>()
  if (!KINDS.includes(body.kind)) fail(400, '未知的資料種類')
  validData(body.kind, body.data)
  const db = c.env.DB
  const trip = c.get('trip')
  const me = c.get('me')
  const id = typeof body.id === 'string' && /^[\w:-]{4,80}$/.test(body.id) ? body.id : randomId(8)
  const old = await db
    .prepare('SELECT kind, data, created_by FROM entities WHERE trip_id = ? AND id = ?')
    .bind(trip.id, id)
    .first<{ kind: Kind; data: string; created_by: string }>()
  if (old && old.kind !== body.kind) fail(409, 'ID 衝突')
  canWrite(c, body.kind, id, old ? { data: JSON.parse(old.data), created_by: old.created_by } : null, body.data)
  const t0 = now()
  const json = JSON.stringify(body.data)
  if (old) {
    await db
      .prepare('UPDATE entities SET data = ?, updated_by = ?, updated_at = ?, deleted_at = NULL WHERE trip_id = ? AND id = ?')
      .bind(json, me.id, t0, trip.id, id)
      .run()
  } else {
    await db
      .prepare('INSERT INTO entities (trip_id, id, kind, data, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(trip.id, id, body.kind, json, me.id, me.id, t0, t0)
      .run()
  }
  await logActivity(db, trip.id, me.id, body.activity, id)
  await bump(db, trip.id)
  return c.json({ id, updatedAt: t0 })
})

t.delete('/entities/:id', async (c) => {
  requireOpen(c)
  const db = c.env.DB
  const trip = c.get('trip')
  const id = c.req.param('id')
  const old = await db
    .prepare('SELECT kind, data, created_by FROM entities WHERE trip_id = ? AND id = ? AND deleted_at IS NULL')
    .bind(trip.id, id)
    .first<{ kind: Kind; data: string; created_by: string }>()
  if (!old) return c.json({ ok: true })
  canWrite(c, old.kind, id, { data: JSON.parse(old.data), created_by: old.created_by }, null)
  // 打勾類直接刪掉，其他的保留 7 天可還原
  if (old.kind === 'check' || old.kind === 'checkin') {
    await db.prepare('DELETE FROM entities WHERE trip_id = ? AND id = ?').bind(trip.id, id).run()
  } else {
    await db.prepare('UPDATE entities SET deleted_at = ?, updated_by = ? WHERE trip_id = ? AND id = ?').bind(now(), c.get('me').id, trip.id, id).run()
  }
  await logActivity(db, trip.id, c.get('me').id, c.req.query('activity'), id)
  await bump(db, trip.id)
  return c.json({ ok: true })
})

t.post('/entities/:id/restore', async (c) => {
  requireOpen(c)
  const db = c.env.DB
  const trip = c.get('trip')
  const id = c.req.param('id')
  const old = await db
    .prepare('SELECT kind, data, created_by FROM entities WHERE trip_id = ? AND id = ? AND deleted_at IS NOT NULL')
    .bind(trip.id, id)
    .first<{ kind: Kind; data: string; created_by: string }>()
  if (!old) fail(404, '找不到或已超過 7 天')
  const data = JSON.parse(old!.data)
  canWrite(c, old!.kind, id, { data, created_by: old!.created_by }, data)
  await db.prepare('UPDATE entities SET deleted_at = NULL, updated_by = ?, updated_at = ? WHERE trip_id = ? AND id = ?').bind(c.get('me').id, now(), trip.id, id).run()
  await logActivity(db, trip.id, c.get('me').id, `還原了「${data.title ?? data.name ?? data.text ?? ''}」`, id)
  await bump(db, trip.id)
  return c.json({ ok: true })
})

// 修改旅行資訊與設定
t.patch('/trip', async (c) => {
  const body = await c.req.json<Record<string, any>>()
  const trip = c.get('trip')
  const s = settingsOf(trip)
  const db = c.env.DB
  requireLeader(c)
  if (s.closed && body.settings?.closed !== false) fail(423, '這趟旅行已經結案，只能查看')

  const name = body.name !== undefined ? str(body.name, 40, '旅行名稱') : trip.name
  const destination = body.destination !== undefined ? str(body.destination, 40, '目的地', false) : trip.destination
  const theme = body.theme !== undefined ? str(body.theme, 20, '主題') : trip.theme
  const startDate = body.startDate ?? trip.start_date
  const endDate = body.endDate ?? trip.end_date
  if (!DATE.test(startDate) || !DATE.test(endDate) || endDate < startDate) fail(400, '日期不正確')
  const next: TripSettings = { ...s }
  if (body.settings) {
    const ns = body.settings as TripSettings
    if (ns.fx) {
      const fx: Record<string, number> = {}
      for (const [k, v] of Object.entries(ns.fx)) if (/^[A-Z]{3}$/.test(k) && v > 0) fx[k] = v
      next.fx = fx
      next.fxUpdatedAt = now()
    }
    if (typeof ns.expensesLocked === 'boolean') next.expensesLocked = ns.expensesLocked
    if (typeof ns.closed === 'boolean') next.closed = ns.closed
  }
  await db
    .prepare('UPDATE trips SET name = ?, destination = ?, theme = ?, start_date = ?, end_date = ?, settings = ? WHERE id = ?')
    .bind(name, destination, theme, startDate, endDate, JSON.stringify(next), trip.id)
    .run()
  await logActivity(db, trip.id, c.get('me').id, body.activity, null)
  await bump(db, trip.id)
  return c.json({ ok: true })
})

// 修改自己的資料
t.patch('/me', async (c) => {
  const body = await c.req.json<Record<string, unknown>>()
  const me = c.get('me')
  const db = c.env.DB
  const profile = validMemberProfile({ name: body.name ?? me.name, animal: body.animal ?? me.animal, color: body.color ?? me.color })
  if (profile.animal !== me.animal && (await animalTaken(db, me.trip_id, profile.animal, me.id))) fail(409, '這隻動物已經有人選了')
  if (body.newPin !== undefined) {
    if ((await hashPin(checkPin(body.oldPin), me.pin_salt ?? '')) !== me.pin_hash) fail(403, '舊 PIN 不對')
    const salt = randomId(8)
    await db.prepare('UPDATE members SET pin_hash = ?, pin_salt = ? WHERE id = ?').bind(await hashPin(checkPin(body.newPin), salt), salt, me.id).run()
  }
  await db.prepare('UPDATE members SET name = ?, animal = ?, color = ? WHERE id = ?').bind(profile.name, profile.animal, profile.color, me.id).run()
  await bump(db, me.trip_id)
  return c.json({ ok: true })
})

async function targetMember(c: C) {
  const m = await c.env.DB.prepare('SELECT * FROM members WHERE id = ? AND trip_id = ? AND removed_at IS NULL')
    .bind(c.req.param('memberId'), c.get('trip').id)
    .first<MemberRow>()
  if (!m) fail(404, '找不到這位成員')
  return m!
}

t.post('/members/:memberId/reset-pin', async (c) => {
  requireLeader(c)
  const m = await targetMember(c)
  await c.env.DB.prepare('UPDATE members SET pin_hash = NULL, pin_salt = NULL, fail_count = 0, locked_until = 0 WHERE id = ?').bind(m.id).run()
  await bump(c.env.DB, m.trip_id)
  return c.json({ ok: true })
})

t.post('/members/:memberId/role', async (c) => {
  requireLeader(c)
  const m = await targetMember(c)
  const { role } = await c.req.json<{ role: string }>()
  if (role !== 'leader' && role !== 'member') fail(400, '角色不正確')
  if (role === 'member') {
    const leaders = (await activeMembers(c.env.DB, m.trip_id)).filter((x) => x.role === 'leader')
    if (leaders.length <= 1) fail(400, '至少要有一位團長')
  }
  await c.env.DB.prepare('UPDATE members SET role = ? WHERE id = ?').bind(role, m.id).run()
  await logActivity(c.env.DB, m.trip_id, c.get('me').id, role === 'leader' ? `讓 ${m.name} 成為團長 👑` : `取消了 ${m.name} 的團長`, null)
  await bump(c.env.DB, m.trip_id)
  return c.json({ ok: true })
})

t.post('/members/:memberId/remove', async (c) => {
  requireLeader(c)
  const m = await targetMember(c)
  if (m.id === c.get('me').id) fail(400, '不能移除自己')
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE members SET removed_at = ? WHERE id = ?').bind(now(), m.id),
    c.env.DB.prepare('DELETE FROM sessions WHERE member_id = ?').bind(m.id),
  ])
  await logActivity(c.env.DB, m.trip_id, c.get('me').id, `將 ${m.name} 移出旅行`, null)
  await bump(c.env.DB, m.trip_id)
  return c.json({ ok: true })
})

t.post('/logout', async (c) => {
  const token = c.req.header('authorization')?.replace(/^Bearer /, '')
  await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token ?? '').run()
  return c.json({ ok: true })
})

// ---------- 外部服務代理（需登入，避免被濫用） ----------

const UA = 'TravelPlannerBot/1.0 (+https://workers.dev)'

t.post('/resolve-url', async (c) => {
  await rateLimit(c.env.DB, `resolve:${c.get('me').id}`, 60, 3600_000)
  const { url } = await c.req.json<{ url: string }>()
  let u: URL
  try {
    u = new URL(String(url).trim())
  } catch {
    return fail(400, '這不是有效的網址')
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') fail(400, '只支援 http/https 網址')

  // 展開短網址：手動追 redirect，每一站都試著解析
  let current = u
  for (let i = 0; i < 6; i++) {
    const parsed = parseGoogleMapsUrl(current.href)
    if (parsed?.lat != null) return c.json({ type: 'maps', url: u.href, ...parsed })
    if (!isShortMapsUrl(current)) break
    const res = await fetch(current.href, { redirect: 'manual', headers: { 'user-agent': UA } })
    const loc = res.headers.get('location')
    if (!loc) break
    current = new URL(loc, current)
  }
  const parsed = parseGoogleMapsUrl(current.href)
  if (parsed) {
    // App 分享的網址常常只有名稱沒有座標：讀 Google Maps 頁面補座標，不行再用 OSM 查
    const [page, osm] = await Promise.all([coordsFromMapsPage(current.href), geocodeFirst([parsed.address, parsed.name])])
    // Google 頁面有時給的是預設畫面中心；跟 OSM 差太遠時以 OSM 為準
    const coords = page && osm && distanceKm(page, osm) > 30 ? osm : (page ?? osm)
    return c.json({ type: 'maps', url: u.href, ...parsed, ...coords })
  }

  // 一般網頁：抓標題
  try {
    const res = await fetch(current.href, { headers: { 'user-agent': UA, 'accept-language': 'zh-TW,zh;q=0.9,ja;q=0.8' }, cf: { cacheTtl: 3600 } })
    const type = res.headers.get('content-type') ?? ''
    if (!type.includes('html')) return c.json({ type: 'link', url: u.href })
    const reader = res.body?.getReader()
    let html = ''
    const dec = new TextDecoder()
    while (reader && html.length < 200_000) {
      const { done, value } = await reader.read()
      if (done) break
      html += dec.decode(value, { stream: true })
      if (/<\/head>/i.test(html)) break
    }
    reader?.cancel().catch(() => {})
    // 頁面上若有 Google Maps 連結也試著抓座標
    const mapsLink = /https:\/\/(?:www\.)?google\.[a-z.]+\/maps[^"'<>\s]+/i.exec(html)?.[0]
    const place = mapsLink ? parseGoogleMapsUrl(mapsLink.replace(/&amp;/g, '&')) : null
    return c.json({ type: 'link', url: u.href, name: extractTitle(html), lat: place?.lat, lng: place?.lng })
  } catch {
    return c.json({ type: 'link', url: u.href })
  }
})

const BROWSER_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

async function coordsFromMapsPage(url: string) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': BROWSER_UA, 'accept-language': 'zh-TW,zh;q=0.9,ja;q=0.8' } })
    if (!res.ok) return null
    return extractCoordsFromMapsHtml((await res.text()).slice(0, 400_000))
  } catch {
    return null
  }
}

async function nominatim(q: string, limit = 6) {
  const api = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=${limit}&accept-language=zh-TW,ja,en&q=${encodeURIComponent(q)}`
  const res = await fetch(api, { headers: { 'user-agent': UA }, cf: { cacheTtl: 86400, cacheEverything: true } })
  if (!res.ok) return null
  const list = await res.json<{ display_name: string; name?: string; lat: string; lon: string }[]>()
  return list.map((r) => ({ name: r.name || r.display_name.split(',')[0], address: r.display_name, lat: +r.lat, lng: +r.lon }))
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r)
  const y = (b.lat - a.lat) * r
  return Math.sqrt(x * x + y * y) * 6371
}

async function geocodeFirst(queries: (string | undefined)[]) {
  for (const q of queries) {
    if (!q) continue
    try {
      const r = await nominatim(q, 1)
      if (r?.[0]) return { lat: r[0].lat, lng: r[0].lng }
    } catch {
      /* 換下一個 */
    }
  }
  return null
}

t.get('/geocode', async (c) => {
  const q = (c.req.query('q') ?? '').trim()
  if (!q || q.length > 100) return c.json([])
  await rateLimit(c.env.DB, `geo:${c.get('me').id}`, 120, 3600_000)
  const list = await nominatim(q)
  if (!list) fail(502, '地點搜尋暫時無法使用')
  return c.json(list)
})

t.get('/fx', async (c) => {
  const res = await fetch('https://open.er-api.com/v6/latest/TWD', { cf: { cacheTtl: 21600, cacheEverything: true } })
  if (!res.ok) fail(502, '匯率服務暫時無法使用')
  const j = await res.json<{ rates: Record<string, number> }>()
  // API 給的是 1 台幣 = ? 外幣，轉成 1 外幣 = ? 台幣
  const out: Record<string, number> = {}
  for (const k of ['JPY', 'KRW', 'USD', 'EUR', 'HKD', 'THB', 'CNY', 'SGD']) if (j.rates[k]) out[k] = +(1 / j.rates[k]).toFixed(5)
  return c.json(out)
})

app.route('/t/:tripId', t)

app.all('*', (c) => c.json({ error: 'Not found' }, 404))

export default app
