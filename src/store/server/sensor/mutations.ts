import Vue from 'vue'
import { getDefaultState } from './index'
import { MutationTree } from 'vuex'
import { ServerSensor, ServerSensorState } from '@/store/server/sensor/types'
import type { SensorUpdateNotification } from '@/types/moonraker/DevicesRPC'

export const mutations: MutationTree<ServerSensorState> = {
    reset(state): void {
        Object.assign(state, getDefaultState())
    },

    setSensors(state, sensors: Record<string, ServerSensor>): void {
        Vue.set(state, 'sensors', sensors)
    },

    /** Replaces the values of the given sensors. Unknown sensors are ignored. */
    setSensorValues(state, payload: SensorUpdateNotification): void {
        const sensors = { ...state.sensors }

        for (const [id, values] of Object.entries(payload)) {
            const sensor = sensors[id]
            if (!sensor) continue

            sensors[id] = { ...sensor, values }
        }

        Vue.set(state, 'sensors', sensors)
    },
}
