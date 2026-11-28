/**
 * Switches, Sensors, and Devices RPC Interface
 *
 * The endpoints are only available when the corresponding devices are configured in `moonraker.conf`.
 * Currently the power and sensor endpoints are typed.
 *
 * @see https://moonraker.readthedocs.io/en/latest/external_api/devices/
 */
export interface DevicesRPC {
    /**
     * Get device list.
     * Returns the status of all configured power devices.
     */
    'machine.device_power.devices': () => Promise<{
        /** An array of Power Device Status objects */
        devices: PowerDevice[]
    }>

    /**
     * Get device state.
     * Requests the device state for a single configured device. Returns an error if the device does not exist.
     */
    'machine.device_power.get_device': (params: {
        /** The name of the device (required) */
        device: string
    }) => Promise<PowerDeviceStates>

    /**
     * Set device state.
     * Toggle, turn on, or turn off a specified device. Returns an error if the device does not exist,
     * or if the device is `locked_while_printing` and Klipper is printing.
     */
    'machine.device_power.post_device': (params: {
        /** The name of the device to manage (required) */
        device: string
        /** The action to perform on the device (required) */
        action: PowerDeviceAction
    }) => Promise<PowerDeviceStates>

    /**
     * Get batch device status.
     * Get power status for the requested devices. At least one device must be specified.
     */
    'machine.device_power.status': (params: PowerDeviceBatchParams) => Promise<PowerDeviceBatchStates>

    /**
     * Batch power on devices.
     * Power on the requested devices. At least one device must be specified.
     */
    'machine.device_power.on': (params: PowerDeviceBatchParams) => Promise<PowerDeviceBatchStates>

    /**
     * Batch power off devices.
     * Power off the requested devices. At least one device must be specified.
     */
    'machine.device_power.off': (params: PowerDeviceBatchParams) => Promise<PowerDeviceBatchStates>

    /**
     * Get sensor list.
     * Returns the status of all configured sensors, keyed by the sensor ID.
     */
    'server.sensors.list': (params?: {
        /** When set to `true` the status of each sensor includes `parameter_info` and `history_fields` (default: false) */
        extended?: boolean
    }) => Promise<{
        /** An object containing the Sensor Status objects keyed by the sensor ID */
        sensors: Record<string, SensorStatus>
    }>

    /**
     * Get sensor information.
     * Returns the status of a single configured sensor. Returns an error if the sensor does not exist.
     */
    'server.sensors.info': (params: {
        /** The ID of the requested sensor (required) */
        sensor: string
        /** When set to `true` the status includes `parameter_info` and `history_fields` (default: false) */
        extended?: boolean
    }) => Promise<SensorStatus>

    /**
     * Get sensor measurements.
     * Returns all recorded measurements of a single sensor or, if no sensor is specified, of all sensors.
     * Returns an error if the requested sensor does not exist.
     *
     * Note: The docs mark `sensor` as required, but Moonraker treats a missing (or empty) `sensor` as
     * a batch request (documented separately as "Get Batch Sensor Measurements").
     */
    'server.sensors.measurements': (params?: {
        /** The ID of the requested sensor. Omit it to request the measurements of all sensors */
        sensor?: string
    }) => Promise<Record<string, SensorMeasurements>>
}

/**
 * Power Device State
 *
 * - `on`: The device is powered on
 * - `off`: The device is powered off
 * - `init`: The device is initializing
 * - `error`: The device encountered an error
 */
export type PowerDeviceState = 'on' | 'off' | 'init' | 'error'

/**
 * Power Device Action
 *
 * - `on`: Turns the device on
 * - `off`: Turns the device off
 * - `toggle`: Toggles the device state
 */
export type PowerDeviceAction = 'on' | 'off' | 'toggle'

/**
 * Power Device Type
 *
 * Note: Unofficial 3rd party extensions can register their own device types.
 */
export type PowerDeviceType =
    | 'gpio'
    | 'klipper_device'
    | 'tplink_smartplug'
    | 'tasmota'
    | 'shelly'
    | 'homeseer'
    | 'homeassistant'
    | 'loxonev1'
    | 'rf'
    | 'mqtt'
    | 'smartthings'
    | 'hue'
    | 'http'
    | 'uhubctl'
    | (string & {})

/**
 * Power Device Status
 */
export interface PowerDevice {
    /** The configured name of the device */
    device: string
    /** The current state of the device */
    status: PowerDeviceState
    /** When set to true the power device status may not be changed when Klipper is printing */
    locked_while_printing: boolean
    /** The device type of the device */
    type: PowerDeviceType
    /**
     * Whether Klipper is shut down.
     * Note: Not documented, Moonraker only adds this field for devices of type `klipper_device`.
     */
    is_shutdown?: boolean
}

/**
 * Batch request parameters.
 * The keys are the requested device names, the values should always be `null`.
 */
export type PowerDeviceBatchParams = Record<string, null>

/**
 * Device states keyed by the configured device name.
 */
export type PowerDeviceStates = Record<string, PowerDeviceState>

/**
 * Device states of a batch request keyed by the configured device name.
 * Note: Not documented, Moonraker returns `device_not_found` for unknown devices instead of an error.
 */
export type PowerDeviceBatchStates = Record<string, PowerDeviceState | 'device_not_found'>

/**
 * Payload of the notify_power_changed notification.
 * Emitted when the state of a power device changes.
 *
 * Note: Not documented on the notifications page (only in the API changelog). Moonraker sends the full
 * Power Device Status of the changed device.
 */
export type PowerChangedNotification = PowerDevice

/**
 * Sensor Values
 *
 * The most recent measurements of a sensor, keyed by the parameter name.
 *
 * Note: The docs type the values as `any`, but Moonraker converts every measurement to a number.
 * The object is empty until the first measurement arrives or after the MQTT connection of a sensor was lost.
 */
export type SensorValues = Record<string, number>

/**
 * Sensor Parameter Info
 *
 * Contains the `parameter_<name>` options of the sensor config section. Besides the `name`, the object
 * contains all custom fields of the option, e.g. `units`.
 */
export interface SensorParameterInfo {
    /** The name of a parameter measured by the sensor */
    name: string
    /** Custom fields provided in the sensor configuration, e.g. `units` */
    [key: string]: string
}

/**
 * Sensor History Tracking Strategy
 *
 * - `basic`: Stores the last value measured during a job
 * - `delta`: Stores the difference between the last and first values measured during a job
 * - `accumulate`: Stores the cumulative value of all measurements reported during the job
 * - `average`: Stores an average of all measurements taken during the job
 * - `maximum`: Stores the maximum value measured during the job
 * - `minimum`: Stores the minimum value measured during the job
 * - `collect`: Stores all values measured during the job in an array
 */
export type SensorHistoryStrategy = 'basic' | 'delta' | 'accumulate' | 'average' | 'maximum' | 'minimum' | 'collect'

/**
 * Sensor History Field
 *
 * An auxiliary field the sensor stores in the job history.
 */
export interface SensorHistoryField {
    /** The name of the auxiliary field to be stored in the job history */
    field: string
    /** The object providing data for history tracking, the sensor's config section name, e.g. `sensor my_sensor` */
    provider: string
    /** A brief description of the measurement */
    description: string
    /** The strategy used to track data stored in the job history */
    strategy: SensorHistoryStrategy
    /** The units, if applicable, for the value stored in history */
    units: string | null
    /** When `true` the first value tracked will be initialized to the most recent sensor measurement */
    init_tracker: boolean
    /** When `true` tracking will exclude measurements taken while a job is paused */
    exclude_paused: boolean
    /** When `true` the final tracked value will be accumulated and included in the job totals */
    report_total: boolean
    /** When `true` the maximum final tracked value during a job will be included in the job totals */
    report_maximum: boolean
    /**
     * The precision of the final tracked value, presuming it is a float.
     * Note: The docs type it as `int`, but Moonraker returns `null` if no precision is configured.
     */
    precision: number | null
    /** The `name` of the sensor parameter to track */
    parameter: string
}

/**
 * Sensor Status
 */
export interface SensorStatus {
    /** The sensor's configured ID */
    id: string
    /** The sensor's configured friendly name. Moonraker falls back to the ID, if no name is configured */
    friendly_name: string
    /**
     * The sensor's configured type. Currently only `mqtt` types are supported.
     * Note: Moonraker returns the type as configured, so the case may differ (e.g. `MQTT`).
     */
    type: string
    /** The most recent values measured by the sensor */
    values: SensorValues
    /** An array of Parameter Info objects. Only included with `extended` responses */
    parameter_info?: SensorParameterInfo[]
    /**
     * An array of History Field objects. Only included with `extended` responses.
     * Empty if no history fields are configured for the sensor.
     */
    history_fields?: SensorHistoryField[]
}

/**
 * Sensor Measurements
 *
 * All stored measurements of a sensor, keyed by the parameter name.
 */
export type SensorMeasurements = Record<string, number[]>

/**
 * Payload of the notify_sensor_update notification.
 * Emitted (at most once per second) when the values of one or more sensors changed.
 *
 * The keys are the sensor IDs, the values are the Sensor Values objects. Moonraker always sends all
 * current values of a changed sensor, not only the changed ones. Unchanged sensors are omitted.
 */
export type SensorUpdateNotification = Record<string, SensorValues>
