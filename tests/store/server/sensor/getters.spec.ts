import { describe, expect, it } from 'vitest'
import { getters } from '@/store/server/sensor/getters'
import type { ServerSensor, ServerSensorState } from '@/store/server/sensor/types'
import type { RootState } from '@/store/types'
import { sensor } from './fixtures'

const callGetter = <T>(name: string, sensors: Record<string, ServerSensor>): T => {
    const state: ServerSensorState = { sensors }

    return getters[name](state, {}, {} as RootState, {}) as T
}

describe('server/sensor/getters', () => {
    const sensors = { power: sensor('power'), climate: sensor('climate') }

    it('lists the sensor IDs', () => {
        expect(callGetter<string[]>('sensorIds', sensors)).toEqual(['power', 'climate'])
        expect(callGetter<string[]>('sensorIds', {})).toEqual([])
    })

    it('finds a sensor by ID and returns null for unknown sensors', () => {
        const getSensor = callGetter<(id: string) => ServerSensor | null>('getSensor', sensors)

        expect(getSensor('climate')).toBe(sensors.climate)
        expect(getSensor('unknown')).toBeNull()
    })
})
