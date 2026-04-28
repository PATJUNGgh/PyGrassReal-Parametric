import { supabase } from '../../lib/supabaseClient';

export interface PackageRanking {
  tier: string;
  user_count: number;
}

export interface ApiPlanRanking {
  plan: string;
  user_count: number;
}

export interface AiModelRanking {
  model_name: string;
  usage_count: number;
  total_tokens: number;
}

export interface DailyModelUsage {
  usage_date: string;
  model_name: string;
  total_tokens: number;
}

export interface TokenUsageSource {
  source: string;
  total_tokens: number;
}

export interface DailyMetrics {
  usage_date: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_cost: number;
}

export const rankingService = {
  async fetchTotalUsers(): Promise<number> {
    const { data, error } = await supabase.rpc('get_total_users');
    if (error) throw error;
    return data || 0;
  },

  async fetchPackageRankings(): Promise<PackageRanking[]> {
    const { data, error } = await supabase.rpc('get_package_rankings');
    if (error) throw error;
    return data || [];
  },

  async fetchApiPlanRankings(): Promise<ApiPlanRanking[]> {
    const { data, error } = await supabase.rpc('get_api_plan_rankings');
    if (error) throw error;
    return data || [];
  },

  async fetchAiModelRankings(): Promise<AiModelRanking[]> {
    const { data, error } = await supabase.rpc('get_ai_model_rankings');
    if (error) throw error;
    return data || [];
  },

  async fetchDailyModelUsage(): Promise<DailyModelUsage[]> {
    const { data, error } = await supabase.rpc('get_daily_model_usage');
    if (error) throw error;
    return data || [];
  },

  async fetchTokenUsageBySource(): Promise<TokenUsageSource[]> {
    const { data, error } = await supabase.rpc('get_token_usage_by_source');
    if (error) throw error;
    return data || [];
  },

  async fetchDailyMetrics(): Promise<DailyMetrics[]> {
    const { data, error } = await supabase.rpc('get_daily_metrics');
    if (error) throw error;
    return data || [];
  }
};
