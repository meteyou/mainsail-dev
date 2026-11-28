import { describe, expect, it } from 'vitest'
import { mutations } from '@/store/server/sensor/mutations'
import { getDefaultState } from '@/store/server/sensor'
import { sensor } from './fixtures'

describe('server/sensor/mutations', () => {
    it('starts without sensors', () => {
        expect(getDefaultState().sensors).toEqual({})
    })

    it('sets the sensors', () => {
        const state = getDefaultState()
        const sensors = { power: sensor('power') }

        mutations.setSensors(state, sensors)

        expect(state.sensors).toBe(sensors)
    })

    it('replaces the values without mutating the old entries', () => {
        const state = getDefaultState()
        const power = sensor('power', { voltage: 230 })
        const climate = sensor('climate', { temperature: 22 })
        const sensors = { power, climate }
        mutations.setSensors(state, sensors)

        mutations.setSensorValues(state, { power: { voltage: 231 } })

        expect(state.sensors.power).toEqual(sensor('power', { voltage: 231 }))
        expect(state.sensors.climate).toBe(climate)
        expect(power.values).toEqual({ voltage: 230 })
        expect(sensors.power).toBe(power)
    })

    it('ignores the values of unknown sensors', () => {
        const state = getDefaultState()
        mutations.setSensors(state, { power: sensor('power') })

        mutations.setSensorValues(state, { unknown: { value: 1 } })

        expect(state.sensors).toEqual({ power: sensor('power') })
    })

    it('resets the state', () => {
        const state = getDefaultState()
        mutations.setSensors(state, { power: sensor('power') })

        mutations.reset(state, undefined)

        expect(state).toEqual(getDefaultState())
    })
})
