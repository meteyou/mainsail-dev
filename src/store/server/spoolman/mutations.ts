import Vue from 'vue'
import { getDefaultState } from './index'
import { MutationTree } from 'vuex'
import { ServerSpoolmanState } from './types'
import type { SpoolmanSpool } from '@/types/moonraker/SpoolmanRPC'

export const mutations: MutationTree<ServerSpoolmanState> = {
    reset(state): void {
        Object.assign(state, getDefaultState())
    },

    setConnected(state, connected: boolean): void {
        Vue.set(state, 'connected', connected)
    },

    setActiveSpoolId(state, spoolId: number | null): void {
        Vue.set(state, 'active_spool_id', spoolId)
    },

    setActiveSpool(state, spool: SpoolmanSpool | null): void {
        Vue.set(state, 'active_spool', spool)
    },

    setSpools(state, spools: SpoolmanSpool[]): void {
        Vue.set(state, 'spools', spools)
    },

    /** Replaces a spool in the spool list or adds it, if it is unknown (e.g. created after loading the list) */
    setSpool(state, spool: SpoolmanSpool): void {
        const exists = state.spools.some((entry) => entry.id === spool.id)
        const spools = exists
            ? state.spools.map((entry) => (entry.id === spool.id ? spool : entry))
            : [...state.spools, spool]

        Vue.set(state, 'spools', spools)
    },
}
