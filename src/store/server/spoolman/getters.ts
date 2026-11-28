import { GetterTree } from 'vuex'
import { ServerSpoolmanState } from './types'
import { RootState } from '@/store/types'
import type { SpoolmanSpool } from '@/types/spoolman'

export const getters: GetterTree<ServerSpoolmanState, RootState> = {
    getSpool:
        (state) =>
        (id: number | null): SpoolmanSpool | null =>
            state.spools.find((spool) => spool.id === id) ?? null,
}
