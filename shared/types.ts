// 前後端共用的資料型別

export type Participants = 'all' | string[]

export type Transport =
  | 'walk' | 'train' | 'shinkansen' | 'bus' | 'taxi' | 'car' | 'plane' | 'ship' | 'ropeway' | 'ski' | 'none'

export interface ItemData {
  date: string // YYYY-MM-DD
  time: string // HH:mm（可空）
  endTime?: string
  title: string
  note?: string
  url?: string
  placeName?: string
  lat?: number
  lng?: number
  transport: Transport
  mustGo?: boolean
  meetup?: boolean
  participants: Participants
}

export interface FlightData {
  airline: string
  flightNo: string
  from: string // 機場代碼
  to: string
  depLocal: string // YYYY-MM-DDTHH:mm（起飛地當地時間）
  depTz: string
  arrLocal: string
  arrTz: string
  terminal?: string
  gate?: string
  seat?: string
  bookingRef?: string
  participants: Participants
}

export interface StayData {
  name: string
  address?: string
  url?: string
  lat?: number
  lng?: number
  checkIn: string
  checkInTime?: string
  checkOut: string
  checkOutTime?: string
  bookingRef?: string
  phone?: string
  room?: string
  note?: string
  participants: Participants
}

export type TodoType = 'shared' | 'each' | 'private'
export interface TodoData {
  title: string
  type: TodoType
  owner?: string // private 專用
  done?: { by: string; at: number } | null // shared 專用
}

export interface CheckData { todoId: string; memberId: string }

export interface CheckinData { itemId: string; memberId: string; mood: string; text?: string }

export type ExpenseCategory = 'food' | 'transport' | 'stay' | 'ski' | 'other'
export interface ExpenseData {
  title: string
  amount: number
  currency: string
  category: ExpenseCategory
  payer: string
  date: string
  itemId?: string
  split: 'equal' | 'custom' | 'none'
  among: string[]
  custom?: Record<string, number>
}

export interface PaymentData { from: string; to: string; amount: number } // 台幣

export interface AnnounceData { text: string; pinned: boolean }

export interface KindMap {
  item: ItemData
  flight: FlightData
  stay: StayData
  todo: TodoData
  check: CheckData
  checkin: CheckinData
  expense: ExpenseData
  payment: PaymentData
  announce: AnnounceData
}
export type Kind = keyof KindMap
export const KINDS: Kind[] = ['item', 'flight', 'stay', 'todo', 'check', 'checkin', 'expense', 'payment', 'announce']

export interface Entity<K extends Kind = Kind> {
  id: string
  kind: K
  data: KindMap[K]
  createdBy: string
  updatedBy: string
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

export interface TripSettings {
  fx?: Record<string, number> // 1 單位外幣 = ? 台幣
  fxUpdatedAt?: number
  expensesLocked?: boolean
  closed?: boolean
}

export interface Trip {
  id: string
  name: string
  destination: string
  theme: string
  startDate: string
  endDate: string
  inviteToken: string
  settings: TripSettings
}

export interface Member {
  id: string
  name: string
  animal: string
  color: string
  role: 'leader' | 'member'
  hasPin: boolean
}

export interface Activity {
  id: number
  memberId: string
  text: string
  refId: string | null
  createdAt: number
}

export interface TripState {
  version: number
  trip: Trip
  me: string
  members: Member[]
  entities: Entity[]
  activity: Activity[]
}

export const RESTORE_WINDOW_MS = 7 * 24 * 3600 * 1000
