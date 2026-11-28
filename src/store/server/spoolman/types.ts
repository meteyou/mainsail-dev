import type { SpoolmanSpool } from '@/types/spoolman'

export interface ServerSpoolmanState {
    /** Moonraker has an established connection to the Spoolman server */
    connected: boolean
    active_spool_id: number | null
    active_spool: SpoolmanSpool | null
    spools: SpoolmanSpool[]
}
