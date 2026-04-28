/**
 * useTokenUsage.ts
 * Hook สำหรับจัดการ state ของข้อมูล Token Usage
 */

import { useState, useEffect, useCallback } from 'react';
import {
    fetchDailyUsage,
    fetchUsageLimits,
    fetchUsageHistory,
    fetchMonthlyUsageTotals,
    fetchLifetimeTokensTotal,
    fetchApiLifetimeTokensTotal,
    fetchRecentCost5Min,
    fetchRecentCost10Min,
} from '../services/tokenUsage.service';
import type {
    DailyChartData,
    UsageLimits,
    TokenUsageHistoryItem,
    UsagePeriod,
} from '../types/tokenUsage.types';

interface UseTokenUsageReturn {
    // Chart
    chartData: DailyChartData[];
    chartLoading: boolean;
    period: UsagePeriod;
    setPeriod: (p: UsagePeriod) => void;

    // Limits (Balance cards)
    limits: UsageLimits | null;
    limitsLoading: boolean;
    monthlyCostUsed: number;
    monthlyTokensUsed: number;
    hourlyCostUsed: number;
    weeklyCostUsed: number;
    lifetimeTokensUsed: number;
    apiLifetimeTokensUsed: number;

    // History table
    historyItems: TokenUsageHistoryItem[];
    historyTotal: number;
    historyPage: number;
    historyLoading: boolean;
    setHistoryPage: (p: number) => void;

    // Global
    error: string | null;
    refetch: () => void;
}

export function useTokenUsage(): UseTokenUsageReturn {
    const [period, setPeriodState] = useState<UsagePeriod>(30);
    const [chartData, setChartData] = useState<DailyChartData[]>([]);
    const [chartLoading, setChartLoading] = useState(true);

    const [limits, setLimits] = useState<UsageLimits | null>(null);
    const [limitsLoading, setLimitsLoading] = useState(true);

    const [historyItems, setHistoryItems] = useState<TokenUsageHistoryItem[]>([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyPage, setHistoryPageState] = useState(1);
    const [historyLoading, setHistoryLoading] = useState(true);

    const [monthlyCostUsed, setMonthlyCostUsed] = useState(0);
    const [monthlyTokensUsed, setMonthlyTokensUsed] = useState(0);
    const [hourlyCostUsed, setHourlyCostUsed] = useState(0);
    const [weeklyCostUsed, setWeeklyCostUsed] = useState(0);
    const [lifetimeTokensUsed, setLifetimeTokensUsed] = useState(0);
    const [apiLifetimeTokensUsed, setApiLifetimeTokensUsed] = useState(0);

    const [error, setError] = useState<string | null>(null);
    const [tick, setTick] = useState(0);

    const HISTORY_PER_PAGE = 10;

    const loadChart = useCallback(async (p: UsagePeriod) => {
        setChartLoading(true);
        try {
            const data = await fetchDailyUsage(p);
            setChartData(data);
        } catch (err) {
            setError('ไม่สามารถโหลดข้อมูลกราฟได้');
            console.error(err);
        } finally {
            setChartLoading(false);
        }
    }, []);

    const loadLimits = useCallback(async () => {
        setLimitsLoading(true);
        try {
            const data = await fetchUsageLimits();
            setLimits(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLimitsLoading(false);
        }
    }, []);

    const loadMonthlyCostTotal = useCallback(async () => {
        try {
            const totals = await fetchMonthlyUsageTotals();
            setMonthlyCostUsed(totals.cost);
            setMonthlyTokensUsed(totals.tokens);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const loadLifetimeTokensTotal = useCallback(async () => {
        try {
            const [total, apiTotal] = await Promise.all([
                fetchLifetimeTokensTotal(),
                fetchApiLifetimeTokensTotal(),
            ]);
            setLifetimeTokensUsed(total);
            setApiLifetimeTokensUsed(apiTotal);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const loadRecentCosts = useCallback(async () => {
        try {
            const [cost5, cost10] = await Promise.all([
                fetchRecentCost5Min(),
                fetchRecentCost10Min(),
            ]);
            setHourlyCostUsed(cost5);
            setWeeklyCostUsed(cost10);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const loadHistory = useCallback(async (page: number) => {
        setHistoryLoading(true);
        try {
            const { items, total } = await fetchUsageHistory(page, HISTORY_PER_PAGE);
            setHistoryItems(items);
            setHistoryTotal(total);
        } catch (err) {
            console.error(err);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    // โหลดครั้งแรก + เมื่อ refetch
    useEffect(() => {
        setError(null);
        void loadChart(period);
        void loadLimits();
        void loadHistory(historyPage);
        void loadMonthlyCostTotal();
        void loadLifetimeTokensTotal();
        void loadRecentCosts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tick]);

    // โหลดกราฟใหม่เมื่อ period เปลี่ยน
    useEffect(() => {
        void loadChart(period);
    }, [period, loadChart]);

    // โหลด history ใหม่เมื่อ page เปลี่ยน
    useEffect(() => {
        void loadHistory(historyPage);
    }, [historyPage, loadHistory]);

    const setPeriod = useCallback((p: UsagePeriod) => {
        setPeriodState(p);
    }, []);

    const setHistoryPage = useCallback((p: number) => {
        setHistoryPageState(p);
    }, []);

    const refetch = useCallback(() => {
        setTick((t) => t + 1);
    }, []);

    return {
        chartData,
        chartLoading,
        period,
        setPeriod,
        limits,
        limitsLoading,
        historyItems,
        historyTotal,
        historyPage,
        historyLoading,
        setHistoryPage,
        monthlyCostUsed,
        monthlyTokensUsed,
        hourlyCostUsed,
        weeklyCostUsed,
        lifetimeTokensUsed,
        apiLifetimeTokensUsed,
        error,
        refetch,
    };
}
