import React, { useMemo } from 'react';
import { Users, Package, BrainCircuit, Activity, RefreshCw, BarChart2, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRankingData } from './hooks/useRankingData';
import { localizeText, useLanguage } from '../i18n/language';
import './RankingPage.css';

export const RankingPage: React.FC = () => {
  const { language } = useLanguage();
  const { totalUsers, packageRankings, aiModelRankings, dailyModelUsage, dailyMetrics, tokenUsageBySource, loading, error, refetch } = useRankingData();

  const chartData = useMemo(() => {
    if (!dailyModelUsage || dailyModelUsage.length === 0) return [];
    
    const dataMap = new Map<string, any>();
    dailyModelUsage.forEach(d => {
      if (!dataMap.has(d.usage_date)) {
        dataMap.set(d.usage_date, { name: d.usage_date });
      }
      const dayData = dataMap.get(d.usage_date);
      dayData[d.model_name] = d.total_tokens;
    });
    
    return Array.from(dataMap.values()).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
  }, [dailyModelUsage]);

  const uniqueModels = useMemo(() => {
    const models = new Set<string>();
    dailyModelUsage?.forEach(d => models.add(d.model_name));
    return Array.from(models);
  }, [dailyModelUsage]);

  const COLORS = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#84cc16'];
  const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'];
  
  const formattedTokenSource = useMemo(() => {
    return tokenUsageBySource?.map(item => ({
      name: item.source,
      value: item.total_tokens
    })) || [];
  }, [tokenUsageBySource]);

  const formattedDailyMetrics = useMemo(() => {
    return dailyMetrics?.map(item => ({
      name: new Date(item.usage_date).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short' }),
      input: item.prompt_tokens,
      output: item.completion_tokens
    })) || [];
  }, [dailyMetrics, language]);

  if (loading) {
    return (
      <div className="ranking-page-container">
        <div className="ranking-loading-state">
          <Activity className="app-spin-animation" size={32} style={{ marginBottom: '16px' }} />
          <span>{localizeText(language, { th: 'กำลังโหลดข้อมูลสถิติ...', en: 'Loading ranking data...' })}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ranking-page-container">
        <div className="ranking-error-state">
          <span>{localizeText(language, { th: 'เกิดข้อผิดพลาดในการดึงข้อมูล', en: 'Failed to load ranking data.' })}</span>
          <button 
            onClick={refetch} 
            className="dashboard-primary-button" 
            style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ranking-page-container">
      <div className="ranking-page-header">
        <h1 className="ranking-page-title">
          {localizeText(language, { th: 'สถิติและอันดับ (Ranking)', en: 'Statistics & Rankings' })}
        </h1>
        <p className="ranking-page-subtitle">
          {localizeText(language, { th: 'ข้อมูลจำนวนผู้ใช้งาน แพ็กเกจ และการใช้งาน AI ล่าสุดจากระบบ', en: 'Latest usage statistics from the system for users, plans, and AI models.' })}
        </p>
      </div>

      <div className="ranking-grid">
        {/* Total Users Card */}
        <div className="ranking-card">
          <div className="ranking-card-header">
            <div className="ranking-card-icon">
              <Users size={24} />
            </div>
            <h2 className="ranking-card-title">
              {localizeText(language, { th: 'จำนวนผู้ใช้ทั้งหมด', en: 'Total Users' })}
            </h2>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div className="ranking-stat-big">{totalUsers.toLocaleString()}</div>
            <div className="ranking-stat-label">
              {localizeText(language, { th: 'ผู้ใช้งานในระบบเวลานี้', en: 'Active users in the system' })}
            </div>
          </div>
        </div>

        {/* Popular Packages */}
        <div className="ranking-card">
          <div className="ranking-card-header">
            <div className="ranking-card-icon emerald">
              <Package size={24} />
            </div>
            <h2 className="ranking-card-title">
              {localizeText(language, { th: 'แพ็กเกจยอดนิยม', en: 'Popular Plans' })}
            </h2>
          </div>
          
          <div className="ranking-list">
            {packageRankings.length > 0 ? (
              packageRankings.map((pkg, idx) => (
                <div key={pkg.tier} className="ranking-list-item">
                  <div className="ranking-item-left">
                    <span className="ranking-position" data-rank={idx + 1}>#{idx + 1}</span>
                    <span className="ranking-item-name">{pkg.tier}</span>
                  </div>
                  <div className="ranking-item-right">
                    <span className="ranking-item-count">{pkg.user_count.toLocaleString()}</span>
                    <span className="ranking-item-sub">{localizeText(language, { th: 'ผู้ใช้', en: 'Users' })}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="ranking-item-sub" style={{ textAlign: 'center', padding: '20px 0' }}>
                {localizeText(language, { th: 'ไม่มีข้อมูลแพ็กเกจ', en: 'No plan data available' })}
              </div>
            )}
          </div>
        </div>

        {/* AI Model Usage */}
        <div className="ranking-card">
          <div className="ranking-card-header">
            <div className="ranking-card-icon purple">
              <BrainCircuit size={24} />
            </div>
            <h2 className="ranking-card-title">
              {localizeText(language, { th: 'AI Model ที่ใช้เยอะที่สุด', en: 'Top AI Models' })}
            </h2>
          </div>
          
          <div className="ranking-list">
            {aiModelRankings.length > 0 ? (
              aiModelRankings.map((model, idx) => (
                <div key={model.model_name} className="ranking-list-item">
                  <div className="ranking-item-left">
                    <span className="ranking-position" data-rank={idx + 1}>#{idx + 1}</span>
                    <span className="ranking-item-name" style={{ wordBreak: 'break-all', fontSize: '0.85rem' }}>{model.model_name}</span>
                  </div>
                  <div className="ranking-item-right">
                    <span className="ranking-item-count">{model.usage_count.toLocaleString()}</span>
                    <span className="ranking-item-sub">{model.total_tokens.toLocaleString()} tokens</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="ranking-item-sub" style={{ textAlign: 'center', padding: '20px 0' }}>
                {localizeText(language, { th: 'ไม่มีข้อมูลการใช้งาน', en: 'No usage data available' })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="ranking-card" style={{ marginTop: '24px', gridColumn: '1 / -1' }}>
        <div className="ranking-card-header">
          <div className="ranking-card-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Activity size={24} />
          </div>
          <h2 className="ranking-card-title">
            {localizeText(language, { th: 'กราฟสถิติรูปแบบการใช้งาน', en: 'Usage Pattern Statistics Graph' })}
          </h2>
        </div>
        
        <div style={{ width: '100%', height: 400, marginTop: '20px', position: 'relative' }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400} minWidth={1} minHeight={1} id="main-usage-chart">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.5)' }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.5)' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'rgba(20, 24, 32, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }} 
                  itemStyle={{ color: '#fff', fontSize: '0.875rem' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)', marginBottom: '8px', fontSize: '0.875rem' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                {uniqueModels.map((model, idx) => (
                  <Bar key={model} dataKey={model} stackId="a" fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="ranking-item-sub" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {localizeText(language, { th: 'ไม่มีข้อมูลสถิติเพียงพอสำหรับสร้างกราฟ', en: 'Not enough data to generate graph' })}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginTop: '24px' }}>
        {/* Line Chart 1 */}
        <div className="ranking-card">
          <div className="ranking-card-header" style={{ marginBottom: '16px' }}>
            <h2 className="ranking-card-title" style={{ fontSize: '1rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} /> {localizeText(language, { th: 'Input Tokens (7 days)', en: 'Input Tokens (7 days)' })}
            </h2>
          </div>
          <div style={{ width: '100%', height: 250, position: 'relative' }}>
            <ResponsiveContainer width="100%" height={250} minWidth={1} minHeight={1} id="input-tokens-chart">
              <LineChart data={formattedDailyMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(20, 24, 32, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff', fontSize: '0.875rem' }}
                />
                <Line type="monotone" dataKey="input" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line Chart 2 */}
        <div className="ranking-card">
          <div className="ranking-card-header" style={{ marginBottom: '16px' }}>
            <h2 className="ranking-card-title" style={{ fontSize: '1rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} /> {localizeText(language, { th: 'Output Tokens (7 days)', en: 'Output Tokens (7 days)' })}
            </h2>
          </div>
          <div style={{ width: '100%', height: 250, position: 'relative' }}>
            <ResponsiveContainer width="100%" height={250} minWidth={1} minHeight={1} id="output-tokens-chart">
              <LineChart data={formattedDailyMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(20, 24, 32, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff', fontSize: '0.875rem' }}
                />
                <Line type="monotone" dataKey="output" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="ranking-card" style={{ marginTop: '24px', gridColumn: '1 / -1' }}>
        <div className="ranking-card-header">
          <div className="ranking-card-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <PieChartIcon size={24} />
          </div>
          <h2 className="ranking-card-title">
            {localizeText(language, { th: 'อัตราส่วนการใช้งาน AI แบบ Dashboard กับ API AI', en: 'Dashboard AI vs API AI Token Usage' })}
          </h2>
        </div>
        
        <div style={{ width: '100%', height: 350, marginTop: '16px', display: 'flex', justifyContent: 'center', position: 'relative' }}>
          {formattedTokenSource.length > 0 ? (
            <ResponsiveContainer width="100%" height={350} minWidth={1} minHeight={1} id="token-source-pie-chart">
              <PieChart>
                <Pie
                  data={formattedTokenSource}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {formattedTokenSource.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(20, 24, 32, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="ranking-item-sub" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {localizeText(language, { th: 'ไม่มีข้อมูลสถิติเพียงพอ', en: 'Not enough data' })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
