// api/pulse.js — BL.co PULSE data endpoint
// Real sources only: GitHub public API + Vercel deployments API
// 5-minute server-side cache via Cache-Control

const GITHUB_USER = 'BLAMEDXD';
const VERCEL_PROJECT_ID = 'prj_nEFJKtp9yQHOgW4APtFGhH8e63O1';

// Manual config — update as BL.co grows
const MANUAL = {
  activeProjects: 3,
  journalEntries: 7,
  labsExperiments: 4
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const ghHeaders = {
    'User-Agent': 'BL.co-pulse/1.0',
    'Accept': 'application/vnd.github.v3+json'
  };

  const [ghUser, ghEvents, vercelDeploys] = await Promise.allSettled([
    fetch(`https://api.github.com/users/${GITHUB_USER}`, { headers: ghHeaders })
      .then(r => r.ok ? r.json() : null),
    fetch(`https://api.github.com/users/${GITHUB_USER}/events?per_page=100`, { headers: ghHeaders })
      .then(r => r.ok ? r.json() : []),
    process.env.VERCEL_TOKEN
      ? fetch(
          `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&limit=100&target=production`,
          { headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` } }
        ).then(r => r.ok ? r.json() : null)
      : Promise.resolve(null)
  ]);

  const events = (ghEvents.status === 'fulfilled' && Array.isArray(ghEvents.value)) ? ghEvents.value : [];
  const pushEvents = events.filter(e => e.type === 'PushEvent');
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  const weeklyBars = Array(12).fill(0);
  let commits30d = 0;
  pushEvents.forEach(ev => {
    const age = now - new Date(ev.created_at).getTime();
    const commits = ev.payload?.commits?.length || 1;
    const wk = Math.floor(age / weekMs);
    if (wk >= 0 && wk < 12) weeklyBars[11 - wk] += commits;
    if (age < 30 * 24 * 60 * 60 * 1000) commits30d += commits;
  });

  const user = ghUser.status === 'fulfilled' ? ghUser.value : {};

  let deploymentCount = null;
  let latestDeployedAt = null;
  const vd = vercelDeploys.status === 'fulfilled' ? vercelDeploys.value : null;
  if (vd?.deployments?.length) {
    deploymentCount = vd.deployments.length;
    latestDeployedAt = vd.deployments[0]?.createdAt ?? null;
  }

  return res.status(200).json({
    github: { repos: user.public_repos ?? null, commits30d, weeklyActivity: weeklyBars },
    vercel: { deployments: deploymentCount, latestAt: latestDeployedAt },
    config: MANUAL,
    fetchedAt: new Date().toISOString()
  });
}
