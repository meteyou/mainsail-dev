import Vue from 'vue'
import { ActionTree } from 'vuex'
import { ServerSensorState } from '@/store/server/sensor/types'
import { RootState } from '@/store/types'
import { isJsonRpcError } from '@/types/moonraker'
import type { SensorUpdateNotification } from '@/types/moonraker/DevicesRPC'

const LOG_PREFIX = '[Server][Sensor]'
const logDebug = (...args: unknown[]) => window.console.debug(LOG_PREFIX, ...args)
const logError = (...args: unknown[]) => window.console.error(LOG_PREFIX, ...args)

export const actions: ActionTree<ServerSensorState, RootState> = {
    reset({ commit }): void {
        commit('reset')
    },

    async init({ commit, dispatch }): Promise<void> {
        logDebug('init')

        try {
            const response = await Vue.$socket.emitAndWait('server.sensors.list')

            commit('setSensors', response.sensors)
        } catch (error) {
            // connection loss, timeouts etc. are handled by server/init
            if (!isJsonRpcError(error)) throw error

            // Moonraker answered with an error: the component is optional, so report it instead of failing the init
            logError('Failed to initialize sensors:', error)
            await dispatch('server/addFailedInitComponent', 'sensor', { root: true })
        }
    },

    notifySensorUpdate({ commit }, payload: SensorUpdateNotification): void {
        commit('setSensorValues', payload)
    },
}
