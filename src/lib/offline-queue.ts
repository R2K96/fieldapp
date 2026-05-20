import type { OfflineOp } from '../types'
import { SUPA_URL } from './config'

const QUEUE_KEY = 'schnellr_offline_queue'

class OfflineQueueManager {
  private _q: OfflineOp[] = []

  constructor() {
    this.load()
  }

  load() {
    try {
      this._q = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]')
    } catch {
      this._q = []
    }
  }

  save() {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this._q))
    } catch {}
  }

  push(op: Omit<OfflineOp, 'ts'>) {
    this._q.push({ ...op, ts: Date.now() })
    this.save()
  }

  count(): number {
    return this._q.length
  }

  clear() {
    this._q = []
    this.save()
  }

  async flush(headers: Record<string, string>): Promise<void> {
    if (!this._q.length) return

    const ops = [...this._q]
    this.clear()
    const failed: OfflineOp[] = []

    for (const op of ops) {
      try {
        if (op.type === 'upsert' && op.items?.length) {
          const res = await fetch(`${SUPA_URL}/rest/v1/${op.table}`, {
            method: 'POST',
            headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
            body: JSON.stringify(op.items.map((item: any) => ({
              id: item.id, user_id: op.uid, data: item,
            }))),
          })
          if (!res.ok) failed.push(op)
        } else if (op.type === 'delete' && op.ids?.length) {
          const ids = op.ids.map(id => `"${id}"`).join(',')
          const res = await fetch(`${SUPA_URL}/rest/v1/${op.table}?id=in.(${ids})`, {
            method: 'DELETE', headers,
          })
          if (!res.ok) failed.push(op)
        }
      } catch {
        failed.push(op)
      }
    }

    if (failed.length) {
      this._q = failed
      this.save()
    }
  }
}

export const offlineQueue = new OfflineQueueManager()
