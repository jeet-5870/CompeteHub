import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, MapPin, Building, Link as LinkIcon, Edit3, Award, Flame, Target, TrendingUp, TrendingDown, Clock, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { firebaseAuth } from '../firebase';
import { apiService } from '../services/apiService';
import ContributionHeatmap from '../components/ContributionHeatmap';


const Profile = () => {
  const { user, loading } = useAuth();

  const [submissions, setSubmissions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);

  const [userStats, setUserStats] = useState({
    totalSolved: 0,
    currentStreak: 0,
    percentile: 'N/A'
  });

  // Dynamic platform states
  const [userPlatforms, setUserPlatforms] = useState([]);
  const [availablePlatforms, setAvailablePlatforms] = useState([]);
  const [newPlatformId, setNewPlatformId] = useState('');
  const [newHandle, setNewHandle] = useState('');
  const [githubHandle, setGithubHandle] = useState(''); // Kept separate as it's the primary heatmap source

  useEffect(() => {
    const fetchData = async () => {
      if (user?.uid) {
        setFetching(true);
        setError(null);
        try {
          // 1. Get available platforms from API
          const allPlatforms = await apiService.getPlatforms();
          setAvailablePlatforms(allPlatforms);

          // 2. Get preferences from Firestore
          const prefs = await firebaseAuth.getUserPreferences(user.uid);

          const safePrefs = prefs || {};
          let currentPlatforms = safePrefs?.userPlatforms || [];
          const github = safePrefs?.githubHandle || '';

          // AUTO-MIGRATION: Convert old fields to array if needed
          if (!safePrefs?.userPlatforms && (safePrefs?.codeforcesHandle || safePrefs?.leetcodeUsername)) {
            console.log('[Migration] Detected legacy platforms, converting to userPlatforms array...');
            if (safePrefs.codeforcesHandle) {
              currentPlatforms.push({ id: '1', resourceId: 1, name: 'Codeforces', handle: prefs.codeforcesHandle });
            }
            if (safePrefs.leetcodeUsername) {
              currentPlatforms.push({ id: '2', resourceId: 102, name: 'LeetCode', handle: prefs.leetcodeUsername });
            }
            // Save migrated state back to Firestore
            await firebaseAuth.saveUserPreferences(user.uid, { userPlatforms: currentPlatforms });
          }

          setUserPlatforms(currentPlatforms);
          setGithubHandle(github);

          // 3. Caching Logic
          const cacheAge = Date.now() - (safePrefs.lastFetchedTimestamp || 0);
          const isCacheValid = cacheAge < 3600000;
          let statsMap = safePrefs.lastFetchedStats || {};

          // 4. Fetch fresh data if invalid or missing
          if (!isCacheValid || Object.keys(statsMap).length === 0) {
            console.log('Fetching fresh stats for connected platforms...');
            const freshStats = {};

            await Promise.all(currentPlatforms.map(async (p) => {
              const data = await apiService.getClistUserStats(p.handle, p.resourceId);
              freshStats[p.id] = data;
            }));

            statsMap = freshStats;
            await firebaseAuth.saveUserPreferences(user.uid, {
              lastFetchedStats: statsMap,
              lastFetchedTimestamp: Date.now()
            });
          }

          // Calculate total solved from statsMap
          let grandTotalSolved = 0;
          Object.values(statsMap).forEach(s => {
            if(s){
              grandTotalSolved += (Number(s.n_solved) || 0);
            }
          });

          setUserStats(prev => ({
            ...prev,
            totalSolved: grandTotalSolved,
          }));
        } catch (err) {
          console.error("Profile Data Error:", err);
          setSaveStatus({ type: 'error', message: "Data sync paused." });
        } finally {
          setFetching(false);
        }
      }
    };
    fetchData();
  }, [user]);

  const enrichedPlatforms = useMemo(() => {
    return (userPlatforms || []).map(p => {
      const meta = availablePlatforms.find(m => m.id === Number(p.id)) || {};
      return {
        ...p,
        color: meta.color || 'var(--color-text-muted)',
        bg: meta.bg || 'var(--color-bg-tertiary)',
        rating: p.rating || 0,
        rank: p.rank || 'N/A',
        solved: p.solved || 0,
        trend: 'up'
      };
    });
  }, [userPlatforms, availablePlatforms]);

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveStatus(null);
    try {
      // 1. Save platforms using the specialized clean-array function
      await firebaseAuth.saveUserPlatforms(user.uid, userPlatforms);
      
      // 2. Save other preferences
      await firebaseAuth.saveUserPreferences(user.uid, { githubHandle });
      
      setSaveStatus({ type: 'success', message: 'Settings saved successfully!' });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error("Save Error:", error);
      setSaveStatus({ type: 'error', message: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddPlatform = () => {
    if (!newPlatformId || !newHandle) return;

    const platformMeta = availablePlatforms.find(p => p.id === Number(newPlatformId));
    if (!platformMeta) return;

    // Check if already added
    if (userPlatforms.some(p => p.id === String(platformMeta.id))) {
      setSaveStatus({ type: 'error', message: 'Platform already connected.' });
      return;
    }

    setUserPlatforms(prev => [...prev, {
      id: String(platformMeta.id), // Use platformMeta.id as string for consistency
      resourceId: platformMeta.resourceId,
      name: platformMeta.name,
      handle: newHandle.trim()
    }]);

    setNewPlatformId('');
    setNewHandle('');
  };

  const handleRemovePlatform = (id) => {
    setUserPlatforms((userPlatforms || []).filter(p => p.id !== id));
  };

  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'G';
  };

  const getJoinedDate = () => {
    if (user?.metadata?.creationTime) {
      const date = new Date(user.metadata.creationTime);
      return `Joined ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    }
    return 'Joined Recently';
  };


  if (loading || fetching) {
    return (
      <div className="p-4 md:p-8 flex flex-col gap-8 animate-pulse">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-[180px] h-[180px] rounded-[10px] bg-[var(--color-bg-secondary)] border border-[var(--color-border)]"></div>
          <div className="flex flex-col gap-4 w-full max-w-[480px]">
            <div className="h-10 w-48 bg-[var(--color-bg-secondary)] rounded-md"></div>
            <div className="h-6 w-64 bg-[var(--color-bg-secondary)] rounded-md"></div>
            <div className="flex flex-col gap-2">
              <div className="h-4 w-32 bg-[var(--color-bg-secondary)] rounded-md"></div>
              <div className="h-4 w-40 bg-[var(--color-bg-secondary)] rounded-md"></div>
            </div>
          </div>
        </div>
        <div className="h-48 w-full bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.2)] rounded-lg p-8 max-w-[400px]">
          <h2 className="text-xl font-bold text-[var(--color-accent-red)] mb-2">Profile Error</h2>
          <p className="text-[var(--color-text-secondary)] mb-6 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] border border-[var(--color-border)] rounded-md text-sm font-medium transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        <div className="flex-shrink-0 relative group">
          <div className="w-[180px] h-[180px] rounded-[10px] border border-[var(--color-border)] overflow-hidden bg-[var(--color-bg-secondary)] flex items-center justify-center relative">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <>
                <div className="w-full h-full bg-gradient-to-tr from-[var(--color-accent-blue)] to-[var(--color-accent-purple)] opacity-20"></div>
                <span className="text-[64px] font-mono font-bold text-white absolute">
                  {getInitials()}
                </span>
              </>
            )}
          </div>
          <button className="absolute bottom-2 left-2 right-2 bg-[rgba(22,27,34,0.8)] backdrop-blur-sm border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs font-semibold py-1.5 rounded-md hover:text-[var(--color-accent-blue)] hover:border-[var(--color-accent-blue)] opacity-80 group-hover:opacity-100 transition-all flex items-center justify-center gap-1 shadow-lg">
            <Edit3 size={14} /> Edit profile
          </button>
        </div>

        <div className="flex flex-col pt-1 w-full max-w-[480px]">
          <h1 className="text-[32px] font-semibold leading-tight text-[var(--color-text-primary)]">{user?.displayName || 'User'}</h1>
          <p className="text-[18px] text-[var(--color-text-secondary)] mb-4">{user?.email || 'No email provided'}</p>

          <div className="flex flex-col gap-2 text-sm text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-2"><MapPin size={16} /> Location not set</div>
            <div className="flex items-center gap-2"><Building size={16} /> Organization not set</div>
            <div className="flex items-center gap-2">
              <LinkIcon size={16} />
              {githubHandle ? (
                <a
                  href={`https://github.com/${githubHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-accent-blue)] hover:underline"
                >
                  github.com/{githubHandle}
                </a>
              ) : (
                <span className="text-[var(--color-text-muted)] italic text-sm">No GitHub handle set</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[var(--color-text-muted)] mt-2"><Calendar size={16} /> {getJoinedDate()}</div>
          </div>

          <div className="mt-6 flex gap-3">
            <button className="bg-[var(--color-btn-primary-bg)] border border-[var(--color-btn-primary-border)] hover:brightness-90 text-white px-6 py-1.5 rounded-md text-sm font-medium transition-all">
              Follow
            </button>
            <button className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)] hover:border-[var(--color-text-secondary)] text-[var(--color-text-primary)] px-4 py-1.5 rounded-md text-sm font-medium transition-all">
              Share Profile
            </button>
          </div>
        </div>

        {/* Overall Stats Row */}
        <div className="flex-1 min-w-[300px] flex flex-col gap-4">
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md p-4 flex items-center gap-4">
            <div className="bg-[var(--color-bg-tertiary)] p-3 rounded-md"><Award className="text-[var(--color-accent-purple)]" size={24} /></div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Global Rating Percentile</div>
              <div className="font-mono text-2xl font-bold">Top <span className="text-[var(--color-accent-purple)]">{userStats.percentile}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md p-4">
              <div className="flex items-center gap-2 mb-2 text-[var(--color-text-secondary)]">
                <Target size={16} /> <span className="text-xs font-semibold uppercase tracking-wider">Total Solved</span>
              </div>
              <div className="font-mono text-xl font-bold text-[var(--color-text-primary)]">{userStats.totalSolved.toLocaleString()}</div>
            </div>
            <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md p-4">
              <div className="flex items-center gap-2 mb-2 text-[var(--color-text-secondary)]">
                <Flame size={16} className="text-[var(--color-accent-orange)]" /> <span className="text-xs font-semibold uppercase tracking-wider">Current Streak</span>
              </div>
              <div className="font-mono text-xl font-bold text-[var(--color-text-primary)]">{userStats.currentStreak} <span className="text-sm text-[var(--color-text-muted)]">days</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-8">

        {/* Heatmap Section */}
        <div className="lg:w-2/3">
          <ContributionHeatmap
            userId={user?.uid}
            githubUsername={githubHandle || user?.displayName?.replace(/\s+/g, '-').toLowerCase()}
            platforms={userPlatforms || []}
          />
        </div>

        {/* Platform Cards & Settings */}
        <div className="lg:w-1/3 flex flex-col gap-6">

          {/* User Settings Section */}
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-5">
            <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
              <Edit3 size={18} className="text-[var(--color-text-secondary)]" />
              User Settings
            </h3>

            <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] font-mono">GitHub Username</label>
                <div className="text-[10px] text-[var(--color-text-muted)] -mt-1 mb-1 italic">Used for GitHub contributions on the heatmap</div>
                <input
                  type="text"
                  value={githubHandle}
                  onChange={(e) => setGithubHandle(e.target.value)}
                  placeholder="e.g. gaearon"
                  className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline focus:outline-2 focus:outline-[var(--color-accent-blue)] focus:outline-offset-1 transition-all"
                  disabled={fetching}
                />
              </div>

              <div className="pt-2 border-t border-[var(--color-border-muted)]">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2 block">Manage Platforms</label>
                <div className="flex flex-col gap-3 p-3 bg-[var(--color-bg-primary)] rounded-md border border-[var(--color-border-muted)]">
                  <select
                    value={newPlatformId}
                    onChange={(e) => setNewPlatformId(e.target.value)}
                    className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md px-2 py-1.5 text-xs text-[var(--color-text-primary)] w-full focus:outline-none"
                  >
                    <option value="">Select Platform...</option>
                    {availablePlatforms.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newHandle}
                      onChange={(e) => setNewHandle(e.target.value)}
                      placeholder="Handle/Username"
                      className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-xs text-[var(--color-text-primary)] flex-1 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddPlatform}
                      className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] hover:border-[var(--color-text-secondary)] p-1.5 rounded-md transition-all"
                      title="Add Platform"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || fetching}
                className="mt-2 flex items-center justify-center gap-2 bg-[var(--color-btn-primary-bg)] border border-[var(--color-btn-primary-border)] hover:brightness-90 text-white py-1.5 rounded-md text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Save Settings'}
              </button>

              {saveStatus && (
                <p className={`text-xs text-center font-medium ${saveStatus.type === 'success' ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-accent-red)]'}`}>
                  {saveStatus.message}
                </p>
              )}
            </form>
          </div>

          <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)] mb-1 border-b border-[var(--color-border-muted)] pb-2">Connected Platforms</h3>

          {enrichedPlatforms?.map(platform => (
            <div key={platform.id} className={`bg-[var(--color-bg-secondary)] border ${platform.error ? 'border-[var(--color-accent-red)] shadow-[0_0_10px_rgba(248,81,73,0.1)]' : 'border-[var(--color-border)]'} rounded-md p-4 card-hover w-full flex items-center justify-between group`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0 border border-[var(--color-border)]" style={{ backgroundColor: platform.color, backgroundImage: `linear-gradient(rgba(255,255,255,0.1), rgba(255,255,255,0))` }}>
                  {platform.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 group-hover:text-[var(--color-accent-blue)] transition-colors">
                    {platform.name}
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] font-medium border border-[var(--color-border-muted)] px-1.5 py-0.5 rounded-sm bg-[var(--color-bg-primary)]">{platform.rank}</span>
                  </h4>
                  <div className="flex items-center gap-3 mt-1 text-xs font-mono text-[var(--color-text-muted)]">
                    <span title="Current Rating" className={platform.trend === 'up' ? 'text-[var(--color-accent-green)] font-semibold' : 'text-[var(--color-accent-red)] font-semibold'}>{platform.rating}</span>
                    <span title="Handle">({platform.handle})</span>
                    <span title="Problems Solved">✓ {platform.solved}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Tiny SVG sparkline mock */}
                <div className="w-[40px] h-[20px] opacity-70 hidden sm:block">
                  <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
                    <path
                      d={platform.trend === 'up' ? "M0,30 L20,20 L40,25 L60,10 L80,15 L100,5" : "M0,10 L20,5 L40,15 L60,10 L80,25 L100,20"}
                      fill="none"
                      stroke={platform.trend === 'up' ? 'var(--color-accent-green)' : 'var(--color-accent-red)'}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePlatform(platform.id)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-red)] p-1 opacity-0 group-hover:opacity-100 transition-all"
                  title="Remove Platform"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="w-full">
        <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)] mb-4 border-b border-[var(--color-border-muted)] pb-2 flex items-center gap-2">
          <Clock size={16} className="text-[var(--color-text-secondary)]" /> Recent Submissions
        </h3>

        <div className="border border-[var(--color-border)] rounded-md bg-[var(--color-bg-secondary)] overflow-hidden">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-[var(--color-border-muted)] text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] bg-[rgba(13,17,23,0.3)]">
                <th className="px-4 py-3 font-semibold">Problem</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell">Language</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-muted)] text-[13px]">
              {submissions.map(sub => (
                <tr key={sub.id} className="hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: enrichedPlatforms?.find(p => p.name === sub.platform)?.color || 'var(--color-border)' }}></span>
                      <span className="font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-blue)] transition-colors truncate max-w-[150px] sm:max-w-none">{sub.title}</span>
                      <span className="text-[11px] text-[var(--color-text-muted)] ml-2 hidden sm:inline">{sub.platform}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 flex items-center gap-2 font-mono">
                    {sub.result === 'Accepted' ? (
                      <span className="text-[var(--color-accent-green)]">✓ {sub.result}</span>
                    ) : (
                      <span className="text-[var(--color-accent-red)]">✗ {sub.result}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)] hidden sm:table-cell">{sub.language}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] hidden sm:table-cell text-right">{sub.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Profile;
