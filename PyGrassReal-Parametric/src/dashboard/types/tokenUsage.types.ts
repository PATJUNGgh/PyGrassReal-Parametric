/**
 * tokenUsage.types.ts
 * TypeScript types สำหรับระบบสถิติการใช้ Token
 */

export type TokenPlatform = 'IDE' | 'CLI' | 'PYGRASSREAL';
export type TokenProvider = 'openrouter' | 'huggingface';

export interface TokenUsageRecord {
    id: string;
    user_id: string;
    platform: TokenPlatform;
    provider: TokenProvider;
    model: string | null;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost: number;
    api_key_id: string | null;
    session_id: string | null;
    created_at: string;
}

export interface DailyTokenSummary {
    user_id: string;
    platform: TokenPlatform;
    usage_date: string; // YYYY-MM-DD
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_cost: number;
    request_count: number;
}

/** ข้อมูลสำหรับวาดกราฟ (รวม 3 platform ต่อวัน) */
export interface DailyChartData {
    date: string; // YYYY-MM-DD
    IDE: number;
    CLI: number;
    PYGRASSREAL: number;
}

export interface UsageLimits {
    hourly_cost_limit?: number;
    weekly_cost_limit?: number;
    monthly_cost_limit?: number;
    hourly_cost_used?: number;
    weekly_cost_used?: number;
    monthly_cost_used?: number;
    hourly_reset_at: string;
    weekly_reset_at: string;
    monthly_reset_at: string;
}

export interface TokenUsageHistoryItem {
    id: string;
    created_at: string;
    platform: TokenPlatform;
    provider: TokenProvider;
    model: string | null;
    total_tokens: number;
    cost: number;
}

export type UsagePeriod = 7 | 30 | 90;
