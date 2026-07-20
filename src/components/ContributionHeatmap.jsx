import React, { useMemo, useEffect, useState, memo } from 'react';
import { getUnifiedActivity } from '../services/activityService';
import { formatDateIST } from '../utils/dateUtils';

// ── Skeleton ────────────────────────────────────────────────────────────────
const SKELETON_WEEKS = 53;
const SKELETON_DAYS  = 7;

const HeatmapSkeleton = () => (
  <div className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-bg-primary)] mt-4">
    {/* Header */}
    <div className="flex items-center justify-between mb-4">
      <div className="h-4 w-48 rounded bg-[var(--color-bg-secondary)] animate-pulse" />
      <div className="h-3 w-28 rounded bg-[var(--color-bg-secondary)] animate-pulse" />
    </div>

    <div className="flex flex-col gap-1 overflow-x-auto pb-4">
      {/* Month label row */}
      <div className="flex gap-[3px] ml-8 mb-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded bg-[var(--color-bg-secondary)] animate-pulse"
            style={{ width: `${Math.floor(SKELETON_WEEKS / 12) * 13}px`, animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>

      <div className="flex gap-[3px]">
        {/* Day label column */}
        <div className="flex flex-col gap-[3px] w-7 pt-[2px]">
          {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, i) => (
            <div key={i} className="h-[10px] flex items-center">
              {label && (
                <div className="h-2 w-5 rounded bg-[var(--color-bg-secondary)] animate-pulse" style={{ animationDelay: `${i * 30}ms` }} />
              )}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-[3px]">
          {Array.from({ length: SKELETON_WEEKS }).map((_, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-[3px]">
              {Array.from({ length: SKELETON_DAYS }).map((_, dIdx) => (
                <div
                  key={dIdx}
                  className="w-[10px] h-[10px] rounded-sm bg-[var(--color-bg-secondary)] animate-pulse"
                  style={{ animationDelay: `${(wIdx * 7 + dIdx) * 3}ms` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Legend */}
    <div className="flex items-center justify-end gap-2 mt-2">
      <div className="h-3 w-6 rounded bg-[var(--color-bg-secondary)] animate-pulse" />
      <div className="flex gap-[3px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-[10px] h-[10px] rounded-sm bg-[var(--color-bg-secondary)] animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
      <div className="h-3 w-6 rounded bg-[var(--color-bg-secondary)] animate-pulse" />
    </div>
  </div>
);

// ── Heatmap ──────────────────────────────────────────────────────────────────
const ContributionHeatmap = memo(({ userId, githubUsername, userPlatforms = [], manualData = null }) => {
  const [internalStats, setInternalStats] = useState({});
  const [loading, setLoading] = useState(false);

  // Constants for styling
  const colors = {
    0: 'bg-[#161b22]', // no activity
    1: 'bg-[#0e4429]', // low activity
    2: 'bg-[#006d32]', // medium activity
    3: 'bg-[#26a641]', // high activity
    4: 'bg-[#39d353]'  // 4+ activity
  };

  useEffect(() => {
    // Skip fetching if data is provided manually (Unified Dashboard mode)
    if (manualData) return;

    const fetchStats = async () => {
      // Build a unified platform list for the service
      const unifiedPlatforms = [...(userPlatforms || [])];
      
      const gh = githubUsername || userId;
      if (gh && !unifiedPlatforms.some(p => p.resourceId === 'github')) {
        unifiedPlatforms.push({ resourceId: 'github', handle: gh, name: 'GitHub' });
      }

      if (unifiedPlatforms.length > 0) {
        setLoading(true);
        try {
          const { activityData } = await getUnifiedActivity(unifiedPlatforms);
          setInternalStats(activityData);
        } catch (error) {
          console.error('[ContributionHeatmap] Unexpected fetch error:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchStats();
  }, [userId, githubUsername, JSON.stringify(userPlatforms), manualData]);

  const activeStats = manualData || internalStats;

  // Generate 365 days of data ending today
  const heatmapData = useMemo(() => {
    console.log("[HeatmapUI] Received Data:", Object.keys(activeStats).length + " days");
    
    // Calculate dynamic thresholds based on max activity
    const counts = Object.values(activeStats).filter(v => typeof v === 'number');
    const maxCount = counts.length > 0 ? Math.max(...counts) : 10;
    
    // Dynamic thresholds: 25%, 50%, 75%, 100% of max
    const t1 = Math.max(1, Math.floor(maxCount * 0.25));
    const t2 = Math.max(2, Math.floor(maxCount * 0.50));
    const t3 = Math.max(4, Math.floor(maxCount * 0.75));
    const t4 = Math.max(6, Math.floor(maxCount * 0.90));

    const data = [];
    const today = new Date();
    const endDate = new Date(today);
    endDate.setHours(0, 0, 0, 0); // Normalize to start of day
    
    // Starting from 364 days ago to maintain exactly 365 days
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 364);

    let currentDate = new Date(startDate);
    let currentWeek = [];

    // Align the first week (if start day is not Sunday)
    const firstDayOfWeek = startDate.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null); 
    }

    while (currentDate <= endDate) {
      // Use IST-consistent YYYY-MM-DD or simple ISO split
      // We must match the fetcher's format: toISOString().split('T')[0]
      const dateStr = currentDate.toISOString().split('T')[0];
      const count = Number(activeStats[dateStr]) || 0;
      
      // Determine level (0-4) based on dynamic thresholds
      let level = 0;
      if (count > 0) level = 1;
      if (count >= t2) level = 2;
      if (count >= t3) level = 3;
      if (count >= t4) level = 4;

      currentWeek.push({
        date: new Date(currentDate),
        count: count,
        level: level
      });

      if (currentWeek.length === 7) {
        data.push(currentWeek);
        currentWeek = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      data.push(currentWeek);
    }

    return data;
  }, [activeStats]);

  // Month labels logic
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;

    heatmapData.forEach((week, weekIdx) => {
      const firstValidDay = week.find(d => d !== null);
      if (firstValidDay) {
        const month = firstValidDay.date.getMonth();
        if (month !== lastMonth) {
          labels.push({
            month: firstValidDay.date.toLocaleString('default', { month: 'short' }),
            index: weekIdx
          });
          lastMonth = month;
        }
      }
    });

    return labels.filter((label, i) => i === 0 || label.index - labels[i - 1].index > 2);
  }, [heatmapData]);

  if (loading) return (
    <div className="relative">
      <HeatmapSkeleton />
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-bg-primary)]/50 backdrop-blur-[1px] rounded-lg">
        <p className="text-sm font-medium text-[var(--color-text-primary)] animate-pulse">
          Loading activity data...
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Aggregating GitHub, LeetCode, and Codeforces
        </p>
      </div>
    </div>
  );

  return (
    <div className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-bg-primary)] mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {githubUsername ? `${githubUsername}'s` : 'Your'} contributions in the last year
        </h3>
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">
          365 Day Rolling Window
        </span>
      </div>

      <div className="flex flex-col gap-1 overflow-x-auto pb-4 custom-scrollbar">
        {/* Month labels header */}
        <div className="flex relative h-5 mb-1 ml-8">
          {monthLabels.map((label, idx) => (
            <div
              key={idx}
              className="absolute text-[10px] text-[var(--color-text-muted)]"
              style={{ left: `${label.index * 13}px` }}
            >
              {label.month}
            </div>
          ))}
        </div>

        <div className="flex gap-1">
          {/* Day labels column */}
          <div className="flex flex-col gap-[3px] text-[10px] text-[var(--color-text-muted)] pt-[2px] w-7">
            <span className="h-[10px]"></span>
            <span className="h-[10px]">Mon</span>
            <span className="h-[10px]"></span>
            <span className="h-[10px]">Wed</span>
            <span className="h-[10px]"></span>
            <span className="h-[10px]">Fri</span>
            <span className="h-[10px]"></span>
          </div>

          {/* Grid */}
          <div className="flex gap-[3px]">
            {heatmapData.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-[3px]">
                {week.map((day, dIdx) => (
                  day ? (
                    <div
                      key={dIdx}
                      className={`w-[10px] h-[10px] rounded-sm ${colors[day.level]} outline outline-1 outline-[#1b1f24]/5 hover:outline-[#8b949e] transition-all cursor-pointer`}
                      title={`${formatDateIST(day.date)}: ${day.count} contributions`}
                    />
                  ) : (
                    <div key={dIdx} className="w-[10px] h-[10px] bg-transparent" />
                  )
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 text-xs mt-2 text-[var(--color-text-secondary)]">
        <span>Less</span>
        <div className="flex gap-[3px]">
          {Object.entries(colors).map(([level, colorClass]) => (
            <div key={level} className={`w-[10px] h-[10px] rounded-sm ${colorClass} outline outline-1 outline-[#1b1f24]/5`} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
});

export default ContributionHeatmap;
