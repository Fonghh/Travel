// Gemini API 錯誤分類：決定要不要換下一個模型再試

export type GeminiErrorKind = 'no-quota' | 'unavailable' | 'daily' | 'rate' | 'other'

/** 依序嘗試的模型；第一個沒有免費額度或不存在，就換下一個 */
export const DEFAULT_GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite']

export function geminiModels(setting?: string): string[] {
  const list = (setting ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return list.length ? list : DEFAULT_GEMINI_MODELS
}

export function classifyGeminiError(status: number, message = ''): GeminiErrorKind {
  const m = message.toLowerCase()
  // 這個模型（或它的搜尋功能）在免費方案沒有額度：Google 會寫 limit: 0
  if (status === 429 && /limit:\s*0\b/.test(m)) return 'no-quota'
  // 模型不存在、已停用、不支援搜尋工具
  if (status === 404 || /not found|not supported|is not available|deprecated|no longer/.test(m)) return 'unavailable'
  if (status === 429 && /per[ _]?day|daily/.test(m)) return 'daily'
  if (status === 429) return 'rate'
  return 'other'
}

/** 換下一個模型有機會成功的錯誤（免費額度是每個模型分開算的）；金鑰錯誤等其他錯誤就停 */
export const tryNextModel = (k: GeminiErrorKind) => k !== 'other'
