export const apiService = {
  async getPlatforms() {
    return [
      { id: 1, resourceId: 1, name: 'Codeforces', url: 'https://codeforces.com', desc: 'The most popular competitive programming platform with regular contests and a strong rating system.', tags: ['Competitive', 'Olympiad'], problems: '9,450', users: '1.2M', color: 'var(--color-platform-cf)', bg: 'rgba(31,111,235,0.15)' },
      { id: 2, resourceId: 102, name: 'LeetCode', url: 'https://leetcode.com', desc: 'The best platform to help you enhance your skills, expand your knowledge and prepare for technical interviews.', tags: ['Interview Prep'], problems: '3,120', users: '4.5M', color: 'var(--color-platform-lc)', bg: 'rgba(255,161,22,0.15)' },
      { id: 3, resourceId: 93, name: 'AtCoder', url: 'https://atcoder.jp', desc: 'Japanese contest platform known for high-quality mathematical and algorithmic problems.', tags: ['Competitive', 'Olympiad'], problems: '4,200', users: '350K', color: 'var(--color-platform-at)', bg: 'rgba(89,109,233,0.15)' },
      { id: 4, resourceId: 2, name: 'CodeChef', url: 'https://codechef.com', desc: 'Global programming community hosting long contests, cook-offs, and lunchtime competitions.', tags: ['Competitive', 'Beginner-friendly'], problems: '12,500', users: '2.1M', color: 'var(--color-platform-cc)', bg: 'rgba(93,64,55,0.3)' },
      { id: 5, resourceId: 63, name: 'HackerRank', url: 'https://hackerrank.com', desc: 'Practice coding, prepare for interviews, and get hired. Domain-specific tracks available.', tags: ['Interview Prep', 'Beginner-friendly'], problems: '2,800', users: '7.8M', color: 'var(--color-platform-hr)', bg: 'rgba(63,185,80,0.15)' },
    ];
  },

  getPlatformColor(site) {
    const colors = {
      Codeforces: 'var(--color-platform-cf)',
      LeetCode: 'var(--color-platform-lc)',
      AtCoder: 'var(--color-platform-at)',
      CodeChef: 'var(--color-platform-cc)',
      HackerRank: 'var(--color-platform-hr)',
      HackerEarth: 'var(--color-platform-he)',
    };
    return colors[site] || '#e6edf3';
  },

  /**
   *
   * @param {string} handle     
   * @param {number} resourceId  
   * @returns {{ rating: number, n_solved: number, rank: string }}
   */
  async getClistUserStats(handle, resourceId) {
    const DEFAULT = { rating: 0, n_solved: 0, rank: 'N/A' };
    if (!handle) return DEFAULT;

    const clistUser = import.meta.env.VITE_CLIST_USERNAME;
    const clistKey = import.meta.env.VITE_CLIST_API_KEY;
    if (!clistUser || !clistKey) {
      console.warn('getClistUserStats: Missing VITE_CLIST_USERNAME or VITE_CLIST_API_KEY');
      return DEFAULT;
    }

    const endpoint = [
      'https://clist.by/api/v1/account/',
      `?handle=${encodeURIComponent(handle)}`,
      `&resource_id=${resourceId}`,
      `&username=${clistUser}`,
      `&api_key=${clistKey}`,
    ].join('');

    console.log(`[ApiService] 📡 GET: https://clist.by/api/v1/account/?handle=${handle}&resource_id=${resourceId}`);

    const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(endpoint)}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const resp = await fetch(proxiedUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (resp.status === 404) {
        console.warn(`[ApiService] 🔍 Handle not found on platform: ${handle}`);
        return { rating: 0, n_solved: 0, rank: 'Not Found', platformStatus: 'offline' };
      }

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();
      const account = data?.objects?.[0];
      if (!account) {
        console.warn(`[ApiService] ⚠️ Account object missing for: ${handle}`);
        return { rating: 0, n_solved: 0, rank: 'Not Found', platformStatus: 'offline' };
      }

      return {
        rating: account.resource_rank ?? account.rating ?? 0,
        n_solved: account.n_contests ?? account.n_solved ?? 0,
        rank: account.rank || 'N/A',
      };
    } catch (err) {
      console.warn(`getClistUserStats failed for "${handle}" (resource ${resourceId}):`, err.message);
      return DEFAULT;
    }
  },

  _normalizeContest(raw) {
    try {
      const startTime = new Date(raw.start).getTime();
      if (startTime <= Date.now() - 1_800_000) return null;

      const rid = Number(raw.resource?.id);
      const PLATFORM_MAP = {
        1: { name: 'Codeforces', color: '#1f6feb' },
        2: { name: 'CodeChef', color: '#a1887f' },
        93: { name: 'AtCoder', color: '#596de9' },
        102: { name: 'LeetCode', color: '#ffa116' },
      };
      const { name: platform = 'Clist', color = '#e6edf3' } = PLATFORM_MAP[rid] ?? {};

      return {
        name: raw.event,
        url: raw.href || `https://clist.by/contest/${raw.id}`,
        platform,
        startTime,
        duration: raw.duration,
        isLive: startTime <= Date.now(),
        color,
        tags: ['Rated', platform],
      };
    } catch {
      return null;
    }
  },

  async getContests() {
    const clistUser = import.meta.env.VITE_CLIST_USERNAME;
    const clistKey = import.meta.env.VITE_CLIST_API_KEY;

    const CACHE_KEY = 'competehub_contests';
    const CACHE_TIME_KEY = 'competehub_contests_last_fetch';
    const cached = sessionStorage.getItem(CACHE_KEY);
    const lastFetch = sessionStorage.getItem(CACHE_TIME_KEY);
    const TEN_MINUTES = 10 * 60 * 1000;

    if (cached && lastFetch && (Date.now() - lastFetch < TEN_MINUTES)) {
      console.log('[ApiService] ⚡ Using cached contest data');
      return { data: JSON.parse(cached), isFallback: false };
    }

    if (!clistUser || !clistKey) {
      console.error('getContests: Missing Clist credentials');
      return { data: [], isFallback: true };
    }

    const now = new Date().toISOString();
    const endpoint = `https://clist.by/api/v1/contest/?resource_id__in=1,2,93,102&start__gt=${now}&order_by=start&limit=100&username=${clistUser}&api_key=${clistKey}`;

    const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(endpoint)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s is plenty

    try {
      const resp = await fetch(proxiedUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (resp.status === 429) {
        console.warn('[ApiService] ⚠️ Rate limited by Clist. Falling back to cache/offline.');
        if (cached) return { data: JSON.parse(cached), isFallback: true };
        throw new Error("Rate limit exceeded");
      }

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();
      const rawList = data.objects || [];

      const contests = rawList
        .map(item => this._normalizeContest(item))
        .filter(Boolean)
        .sort((a, b) => a.startTime - b.startTime)
        .map((c, i) => ({ ...c, id: `clist-${i}` }));

      if (contests.length === 0) throw new Error('No contests found');

      // 2. Save to Session Storage
      const finalData = contests.slice(0, 25);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(finalData));
      sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString());

      return { data: finalData, isFallback: false };

    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('[ApiService] Fetch failed:', err.message);

      return {
        isFallback: true,
        data: cached ? JSON.parse(cached) : [
          { id: 'fb1', name: 'Codeforces (Offline Fallback)', url: 'https://codeforces.com', platform: 'Codeforces', startTime: Date.now() + 86400000, duration: 7200, color: '#1f6feb', tags: ['Offline'] },
          { id: 'fb2', name: 'LeetCode (Offline Fallback)', url: 'https://leetcode.com', platform: 'LeetCode', startTime: Date.now() + 172800000, duration: 5400, color: '#f0a500', tags: ['Offline'] },
        ],
      };
    }
  },
  /**
   *
   * @param {string} username 
   * @returns {Record<string, number>}
   */
  async getGithubActivity(username) {
    if (!username) return {};

    const targetUrl = `https://github-contributions.vercel.app/api/v1/${username}`;
    const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    try {
      const resp = await fetch(proxiedUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();
      const contributions = Array.isArray(data.contributions) ? data.contributions : [];

      const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
      return contributions.reduce((acc, day) => {
        if (new Date(day.date).getTime() >= cutoff) {
          acc[day.date] = day.count;
        }
        return acc;
      }, {});
    } catch (err) {
      console.warn('getGithubActivity: fetch failed, returning empty activity.', err.message);
      return {};
    }
  },
};
