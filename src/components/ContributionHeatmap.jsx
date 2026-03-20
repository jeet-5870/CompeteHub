import React, { useMemo, useEffect, useState, memo } from 'react';
import { apiService } from '../services/apiService';
import { formatDateIST } from '../utils/dateUtils';

const ContributionHeatmap = memo(({ userId, githubUsername }) => {
  const [externalStats, setExternalStats] = useState({});
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
    const fetchStats = async () => {
      if (userId || githubUsername) {
        setLoading(true);
        try {
          const stats = await apiService.getSubmissionStats(githubUsername || userId);
          setExternalStats(stats);
        } catch (error) {
          console.error("Error fetching heatmap stats:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchStats();
  }, [userId, githubUsername]);

  // Generate 365 days of data ending today
  const heatmapData = useMemo(() => {
    const data = [];
    const today = new Date();
    const endDate = new Date(today);
    
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
      const dateStr = currentDate.toISOString().split('T')[0];
      const count = externalStats[dateStr] || 0;
      
      // Determine level (0-4)
      let level = 0;
      if (count > 0) level = 1;
      if (count >= 2) level = 2;
      if (count >= 4) level = 3;
      if (count >= 6) level = 4;

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
  }, [externalStats]);

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

  return (
    <div className={`border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-bg-primary)] mt-4 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
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
