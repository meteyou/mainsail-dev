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
     * @see https://donkie.github.io/Spoolman/ for the Spoolman API
     */
    'server.spoolman.proxy': (params: {
        /** Request a version 2 response (default: false) */
        use_v2_response: true
        /** The HTTP request method of the API call to proxy (required) */
        request_method: SpoolmanRequestMethod
        /** The path of the API endpoint to proxy. It must include the version, e.g. `/v1/filament` (required) */
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

/*
 * Spoolman API objects, as returned through the proxy.
 * Spoolman omits fields with a null value, so nullable fields are optional.
 * @see https://donkie.github.io/Spoolman/
 */

/** Response of the Spoolman `GET /v1/health` endpoint */
export interface SpoolmanHealth {
    /** Always `healthy` if Spoolman is reachable */
    status: string
}

/** Spoolman Vendor */
export interface SpoolmanVendor {
    /** Unique internal ID of this vendor */
    id: number
    /** When the vendor was registered in the database (ISO 8601, UTC) */
    registered: string
    /** Vendor name */
    name: string
    /** Free text comment about this vendor */
    comment?: string
    /** The empty spool weight of this vendor's spools in grams */
    empty_spool_weight?: number
    /** Set if this vendor comes from an external database */
    external_id?: string
    /** Extra fields for this vendor, values are JSON encoded strings */
    extra?: Record<string, string>
}

/** Direction of the colors of a multi-color filament */
export type SpoolmanMultiColorDirection = 'coaxial' | 'longitudinal'

/** Spoolman Filament */
export interface SpoolmanFilament {
    /** Unique internal ID of this filament type */
    id: number
    /** When the filament was registered in the database (ISO 8601, UTC) */
    registered: string
    /** Filament name, to distinguish this filament type among others from the same vendor */
    name?: string
    /** The vendor of this filament type */
    vendor?: SpoolmanVendor
    /** The material of this filament, e.g. PLA */
    material?: string
    /** The price of a full spool of this filament type */
    price?: number
    /** The density of this filament in g/cm3 */
    density: number
    /** The diameter of this filament in mm */
    diameter: number
    /** The weight of the filament in a full spool, in grams */
    weight?: number
    /** The empty spool weight in grams */
    spool_weight?: number
    /** Vendor article number, e.g. EAN, QR code, etc. */
    article_number?: string
    /** Free text comment about this filament type */
    comment?: string
    /** Overridden extruder temperature in °C */
    settings_extruder_temp?: number
    /** Overridden bed temperature in °C */
    settings_bed_temp?: number
    /** Hexadecimal color code of the filament without the leading `#`. Not set for multi-color filaments */
    color_hex?: string
    /** Comma separated hexadecimal color codes of a multi-color filament */
    multi_color_hexes?: string
    /** Direction of the colors of a multi-color filament */
    multi_color_direction?: SpoolmanMultiColorDirection
    /** Set if this filament comes from an external database */
    external_id?: string
    /** Extra fields for this filament, values are JSON encoded strings */
    extra?: Record<string, string>
}

/** Spoolman Spool */
export interface SpoolmanSpool {
    /** Unique internal ID of this spool */
    id: number
    /** When the spool was registered in the database (ISO 8601, UTC) */
    registered: string
    /** First logged occurrence of spool usage (ISO 8601, UTC) */
    first_used?: string
    /** Last logged occurrence of spool usage (ISO 8601, UTC) */
    last_used?: string
    /** The filament type of this spool */
    filament: SpoolmanFilament
    /** The price of this spool. Overrides the filament price */
    price?: number
    /** Estimated remaining weight of filament on the spool in grams */
    remaining_weight?: number
    /** The initial weight of the filament on the spool in grams */
    initial_weight?: number
    /** The weight of the empty spool in grams */
    spool_weight?: number
    /** Consumed weight of filament from the spool in grams */
    used_weight: number
    /** Estimated remaining length of filament on the spool in mm */
    remaining_length?: number
    /** Consumed length of filament from the spool in mm */
    used_length: number
    /** Where this spool can be found */
    location?: string
    /** Vendor manufacturing lot/batch number of the spool */
    lot_nr?: string
    /** Free text comment about this specific spool */
    comment?: string
    /** Whether this spool is archived and should not be used anymore */
    archived: boolean
    /** Extra fields for this spool, values are JSON encoded strings */
    extra?: Record<string, string>
}
