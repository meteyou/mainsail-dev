import { GetterTree } from 'vuex'
import { ServerSensor, ServerSensorState } from '@/store/server/sensor/types'
import { RootState } from '@/store/types'

export const getters: GetterTree<ServerSensorState, RootState> = {
    sensorIds: (state): string[] => Object.keys(state.sensors),

    getSensor:
        (state) =>
        (id: string): ServerSensor | null =>
            state.sensors[id] ?? null,
}
