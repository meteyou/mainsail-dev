import type { SensorStatus } from '@/types/moonraker/DevicesRPC'

export interface ServerSensorState {
    /** Sensors keyed by the sensor ID */
    sensors: Record<string, ServerSensor>
}

/** The store only requests the basic sensor status, so the `extended` fields are never present */
export type ServerSensor = Omit<SensorStatus, 'parameter_info' | 'history_fields'>
