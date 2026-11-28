/**
 * Spoolman RPC Interface
 *
 * The endpoints are only available when the `[spoolman]` component is configured in `moonraker.conf`.
 * They are documented in the Spoolman section of Moonraker's integrations page.
 *
 * @see https://moonraker.readthedocs.io/en/latest/external_api/integrations/#spoolman
 */
export interface SpoolmanRPC {
    /**
     * Get Spoolman status.
     * Returns the current status of the spoolman module.
     */
    'server.spoolman.status': () => Promise<{
        /** Indicates that Moonraker has an established websocket connection to Spoolman */
        spoolman_connected: boolean
        /** Reports that have not been sent to Spoolman yet (Spoolman unavailable or waiting for the report timer) */
        pending_reports: SpoolmanPendingReport[]
        /** The ID of the currently tracked spool. null if no spool is set and tracking is disabled */
        spool_id: number | null
    }>

    /**
     * Set active spool.
     * Sets the ID of the spool to track filament usage and report to Spoolman.
     * Emits the notify_active_spool_set notification if the spool ID changed.
     */
    'server.spoolman.post_spool_id': (params?: {
        /**
         * The new active spool ID. When omitted the active spool is unset and tracking is disabled.
         *
         * Note: The docs list `null` as the default, but Moonraker rejects an explicit null
         * (it fails the int conversion), so the parameter must be omitted instead.
         */
        spool_id?: number
    }) => Promise<{
        /** The ID of the currently tracked spool. null if no spool is set and tracking is disabled */
        spool_id: number | null
    }>

    /**
     * Get active spool.
     * Retrieves the ID of the spool to which Moonraker reports usage for Spoolman.
     */
    'server.spoolman.get_spool_id': () => Promise<{
        /** The ID of the currently tracked spool. null if no spool is set and tracking is disabled */
        spool_id: number | null
    }>

    /**
     * Proxy an API request to the Spoolman server.
     *
     * Note: Only the version 2 response is typed, so `use_v2_response` is required here.
     * The version 1 response is deprecated by Moonraker and proxies Spoolman's response and errors
     * directly, which makes it impossible to tell Spoolman errors apart from Moonraker errors.
     *
     * The response is typed by `fetchSpoolman` in the spoolman store using `SpoolmanGetEndpoints` (`@/types/spoolman`).
     *
     * @see https://donkie.github.io/Spoolman/ for the Spoolman API
     */
    'server.spoolman.proxy': (params: {
        /** Request a version 2 response (default: false) */
        use_v2_response: true
        /** The HTTP request method of the API call to proxy (required) */
        request_method: SpoolmanRequestMethod
        /**
         * The path of the API endpoint to proxy. It must include the version, e.g. `/v1/filament` (required).
         * The typed GET endpoints are listed in `SpoolmanGetEndpoints` (`@/types/spoolman`).
         */
        path: string
        /**
         * An optional query string of the URL to proxy, without the leading `?`.
         *
         * Note: The docs list `null` as the default, but Moonraker converts an explicit null
         * to the string "None", so the parameter must be omitted instead.
         */
        query?: string
        /** An optional JSON encodable request body. GET requests must not have a body */
        body?: Record<string, unknown> | null
    }) => Promise<SpoolmanProxyResponse>
}

/** HTTP request methods accepted by the Spoolman proxy */
export type SpoolmanRequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Pending Spoolman Report
 *
 * Filament usage that has not been reported to Spoolman yet.
 */
export interface SpoolmanPendingReport {
    /** The ID of the spool with pending report data */
    spool_id: number
    /** The amount of used filament to report in mm */
    filament_used: number
}

/**
 * Spoolman Error
 *
 * An error returned by Spoolman (or by Moonraker if Spoolman is not available) in a version 2 proxy response.
 */
export interface SpoolmanError {
    /** The HTTP status code of the response. 503 if Moonraker is not connected to Spoolman */
    status_code: number
    /** The error message received with the response */
    message: string
}

/**
 * Version 2 response of the Spoolman proxy.
 * Exactly one of `response` and `error` is set.
 */
export type SpoolmanProxyResponse =
    | {
          /** The response received from Spoolman */
          response: unknown
          /**
           * The headers of the response received from Spoolman.
           * Not documented, but returned by Moonraker.
           */
          response_headers: Record<string, string>
          error: null
      }
    | {
          response: null
          /** The error received from Spoolman */
          error: SpoolmanError
      }

/**
 * Payload of the notify_active_spool_set notification.
 * Emitted when the active spool ID has changed.
 * @see https://moonraker.readthedocs.io/en/latest/external_api/jsonrpc_notifications/#spoolman-active-spool-id-changed
 */
export interface SpoolmanActiveSpoolSetNotification {
    /** The spool ID of the new active spool. null if no active spool is set and tracking is disabled */
    spool_id: number | null
}

/**
 * Payload of the notify_spoolman_status_changed notification.
 * Emitted when the connection status between Moonraker and Spoolman changes.
 * @see https://moonraker.readthedocs.io/en/latest/external_api/jsonrpc_notifications/#spoolman-status-changed
 */
export interface SpoolmanStatusChangedNotification {
    /** true if Moonraker is currently connected to the Spoolman server */
    spoolman_connected: boolean
}
