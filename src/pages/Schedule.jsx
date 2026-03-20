import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ExternalLink, Loader2 } from 'lucide-react';
import { apiService } from '../services/apiService';
import { formatDateIST } from '../utils/dateUtils';

const CountdownTimer = ({ targetTime, isLive }) => {
  const [timeLeft, setTimeLeft] = useState(isLive ? targetTime + (2 * 60 * 60 * 1000) - new Date().getTime() : targetTime - new Date().getTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(isLive ? targetTime + (2 * 60 * 60 * 1000) - new Date().getTime() : targetTime - new Date().getTime());
    }, 1000);
    return () => clearInterval(timer);
  }, [targetTime, isLive]);

  if (timeLeft < 0 && !isLive) return <span className="text-[var(--color-accent-red)] font-mono text-sm tracking-wide">00:00:00</span>;

  const hours = Math.floor((timeLeft / (1000 * 60 * 60)));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const formatTime = (time) => String(time).padStart(2, '0');

  const timeString = `${hours > 0 ? formatTime(hours) + ':' : ''}${formatTime(minutes)}:${formatTime(seconds)}`;

  return (
    <span className={`font-mono text-sm tracking-wider font-semibold tabular-nums 
      ${isLive ? 'text-[var(--color-accent-green)] animate-pulse' : 'text-[var(--color-accent-orange)]'}`}>
      {timeString}
    </span>
  );
};

const Schedule = () => {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [filter, setFilter] = useState('All');

  const platforms = [
    { name: 'All', color: 'var(--color-bg-tertiary)' },
    { name: 'Codeforces', color: '#1f6feb' },
    { name: 'LeetCode', color: '#f0a500' },
    { name: 'AtCoder', color: '#596de9' },
    { name: 'CodeChef', color: '#a1887f' }
  ];

  const fetchContests = async () => {
    setLoading(true);
    setError(null);
    setIsOffline(false);
    try {
      const result = await apiService.getContests();
      setContests(result.data);
      setIsOffline(result.isFallback);
    } catch (err) {
      console.error("Error fetching contests:", err);
      setError("Failed to retrieve contest schedule. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContests();
  }, []);

  const filteredContests = contests.filter(contest => {
    if (filter === 'All') return true;
    return contest.platform === filter;
  });

  if (loading) {
// ... loading state logic (kept same)
    return (
      <div className="p-4 md:p-8 animate-pulse">
        <div className="h-10 w-48 bg-[var(--color-bg-secondary)] rounded-md mb-8"></div>
        <div className="flex flex-col md:flex-row gap-8">
           <div className="w-[240px] h-64 bg-[var(--color-bg-secondary)] rounded-md"></div>
           <div className="flex-1 h-96 bg-[var(--color-bg-secondary)] rounded-md"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[400px]">
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md p-8 text-center max-w-[440px]">
           <div className="text-[var(--color-accent-red)] mb-4 flex justify-center">
             <div className="p-3 bg-[rgba(248,81,73,0.1)] rounded-full border border-[rgba(248,81,73,0.2)]">
               <Calendar size={32} />
             </div>
           </div>
           <h2 className="text-lg font-semibold mb-2">Schedule Sync Failed</h2>
           <p className="text-[var(--color-text-secondary)] mb-6 text-sm">{error}</p>
           <button 
             onClick={fetchContests}
             className="w-full py-2 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] border border-[var(--color-border)] rounded-md text-sm font-medium transition-colors"
           >
             Force Re-sync
           </button>
        </div>
      </div>
    );
  }

  const liveContests = filteredContests.filter(c => c.isLive);
  const upcomingContests = filteredContests.filter(c => !c.isLive).sort((a,b) => a.startTime - b.startTime);

  return (
    <div className="p-4 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 border-b border-[var(--color-border-muted)] pb-6 gap-4">
        <div>
          <h1 className="text-[24px] font-semibold mb-1">Contest Schedule</h1>
          <p className="text-[var(--color-text-secondary)] text-sm">Upcoming and live contests across all platforms</p>
        </div>
        
        <div className="relative inline-block w-full md:w-auto">
          <select className="w-full md:w-auto appearance-none bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md pl-3 pr-8 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-blue)] cursor-pointer">
            <option>UTC (Coordinated Universal Time)</option>
            <option>IST (Indian Standard Time)</option>
            <option>EST (Eastern Standard Time)</option>
            <option>PST (Pacific Standard Time)</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none" size={14} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-[240px] flex-shrink-0 flex flex-col gap-6">
          {isOffline && (
            <div className="bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.3)] rounded-md p-3 mb-2 animate-pulse">
              <div className="flex items-center gap-2 text-[var(--color-accent-red)] text-xs font-bold uppercase tracking-widest mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-red)]"></div>
                Offline Mode
              </div>
              <p className="text-[10px] text-[var(--color-text-secondary)] leading-relaxed">
                Network timeout. Displaying archived contest schedules.
              </p>
            </div>
          )}

          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Duration</h3>
            <div className="flex flex-col gap-2.5">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="radio" name="duration" className="w-3.5 h-3.5 accent-[var(--color-accent-blue)]" />
                <span className="text-sm text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">&lt; 2 hours</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="radio" name="duration" defaultChecked className="w-3.5 h-3.5 accent-[var(--color-accent-blue)]" />
                <span className="text-sm text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">2 - 5 hours</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="radio" name="duration" className="w-3.5 h-3.5 accent-[var(--color-accent-blue)]" />
                <span className="text-sm text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">5+ hours</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Platform Filter Bar */}
          <div className="flex flex-wrap gap-2 mb-2 p-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg w-fit">
            {platforms.map(p => {
              const isActive = filter === p.name;
              return (
                <button
                  key={p.name}
                  onClick={() => setFilter(p.name)}
                  className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 
                    ${isActive 
                      ? 'text-white shadow-sm' 
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'}`}
                  style={isActive ? { backgroundColor: p.color } : {}}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
          
          {/* Live Now Strip */}
          {liveContests.length > 0 && (
            <div className="bg-[rgba(63,185,80,0.08)] border border-[rgba(63,185,80,0.2)] border-l-4 border-l-[var(--color-accent-green)] rounded-md overflow-hidden">
              <div className="px-4 py-2 bg-[rgba(63,185,80,0.1)] border-b border-[rgba(63,185,80,0.1)] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--color-accent-green)] animate-pulse"></div>
                <span className="text-xs font-semibold text-[var(--color-accent-green)] uppercase tracking-wider">Live Now</span>
              </div>
              <div className="p-2 flex overflow-x-auto snap-x no-scrollbar">
                {liveContests.map(contest => (
                  <div key={contest.id} className="min-w-[280px] sm:min-w-[320px] snap-start bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md p-3 mx-2 flex gap-3 shadow-sm hover:border-[var(--color-text-secondary)] transition-colors cursor-pointer relative overflow-hidden">
                    {/* Progress bar background decoration */}
                    <div className="absolute top-0 left-0 h-1 bg-[var(--color-accent-green)]" style={{ width: '65%' }}></div>
                    
                    <div className="w-8 h-8 rounded-md flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0" style={{ backgroundColor: contest.color, backgroundImage: `linear-gradient(rgba(255,255,255,0.1), rgba(255,255,255,0))` }}>
                      {contest.platform.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{contest.name}</h4>
                      <p className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1.5 mt-1">
                        {contest.platform} • {contest.duration}
                      </p>
                    </div>
                    <div className="flex items-center">
                       <CountdownTimer targetTime={contest.startTime} isLive={true} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Contests */}
          <div className="mt-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-muted)] pb-2 mb-4">
              Upcoming Contests
            </h2>
            
            <div className="flex flex-col rounded-md border border-[var(--color-border)] overflow-hidden bg-[var(--color-bg-secondary)]">
              {upcomingContests.map((contest, i) => (
                <div 
                  key={contest.id} 
                  className={`flex items-center gap-4 p-4 hover:bg-[#1c2128] transition-colors cursor-pointer group
                    ${i !== upcomingContests.length - 1 ? 'border-b border-[var(--color-border-muted)]' : ''}`}
                >
                  <div className="hidden sm:flex flex-col items-center justify-center min-w-[60px] text-center border-r border-[var(--color-border-muted)] pr-4">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                       {formatDateIST(contest.startTime)}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-secondary)] uppercase">
                       {new Intl.DateTimeFormat('en-US', { weekday: 'short'}).format(new Date(contest.startTime))}
                    </span>
                  </div>

                  <div className="w-8 h-8 rounded-md flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0 hidden sm:flex" style={{ backgroundColor: contest.color, backgroundImage: `linear-gradient(rgba(255,255,255,0.1), rgba(255,255,255,0))` }}>
                    {contest.platform.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-y-1">
                    <div>
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] border border-[var(--color-border-muted)] sm:hidden">
                            {contest.platform}
                         </span>
                         <h4 className="text-[15px] font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-blue)] transition-colors truncate">
                           {contest.name}
                         </h4>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[var(--color-text-secondary)]">{contest.duration}</span>
                        {contest.tags.map(tag => (
                           <span key={tag} className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)] tracking-wider">
                             • {tag}
                           </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2 sm:mt-0">
                       <CountdownTimer targetTime={contest.startTime} isLive={false} />
                       <button className="text-[var(--color-text-secondary)] hover:text-[#e6edf3] p-1.5 rounded-md hover:bg-[var(--color-bg-tertiary)] transition-colors transition-opacity opacity-0 group-hover:opacity-100 hidden sm:block">
                         <Calendar size={18} />
                       </button>
                    </div>
                  </div>
                </div>
              ))}
              {upcomingContests.length === 0 && (
                 <div className="p-8 text-center text-[var(--color-text-secondary)]">
                    No upcoming contests match your filters.
                 </div>
              )}
            </div>
            
            <div className="mt-4 flex justify-center">
              <button className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium underline underline-offset-4 decoration-[var(--color-border-muted)] hover:decoration-[var(--color-text-secondary)] transition-all">
                Load More Contests
              </button>
            </div>
          </div>

        </div>
      </div>
      {filteredContests.length === 0 && !loading && !error && (
        <div className="text-center py-20 border border-dashed border-[var(--color-border)] rounded-lg">
          <Calendar className="mx-auto text-[var(--color-text-muted)] mb-4" size={40} />
          <h3 className="text-lg font-medium text-[var(--color-text-primary)]">No Contests Found</h3>
          <p className="text-[var(--color-text-secondary)]">Try adjusting your filters or check back later.</p>
        </div>
      )}
    </div>
  );
};

export default Schedule;
