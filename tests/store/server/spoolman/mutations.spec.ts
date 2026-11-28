import { describe, expect, it } from 'vitest'
import { mutations } from '@/store/server/spoolman/mutations'
import { getDefaultState } from '@/store/server/spoolman'
import { spool } from './fixtures'

describe('server/spoolman/mutations', () => {
    it('starts without Spoolman data', () => {
        expect(getDefaultState()).toEqual({
            health: null,
            active_spool_id: null,
            active_spool: null,
            spools: [],
        })
    })

    it('sets the health', () => {
        const state = getDefaultState()

        mutations.setHealth(state, 'healthy')

        expect(state.health).toBe('healthy')
    })

    it('sets the active spool ID and spool', () => {
        const state = getDefaultState()
        const active = spool(1)

        mutations.setActiveSpoolId(state, 1)
        mutations.setActiveSpool(state, active)

        expect(state.active_spool_id).toBe(1)
        expect(state.active_spool).toBe(active)
    })

    it('sets the spools', () => {
        const state = getDefaultState()
        const spools = [spool(1), spool(2)]

        mutations.setSpools(state, spools)

        expect(state.spools).toBe(spools)
    })

    it('resets the state', () => {
        const state = getDefaultState()
        mutations.setHealth(state, 'healthy')
        mutations.setActiveSpoolId(state, 1)
        mutations.setActiveSpool(state, spool(1))
        mutations.setSpools(state, [spool(1)])

        mutations.reset(state, undefined)

        expect(state).toEqual(getDefaultState())
    })
})
