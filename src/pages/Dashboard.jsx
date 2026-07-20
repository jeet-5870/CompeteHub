import React, { useState, useEffect, useMemo } from 'react';
import { LayoutGrid, Flame, Zap, CheckCircle2, AlertCircle, Loader2, TrendingUp, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { firebaseAuth } from '../firebase';
import { apiService } from '../services/apiService';
import { getUnifiedActivity } from '../services/activityService';
import ContributionHeatmap from '../components/ContributionHeatmap';

const Dashboard = () => {
  const { user } = useAuth();
  const [fetching, setFetching] = useState(true);
  const [userPlatforms, setUserPlatforms] = useState([]);
  const [clistStats, setClistStats] = useState([]);
  const [aggregatedData, setAggregatedData] = useState({});
  const [platformStatus, setPlatformStatus] = useState([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.uid) return;
      setFetching(true);

      try {
        const prefs = await firebaseAuth.getUserPreferences(user.uid);
        let currentPlatforms = prefs?.userPlatforms || [];
        const github = prefs?.githubHandle || '';

        if (!prefs?.userPlatforms && (prefs?.codeforcesHandle || prefs?.leetcodeUsername)) {
          if (prefs.codeforcesHandle) {
            currentPlatforms.push({ id: '1', resourceId: 1, name: 'Codeforces', handle: prefs.codeforcesHandle });
          }
          if (prefs.leetcodeUsername) {
            currentPlatforms.push({ id: '2', resourceId: 102, name: 'LeetCode', handle: prefs.leetcodeUsername });
          }
        }

        setUserPlatforms(currentPlatforms);

        if (currentPlatforms.length > 0) {
          const stats = await Promise.all(currentPlatforms.map(async (p) => {
            const data = await apiService.getClistUserStats(p.handle, p.resourceId);
            return { ...p, ...data };
          }));
          setClistStats(stats);
          
          const statusList = stats?.map(s => ({
            name: s.name,
            success: s.n_solved !== undefined,
            connected: true
          })) || [];
          setPlatformStatus(statusList);
        } else {
          setPlatformStatus([]);
        }

      } catch (err) {
        console.error('Dashboard Load Error:', err);
      } finally {
        setFetching(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const totalSubmissions = useMemo(() => {
    return Object.values(aggregatedData).reduce((sum, val) => sum + val, 0);
  }, [aggregatedData]);

  const activePlatformsCount = platformStatus.filter(p => p.connected).length;

  if (fetching || !userPlatforms) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-[var(--color-accent-blue)] animate-spin" />
        <p className="text-[var(--color-text-secondary)] font-mono animate-pulse">Aggregating your global activity...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2 flex items-center gap-3">
          <LayoutGrid className="text-[var(--color-accent-blue)]" />
          Command Center
        </h1>
        <p className="text-[var(--color-text-secondary)] font-mono text-sm">
          Unified intelligence across {activePlatformsCount} platform{activePlatformsCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm group hover:border-[var(--color-accent-blue)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg text-[var(--color-accent-blue)]">
              <BarChart3 size={24} />
            </div>
            <TrendingUp size={20} className="text-[var(--color-accent-green)] opacity-50" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Total Submissions</p>
          <h2 className="text-4xl font-bold font-mono text-[var(--color-text-primary)]">
            {totalSubmissions.toLocaleString()}
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-2 italic">365-day rolling activity window</p>
        </div>

        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm group hover:border-[var(--color-accent-orange)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg text-[var(--color-accent-orange)]">
              <Flame size={24} />
            </div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Active Sources</p>
          <h2 className="text-4xl font-bold font-mono text-[var(--color-text-primary)]">
            <span>{platformStatus.filter(p => p.success).length}</span>
            <span className="text-xl text-[var(--color-text-muted)]">/{platformStatus.length}</span>
          </h2>
          <div className="flex gap-2 mt-3 flex-wrap">
            {platformStatus?.map(p => (
              <span 
                key={p.name} 
                className={`text-[10px] px-2 py-0.5 rounded-full border ${p.success ? 'border-[var(--color-accent-green)] text-[var(--color-accent-green)]' : 'border-[var(--color-accent-red)] text-[var(--color-accent-red)]'}`}
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm group hover:border-[var(--color-accent-purple)] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg text-[var(--color-accent-purple)]">
              <Zap size={24} />
            </div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">System Pulse</p>
          <div className="mt-2 space-y-2">
            {platformStatus.some(p => p.connected && !p.success) ? (
              <div className="flex items-center gap-2 text-[var(--color-accent-red)] text-sm">
                <AlertCircle size={16} />
                <span>Unreachable endpoints detected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[var(--color-accent-green)] text-sm">
                <CheckCircle2 size={16} />
                <span>All connected nodes healthy</span>
              </div>
            )}
            <p className="text-xs text-[var(--color-text-secondary)] italic">Last poll: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      {/* StatsOverview Section (Glassmorphism) — Replaces Heatmap */}
      <div className="mb-8 relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(13,17,23,0.6)] backdrop-blur-xl shadow-2xl p-8 animate-in zoom-in-95 duration-700">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-accent-blue)] opacity-[0.03] blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--color-accent-purple)] opacity-[0.03] blur-[100px] pointer-events-none" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-1">Global Coding Power</h2>
            <div className="flex items-baseline gap-3">
              <span className="text-6xl font-black text-white tracking-tight drop-shadow-sm">
                {clistStats.reduce((sum, s) => sum + (Number(s.n_solved) || 0), 0).toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-[var(--color-accent-green)] px-2 py-1 rounded bg-[rgba(63,185,80,0.1)] border border-[rgba(63,185,80,0.2)]">
                Solved Problems
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            {clistStats?.map(stat => (
              <div key={stat.id} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-xl p-4 min-w-[140px] hover:border-[rgba(255,255,255,0.2)] transition-all">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">{stat.name}</p>
                <p className="text-2xl font-mono font-bold text-white">{Number(stat.n_solved || 0).toLocaleString()}</p>
                <div className="h-1 w-full bg-[rgba(255,255,255,0.05)] rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[var(--color-accent-blue)] to-[var(--color-accent-purple)]" 
                    style={{ width: `${Math.min(100, (Number(stat.n_solved) / 500) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unified Heatmap (Commented Out for Stability) */}
      {/* 
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl overflow-hidden p-6 shadow-sm relative mb-8">
        <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-accent-blue)]" />
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Unified Activity Heatmap</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Aggregated intensity from GitHub, LeetCode, and Codeforces</p>
            </div>
        </div>
        <ContributionHeatmap manualData={aggregatedData} />
      </div>
      */}

      {/* Connect Suggestion / Get Started */}
      {platformStatus.length === 0 ? (
        <div className="p-16 border border-dashed border-[var(--color-border)] rounded-2xl text-center bg-[rgba(31,111,235,0.02)] flex flex-col items-center">
          <div className="bg-[var(--color-bg-primary)] p-5 rounded-full border border-[var(--color-border)] mb-6 shadow-sm">
            <Zap size={40} className="text-[var(--color-accent-blue)]" />
          </div>
          <h3 className="text-2xl font-bold mb-3">Welcome to CompeteHub</h3>
          <p className="text-[var(--color-text-secondary)] mb-8 max-w-md mx-auto">Your Command Center is empty. Connect your competitive programming handles to track your global impact and coding power.</p>
          <a href="/profile" className="px-8 py-3 bg-[var(--color-accent-blue)] hover:bg-[#1b66d1] text-white rounded-xl font-bold transition-all shadow-lg shadow-[rgba(31,111,235,0.2)]">
            Get Started: Add First Platform
          </a>
        </div>
      ) : (
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-secondary)] border-l-4 border-l-[var(--color-accent-blue)]">
               <span className="font-semibold text-white">Pro Tip:</span> Your heatmap intensity is determined by the total volume of daily submissions across all synced accounts.
            </div>
            <div className="p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-secondary)] border-l-4 border-l-[var(--color-accent-purple)]">
               <span className="font-semibold text-white">Did you know?</span> Codeforces submissions are fetched from your last 2,000 status updates to ensure accuracy.
            </div>
         </div>
      )}
    </div>
  );
};

export default Dashboard;
