const TAG = '[ActivityService]';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 *
 * @param {string}  url
 * @param {number}  [timeoutMs=5000]
 * @param {string}  [label='']        
 * @returns {Promise<any|null>}
 */
async function fetchWithTimeout(url, timeoutMs = 8000, label = '') {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timerId);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (err) {
    clearTimeout(timerId);
    console.info(`${TAG} ℹ️ ${label} calendar skipped (Source Offline)`);
    return null;
  }
}

/**
 *
 * @param {Record<string, number>[]} calendars
 * @param {string[]} [sourceNames=[]]
 * @returns {Record<string, number>}
 */
function mergeCalendars(calendars, sourceNames = []) {
  return calendars.reduce((acc, cal, idx) => {
    const source = sourceNames[idx] || `Source #${idx + 1}`;

    if (!cal || typeof cal !== 'object') return acc;

    Object.entries(cal).forEach(([date, val]) => {
      const numValue = Number(val);

      if (isNaN(numValue)) {
        console.error(`${TAG} 🚨 Invalid count detected for date ${date} on ${source}.`);
        return;
      }

      if (numValue > 0) {
        acc[date] = (acc[date] || 0) + numValue;
      }
    });

    return acc;
  }, {});
}

async function fetchGitHubCalendar(username) {
  if (!username) return {};

  const targetUrl = `https://github-contributions.vercel.app/api/v1/${username}`;
  const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
  const data = await fetchWithTimeout(proxiedUrl, 8000, 'GitHub');

  if (!data) {
    console.info(`${TAG} ℹ️ GitHub data unavailable for "${username}" — heatmap will be partial.`);
    return {};
  }

  const contributions = Array.isArray(data.contributions) ? data.contributions : [];
  const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;

  return contributions.reduce((acc, day) => {
    if (day?.date && new Date(day.date).getTime() >= cutoff) {
      acc[day.date] = Number(day.count) || 0;
    }
    return acc;
  }, {});
}

async function fetchLeetCodeCalendar(username) {
  if (!username) return {};

  const url = `https://leetcode-stats-api.herokuapp.com/${username}`;
  const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  const data = await fetchWithTimeout(proxiedUrl, 8000, 'LeetCode');

  if (!data?.submissionCalendar) {
    console.info(`${TAG} ℹ️ LeetCode calendar unavailable for "${username}".`);
    return {};
  }

  try {
    const calendar = typeof data.submissionCalendar === 'string'
      ? JSON.parse(data.submissionCalendar)
      : data.submissionCalendar;

    const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const result = {};

    for (const [ts, count] of Object.entries(calendar)) {
      const ms = Number(ts) * 1000;
      const date = new Date(ms).toISOString().split('T')[0];
      if (ms >= cutoff) {
        result[date] = (result[date] || 0) + (Number(count) || 0);
      }
    }
    return result;
  } catch (parseErr) {
    console.groupCollapsed(`${TAG} ⚠️ LeetCode calendar parse error`);
    console.error(parseErr);
    console.groupEnd();
    return {};
  }
}

async function fetchCodeforcesCalendar(handle) {
  if (!handle) return {};

  const url = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=2000`;
  const data = await fetchWithTimeout(url, 8000, 'Codeforces');

  if (!data || data.status !== 'OK' || !Array.isArray(data.result)) {
    console.info(`${TAG} ℹ️ Codeforces submissions unavailable for "${handle}".`);
    return {};
  }

  const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const result = {};

  for (const sub of data.result) {
    const ms = (sub.creationTimeSeconds || 0) * 1000;
    if (ms < cutoff) continue;
    const date = new Date(ms).toISOString().split('T')[0];
    result[date] = (result[date] || 0) + 1;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch and merge activity calendars for a dynamic list of platforms.
 *
 * @param {{ resourceId: number|string, handle: string, name: string }[]} platforms
 * @returns {Promise<{
 *   activityData : Record<string, number>,
 *   sources      : Record<string, boolean>
 * }>}
 */
export async function getUnifiedActivity(userPlatforms = []) {
  if (!Array.isArray(userPlatforms) || userPlatforms.length === 0) {
    return { activityData: {}, sources: {} };
  }

  const fetchPromises = (userPlatforms || []).map(async (p) => {
    const rid = String(p.resourceId);
    let calendar = {};

    try {
      if (rid === 'github') {
        calendar = await fetchGitHubCalendar(p.handle);
      } else if (rid === '102') {
        calendar = await fetchLeetCodeCalendar(p.handle);
      } else if (rid === '1') {
        calendar = await fetchCodeforcesCalendar(p.handle);
      } else {
        calendar = {};
      }
    } catch (err) {
      calendar = {};
    }

    return { name: p.name || rid, calendar, handle: p.handle };
  });

  const results = await Promise.allSettled(fetchPromises);
  const calendars = [];
  const sourceNames = [];
  const sourceStatus = {};

  results.forEach((res) => {
    if (res.status === 'fulfilled') {
      const { name, calendar } = res.value;
      const dayCount = Object.keys(calendar).length;

      if (dayCount > 0) {
        calendars.push(calendar);
        sourceNames.push(name);
        sourceStatus[name] = true;
      } else {
        sourceStatus[name] = false;
      }
    }
  });

  const activityData = mergeCalendars(calendars, sourceNames);

  console.info(`${TAG} ✅ Merged activity | total days: ${Object.keys(activityData).length}`);

  return { activityData, sources: sourceStatus };
}
