/**
 * tokenUsage.service.ts
 * Service สำหรับดึงข้อมูล Token Usage จาก Supabase
 */

import { supabase } from '../../lib/supabaseClient';
import type {
    DailyChartData,
    TokenUsageHistoryItem,
    TokenPlatform,
    UsageLimits,
    UsagePeriod,
} from '../types/tokenUsage.types';
import { ALL_PLATFORMS } from '../data/tokenUsageConfig';

interface TokenUsageChartRow {
    created_at: string;
    platform: TokenPlatform;
    cost: number | null;
}

/** ดึงข้อมูลสรุปรายวันสำหรับวาดกราฟ */
export async function fetchDailyUsage(days: UsagePeriod): Promise<DailyChartData[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
        .from('token_usage')
        .select('created_at, platform, cost')
        .is('api_key_id', null)
        .gte('created_at', cutoff.toISOString())
        .order('created_at', { ascending: true });

    if (error) {
        console.error('[tokenUsage.service] fetchDailyUsage error:', error);
        return [];
    }

    const dateMap = new Map<string, DailyChartData>();
    const rows = (data ?? []) as TokenUsageChartRow[];

    for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        const dateStr = d.toISOString().split('T')[0];
        dateMap.set(dateStr, { date: dateStr, IDE: 0, CLI: 0, PYGRASSREAL: 0 });
    }

    for (const row of rows) {
        const dateStr = new Date(row.created_at).toISOString().split('T')[0];
        const entry = dateMap.get(dateStr);
        if (entry && ALL_PLATFORMS.includes(row.platform)) {
            entry[row.platform] += Number(row.cost || 0);
        }
    }

    return Array.from(dateMap.values());
}

/** ดึงข้อมูล Usage Limits ของ user ปัจจุบัน */
export async function fetchUsageLimits(): Promise<UsageLimits | null> {
    const { data, error } = await supabase
        .from('usage_limits')
        .select('*')
        .maybeSingle();

    if (error) {
        console.error('[tokenUsage.service] fetchUsageLimits error:', error);
        return null;
    }

    return data as UsageLimits | null;
}

/** ดึงยอดรวม Cost และ Tokens ทั้งหมดในเดือนปัจจุบัน */
export async function fetchMonthlyUsageTotals(): Promise<{ cost: number; tokens: number }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
        .from('token_usage')
        .select('cost, total_tokens')
        .is('api_key_id', null)
        .gte('created_at', startOfMonth.toISOString());

    if (error) {
        console.error('[tokenUsage.service] fetchMonthlyUsageTotals error:', error);
        return { cost: 0, tokens: 0 };
    }

    const totals = (data ?? []).reduce(
        (acc, curr) => {
            acc.cost += Number(curr.cost) || 0;
            acc.tokens += Number(curr.total_tokens) || 0;
            return acc;
        },
        { cost: 0, tokens: 0 }
    );

    return totals;
}

/** ดึงยอดรวม Tokens ทั้งหมดที่เคยใช้มา (Lifetime) */
export async function fetchLifetimeTokensTotal(): Promise<number> {
    const { data, error } = await supabase
        .from('token_usage')
        .select('total_tokens');

    if (error) {
        console.error('[tokenUsage.service] fetchLifetimeTokensTotal error:', error);
        return 0;
    }

    return (data ?? []).reduce((acc, curr) => acc + (Number(curr.total_tokens) || 0), 0);
}

/** ดึงยอดรวม Tokens ทั้งหมดที่ใช้ผ่าน API (มี api_key_id) (Lifetime) */
export async function fetchApiLifetimeTokensTotal(): Promise<number> {
    const { data, error } = await supabase
        .from('token_usage')
        .select('total_tokens')
        .not('api_key_id', 'is', null);

    if (error) {
        console.error('[tokenUsage.service] fetchApiLifetimeTokensTotal error:', error);
        return 0;
    }

    return (data ?? []).reduce((acc, curr) => acc + (Number(curr.total_tokens) || 0), 0);
}

/** ดึงยอดรวม Cost ใน 5 นาทีล่าสุด (hourly window) */
export async function fetchRecentCost5Min(): Promise<number> {
    const since = new Date(Date.now() - 5 * 60 * 1000);

    const { data, error } = await supabase
        .from('token_usage')
        .select('cost')
        .is('api_key_id', null)
        .gte('created_at', since.toISOString());

    if (error) {
        console.error('[tokenUsage.service] fetchRecentCost5Min error:', error);
        return 0;
    }

    return (data ?? []).reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
}

/** ดึงยอดรวม Cost ใน 10 นาทีล่าสุด (weekly window) */
export async function fetchRecentCost10Min(): Promise<number> {
    const since = new Date(Date.now() - 10 * 60 * 1000);

    const { data, error } = await supabase
        .from('token_usage')
        .select('cost')
        .is('api_key_id', null)
        .gte('created_at', since.toISOString());

    if (error) {
        console.error('[tokenUsage.service] fetchRecentCost10Min error:', error);
        return 0;
    }

    return (data ?? []).reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
}

/** ดึงประวัติการใช้งาน พร้อม pagination */
export async function fetchUsageHistory(
    page = 1,
    perPage = 10,
): Promise<{ items: TokenUsageHistoryItem[]; total: number }> {
    const from = (page - 1) * perPage;
    const to = page * perPage - 1;

    const { data, count, error } = await supabase
        .from('token_usage')
        .select('id, created_at, platform, provider, model, total_tokens, cost', { count: 'exact' })
        .gt('total_tokens', 0)
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('[tokenUsage.service] fetchUsageHistory error:', error);
        return { items: [], total: 0 };
    }

    return {
        items: (data ?? []) as TokenUsageHistoryItem[],
        total: count ?? 0,
    };
}

/** Reset visible usage history for the signed-in user. */
export async function resetUsageHistory(): Promise<void> {
    const { data, error: authError } = await supabase.auth.getUser();

    if (authError || !data.user) {
        throw new Error('Unable to identify the current user.');
    }

    const { error } = await supabase
        .from('token_usage')
        .delete()
        .eq('user_id', data.user.id)
        .gt('total_tokens', 0);

    if (error) {
        throw error;
    }
}
