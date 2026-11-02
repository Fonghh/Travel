/** 從模型回覆裡挖出第一個 JSON 物件（搜尋工具不能搭配 JSON 模式，只能自己解析） */
export function parseJsonBlock(text: string): Record<string, any> | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text)?.[1]
  const raw = fenced ?? text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null
  } catch {
    return null
  }
}
