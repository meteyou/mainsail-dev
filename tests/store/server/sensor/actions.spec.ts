import { beforeEach, describe, expect, it, vi } from 'vitest'
import Vue from 'vue'
import Vuex, { Store } from 'vuex'
import { getDefaultState, sensor as sensorModule } from '@/store/server/sensor'
import type { ServerSensorState } from '@/store/server/sensor/types'
import { WebSocketClosedError } from '@/plugins/jsonRpcSocket'
import { sensor } from './fixtures'

Vue.use(Vuex)

type Responder = (params: Record<string, unknown>) => unknown

let responders: Record<string, Responder>
const emitAndWait = vi.fn<(method: string, params?: Record<string, unknown>, options?: unknown) => Promise<unknown>>(
    async (method, params = {}) => {
        const responder = responders[method]
        if (!responder) throw { code: -32601, message: `Method not found: ${method}` }

        return responder(params)
    }
)
const windowStub = { console: { error: vi.fn(), debug: vi.fn() } }
const addFailedInitComponent = vi.fn()

const createStore = () =>
    new Store({
        actions: {
            'server/addFailedInitComponent': (_, component: string) => addFailedInitComponent(component),
        },
        modules: {
            sensor: { ...sensorModule, state: getDefaultState() },
        },
    })

const sensorState = (store: Store<unknown>) => (store.state as { sensor: ServerSensorState }).sensor

describe('server/sensor/actions', () => {
    beforeEach(() => {
        emitAndWait.mockClear()
        addFailedInitComponent.mockClear()
        windowStub.console.error.mockClear()
        Vue.$socket = { emitAndWait } as unknown as typeof Vue.$socket
        vi.stubGlobal('window', windowStub)

        responders = {
            'server.sensors.list': () => ({
                sensors: {
                    power: sensor('power', { voltage: 230 }),
                    climate: sensor('climate', { temperature: 22.4, humidity: 28.9 }),
                },
            }),
        }
    })

    describe('init', () => {
        it('loads the sensors', async () => {
            const store = createStore()

            await store.dispatch('sensor/init')

            expect(emitAndWait).toHaveBeenCalledWith('server.sensors.list')
            expect(sensorState(store).sensors).toEqual({
                power: sensor('power', { voltage: 230 }),
                climate: sensor('climate', { temperature: 22.4, humidity: 28.9 }),
            })
        })

        it('reports a failed init component when Moonraker answers with an error', async () => {
            responders = {}
            const store = createStore()

            await expect(store.dispatch('sensor/init')).resolves.toBeUndefined()
            expect(sensorState(store).sensors).toEqual({})
            expect(windowStub.console.error).toHaveBeenCalled()
            expect(addFailedInitComponent).toHaveBeenCalledWith('sensor')
        })

        it('propagates non RPC errors to the caller', async () => {
            responders['server.sensors.list'] = () => {
                throw new WebSocketClosedError()
            }
            const store = createStore()

            await expect(store.dispatch('sensor/init')).rejects.toBeInstanceOf(WebSocketClosedError)
            expect(addFailedInitComponent).not.toHaveBeenCalled()
        })
    })

    describe('notifySensorUpdate', () => {
        it('replaces the values of the changed sensors', async () => {
            const store = createStore()
            await store.dispatch('sensor/init')

            await store.dispatch('sensor/notifySensorUpdate', { climate: { temperature: 23, humidity: 30 } })

            expect(sensorState(store).sensors.climate.values).toEqual({ temperature: 23, humidity: 30 })
            expect(sensorState(store).sensors.power.values).toEqual({ voltage: 230 })
        })

        it('ignores unknown sensors', async () => {
            const store = createStore()
            await store.dispatch('sensor/init')

            await store.dispatch('sensor/notifySensorUpdate', { unknown: { value: 1 } })

            expect(Object.keys(sensorState(store).sensors)).toEqual(['power', 'climate'])
        })
    })

    it('resets the state', async () => {
        const store = createStore()
        await store.dispatch('sensor/init')

        await store.dispatch('sensor/reset')

        expect(sensorState(store)).toEqual(getDefaultState())
    })
})
