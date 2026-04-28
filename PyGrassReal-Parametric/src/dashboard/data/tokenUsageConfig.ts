/**
 * tokenUsageConfig.ts
 * Config สี, label, และการตั้งค่าแสดงผลสำหรับแต่ละ Platform
 */

import type { TokenPlatform } from '../types/tokenUsage.types';

export interface PlatformConfig {
    label: string;
    color: string;      // CSS color สำหรับกราฟ
    dotClass: string;   // CSS class สำหรับ legend dot
}

export const PLATFORM_CONFIG: Record<TokenPlatform, PlatformConfig> = {
    IDE: {
        label: 'IDE',
        color: '#f97316',   // สีส้ม
        dotClass: 'api-usage-legend-dot is-ide',
    },
    CLI: {
        label: 'CLI',
        color: '#22c55e',   // สีเขียว
        dotClass: 'api-usage-legend-dot is-cli',
    },
    PYGRASSREAL: {
        label: 'PyGrassReal',
        color: '#3b82f6',   // สีน้ำเงิน
        dotClass: 'api-usage-legend-dot is-pygrassreal',
    },
};

export const ALL_PLATFORMS: TokenPlatform[] = ['IDE', 'CLI', 'PYGRASSREAL'];

export const PERIOD_OPTIONS = [
    { value: 7 as const, label: { th: '7 วัน', en: '7 days' } },
    { value: 30 as const, label: { th: '30 วัน', en: '30 days' } },
    { value: 90 as const, label: { th: '90 วัน', en: '90 days' } },
];
