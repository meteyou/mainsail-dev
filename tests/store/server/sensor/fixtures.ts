import type { ServerSensor } from '@/store/server/sensor/types'
import type { SensorValues } from '@/types/moonraker/DevicesRPC'

export const sensor = (id: string, values: SensorValues = {}): ServerSensor => ({
    id,
    friendly_name: id,
    type: 'mqtt',
    values,
})
