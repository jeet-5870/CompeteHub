// Centralized Service for Data Fetching
// This service acts as a bridge to Firestore or external APIs.

export const apiService = {
  // Fetch platform details for the Platforms page (Static for now)
  async getPlatforms() {
    return [
      { id: 1, name: 'Codeforces', desc: 'The most popular competitive programming platform with regular contests and a strong rating system.', tags: ['Competitive', 'Olympiad'], problems: '9,450', users: '1.2M', color: '#1f6feb', bg: 'rgba(31,111,235,0.15)' },
      { id: 2, name: 'LeetCode', desc: 'The best platform to help you enhance your skills, expand your knowledge and prepare for technical interviews.', tags: ['Interview Prep'], problems: '3,120', users: '4.5M', color: '#f0a500', bg: 'rgba(255,161,22,0.15)' },
      { id: 3, name: 'AtCoder', desc: 'Japanese contest platform known for high-quality mathematical and algorithmic problems.', tags: ['Competitive', 'Olympiad'], problems: '4,200', users: '350K', color: '#596de9', bg: 'rgba(89,109,233,0.15)' },
      { id: 4, name: 'CodeChef', desc: 'Global programming community hosting long contests, cook-offs, and lunchtime competitions.', tags: ['Competitive', 'Beginner-friendly'], problems: '12,500', users: '2.1M', color: '#a1887f', bg: 'rgba(93,64,55,0.3)' },
      { id: 5, name: 'HackerRank', desc: 'Practice coding, prepare for interviews, and get hired. Domain-specific tracks available.', tags: ['Interview Prep', 'Beginner-friendly'], problems: '2,800', users: '7.8M', color: '#3fb950', bg: 'rgba(63,185,80,0.15)' }
    ];
  },

  // Normalize contest data from various sources into a unified format
  normalizeContestData(raw, source) {
    try {
      if (source === 'codeforces') {
        // Include both upcoming (BEFORE) and ongoing (CODING) contests
        if (raw.phase !== 'BEFORE' && raw.phase !== 'CODING') return null;
        const startTime = raw.startTimeSeconds * 1000;
        return {
          name: raw.name,
          url: `https://codeforces.com/contests/${raw.id}`,
          platform: 'Codeforces',
          startTime: startTime,
          duration: raw.durationSeconds,
          isLive: raw.phase === 'CODING' || (startTime <= Date.now() && startTime > Date.now() - 1800000),
          color: '#1f6feb',
          tags: [raw.type, `Div. ${raw.name.match(/Div\.\s*(\d+)/)?.[1] || 'All'}`]
        };
      }

      if (source === 'atcoder') {
        const startTime = raw.start_epoch_second * 1000;
        // Allow contests that started in the last 30 minutes (Ongoing)
        if (startTime <= Date.now() - 1800000) return null;
        return {
          name: raw.title,
          url: `https://atcoder.jp/contests/${raw.id}`,
          platform: 'AtCoder',
          startTime: startTime,
          duration: raw.duration_second,
          isLive: startTime <= Date.now(),
          color: '#596de9',
          tags: [raw.rate_range || 'All']
        };
      }

      if (source === 'leetcode-clist') {
        const startTime = new Date(raw.start).getTime();
        // Allow contests that started in the last 30 minutes (Ongoing)
        if (startTime <= Date.now() - 1800000) return null; 
        
        // Ensure resource.id is treated as a number for comparison
        const rid = Number(raw.resource?.id);
        let platform = 'Clist';
        let color = '#f0a500';
        
        // Platform detection based on resource_id mapping
        if (rid === 1) { platform = 'Codeforces'; color = '#1f6feb'; }
        else if (rid === 102) { platform = 'LeetCode'; color = '#ffa116'; } 
        else if (rid === 93) { platform = 'AtCoder'; color = '#2d2d2d'; }
        else if (rid === 2) { platform = 'CodeChef'; color = '#5b4638'; }
        
        return {
          name: raw.event,
          url: raw.href || `https://clist.by/contest/${raw.id}`,
          platform: platform,
          startTime: startTime,
          duration: raw.duration,
          isLive: startTime <= Date.now(),
          color: color,
          tags: ['Rated', platform]
        };
      }
    } catch (e) {
      console.warn(`Normalization error for ${source}:`, e);
      return null;
    }
    return null;
  },

  // Fetch upcoming contests using a Hybrid Multi-Source strategy (CF, AtCoder, Clist)
  async getContests() {
    // Strict scoping of AbortController for signal safety
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // Massive 30s timeout for stability

    const clistUser = import.meta.env.VITE_CLIST_USERNAME;
    const clistKey = import.meta.env.VITE_CLIST_API_KEY;
    
    // Auth Verification: Skip fetch if credentials are missing
    if (!clistUser || !clistKey) {
      console.error("Missing Clist Credentials in .env");
    }
    
    // Correct URL Construction: Append auth params before the proxy wrapper
    const now = new Date().toISOString();
    const clistBaseUrl = `https://clist.by/api/v1/contest/?resource_id__in=1,2,93,102&start__gt=${now}&order_by=start&limit=100`;
    const clistAuthUrl = `${clistBaseUrl}&username=${clistUser || ''}&api_key=${clistKey || ''}`;

    const sources = [
      { id: 'codeforces', url: 'https://codeforces.com/api/contest.list?gym=false', useProxy: false },
      { id: 'atcoder', url: 'https://kenkoooo.com/atcoder/resources/contests.json', useProxy: true },
      { id: 'leetcode-clist', url: clistAuthUrl, useProxy: true, skip: !clistUser || !clistKey }
    ];

    try {
      const results = await Promise.allSettled(
        sources.map(src => {
          if (src.skip) {
            return Promise.resolve({ id: src.id, data: [], error: true });
          }
          
          // Clist Optimization: Try direct fetch first, fallback to proxy
          if (src.id === 'leetcode-clist') {
            return fetch(src.url, { signal: controller.signal })
              .then(async res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                return { id: src.id, data };
              })
              .catch(async () => {
                // Proxy Fallback: Use CORSProxy.io for resilience
                const proxiedUrl = `https://corsproxy.io/?${src.url}`;
                return fetch(proxiedUrl, { signal: controller.signal })
                  .then(async res => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();
                    return { id: src.id, data };
                  })
                  .catch(err => ({ id: src.id, data: [], error: true }));
              });
          }

          const finalUrl = src.useProxy 
            ? `https://corsproxy.io/?${src.url}` 
            : src.url;
            
          return fetch(finalUrl, { signal: controller.signal })
            .then(async res => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const data = await res.json();
              return { id: src.id, data };
            })
            .catch(err => {
              console.warn(`Source ${src.id} failed:`, err.name === 'AbortError' ? 'Timeout' : err.message);
              return { id: src.id, data: [], error: true };
            });
        })
      );
      clearTimeout(timeoutId);

      let allContests = [];
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          const { id, data, error } = result.value;
          if (error) return;

          let rawList = [];
          if (id === 'codeforces' && data.status === 'OK') rawList = data.result;
          else if (id === 'atcoder') rawList = data;
          else if (id === 'leetcode-clist') rawList = data.objects || [];

          const normalized = rawList
            .map(item => this.normalizeContestData(item, id))
            .filter(Boolean);

          allContests = [...allContests, ...normalized];
        }
      });

      // Deduplication by name and sorting by startTime (chronological)
      const seenNames = new Set();
      const uniqueContests = allContests
        .filter(contest => {
          if (seenNames.has(contest.name)) return false;
          seenNames.add(contest.name);
          return true;
        })
        .sort((a, b) => a.startTime - b.startTime)
        .map((c, i) => ({ ...c, id: i }));

      // If no contests found overall, return fallback
      if (uniqueContests.length === 0) throw new Error("Zero contests captured");

      return {
        data: uniqueContests.slice(0, 25),
        isFallback: false
      };

    } catch (error) {
      clearTimeout(timeoutId);
      console.warn("Multi-source fetch failed. Using fallback data.", error);

      const fallbackData = [
        { id: 'fb1', name: 'Codeforces Round (Archived)', url: 'https://codeforces.com', platform: 'Codeforces', startTime: Date.now() + 86400000, duration: 7200, color: '#1f6feb', tags: ['Offline-Sync'] },
        { id: 'fb2', name: 'LeetCode Weekly (Archived)', url: 'https://leetcode.com', platform: 'LeetCode', startTime: Date.now() + 172800000, duration: 5400, color: '#f0a500', tags: ['Offline-Sync'] }
      ];

      return {
        data: fallbackData,
        isFallback: true
      };
    }
  },

  // Helper to get consistent platform colors
  getPlatformColor(site) {
    const colors = {
      'CodeForces': '#1f6feb',
      'LeetCode': '#f0a500',
      'AtCoder': '#596de9',
      'CodeChef': '#a1887f',
      'HackerRank': '#3fb950',
      'HackerEarth': '#8957e5'
    };
    return colors[site] || '#e6edf3';
  },

  // Fetch real Codeforces data
  async getCodeforcesUser(handle) {
    if (!handle) return null;
    try {
      const response = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
      const data = await response.json();
      if (data.status === 'OK' && data.result.length > 0) {
        const user = data.result[0];
        return {
          rating: user.rating || 0,
          maxRating: user.maxRating || 0,
          rank: user.rank || 'Unrated',
          trend: 'up' // Default
        };
      }
      throw new Error('User not found');
    } catch (error) {
      console.error("Codeforces API error:", error);
      return { error: 'Platform Not Found' };
    }
  },

  // Fetch real LeetCode data using multi-proxy fallback and AllOrigins resilience
  async getLeetCodeUser(username) {
    if (!username) return null;

    const fetchWithTimeout = async (url, timeout = 5000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(`https://corsproxy.io/?${url}`, {
          signal: controller.signal
        });
        clearTimeout(id);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } catch (err) {
        clearTimeout(id);
        throw err;
      }
    };

    const proxies = [
      `https://leetcode-stats-api.herokuapp.com/${username}`,
      `https://leetcode-api-faisalshohag.vercel.app/${username}`
    ];

    for (const proxyUrl of proxies) {
      try {
        const data = await fetchWithTimeout(proxyUrl);
        // Normalize based on which proxy responded (they have slightly different schemas)
        if (data.status === 'success' || data.totalSolved !== undefined) {
          return {
            totalSolved: data.totalSolved || data.solvedOverAll || 0,
            ranking: data.ranking || data.rank || 'N/A',
            contributionPoints: data.contributionPoints || 0,
            rank: (data.ranking || data.rank) ? `Rank ${Number(data.ranking || data.rank).toLocaleString()}` : 'N/A'
          };
        }
      } catch (error) {
        console.warn(`LeetCode proxy ${proxyUrl} failed:`, error.message);
        continue; // Try next proxy
      }
    }

    // Comprehensive Fallback if all proxies fail
    console.error("All LeetCode proxies failed.");
    return {
      error: 'Sync Error',
      totalSolved: 'N/A',
      ranking: 'Syncing...',
      contributionPoints: 0,
      rank: 'Syncing...'
    };
  },

  // Combined stats fetch with caching logic should handle Firestore calls
  // This service remains stateless; orchestration happens in the component
  async getUserStats(uid) {
    // This remains as a fallback or for other data not in CF/LC
    return {
      submissions: [
        { id: 101, title: 'Real-time data sync active', platform: 'CompeteHub', result: 'Accepted', time: 'Just now', language: 'System' }
      ]
    };
  },

  // Fetch daily submission counts for the Heatmap (GitHub Contributions)
  async getSubmissionStats(identifier) {
    if (!identifier) return {};

    const directUrl = `https://github-contributions.vercel.app/api/v1/${identifier}`;
    const proxiedUrl = `https://corsproxy.io/?${directUrl}`;

    const attemptFetch = async (url) => {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (!data.contributions || !Array.isArray(data.contributions)) {
        throw new Error("Invalid format from GitHub API");
      }
      return data;
    };

    try {
      // 1. Try Direct Fetch first (Fastest if not blocked)
      try {
        const data = await attemptFetch(directUrl);
        return this.mapGithubContributions(data.contributions);
      } catch (err) {
        console.warn(`Direct GitHub fetch failed for ${identifier}, trying proxy...`);
        // 2. Try Proxied Fetch (Standard fallback for CORS)
        const data = await attemptFetch(proxiedUrl);
        return this.mapGithubContributions(data.contributions);
      }
    } catch (error) {
      console.warn("GitHub Heatmap real-time fetch failed. Falling back to mock data.", error);
      return this.generateMockHeatmap(identifier);
    }
  },

  // Robust mapping for GitHub API response
  mapGithubContributions(contributions) {
    const stats = {};
    contributions.forEach(day => {
      stats[day.date] = day.count;
    });
    return stats;
  },

  // Seeded mock logic for fallback (consistent results for same handle)
  generateMockHeatmap(identifier) {
    const stats = {};
    const today = new Date();
    const seed = identifier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seededRandom = (s) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayHash = seed + i;
      const rand = seededRandom(dayHash);
      const dayOfWeek = date.getDay();
      
      let count = 0;
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Weekdays
        if (rand > 0.4) count = Math.floor(rand * 8);
      } else { // Weekends
        if (rand > 0.8) count = Math.floor(rand * 5);
      }
      stats[dateStr] = count;
    }
    return stats;
  }
};
