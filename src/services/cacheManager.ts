import { CacheEntry } from '../types'
import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface CacheDB extends DBSchema {
  cache: {
    key: string
    value: CacheEntry<unknown>
    indexes: { 'by-expires': number }
  }
}

class CacheManager {
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map()
  private db: IDBPDatabase<CacheDB> | null = null
  private maxMemorySize: number = 50 * 1024 * 1024
  private currentMemorySize: number = 0
  private readonly defaultTTL: number = 300000

  async init(): Promise<void> {
    try {
      this.db = await openDB<CacheDB>('review-cache', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('cache')) {
            const store = db.createObjectStore('cache', { keyPath: 'key' })
            store.createIndex('by-expires', 'expiresAt')
          }
        },
      })

      this.startCleanupInterval()
    } catch (error) {
      console.warn('IndexedDB not available, using memory cache only:', error)
    }
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  async set<T>(key: string, data: T, options?: { ttl?: number; version?: number }): Promise<void> {
    const ttl = options?.ttl ?? this.defaultTTL
    const timestamp = Date.now()
    const expiresAt = timestamp + ttl

    const entry: CacheEntry<T> = {
      data,
      timestamp,
      expiresAt,
      version: options?.version ?? 1,
    }

    const size = this.estimateSize(entry)
    
    const existingEntry = this.memoryCache.get(key)
    if (existingEntry) {
      this.currentMemorySize -= this.estimateSize(existingEntry)
    }
    
    if (this.currentMemorySize + size > this.maxMemorySize) {
      this.evictLRU()
    }

    this.memoryCache.set(key, entry as CacheEntry<unknown>)
    this.currentMemorySize += size

    if (this.db) {
      try {
        await this.db.put('cache', {
          key,
          value: entry as CacheEntry<unknown>,
          expiresAt,
        })
      } catch (error) {
        console.warn('Failed to write to IndexedDB:', error)
      }
    }
  }

  get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key) as CacheEntry<T> | undefined

    if (!entry) {
      return null
    }

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key)
      this.currentMemorySize -= this.estimateSize(entry)
      return null
    }

    return entry.data
  }

  async getAsync<T>(key: string): Promise<T | null> {
    const memoryEntry = this.memoryCache.get(key) as CacheEntry<T> | undefined

    if (memoryEntry) {
      if (Date.now() > memoryEntry.expiresAt) {
        this.memoryCache.delete(key)
        this.currentMemorySize -= this.estimateSize(memoryEntry)
      } else {
        return memoryEntry.data
      }
    }

    if (this.db) {
      try {
        const stored = await this.db.get('cache', key)
        if (stored && stored.value) {
          const entry = stored.value as CacheEntry<T>
          if (Date.now() <= entry.expiresAt) {
            this.memoryCache.set(key, entry as CacheEntry<unknown>)
            return entry.data
          } else {
            await this.db.delete('cache', key)
          }
        }
      } catch (error) {
        console.warn('Failed to read from IndexedDB:', error)
      }
    }

    return null
  }

  delete(key: string): void {
    const entry = this.memoryCache.get(key)
    if (entry) {
      this.currentMemorySize -= this.estimateSize(entry)
      this.memoryCache.delete(key)
    }

    if (this.db) {
      this.db.delete('cache', key).catch((error) => {
        console.warn('Failed to delete from IndexedDB:', error)
      })
    }
  }

  clear(): void {
    this.memoryCache.clear()
    this.currentMemorySize = 0

    if (this.db) {
      this.db.clear('cache').catch((error) => {
        console.warn('Failed to clear IndexedDB:', error)
      })
    }
  }

  private evictLRU(): void {
    const entries = Array.from(this.memoryCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)

    const toEvict = Math.floor(entries.length * 0.2)
    for (let i = 0; i < toEvict; i++) {
      const [key, entry] = entries[i]
      this.memoryCache.delete(key)
      this.currentMemorySize -= this.estimateSize(entry)
      if (this.db) {
        this.db.delete('cache', key).catch(() => {})
      }
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => {
      const entry = this.memoryCache.get(key)
      if (entry) {
        this.currentMemorySize -= this.estimateSize(entry)
        this.memoryCache.delete(key)
      }
    })

    if (this.db) {
      this.db.getAllKeys('cache').then(keys => {
        keys.forEach(key => {
          this.db!.get('cache', key).then(stored => {
            if (stored && stored.value && now > stored.value.expiresAt) {
              this.db!.delete('cache', key)
            }
          })
        })
      })
    }
  }

  private estimateSize(entry: CacheEntry<unknown>): number {
    try {
      const serialized = JSON.stringify(entry)
      return new Blob([serialized]).size
    } catch {
      return 1024
    }
  }

  getStats(): { size: number; entries: number; memoryUsage: number } {
    return {
      size: this.memoryCache.size,
      entries: this.memoryCache.size,
      memoryUsage: this.currentMemorySize,
    }
  }
}

export const cacheManager = new CacheManager()
cacheManager.init().catch(console.error)
