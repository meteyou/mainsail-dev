/**
 * Spoolman REST API
 *
 * Spoolman is accessed through Moonraker's `server.spoolman.proxy` endpoint (see `SpoolmanRPC.ts`).
 * Spoolman omits fields with a null value, so nullable fields are optional.
 *
 * @see https://donkie.github.io/Spoolman/
 */

/**
 * Typed GET endpoints of the Spoolman API, mapped to their response.
 * Add new endpoints here, `fetchSpoolman` infers the response type from the path.
 *
 * @example
 * '/v1/spool': SpoolmanSpool[]
 * [path: `/v1/spool/${number}`]: SpoolmanSpool
 */
export interface SpoolmanGetEndpoints {
    /** List all spools (archived spools are excluded by default) */
    '/v1/spool': SpoolmanSpool[]
    /** Get a single spool by its ID */
    [path: `/v1/spool/${number}`]: SpoolmanSpool
    /** List all filaments */
    '/v1/filament': SpoolmanFilament[]
    /** Get a single filament by its ID */
    [path: `/v1/filament/${number}`]: SpoolmanFilament
    /** List all vendors */
    '/v1/vendor': SpoolmanVendor[]
    /** Get a single vendor by its ID */
    [path: `/v1/vendor/${number}`]: SpoolmanVendor
}

/** All typed GET paths of the Spoolman API */
export type SpoolmanGetPath = keyof SpoolmanGetEndpoints

/** Response type of a Spoolman GET path */
export type SpoolmanGetResult<P extends SpoolmanGetPath> = SpoolmanGetEndpoints[P]

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
