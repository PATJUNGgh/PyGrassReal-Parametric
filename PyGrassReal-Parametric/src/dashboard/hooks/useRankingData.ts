import { useState, useEffect, useCallback } from 'react';
import { rankingService } from '../services/rankingService';
import type { PackageRanking, ApiPlanRanking, AiModelRanking, DailyModelUsage, DailyMetrics, TokenUsageSource } from '../services/rankingService';

export function useRankingData() {
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [packageRankings, setPackageRankings] = useState<PackageRanking[]>([]);
  const [apiPlanRankings, setApiPlanRankings] = useState<ApiPlanRanking[]>([]);
  const [aiModelRankings, setAiModelRankings] = useState<AiModelRanking[]>([]);
  const [dailyModelUsage, setDailyModelUsage] = useState<DailyModelUsage[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics[]>([]);
  const [tokenUsageBySource, setTokenUsageBySource] = useState<TokenUsageSource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [total, pkgs, apiPlans, models, dailyUsage, dailyMetricsRes, srcRes] = await Promise.all([
        rankingService.fetchTotalUsers(),
        rankingService.fetchPackageRankings(),
        rankingService.fetchApiPlanRankings(),
        rankingService.fetchAiModelRankings(),
        rankingService.fetchDailyModelUsage(),
        rankingService.fetchDailyMetrics(),
        rankingService.fetchTokenUsageBySource()
      ]);
      setTotalUsers(total);
      setPackageRankings(pkgs);
      setApiPlanRankings(apiPlans);
      setAiModelRankings(models);
      setDailyModelUsage(dailyUsage);
      setDailyMetrics(dailyMetricsRes);
      setTokenUsageBySource(srcRes);
    } catch (err: any) {
      console.error('Error fetching ranking data:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { totalUsers, packageRankings, apiPlanRankings, aiModelRankings, dailyModelUsage, dailyMetrics, tokenUsageBySource, loading, error, refetch: fetchData };
}
