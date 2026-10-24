export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch('/api' + path, {
      method: opts.method ?? (opts.body ? 'POST' : 'GET'),
      headers: {
        ...(opts.body ? { 'content-type': 'application/json' } : {}),
        ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    throw new ApiError(0, '連不上網路，請稍後再試')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? `發生錯誤（${res.status}）`)
  return data as T
}
