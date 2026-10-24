/** 從邀請連結（整串網址、夾在訊息裡，或只有代碼）取出邀請代碼 */
export function inviteFrom(text: string): string | undefined {
  const t = text.trim()
  const m = /\/join\/([\w-]{8,})/.exec(t)
  if (m) return m[1]
  return /^[\w-]{12,}$/.test(t) ? t : undefined
}
