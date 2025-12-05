import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, CancelTokenSource } from 'axios'
import { Store } from 'vuex'
import _Vue from 'vue'
import { RootState } from '@/store/types'

export class HttpClient {
    private instance: AxiosInstance
    private store: Store<RootState>
    private isRefreshing = false
    private refreshSubscribers: ((token: string) => void)[] = []

    constructor(options: HttpClientPluginOptions) {
        this.store = options.store

        this.instance = axios.create()

        this.instance.interceptors.request.use((config) => {
            const token = this.store.state.socket?.accessToken
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`
            }

            if (config.url && !config.url.startsWith('http')) {
                const protocol = this.store.state.socket?.protocol === 'wss' ? 'https' : 'http'
                config.url = protocol + ':' + this.store.getters['socket/getUrl'] + config.url
            }

            return config
        })

        this.instance.interceptors.response.use(
            (response) => {
                if (response.data?.result !== undefined) {
                    response.data = response.data.result
                }
                return response
            },
            async (error) => {
                const originalRequest = error.config

                if (error.response?.status === 401 && !originalRequest._retry) {
                    if (this.isRefreshing) {
                        return new Promise((resolve) => {
                            this.refreshSubscribers.push((token: string) => {
                                originalRequest.headers['Authorization'] = `Bearer ${token}`
                                resolve(this.instance(originalRequest))
                            })
                        })
                    }

                    originalRequest._retry = true
                    this.isRefreshing = true

                    try {
                        await this.store.dispatch('socket/refreshAccessToken')
                        const newToken = this.store.state.socket?.accessToken ?? ''

                        this.refreshSubscribers.forEach((callback) => callback(newToken))
                        this.refreshSubscribers = []

                        originalRequest.headers['Authorization'] = `Bearer ${newToken}`
                        return this.instance(originalRequest)
                    } catch {
                        this.store.commit('socket/clearAuth')
                        _Vue.$refreshTokenStorage.remove()
                        return Promise.reject(error)
                    } finally {
                        this.isRefreshing = false
                    }
                }

                return Promise.reject(error)
            }
        )
    }

    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.instance.get<T>(url, config)
    }

    post<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.instance.post<T, AxiosResponse<T>, D>(url, data, config)
    }

    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.instance.put<T>(url, data, config)
    }

    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.instance.delete<T>(url, config)
    }

    createCancelToken(): CancelTokenSource {
        return axios.CancelToken.source()
    }
}

export function HttpClientPlugin(Vue: typeof _Vue, options: HttpClientPluginOptions): void {
    const httpClient = new HttpClient(options)
    Vue.prototype.$http = httpClient
    Vue.$http = httpClient
}

export interface HttpClientPluginOptions {
    store: Store<RootState>
}

declare module 'vue/types/vue' {
    interface Vue {
        $http: HttpClient
    }
    interface VueConstructor {
        $http: HttpClient
    }
}
