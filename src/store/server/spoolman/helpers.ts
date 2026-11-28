import Vue from 'vue'
import { isJsonRpcError } from '@/types/moonraker'
import type { JsonRpcError } from '@/types/moonraker'
import type { SpoolmanGetPath, SpoolmanGetResult } from '@/types/spoolman'

/*
 * Logging
 */

const LOG_PREFIX = '[Server][Spoolman]'
export const logDebug = (...args: unknown[]) => window.console.debug(LOG_PREFIX, ...args)
export const logError = (...args: unknown[]) => window.console.error(LOG_PREFIX, ...args)

/*
 * Errors
 */

/** An error returned by Spoolman, or by Moonraker if Spoolman is not available, through the proxy */
export class SpoolmanProxyError extends Error {
    readonly statusCode: number

    constructor(statusCode: number, message: string) {
        super(message)
        this.name = 'SpoolmanProxyError'
        this.statusCode = statusCode
    }
}

/** Errors that only affect the Spoolman data and must not abort the app init */
export const isSpoolmanRequestError = (error: unknown): error is SpoolmanProxyError | JsonRpcError =>
    error instanceof SpoolmanProxyError || isJsonRpcError(error)

/*
 * Spools
 */

/** Moonraker accepts 0 as spool ID, but Spoolman IDs start at 1, so 0 also means "no active spool" */
export const normalizeSpoolId = (spoolId: number | null): number | null => (spoolId ? spoolId : null)

/*
 * Requests
 */

/**
 * Sends a GET request to the Spoolman API, the response type is inferred from the path.
 * Rejects with a SpoolmanProxyError if Spoolman answers with an error.
 */
export const fetchSpoolman = async <P extends SpoolmanGetPath>(path: P): Promise<SpoolmanGetResult<P>> => {
    const result = await Vue.$socket.emitAndWait('server.spoolman.proxy', {
        use_v2_response: true,
        request_method: 'GET',
        path,
    })
    if (result.error) throw new SpoolmanProxyError(result.error.status_code, result.error.message)

    // the proxy can't know the response type of the requested path
    return result.response as SpoolmanGetResult<P>
}
