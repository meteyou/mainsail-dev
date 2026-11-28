import type { SpoolmanSpool } from '@/types/moonraker/SpoolmanRPC'

export interface ServerSpoolmanState {
    /** Status of the Spoolman health check, null until Spoolman answered */
    health: string | null
    active_spool_id: number | null
    active_spool: SpoolmanSpool | null
    spools: SpoolmanSpool[]
}
