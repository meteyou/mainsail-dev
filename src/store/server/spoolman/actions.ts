import Vue from 'vue'
import { ActionTree } from 'vuex'
import { RootState } from '@/store/types'
import { ServerSpoolmanState } from '@/store/server/spoolman/types'
import { isJsonRpcError } from '@/types/moonraker'
import type {
    SpoolmanActiveSpoolSetNotification,
    SpoolmanSpool,
    SpoolmanStatusChangedNotification,
} from '@/types/moonraker/SpoolmanRPC'

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
const fetchSpoolman = async <T>(path: string): Promise<T> => {
    const result = await Vue.$socket.emitAndWait('server.spoolman.proxy', {
        use_v2_response: true,
        request_method: 'GET',
        path,
    })
    if (result.error) throw new SpoolmanProxyError(result.error.status_code, result.error.message)

    return result.response as T
}

export const actions: ActionTree<ServerSpoolmanState, RootState> = {
    reset({ commit }): void {
        commit('reset')
    },

    async init({ commit, dispatch, state }): Promise<void> {
        logDebug('init')

        try {
            const status = await Vue.$socket.emitAndWait('server.spoolman.status')

            commit('setActiveSpoolId', normalizeSpoolId(status.spool_id))
            commit('setConnected', status.spoolman_connected)
        } catch (error) {
            // connection loss, timeouts etc. are handled by server/init
            if (!isJsonRpcError(error)) throw error

            // Moonraker answered with an error: the component is optional, so report it instead of failing the init
            logError('Failed to initialize spoolman:', error)
            await dispatch('server/addFailedInitComponent', 'spoolman', { root: true })
            return
        }

        // without a connection to Spoolman, the data is loaded by notifySpoolmanStatusChanged
        if (!state.connected) return

        // Spoolman is an external server, so it being unreachable must not fail the init
        try {
            await dispatch('refreshActiveSpool')
        } catch (error) {
            if (!isSpoolmanRequestError(error)) throw error

            logError('Failed to load the active spool:', error)
            Vue.$toast.error(error.message)
        }

        // HappyHare and AFC need the spools to display their spool data, but don't wait for the (possibly large) list
        dispatch('refreshSpools').catch((error) => logError('Failed to load the spools:', error))
    },

    async notifySpoolmanStatusChanged({ commit, dispatch }, payload: SpoolmanStatusChangedNotification): Promise<void> {
        commit('setConnected', payload.spoolman_connected)
        if (!payload.spoolman_connected) return

        // the spools could have changed while Spoolman was not available
        const results = await Promise.allSettled([dispatch('refreshActiveSpool'), dispatch('refreshSpools')])
        results
            .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
            .forEach((result) => logError('Failed to load the Spoolman data after reconnecting:', result.reason))
    },

    async notifyActiveSpoolSet(
        { commit, dispatch, state },
        payload: SpoolmanActiveSpoolSetNotification
    ): Promise<void> {
        commit('setActiveSpoolId', normalizeSpoolId(payload.spool_id))

        // without a connection to Spoolman, the new spool is loaded by notifySpoolmanStatusChanged
        if (!state.connected) {
            if (state.active_spool?.id !== state.active_spool_id) commit('setActiveSpool', null)
            return
        }

        try {
            await dispatch('refreshActiveSpool')
        } catch (error) {
            logError('Failed to load the active spool:', error)
            if (isSpoolmanRequestError(error)) Vue.$toast.error(error.message)
        }
    },

    /** Loads the active spool from Spoolman, or clears it if no spool is active. */
    async refreshActiveSpool({ commit, state }): Promise<void> {
        const spoolId = state.active_spool_id
        if (spoolId === null) {
            commit('setActiveSpool', null)
            return
        }

        const spool = await fetchSpoolman<SpoolmanSpool>(`/v1/spool/${spoolId}`)

        // keep the spool list up to date, because Moonraker only reports the usage of the active spool
        commit('setSpool', spool)

        // the active spool could have changed while waiting for the response
        if (state.active_spool_id !== spoolId) return

        commit('setActiveSpool', spool)
    },

    async refreshSpools({ commit }): Promise<void> {
        const spools = await fetchSpoolman<SpoolmanSpool[]>('/v1/spool')

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
