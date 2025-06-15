export interface SocketState {
    hostname: string
    port: number
    path: string
    protocol: string
    reconnectInterval: number
    isConnected: boolean
    isConnecting: boolean
    needLogin: boolean
    connectingFailed: boolean
    connectionFailedMessage: string | null
    username: null | string
    token: null | string
    refresh_token: null | string
    loadings: string[]
    initializationList: string[]
    connection_id: number | null
}
