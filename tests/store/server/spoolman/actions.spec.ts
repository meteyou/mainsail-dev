import { beforeEach, describe, expect, it, vi } from 'vitest'
import Vue from 'vue'
import Vuex, { Store } from 'vuex'
import { getDefaultState, spoolman } from '@/store/server/spoolman'
import { SpoolmanProxyError } from '@/store/server/spoolman/actions'
import type { ServerSpoolmanState } from '@/store/server/spoolman/types'
import type { SpoolmanProxyResponse, SpoolmanSpool } from '@/types/moonraker/SpoolmanRPC'
import { WebSocketClosedError } from '@/plugins/jsonRpcSocket'
import { spool } from './fixtures'

Vue.use(Vuex)

type Responder = (params: Record<string, unknown>) => unknown

/** Minimal fake of Moonraker's spoolman component and the Spoolman API behind its proxy */
let activeSpoolId: number | null
let spoolmanConnected: boolean
let spools: SpoolmanSpool[]

const success = (response: unknown): SpoolmanProxyResponse => ({ response, response_headers: {}, error: null })
const failure = (status_code: number, message: string): SpoolmanProxyResponse => ({
    response: null,
    error: { status_code, message },
})

const spoolmanApi = (path: string): SpoolmanProxyResponse => {
    if (!spoolmanConnected) return failure(503, 'Spoolman server not available')
    if (path === '/v1/spool') return success(spools)

    const id = Number(path.replace('/v1/spool/', ''))
    const found = spools.find((entry) => entry.id === id)

    return found ? success(found) : failure(404, `No spool with ID ${id} found.`)
}

let responders: Record<string, Responder>
const emitAndWait = vi.fn<(method: string, params?: Record<string, unknown>, options?: unknown) => Promise<unknown>>(
    async (method, params = {}) => {
        const responder = responders[method]
        if (!responder) throw { code: -32601, message: `Method not found: ${method}` }

        return responder(params)
    }
)
const windowStub = { console: { error: vi.fn(), debug: vi.fn() } }
const toastError = vi.fn()
const addFailedInitComponent = vi.fn()

const createStore = () =>
    new Store({
        actions: {
            'server/addFailedInitComponent': (_, component: string) => addFailedInitComponent(component),
        },
        modules: {
            spoolman: { ...spoolman, state: getDefaultState() },
        },
    })

const spoolmanState = (store: Store<unknown>) => (store.state as { spoolman: ServerSpoolmanState }).spoolman

const createConnectedStore = () => {
    const store = createStore()
    store.commit('spoolman/setConnected', true)

    return store
}

/** Waits for actions that are not awaited by the caller, e.g. the spool list in init */
const flushPromises = () => new Promise((resolve) => setTimeout(resolve))

describe('server/spoolman/actions', () => {
    beforeEach(() => {
        emitAndWait.mockClear()
        toastError.mockClear()
        addFailedInitComponent.mockClear()
        windowStub.console.error.mockClear()
        Vue.$socket = { emitAndWait } as unknown as typeof Vue.$socket
        Vue.$toast = { error: toastError } as unknown as typeof Vue.$toast
        vi.stubGlobal('window', windowStub)

        activeSpoolId = 2
        spoolmanConnected = true
        spools = [spool(1), spool(2)]

        responders = {
            'server.spoolman.status': () => ({
                spoolman_connected: spoolmanConnected,
                pending_reports: [],
                spool_id: activeSpoolId,
            }),
            'server.spoolman.post_spool_id': (params) => {
                if ('spool_id' in params && typeof params.spool_id !== 'number') {
                    throw { code: 400, message: 'Unable to convert argument [spool_id]' }
                }

                activeSpoolId = (params.spool_id as number | undefined) ?? null
                return { spool_id: activeSpoolId }
            },
            'server.spoolman.proxy': (params) => spoolmanApi(params.path as string),
        }
    })

    describe('init', () => {
        it('loads the connection status, the active spool and the spools', async () => {
            const store = createStore()

            await store.dispatch('spoolman/init')
            await flushPromises()

            expect(spoolmanState(store)).toEqual({
                connected: true,
                active_spool_id: 2,
                active_spool: spools[1],
                spools,
            })
            expect(emitAndWait).toHaveBeenCalledWith('server.spoolman.proxy', {
                use_v2_response: true,
                request_method: 'GET',
                path: '/v1/spool',
            })
        })

        it('treats the spool ID 0 as no active spool', async () => {
            activeSpoolId = 0
            const store = createStore()

            await store.dispatch('spoolman/init')

            expect(spoolmanState(store).active_spool_id).toBeNull()
            expect(spoolmanState(store).active_spool).toBeNull()
            const paths = emitAndWait.mock.calls.map(([, params]) => params?.path)
            expect(paths).not.toContain('/v1/spool/0')
        })

        it('reports a failed init component when Moonraker answers with an error', async () => {
            responders = {}
            const store = createStore()

            await expect(store.dispatch('spoolman/init')).resolves.toBeUndefined()
            expect(spoolmanState(store)).toEqual(getDefaultState())
            expect(windowStub.console.error).toHaveBeenCalled()
            expect(addFailedInitComponent).toHaveBeenCalledWith('spoolman')
        })

        it('skips the Spoolman requests when Moonraker is not connected to Spoolman', async () => {
            spoolmanConnected = false
            const store = createStore()

            await expect(store.dispatch('spoolman/init')).resolves.toBeUndefined()
            await flushPromises()

            expect(spoolmanState(store)).toEqual({ ...getDefaultState(), active_spool_id: 2 })
            expect(emitAndWait.mock.calls.map(([method]) => method)).toEqual(['server.spoolman.status'])
            expect(toastError).not.toHaveBeenCalled()
            expect(addFailedInitComponent).not.toHaveBeenCalled()
        })

        it('shows the Spoolman error and finishes the init when the active spool cannot be loaded', async () => {
            activeSpoolId = 3
            const store = createStore()

            await expect(store.dispatch('spoolman/init')).resolves.toBeUndefined()
            await flushPromises()

            expect(spoolmanState(store).active_spool).toBeNull()
            expect(spoolmanState(store).spools).toEqual(spools)
            expect(toastError).toHaveBeenCalledWith('No spool with ID 3 found.')
            expect(addFailedInitComponent).not.toHaveBeenCalled()
        })

        it('propagates non RPC errors to the caller', async () => {
            responders['server.spoolman.status'] = () => {
                throw new WebSocketClosedError()
            }
            const store = createStore()

            await expect(store.dispatch('spoolman/init')).rejects.toBeInstanceOf(WebSocketClosedError)
            expect(addFailedInitComponent).not.toHaveBeenCalled()
        })

        it('propagates non RPC errors of the Spoolman requests to the caller', async () => {
            responders['server.spoolman.proxy'] = () => {
                throw new WebSocketClosedError()
            }
            const store = createStore()

            await expect(store.dispatch('spoolman/init')).rejects.toBeInstanceOf(WebSocketClosedError)
            expect(toastError).not.toHaveBeenCalled()
        })
    })

    describe('notifyActiveSpoolSet', () => {
        it('sets the active spool ID and loads the spool', async () => {
            const store = createConnectedStore()

            await store.dispatch('spoolman/notifyActiveSpoolSet', { spool_id: 1 })

            expect(spoolmanState(store).active_spool_id).toBe(1)
            expect(spoolmanState(store).active_spool).toEqual(spools[0])
        })

        it('clears the active spool', async () => {
            const store = createConnectedStore()
            await store.dispatch('spoolman/notifyActiveSpoolSet', { spool_id: 1 })

            await store.dispatch('spoolman/notifyActiveSpoolSet', { spool_id: null })

            expect(spoolmanState(store).active_spool_id).toBeNull()
            expect(spoolmanState(store).active_spool).toBeNull()
        })

        it('shows the Spoolman error instead of rejecting', async () => {
            const store = createConnectedStore()

            await expect(store.dispatch('spoolman/notifyActiveSpoolSet', { spool_id: 3 })).resolves.toBeUndefined()

            expect(spoolmanState(store).active_spool_id).toBe(3)
            expect(spoolmanState(store).active_spool).toBeNull()
            expect(toastError).toHaveBeenCalledWith('No spool with ID 3 found.')
        })

        it('ignores the response of an outdated active spool', async () => {
            let answerSpool1: () => void = () => {}
            responders['server.spoolman.proxy'] = (params) => {
                if (params.path !== '/v1/spool/1') return spoolmanApi(params.path as string)

                return new Promise((resolve) => (answerSpool1 = () => resolve(spoolmanApi('/v1/spool/1'))))
            }
            const store = createConnectedStore()
            const pending = store.dispatch('spoolman/notifyActiveSpoolSet', { spool_id: 1 })

            await store.dispatch('spoolman/notifyActiveSpoolSet', { spool_id: 2 })
            answerSpool1()
            await pending

            expect(spoolmanState(store).active_spool).toEqual(spools[1])
        })

        it('clears an outdated active spool without requesting Spoolman while it is disconnected', async () => {
            const store = createConnectedStore()
            await store.dispatch('spoolman/notifyActiveSpoolSet', { spool_id: 1 })
            store.commit('spoolman/setConnected', false)
            emitAndWait.mockClear()

            await store.dispatch('spoolman/notifyActiveSpoolSet', { spool_id: 2 })

            expect(spoolmanState(store).active_spool_id).toBe(2)
            expect(spoolmanState(store).active_spool).toBeNull()
            expect(emitAndWait).not.toHaveBeenCalled()
        })
    })

    describe('notifySpoolmanStatusChanged', () => {
        it('sets the connection status without requesting Spoolman on a disconnect', async () => {
            const store = createConnectedStore()

            await store.dispatch('spoolman/notifySpoolmanStatusChanged', { spoolman_connected: false })

            expect(spoolmanState(store).connected).toBe(false)
            expect(emitAndWait).not.toHaveBeenCalled()
        })

        it('loads the active spool and the spools on a reconnect', async () => {
            spoolmanConnected = false
            const store = createStore()
            await store.dispatch('spoolman/init')
            spoolmanConnected = true

            await store.dispatch('spoolman/notifySpoolmanStatusChanged', { spoolman_connected: true })

            expect(spoolmanState(store)).toEqual({
                connected: true,
                active_spool_id: 2,
                active_spool: spools[1],
                spools,
            })
        })

        it('logs errors instead of rejecting', async () => {
            const store = createStore()
            responders['server.spoolman.proxy'] = () => failure(500, 'Internal error')

            await expect(
                store.dispatch('spoolman/notifySpoolmanStatusChanged', { spoolman_connected: true })
            ).resolves.toBeUndefined()

            expect(spoolmanState(store).connected).toBe(true)
            expect(windowStub.console.error).toHaveBeenCalledTimes(1)
            expect(toastError).not.toHaveBeenCalled()
        })
    })

    describe('refreshActiveSpool', () => {
        it('loads the active spool', async () => {
            const store = createStore()
            await store.dispatch('spoolman/init')
            spools = [spool(1), spool(2, { remaining_weight: 500 })]

            await store.dispatch('spoolman/refreshActiveSpool')

            expect(spoolmanState(store).active_spool?.remaining_weight).toBe(500)
        })

        it('updates the active spool in the spool list', async () => {
            const store = createStore()
            await store.dispatch('spoolman/init')
            await flushPromises()
            const unchanged = spoolmanState(store).spools[0]
            spools = [spool(1, { remaining_weight: 900 }), spool(2, { remaining_weight: 500 })]

            await store.dispatch('spoolman/refreshActiveSpool')

            expect(spoolmanState(store).spools[0]).toBe(unchanged)
            expect(spoolmanState(store).spools[1].remaining_weight).toBe(500)
            expect(store.getters['spoolman/getSpool'](2)).toBe(spoolmanState(store).active_spool)
        })

        it('rejects with a SpoolmanProxyError if Spoolman answers with an error', async () => {
            const store = createStore()
            await store.dispatch('spoolman/init')
            const active = spoolmanState(store).active_spool
            spoolmanConnected = false

            await expect(store.dispatch('spoolman/refreshActiveSpool')).rejects.toEqual(
                new SpoolmanProxyError(503, 'Spoolman server not available')
            )
            expect(spoolmanState(store).active_spool).toBe(active)
        })
    })

    describe('refreshSpools', () => {
        it('loads the spools', async () => {
            const store = createStore()

            await store.dispatch('spoolman/refreshSpools')

            expect(spoolmanState(store).spools).toEqual(spools)
        })

        it('propagates errors to the caller and keeps the spools', async () => {
            const store = createStore()
            await store.dispatch('spoolman/refreshSpools')
            spoolmanConnected = false

            await expect(store.dispatch('spoolman/refreshSpools')).rejects.toBeInstanceOf(SpoolmanProxyError)
            expect(spoolmanState(store).spools).toEqual(spools)
        })
    })

    describe('setActiveSpool', () => {
        it('sends the spool ID', async () => {
            const store = createStore()

            await store.dispatch('spoolman/setActiveSpool', 1)

            expect(emitAndWait).toHaveBeenLastCalledWith('server.spoolman.post_spool_id', { spool_id: 1 })
            expect(activeSpoolId).toBe(1)
        })

        it('omits the spool ID to unset the active spool', async () => {
            const store = createStore()

            await store.dispatch('spoolman/setActiveSpool', null)

            expect(emitAndWait).toHaveBeenLastCalledWith('server.spoolman.post_spool_id', {})
            expect(activeSpoolId).toBeNull()
        })

        it('propagates errors to the caller', async () => {
            responders = {}
            const store = createStore()

            await expect(store.dispatch('spoolman/setActiveSpool', 1)).rejects.toMatchObject({ code: -32601 })
        })
    })
})
