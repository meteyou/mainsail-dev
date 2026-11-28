import { describe, expect, it } from 'vitest'
import { mutations } from '@/store/server/spoolman/mutations'
import { getDefaultState } from '@/store/server/spoolman'
import { spool } from './fixtures'

describe('server/spoolman/mutations', () => {
    it('starts without Spoolman data', () => {
        expect(getDefaultState()).toEqual({
            connected: false,
            active_spool_id: null,
            active_spool: null,
            spools: [],
        })
    })

    it('sets the connection status', () => {
        const state = getDefaultState()

        mutations.setConnected(state, true)

        expect(state.connected).toBe(true)
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

    it('replaces a spool without mutating the old list', () => {
        const state = getDefaultState()
        const first = spool(1)
        const spools = [first, spool(2)]
        mutations.setSpools(state, spools)
        const updated = spool(2, { remaining_weight: 500 })

        mutations.setSpool(state, updated)

        expect(state.spools).toEqual([first, updated])
        expect(state.spools[0]).toBe(first)
        expect(spools[1]).toEqual(spool(2))
    })

    it('adds an unknown spool', () => {
        const state = getDefaultState()
        mutations.setSpools(state, [spool(1)])

        mutations.setSpool(state, spool(3))

        expect(state.spools.map((entry) => entry.id)).toEqual([1, 3])
    })

    it('resets the state', () => {
        const state = getDefaultState()
        mutations.setConnected(state, true)
        mutations.setActiveSpoolId(state, 1)
        mutations.setActiveSpool(state, spool(1))
        mutations.setSpools(state, [spool(1)])

        mutations.reset(state, undefined)

        expect(state).toEqual(getDefaultState())
    })
})
