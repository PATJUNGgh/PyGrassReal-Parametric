import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart3, RefreshCw, AlertCircle, Trophy, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { supabase } from '../lib/supabaseClient';
import './BenchmarkPage.css';

interface BenchmarkRun {
  id: string;
  model_name: string;
  provider: string;
  set_code: string;
  tier: string;
  status: string;
  total_questions: number;
  completed_questions: number;
  total_time_seconds: number | null;
  total_cost_usd: number | null;
  total_tokens: number | null;
  score_text: string | null;
  correct_count: number;
  wrong_count: number;
  missing_count: number;
  topic_scores: Record<string, { correct: number; total: number; pct: number }>;
  difficulty_scores: Record<string, { correct: number; total: number; pct: number }>;
  results: any[];
  created_at: string;
}

interface QuizAttemptResult {
  id: string;
  created_at: string;
  set_code: string;
  answer_model: string | null;
  provider_model: string | null;
  checker_model?: string | null;
  total_questions: number;
  score_text: string | null;
  correct_count: number;
  wrong_count: number;
  missing_count: number;
  metadata?: Record<string, unknown> | null;
}

interface TopicScore {
  name: string;
  shortName: string;
  correct: number;
  wrong: number;
  total: number;
  attemptsCount: number;
  pct: number;
  pctLabel: string;
  errorPct: number;
  errorPctLabel: string;
  errorLabel: string;
  scoreLabel: string;
  fill: string;
}

interface CombinedErrorScore {
  name: string;
  shortName: string;
  wrong: number;
  total: number;
  errorPct: number;
  errorPctLabel: string;
  errorLabel: string;
  fill: string;
}

interface CombinedScore {
  name: string;
  shortName: string;
  correct: number;
  total: number;
  scorePct: number;
  scorePctLabel: string;
  scoreLabel: string;
  fill: string;
}

const MODEL_OPTIONS = [
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'openai', tier: 'primary' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai', tier: 'cost-effective' },
  { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', provider: 'anthropic', tier: 'primary' },
  { value: 'claude-3.5-haiku', label: 'Claude 3.5 Haiku', provider: 'anthropic', tier: 'cost-effective' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'google', tier: 'primary' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', provider: 'google', tier: 'cost-effective' },
];

const DEFAULT_BENCHMARK_TOTAL_QUESTIONS = 2000;
const PER_SET_SCORE_CHART_TOTAL_QUESTIONS = 2000;
const COMBINED_SCORE_CHART_TOTAL_QUESTIONS = 4000;

const SET_CODE_OPTIONS = [
  { value: 'K01-ARCH-1000Q-V2', label: 'L_01 Architectural' },
  { value: 'K02-CAD-1000Q-V2', label: 'L_02 CAD Drafting' },
];

const ARCH_SET_CODE = 'K01-ARCH-1000Q-V2';
const CAD_SET_CODE = 'L_02-CADDrafting_1000Q-Seed';

const SET_CODE_ALIASES: Record<string, string[]> = {
  [ARCH_SET_CODE]: [
    'K01-ARCH-1000Q-V2',
    'K01-ARCH-1000Q',
    'L_01_Architectural_1000Q',
    'L_01-Architectural-1000Q',
    'L_01_Architectural_1000Q-Seed',
    'L_01-Architectural-1000Q-Seed',
  ],
  [CAD_SET_CODE]: [
    'L_02-CADDrafting_1000Q-Seed',
    'L_02_CADDrafting_1000Q-Seed',
    'K02-CAD-1000Q-V2',
    'K02-CAD-1000Q',
    'L_02_CADDrafting_1000Q',
    'L_02-CADDrafting-1000Q',
  ],
};

const TOPIC_COLORS: Record<string, string> = {
  'file-usage-reference': '#4f46e5',
  'architectural-core-thinking': '#7c3aed',
  'critical-numbers-rules': '#2563eb',
  'building-law-permits': '#0891b2',
  'site-climate-analysis': '#059669',
  'space-planning-room-logic': '#10b981',
  'Ergonomics/UD': '#84cc16',
  'structure-system-coordination': '#eab308',
  'materials-constructability': '#f59e0b',
  'Fire/Parking/Landscape': '#ef4444',
  'Cost/Sustainability/Smart': '#dc2626',
  'Design Intelligence': '#a855f7',
  'Operator/Business/POE': '#6366f1',
  'Professional Practice': '#3b82f6',
  'Assumption/Uncertainty': '#14b8a6',
  'must-memorize-rules': '#22c55e',
  'when-to-check-master-file': '#8b5cf6',
  'file-role-reference': '#4f46e5',
  'cad-preflight-check': '#7c3aed',
  'file-line-standards': '#2563eb',
  'correct-drafting-sequence': '#0891b2',
  'core-component-logic': '#059669',
  'Dimension, Annotation, Level': '#10b981',
  'Schedules, Tagging, Specifications': '#84cc16',
  'Detail and Constructability': '#eab308',
  'QA before release': '#f59e0b',
  'Title Block, Plot, Delivery': '#ef4444',
  'File Management, Blocks, Xrefs': '#dc2626',
  'Special Drawings': '#a855f7',
  'Red Flags': '#6366f1',
  'Shop Drawing, Redline, Field Feedback': '#3b82f6',
  'Assumption, Sequencing, Markup': '#14b8a6',
  'RFI / NCR / Site Instruction': '#22c55e',
  'short-memo-rules': '#8b5cf6',
};

const SCORE_BAR_COLOR = '#3b82f6';
const PRIMARY_MODEL_BAR_COLOR = '#21C7FF';
const ERROR_BAR_COLOR = '#dc2626';

function isPrimaryModel(modelName: string): boolean {
  return modelName.trim().toLowerCase().includes('pygrassreal/hanuman-v1');
}

function getBarColor(modelName: string): string {
  if (isPrimaryModel(modelName)) {
    return PRIMARY_MODEL_BAR_COLOR;
  }
  return SCORE_BAR_COLOR;
}

function parseScoreText(scoreText?: string | null): { correct: number; total: number } | null {
  if (!scoreText) return null;
  const match = scoreText.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return null;

  const correct = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0) return null;

  return { correct, total };
}

function normalizeSetCode(raw?: string | null): string {
  if (!raw) return '';
  return raw.toUpperCase().replace(/[\s_]+/g, '-');
}

function resolveSetFamilyTokens(setCode: string): string[] {
  const normalized = normalizeSetCode(setCode);
  if (normalized.includes('ARCH') || normalized.includes('L-01') || normalized.includes('K01')) {
    return ['ARCH', 'L-01', 'K01'];
  }
  if (normalized.includes('CAD') || normalized.includes('L-02') || normalized.includes('K02')) {
    return ['CAD', 'L-02', 'K02'];
  }
  return [normalized];
}

function normalizeModelNameFromAttempt(row: QuizAttemptResult): string {
  const fromMetadata =
    row.metadata && typeof row.metadata === 'object'
      ? (row.metadata as Record<string, unknown>)
      : null;

  const candidates = [
    row.answer_model,
    row.provider_model,
    row.checker_model,
    typeof fromMetadata?.answer_model === 'string' ? fromMetadata.answer_model : null,
    typeof fromMetadata?.provider_model === 'string' ? fromMetadata.provider_model : null,
    typeof fromMetadata?.model === 'string' ? fromMetadata.model : null,
    typeof fromMetadata?.model_name === 'string' ? fromMetadata.model_name : null,
  ];

  for (const candidate of candidates) {
    const text = String(candidate ?? '').trim();
    if (text) return text;
  }
  return '';
}

export const BenchmarkPage: React.FC = () => {
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttemptResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [selectedSetCode, setSelectedSetCode] = useState('K01-ARCH-1000Q-V2');
  const [activeTab, setActiveTab] = useState<'overview' | 'topics' | 'detail'>('overview');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    const runsRes = await supabase
      .from('benchmark_runs')
      .select('*')
      .order('created_at', { ascending: false });
    const quizRes = await supabase
      .from('quiz_attempt_results')
      .select('id, created_at, set_code, answer_model, provider_model, checker_model, total_questions, score_text, correct_count, wrong_count, missing_count, metadata')
      .order('created_at', { ascending: false });

    if (runsRes.error) {
      console.error('Error fetching benchmark_runs:', runsRes.error);
      setRuns([]);
    } else {
      setRuns(runsRes.data || []);
    }

    if (quizRes.error) {
      console.error('Error fetching quiz_attempt_results:', quizRes.error);
      setQuizAttempts([]);
    } else {
      setQuizAttempts((quizRes.data || []) as QuizAttemptResult[]);
    }

    setLoading(false);
  }, []);

  const buildChartDataForSetFromQuiz = useCallback((allAttempts: QuizAttemptResult[], setCode: string): TopicScore[] => {
    const normalizedAliases = new Set(
      (SET_CODE_ALIASES[setCode] || [setCode]).map((alias) => normalizeSetCode(alias))
    );
    const exactCandidates = allAttempts.filter((row) => {
      const normalized = normalizeSetCode(row.set_code);
      return normalizedAliases.has(normalized);
    });
    const familyTokens = resolveSetFamilyTokens(setCode);
    const familyCandidates = allAttempts.filter((row) => {
      const normalized = normalizeSetCode(row.set_code);
      if (!normalized) return false;
      return familyTokens.some((token) => normalized.includes(token));
    });
    const candidates = exactCandidates.length > 0
      ? exactCandidates
      : familyCandidates;
    if (!candidates.length) return [];

    const grouped = new Map<string, { name: string; correct: number; total: number; createdAt: number; attemptsCount: number }>();

    for (const row of candidates) {
      const modelName = normalizeModelNameFromAttempt(row);
      if (!modelName) continue;
      const modelKey = modelName.trim().toLowerCase();

      const parsed = parseScoreText(row.score_text);
      const totalFromCounts = Number(row.correct_count ?? 0) + Number(row.wrong_count ?? 0) + Number(row.missing_count ?? 0);
      const totalFromColumn = Number(row.total_questions ?? 0);
      const total = totalFromColumn > 0 ? totalFromColumn : (totalFromCounts > 0 ? totalFromCounts : Number(parsed?.total ?? 0));
      const correctFromColumn = Number(row.correct_count ?? NaN);
      const correct = Number.isFinite(correctFromColumn) && correctFromColumn >= 0
        ? correctFromColumn
        : Number(parsed?.correct ?? NaN);
      if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(correct) || correct < 0) continue;

      const safeCorrect = Math.min(correct, total);
      const createdAt = row.created_at ? new Date(row.created_at).getTime() : 0;
      const prev = grouped.get(modelKey);
      if (!prev) {
        grouped.set(modelKey, { name: modelName, correct: safeCorrect, total, createdAt, attemptsCount: 1 });
        continue;
      }
      grouped.set(modelKey, {
        name: createdAt >= prev.createdAt ? modelName : prev.name,
        correct: prev.correct + safeCorrect,
        total: prev.total + total,
        createdAt: Math.max(prev.createdAt, createdAt),
        attemptsCount: prev.attemptsCount + 1,
      });
    }

    return Array.from(grouped.entries())
      .map(([, sums]) => {
        const model = sums.name;
        const displayTotal = PER_SET_SCORE_CHART_TOTAL_QUESTIONS;
        const pct = Number((Math.min(1, sums.correct / displayTotal) * 100).toFixed(2));
        const wrong = Math.max(sums.total - sums.correct, 0);
        const errorPct = Number(((wrong / sums.total) * 100).toFixed(2));

        return {
          name: model,
          shortName: model.length > 24 ? `${model.substring(0, 24)}...` : model,
          correct: sums.correct,
          wrong,
          total: sums.total,
          attemptsCount: sums.attemptsCount,
          pct,
          pctLabel: `${pct.toFixed(2)}%`,
          errorPct,
          errorPctLabel: `${errorPct.toFixed(2)}%`,
          errorLabel: `${wrong}/${sums.total}`,
          scoreLabel: `${sums.correct}/${displayTotal}`,
          fill: getBarColor(model),
        };
      })
      .sort((a, b) => {
        if (b.correct !== a.correct) return b.correct - a.correct;
        if (b.pct !== a.pct) return b.pct - a.pct;
        if (b.wrong !== a.wrong) return a.wrong - b.wrong;
        return a.name.localeCompare(b.name);
      });
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const handleRefresh = useCallback(() => {
    fetchRuns();
  }, [fetchRuns]);

  const handleStartBenchmark = useCallback(async () => {
    setRunning(true);
    const model = MODEL_OPTIONS.find(m => m.value === selectedModel);
    if (!model) return;

    try {
      const { data, error } = await supabase
        .from('benchmark_runs')
        .insert({
          model_name: model.label,
          provider: model.provider,
          set_code: selectedSetCode,
          tier: model.tier,
          status: 'running',
          total_questions: DEFAULT_BENCHMARK_TOTAL_QUESTIONS,
          metadata: { started_by: 'dashboard' },
        })
        .select()
        .single();

      if (error) throw error;

      setRuns(prev => [data, ...prev]);
      alert(`Started benchmark for ${model.label} (Run ID: ${data.id})`);
    } catch (err) {
      console.error('Error starting benchmark:', err);
      alert('Unable to start benchmark');
    } finally {
      setRunning(false);
    }
  }, [selectedModel, selectedSetCode]);

  const topicChartData = useMemo(
    () => buildChartDataForSetFromQuiz(quizAttempts, ARCH_SET_CODE),
    [quizAttempts, buildChartDataForSetFromQuiz]
  );

  const cadChartData = useMemo(
    () => buildChartDataForSetFromQuiz(quizAttempts, CAD_SET_CODE),
    [quizAttempts, buildChartDataForSetFromQuiz]
  );
  const chartLoading = loading;

  const selectedRun = runs.find(r => r.id === selectedRunId) || runs[0];

  const combinedScoreData = useMemo<CombinedScore[]>(() => {
    const totalsByModel = new Map<string, { correct: number; total: number }>();

    for (const row of [...topicChartData, ...cadChartData]) {
      const actualTotal = row.correct + row.wrong;
      if (!Number.isFinite(actualTotal) || actualTotal <= 0) continue;

      const current = totalsByModel.get(row.name) ?? { correct: 0, total: 0 };
      current.correct += row.correct;
      current.total += actualTotal;
      totalsByModel.set(row.name, current);
    }

    return Array.from(totalsByModel.entries())
      .flatMap(([name, sums]) => {
        if (!Number.isFinite(sums.total) || sums.total <= 0) return [];
        const scorePct = Number(((sums.correct / COMBINED_SCORE_CHART_TOTAL_QUESTIONS) * 100).toFixed(2));
        return [{
          name,
          shortName: name.length > 24 ? `${name.substring(0, 24)}...` : name,
          correct: sums.correct,
          total: sums.total,
          scorePct,
          scorePctLabel: `${scorePct.toFixed(2)}%`,
          scoreLabel: `${sums.correct}/${COMBINED_SCORE_CHART_TOTAL_QUESTIONS}`,
          fill: getBarColor(name),
        }];
      })
      .sort((a, b) => {
        if (b.scorePct !== a.scorePct) return b.scorePct - a.scorePct;
        if (b.correct !== a.correct) return b.correct - a.correct;
        return a.name.localeCompare(b.name);
      });
  }, [topicChartData, cadChartData]);

  const combinedErrorData = useMemo<CombinedErrorScore[]>(() => {
    const totalsByModel = new Map<string, { wrong: number; total: number }>();

    for (const row of [...topicChartData, ...cadChartData]) {
      const total = row.correct + row.wrong;
      if (!Number.isFinite(total) || total <= 0) continue;

      const current = totalsByModel.get(row.name) ?? { wrong: 0, total: 0 };
      current.wrong += row.wrong;
      current.total += total;
      totalsByModel.set(row.name, current);
    }

    const rows = Array.from(totalsByModel.entries())
      .flatMap(([name, sums]) => {
        if (!Number.isFinite(sums.total) || sums.total <= 0) return [];
        const errorPct = Number(((sums.wrong / sums.total) * 100).toFixed(2));
        return [{
          name,
          shortName: name.length > 24 ? `${name.substring(0, 24)}...` : name,
          wrong: sums.wrong,
          total: sums.total,
          errorPct,
          errorPctLabel: `${errorPct.toFixed(2)}%`,
          errorLabel: `${sums.wrong}/${sums.total}`,
        }];
      })
      .sort((a, b) => {
        if (b.errorPct !== a.errorPct) return b.errorPct - a.errorPct;
        if (b.wrong !== a.wrong) return b.wrong - a.wrong;
        return a.name.localeCompare(b.name);
      });

    return rows.map((row) => ({
      ...row,
        fill: isPrimaryModel(row.name) ? PRIMARY_MODEL_BAR_COLOR : ERROR_BAR_COLOR,
      }));
  }, [topicChartData, cadChartData]);

  const latestQuizUpdateLabel = useMemo(() => {
    if (!quizAttempts.length) return 'ยังไม่มีข้อมูลอัปเดต';

    let latestMs = 0;
    for (const row of quizAttempts) {
      const ms = row.created_at ? Date.parse(row.created_at) : NaN;
      if (Number.isFinite(ms) && ms > latestMs) {
        latestMs = ms;
      }
    }

    if (!latestMs) return 'ยังไม่มีข้อมูลอัปเดต';

    const latestDate = new Date(latestMs);
    const dateText = new Intl.DateTimeFormat('th-TH', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(latestDate);
    const timeText = new Intl.DateTimeFormat('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(latestDate);

    return `${dateText} เวลา ${timeText}`;
  }, [quizAttempts]);

  const formatTime = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatCost = (usd: number | null) => {
    if (!usd) return 'N/A';
    return `$${usd.toFixed(4)}`;
  };

  if (loading) {
    return (
      <div className="benchmark-page">
        <div className="benchmark-loading">Loading benchmark data...</div>
      </div>
    );
  }

  return (
    <div className="benchmark-page">
      <div className="benchmark-header">
        <div className="benchmark-header-left">
          <BarChart3 size={24} />
          <h1>AI Benchmark Architecture Designer</h1>
        </div>
        <button
          className="benchmark-refresh-btn"
          onClick={handleRefresh}
          title="Refresh data"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      <div className="benchmark-last-update">อัปเดตตารางล่าสุด: {latestQuizUpdateLabel}</div>

      {activeTab === 'overview' && (
        <div className="benchmark-overview">
          {[
            { key: 'arch', title: 'Score (%) L_01 Architectural', data: topicChartData },
            { key: 'cad', title: 'Score (%) L_02 CAD Drafting', data: cadChartData },
          ].map((section) => (
            <div key={section.key} className="benchmark-chart-section">
              <h3>
                <BarChart3 size={18} /> {section.title}
              </h3>
              {chartLoading ? (
                <div className="chart-loading">Loading chart...</div>
              ) : section.data.length > 0 ? (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={500} minWidth={0} minHeight={0}>
                    <BarChart
                      data={section.data}
                      margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.24)" />
                      <XAxis
                        dataKey="shortName"
                        angle={-45}
                        textAnchor="end"
                        interval={0}
                        tick={{ fontSize: 13, fill: '#d2e3f3', fontWeight: 600 }}
                        height={150}
                        axisLine={{ stroke: 'rgba(148, 163, 184, 0.35)' }}
                        tickLine={{ stroke: 'rgba(148, 163, 184, 0.35)' }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 13, fill: '#d2e3f3', fontWeight: 600 }}
                        label={{ value: 'Score (%)', angle: -90, position: 'insideLeft', fontSize: 13, fontWeight: 600, fill: '#e2edf6' }}
                        axisLine={{ stroke: 'rgba(148, 163, 184, 0.35)' }}
                        tickLine={{ stroke: 'rgba(148, 163, 184, 0.35)' }}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(125, 211, 252, 0.12)' }}
                        contentStyle={{ borderRadius: 8, border: '1px solid rgba(125, 211, 252, 0.3)', boxShadow: '0 10px 28px rgba(2, 8, 13, 0.55)', background: 'rgba(10, 18, 28, 0.96)', color: '#e2edf6' }}
                        labelStyle={{ color: '#e2edf6', fontWeight: 700 }}
                        itemStyle={{ color: '#e2edf6', fontSize: 14 }}
                        formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Score (%)']}
                        labelFormatter={(_label: string, payload: any[]) => `Model: ${payload?.[0]?.payload?.name || _label}`}
                      />
                      <Bar dataKey="pct" name="Score (%)" radius={[6, 6, 0, 0]} maxBarSize={50}>
                        {section.data.map((entry) => (
                          <Cell key={`${section.key}-${entry.name}`} fill={entry.fill} />
                        ))}
                        <LabelList dataKey="pctLabel" position="top" fill="#d2e3f3" fontSize={12} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="chart-empty">
                  <AlertCircle size={32} />
                  <p>No quiz_attempt_results rows with usable scores for this set</p>
                </div>
              )}
            </div>
          ))}

          <div className="benchmark-chart-section">
            <h3>
              <Target size={18} /> Combined Score L_01 + L_02 / 4000
            </h3>
            {chartLoading ? (
              <div className="chart-loading">Loading chart...</div>
            ) : combinedScoreData.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={500} minWidth={0} minHeight={0}>
                  <BarChart
                    data={combinedScoreData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.24)" />
                    <XAxis
                      dataKey="shortName"
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 13, fill: '#d2e3f3', fontWeight: 600 }}
                      height={150}
                      axisLine={{ stroke: 'rgba(148, 163, 184, 0.35)' }}
                      tickLine={{ stroke: 'rgba(148, 163, 184, 0.35)' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 13, fill: '#d2e3f3', fontWeight: 600 }}
                      label={{ value: 'Score (%)', angle: -90, position: 'insideLeft', fontSize: 13, fontWeight: 600, fill: '#e2edf6' }}
                      axisLine={{ stroke: 'rgba(148, 163, 184, 0.35)' }}
                      tickLine={{ stroke: 'rgba(148, 163, 184, 0.35)' }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(125, 211, 252, 0.12)' }}
                      contentStyle={{ borderRadius: 8, border: '1px solid rgba(125, 211, 252, 0.3)', boxShadow: '0 10px 28px rgba(2, 8, 13, 0.55)', background: 'rgba(10, 18, 28, 0.96)', color: '#e2edf6' }}
                      labelStyle={{ color: '#e2edf6', fontWeight: 700 }}
                      itemStyle={{ color: '#e2edf6', fontSize: 14 }}
                      formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Score (%)']}
                      labelFormatter={(_label: string, payload: any[]) => `Model: ${payload?.[0]?.payload?.name || _label}`}
                    />
                    <Bar dataKey="scorePct" name="Score (%)" radius={[6, 6, 0, 0]} maxBarSize={50}>
                      {combinedScoreData.map((entry) => (
                        <Cell key={`combined-score-${entry.name}`} fill={entry.fill} />
                      ))}
                      <LabelList dataKey="scorePctLabel" position="top" fill="#d2e3f3" fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="chart-empty">
                <AlertCircle size={32} />
                <p>No combined score data for L_01 and L_02</p>
              </div>
            )}
          </div>

          <div className="benchmark-chart-section">
            <h3>
              <AlertCircle size={18} /> Combined Error Rate L_01 + L_02 (%)
            </h3>
            {chartLoading ? (
              <div className="chart-loading">Loading chart...</div>
            ) : combinedErrorData.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={500} minWidth={0} minHeight={0}>
                  <BarChart
                    data={combinedErrorData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(248, 113, 113, 0.24)" />
                    <XAxis
                      dataKey="shortName"
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 13, fill: '#f9c9c9', fontWeight: 600 }}
                      height={150}
                      axisLine={{ stroke: 'rgba(248, 113, 113, 0.35)' }}
                      tickLine={{ stroke: 'rgba(248, 113, 113, 0.35)' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 13, fill: '#f9c9c9', fontWeight: 600 }}
                      label={{ value: 'Error (%)', angle: -90, position: 'insideLeft', fontSize: 13, fontWeight: 600, fill: '#fecaca' }}
                      axisLine={{ stroke: 'rgba(248, 113, 113, 0.35)' }}
                      tickLine={{ stroke: 'rgba(248, 113, 113, 0.35)' }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(248, 113, 113, 0.12)' }}
                      contentStyle={{ borderRadius: 8, border: '1px solid rgba(248, 113, 113, 0.35)', boxShadow: '0 10px 28px rgba(2, 8, 13, 0.55)', background: 'rgba(24, 10, 12, 0.96)', color: '#fee2e2' }}
                      labelStyle={{ color: '#fee2e2', fontWeight: 700 }}
                      itemStyle={{ color: '#fee2e2', fontSize: 14 }}
                      formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Error (%)']}
                      labelFormatter={(_label: string, payload: any[]) => `Model: ${payload?.[0]?.payload?.name || _label}`}
                    />
                    <Bar dataKey="errorPct" name="Error (%)" radius={[6, 6, 0, 0]} maxBarSize={50}>
                      {combinedErrorData.map((entry) => (
                        <Cell key={`combined-${entry.name}`} fill={entry.fill} />
                      ))}
                      <LabelList dataKey="errorPctLabel" position="top" fill="#fecaca" fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="chart-empty">
                <AlertCircle size={32} />
                <p>No combined error data for L_01 and L_02</p>
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'topics' && selectedRun && (
        <div className="benchmark-topics">
          <h3>Topic scores - {selectedRun.model_name} ({selectedRun.set_code})</h3>
          {Object.keys(selectedRun.topic_scores).length > 0 ? (
            <div className="topic-scores-grid">
              {Object.entries(selectedRun.topic_scores).map(([topic, scores]) => (
                <div key={topic} className="topic-score-card">
                  <div className="topic-name">{topic}</div>
                  <div className="topic-bar-container">
                    <div
                      className={`topic-bar ${scores.pct >= 80 ? 'high' : scores.pct >= 60 ? 'medium' : 'low'}`}
                      style={{ width: `${scores.pct}%` }}
                    />
                  </div>
                  <div className="topic-stats">
                    <span>{scores.correct}/{scores.total}</span>
                    <span className={`topic-pct ${scores.pct >= 80 ? 'high' : scores.pct >= 60 ? 'medium' : 'low'}`}>
                      {scores.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="benchmark-empty">
              <p>No topic scores yet (wait until benchmark finishes)</p>
            </div>
          )}

          {Object.keys(selectedRun.difficulty_scores).length > 0 && (
            <div className="difficulty-section">
              <h3>Scores by difficulty</h3>
              <div className="difficulty-grid">
                {Object.entries(selectedRun.difficulty_scores).map(([diff, scores]) => (
                  <div key={diff} className="difficulty-card">
                    <div className="difficulty-label">{diff}</div>
                    <div className="difficulty-value">{scores.pct.toFixed(1)}%</div>
                    <div className="difficulty-detail">{scores.correct}/{scores.total}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'detail' && selectedRun && (
        <div className="benchmark-detail">
          <h3>Detailed results - {selectedRun.model_name} ({selectedRun.set_code})</h3>
          {Array.isArray(selectedRun.results) && selectedRun.results.length > 0 ? (
            <div className="results-table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Topic</th>
                    <th>Difficulty</th>
                    <th>Correct</th>
                    <th>Model</th>
                    <th>Result</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRun.results.map((r: any) => (
                    <tr key={r.question_no} className={r.is_correct ? 'correct' : 'wrong'}>
                      <td>{r.question_no}</td>
                      <td>{r.topic}</td>
                      <td>{r.difficulty}</td>
                      <td>{r.correct_answer}</td>
                      <td>{r.model_answer || '-'}</td>
                      <td>
                        {r.is_correct ? (
                          <span className="result-correct">Correct</span>
                        ) : (
                          <span className="result-wrong">Wrong</span>
                        )}
                      </td>
                      <td>{r.time_ms ? `${r.time_ms}ms` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="benchmark-empty">
              <p>No detailed results yet (wait until benchmark finishes)</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

