import Vue from 'vue'
import { ActionTree } from 'vuex'
import { RootState } from '@/store/types'
import { ServerSpoolmanState } from '@/store/server/spoolman/types'
import { isJsonRpcError } from '@/types/moonraker'
import type { SpoolmanActiveSpoolSetNotification, SpoolmanHealth, SpoolmanSpool } from '@/types/moonraker/SpoolmanRPC'
import type { EmitAndWaitOptions } from '@/plugins/webSocketClient'

const LOG_PREFIX = '[Server][Spoolman]'
const logDebug = (...args: unknown[]) => window.console.debug(LOG_PREFIX, ...args)
const logError = (...args: unknown[]) => window.console.error(LOG_PREFIX, ...args)

/** An error returned by Spoolman, or by Moonraker if Spoolman is not available, through the proxy */
export class SpoolmanProxyError extends Error {
    readonly statusCode: number

    constructor(statusCode: number, message: string) {
        super(message)
        this.name = 'SpoolmanProxyError'
        this.statusCode = statusCode
    }
}

/** Errors that only affect the Spoolman data and must not abort the app init */
const isSpoolmanRequestError = (error: unknown): error is SpoolmanProxyError | { message: string } =>
    error instanceof SpoolmanProxyError || isJsonRpcError(error)

/** Moonraker accepts 0 as spool ID, but Spoolman IDs start at 1, so 0 also means "no active spool" */
const normalizeSpoolId = (spoolId: number | null): number | null => (spoolId ? spoolId : null)

/** Sends a GET request to the Spoolman API. Rejects with a SpoolmanProxyError if Spoolman answers with an error. */
const fetchSpoolman = async <T>(path: string, options?: EmitAndWaitOptions): Promise<T> => {
    const result = await Vue.$socket.emitAndWait(
        'server.spoolman.proxy',
        { use_v2_response: true, request_method: 'GET', path },
        options
    )
    if (result.error) throw new SpoolmanProxyError(result.error.status_code, result.error.message)

    return result.response as T
}

export const actions: ActionTree<ServerSpoolmanState, RootState> = {
    reset({ commit }): void {
        commit('reset')
    },

    async init({ commit, dispatch }): Promise<void> {
        logDebug('init')

        try {
            const { spool_id } = await Vue.$socket.emitAndWait('server.spoolman.get_spool_id')

            commit('setActiveSpoolId', normalizeSpoolId(spool_id))
        } catch (error) {
            // connection loss, timeouts etc. are handled by server/init
            if (!isJsonRpcError(error)) throw error

            // Moonraker answered with an error: the component is optional, so report it instead of failing the init
            logError('Failed to initialize spoolman:', error)
            await dispatch('server/addFailedInitComponent', 'spoolman', { root: true })
            return
        }

        // Spoolman is an external server, so it being unreachable must not fail the init
        const results = await Promise.allSettled([dispatch('refreshHealth'), dispatch('refreshActiveSpool')])
        const errors = results
            .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
            .map((result) => result.reason as unknown)

        const fatalError = errors.find((error) => !isSpoolmanRequestError(error))
        if (fatalError) throw fatalError

        if (errors.length) {
            logError('Failed to load the Spoolman data:', ...errors)
            Vue.$toast.error((errors[0] as { message: string }).message)
        }

        // HappyHare and AFC need the spools to display their spool data, but don't wait for the (possibly large) list
        dispatch('refreshSpools').catch((error) => logError('Failed to load the spools:', error))
    },

    async notifyActiveSpoolSet({ commit, dispatch }, payload: SpoolmanActiveSpoolSetNotification): Promise<void> {
        commit('setActiveSpoolId', normalizeSpoolId(payload.spool_id))

        try {
            await dispatch('refreshActiveSpool')
        } catch (error) {
            logError('Failed to load the active spool:', error)
            if (isSpoolmanRequestError(error)) Vue.$toast.error(error.message)
        }
    },

    async refreshHealth({ commit }): Promise<void> {
        const health = await fetchSpoolman<SpoolmanHealth>('/v1/health')

        commit('setHealth', health.status)
    },

    /** Loads the active spool from Spoolman, or clears it if no spool is active. */
    async refreshActiveSpool({ commit, state }): Promise<void> {
        const spoolId = state.active_spool_id
        if (spoolId === null) {
            commit('setActiveSpool', null)
            return
        }

        const spool = await fetchSpoolman<SpoolmanSpool>(`/v1/spool/${spoolId}`)

        // the active spool could have changed while waiting for the response
        if (state.active_spool_id !== spoolId) return

        commit('setActiveSpool', spool)
    },

    async refreshSpools({ commit }): Promise<void> {
        const spools = await fetchSpoolman<SpoolmanSpool[]>('/v1/spool', { loading: 'refreshSpools' })

        commit('setSpools', spools)
    },

    /**
     * Sets the active spool in Moonraker. `null` unsets the active spool and disables tracking.
     * The state is updated via the notify_active_spool_set notification.
     */
    async setActiveSpool(_, spoolId: number | null): Promise<void> {
        // Moonraker rejects an explicit null, so spool_id has to be omitted to unset the active spool
        const params = spoolId === null ? {} : { spool_id: spoolId }

        await Vue.$socket.emitAndWait('server.spoolman.post_spool_id', params)
    },
}
