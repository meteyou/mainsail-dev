import { ActionTree } from 'vuex'
import { EditorState } from '@/store/editor/types'
import { RootState } from '@/store/types'
import axios, { AxiosProgressEvent } from 'axios'
import { sha256 } from 'js-sha256'
import Vue from 'vue'
import i18n from '@/plugins/i18n'
import { escapePath, formatFilesize, windowBeforeUnloadFunction } from '@/plugins/helpers'

const LOG_PREFIX = '[EDITOR]'
const logError = (...args: unknown[]) => window.console.error(LOG_PREFIX, ...args)

export const actions: ActionTree<EditorState, RootState> = {
    reset({ commit, dispatch }): void {
        dispatch('cancelLoad')
        commit('reset')
    },

    downloadProgress(
        { commit },
        payload: { progressEvent: AxiosProgressEvent; direction: string; filesize: number | null }
    ): void {
        commit('updateLoader', {
            direction: payload.direction,
            speed: formatFilesize(payload.progressEvent.rate ?? 0),
            loaded: payload.progressEvent.loaded,
            total: payload.filesize ?? payload.progressEvent.total,
        })
    },

    async openFile(
        { state, dispatch, commit, rootGetters },
        payload: {
            root: string
            path: string
            filename: string
            size: number
            permissions: string
        }
    ): Promise<void> {
        const fullFilepathArray = [payload.root]
        let path = payload.path
        if (path.slice(0, 1) === '/') path = path.slice(1)
        if (path.slice(-1) === '/') path = path.slice(0, -1)
        if (path !== '') fullFilepathArray.push(path)
        fullFilepathArray.push(payload.filename)

        const fullFilepath = fullFilepathArray.join('/')
        const url = `${rootGetters['socket/getUrl']}/server/files/${escapePath(fullFilepath)}?${Date.now()}`

        // cancel previous load if it exists
        dispatch('cancelLoad')

        const abortController = new AbortController()
        commit('updateAbortController', abortController)
        commit('updateLoaderState', true)

        commit('setFilename', payload.filename)

        try {
            const response = await axios.get<Blob>(url, {
                signal: abortController.signal,
                onDownloadProgress: (progressEvent): Promise<void> =>
                    dispatch('downloadProgress', {
                        progressEvent,
                        direction: 'downloading',
                        filesize: payload.size,
                    }),
                responseType: 'blob',
            })

            const content = await response.data.text()
            if (state.abortController !== abortController) return

            commit('openFile', {
                filename: payload.filename,
                fileroot: payload.root,
                permissions: payload.permissions,
                filepath: path,
                file: content,
            })
        } catch (error) {
            if (axios.isCancel(error)) return

            logError(error)
            Vue.$toast.error(i18n.t('Editor.FailedLoad', { filename: payload.filename }).toString())
        } finally {
            if (state.abortController === abortController) {
                commit('updateAbortController', null)
                dispatch('clearLoader')
            }
        }
    },

    async saveFile(
        { state, commit, dispatch, rootGetters, rootState },
        payload: { content: string; restartServiceName: string | null }
    ): Promise<void> {
        const content = new Blob([payload.content], { type: 'text/plain' })
        const formData = new FormData()
        formData.append('file', content, state.filename)
        formData.append('root', state.fileroot)
        formData.append('path', state.filepath)
        formData.append('checksum', sha256(payload.content))

        const url = rootGetters['socket/getUrl'] + '/server/files/upload'
        if (state.abortController) dispatch('cancelLoad')
        const abortController = new AbortController()
        commit('updateAbortController', abortController)
        commit('updateLoaderState', true)

        try {
            const response = await axios.post(url, formData, {
                signal: abortController.signal,
                onUploadProgress: (progressEvent) =>
                    dispatch('downloadProgress', {
                        progressEvent,
                        direction: 'uploading',
                        filesize: null,
                    }),
            })
            const data = response.data
            if (state.abortController !== abortController) return

            Vue.$toast.success(i18n.t('Editor.SuccessfullySaved', { filename: data.item.path }).toString())

            if (payload.restartServiceName === 'klipper') {
                const klipperRestartMethod = rootState.gui?.editor?.klipperRestartMethod ?? 'FIRMWARE_RESTART'
                Vue.$socket.emit('printer.gcode.script', { script: klipperRestartMethod })
            } else if (payload.restartServiceName === 'moonraker') {
                Vue.$socket.emit('server.restart', {})
            } else if (payload.restartServiceName !== null) {
                Vue.$socket.emit('machine.services.restart', { service: payload.restartServiceName })
            }

            commit('updateLoadedHash', payload.content)

            if (payload.restartServiceName !== null) dispatch('close')
        } catch (error) {
            if (axios.isCancel(error)) return

            logError(error)
            Vue.$toast.error(i18n.t('Editor.FailedSave', { filename: state.filename }).toString())
        } finally {
            if (state.abortController === abortController) {
                commit('updateAbortController', null)
                dispatch('clearLoader')
            }
        }
    },

    cancelLoad({ state, commit, dispatch }): void {
        if (!state.abortController) return

        state.abortController.abort()
        commit('updateAbortController', null)
        dispatch('clearLoader')
    },

    clearLoader({ commit }): void {
        commit('updateLoaderState', false)
        commit('updateLoader', {
            direction: 'downloading',
            loaded: 0,
            total: 0,
            speed: '',
        })
    },

    close({ dispatch }): void {
        dispatch('reset')

        window.removeEventListener('beforeunload', windowBeforeUnloadFunction)
    },

    updateSourcecode({ commit }, payload): void {
        commit('updateSourcecode', payload)
    },
}
