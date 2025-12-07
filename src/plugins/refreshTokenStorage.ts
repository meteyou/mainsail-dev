import { Store } from 'vuex'
import _Vue from 'vue'
import { RootState } from '@/store/types'

const TOKEN_EXPIRY_DAYS = 90

export interface TokenData {
    refreshToken: string
    username?: string
    source?: string
    updatedAt: number
}

export interface StoredTokens {
    [url: string]: TokenData
}

class RefreshTokenStorageClient {
    private storageKey = 'refreshTokens'
    private store: Store<RootState>

    constructor(store: Store<RootState>) {
        this.store = store
        this.cleanupExpiredTokens()
    }

    private buildUrl(): string {
        const hostname = this.store.state.socket?.hostname ?? ''
        const port = this.store.state.socket?.port ?? 7125
        const path = this.store.state.socket?.path ?? ''
        const normalizedPath = path.replace(/^\/|\/$/g, '')

        if (normalizedPath.length === 0) {
            return `${hostname}:${port}`
        }

        return `${hostname}:${port}/${normalizedPath}`
    }

    private getAll(): StoredTokens {
        const data = localStorage.getItem(this.storageKey)
        if (!data) return {}

        try {
            return JSON.parse(data)
        } catch {
            return {}
        }
    }

    private saveAll(tokens: StoredTokens): void {
        localStorage.setItem(this.storageKey, JSON.stringify(tokens))
    }

    private cleanupExpiredTokens(): void {
        const tokens = this.getAll()
        const now = Date.now()
        const expiryMs = TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        let changed = false

        for (const url in tokens) {
            if (now - tokens[url].updatedAt > expiryMs) {
                delete tokens[url]
                changed = true
            }
        }

        if (changed) {
            this.saveAll(tokens)
        }
    }

    get(url?: string): TokenData | null {
        const key = url ?? this.buildUrl()
        return this.getAll()[key] ?? null
    }

    getRefreshToken(url?: string): string | null {
        return this.get(url)?.refreshToken ?? null
    }

    set(refreshToken: string, metadata?: Partial<Omit<TokenData, 'refreshToken' | 'updatedAt'>>, url?: string): void {
        const key = url ?? this.buildUrl()
        const tokens = this.getAll()

        tokens[key] = {
            refreshToken,
            username: metadata?.username,
            source: metadata?.source,
            updatedAt: Date.now(),
        }

        this.saveAll(tokens)
    }

    remove(url?: string): void {
        const key = url ?? this.buildUrl()
        const tokens = this.getAll()

        delete tokens[key]
        this.saveAll(tokens)
    }

    clearAll(): void {
        localStorage.removeItem(this.storageKey)
    }
}

export function RefreshTokenStoragePlugin(Vue: typeof _Vue, options: { store: Store<RootState> }): void {
    const refreshTokenStorage = new RefreshTokenStorageClient(options.store)
    Vue.prototype.$refreshTokenStorage = refreshTokenStorage
    Vue.$refreshTokenStorage = refreshTokenStorage
}

declare module 'vue/types/vue' {
    interface Vue {
        $refreshTokenStorage: RefreshTokenStorageClient
    }
    interface VueConstructor {
        $refreshTokenStorage: RefreshTokenStorageClient
    }
}
