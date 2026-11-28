import type { SpoolmanSpool } from '@/types/moonraker/SpoolmanRPC'

export const spool = (id: number, overrides: Partial<SpoolmanSpool> = {}): SpoolmanSpool => ({
    id,
    registered: '2026-01-01T00:00:00Z',
    filament: {
        id,
        registered: '2026-01-01T00:00:00Z',
        name: `Filament ${id}`,
        material: 'PLA',
        density: 1.24,
        diameter: 1.75,
        color_hex: 'BD0B0B',
    },
    used_weight: 0,
    used_length: 0,
    archived: false,
    ...overrides,
})
