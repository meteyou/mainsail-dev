import { describe, expect, it } from 'vitest'
import { getters } from '@/store/server/spoolman/getters'
import { getDefaultState } from '@/store/server/spoolman'
import type { RootState } from '@/store/types'
import type { SpoolmanSpool } from '@/types/moonraker/SpoolmanRPC'
import { spool } from './fixtures'

const callGetter = <T>(name: string, spools: SpoolmanSpool[]): T => {
    const state = { ...getDefaultState(), spools }

    return getters[name](state, {}, {} as RootState, {}) as T
}

describe('server/spoolman/getters', () => {
    it('finds a spool by ID and returns null for unknown spools', () => {
        const spools = [spool(1), spool(2)]
        const getSpool = callGetter<(id: number | null) => SpoolmanSpool | null>('getSpool', spools)

        expect(getSpool(2)).toBe(spools[1])
        expect(getSpool(3)).toBeNull()
        expect(getSpool(null)).toBeNull()
    })
})
