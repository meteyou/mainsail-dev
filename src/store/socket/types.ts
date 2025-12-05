export type MoonrakerAuthSource = 'moonraker' | 'ldap'

export interface SocketState {
    hostname: string
    port: number
    path: string
    protocol: string
    reconnectInterval: number
    isConnected: boolean
    isConnecting: boolean
    connectingFailed: boolean
    connectionFailedMessage: string | null
    loadings: string[]
    initializationList: string[]
    connection_id: number | null
    accessToken: string | null
    refreshToken: string | null
    username: string | null
    authSource: string | null
    loginRequired: boolean
    isTrustedClient: boolean
    availableAuthSources: MoonrakerAuthSource[]
    defaultAuthSource: MoonrakerAuthSource
}

export interface MoonrakerAuthInfo {
    available_sources: MoonrakerAuthSource[]
    default_source: MoonrakerAuthSource
    login_required: boolean
    trusted: boolean
}

export interface MoonrakerAuthLoginRequest {
    username: string
    password: string
    source: MoonrakerAuthSource
}

export interface MoonrakerAuthLoginResponse {
    username: string
    token: string
    refresh_token: string
    source: MoonrakerAuthSource
    action: 'user_logged_in'
}

export interface MoonrakerAuthLogoutResponse {
    action: 'user_logged_out'
    username: string
}

export interface MoonrakerAuthRefreshJwtResponse {
    action: 'user_jwt_refresh'
    source: MoonrakerAuthSource
    token: string
    username: string
}

export interface MoonrakerAuthRefreshJwtRequest {
    refresh_token: string
}
