import Vue from 'vue'
import { getDefaultState } from './index'
import { MutationTree } from 'vuex'
import { ServerSpoolmanState } from './types'
import type { SpoolmanSpool } from '@/types/moonraker/SpoolmanRPC'

export const mutations: MutationTree<ServerSpoolmanState> = {
    reset(state): void {
        Object.assign(state, getDefaultState())
    },

    setHealth(state, health: string | null): void {
        Vue.set(state, 'health', health)
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
}
