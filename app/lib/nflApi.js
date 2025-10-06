import axios from ‘axios’

const ESPN_API_BASE = ‘https://site.api.espn.com/apis/site/v2/sports/football/nfl’
const CURRENT_YEAR = 2025

// Cache for API responses to reduce calls
const cache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

async function getCachedData(key, fetchFunction) {
const cached = cache.get(key)
if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
return cached.data
}

const data = await fetchFunction()
cache.set(key, { data, timestamp: Date.now() })
return data
}

export async function fetchNFLPlayers() {
return getCachedData(‘nfl-players’, async () => {
try {
// Fetch from multiple endpoints for comprehensive data
const [scoresResponse, standingsResponse] = await Promise.all([
axios.get(`${ESPN_API_BASE}/scoreboard`),
axios.get(`${ESPN_API_BASE}/standings`)
])

```
// Get team schedules to determine bye weeks and upcoming matchups
const teams = standingsResponse.data.children || []
const teamSchedules = await Promise.all(
teams.slice(0, 32).map(async (team) => {
try {
const teamId = team.uid?.split(':')[2] || team.id
const scheduleRes = await axios.get(
`${ESPN_API_BASE}/teams/${teamId}/schedule`
)
return scheduleRes.data
} catch (e) {
return null
}
})
)

// Process and return player data
return {
lastUpdated: new Date().toISOString(),
teams: teamSchedules.filter(Boolean),
}
} catch (error) {
console.error('Error fetching NFL data:', error)
return { lastUpdated: new Date().toISOString(), teams: [] }
}
```

})
}

export async function fetchPlayerStats(scoringType = ‘PPR’) {
return getCachedData(`player-stats-${scoringType}`, async () => {
try {
// Fetch current season stats
const response = await axios.get(
`${ESPN_API_BASE}/scoreboard`
)

```
const currentWeek = response.data.week?.number || 1

// This is a simplified version - in production, you'd integrate with
// ESPN Fantasy API or another stats provider
return {
currentWeek,
lastUpdated: new Date().toISOString(),
scoringType,
}
} catch (error) {
console.error('Error fetching player stats:', error)
return {
currentWeek: 1,
lastUpdated: new Date().toISOString(),
scoringType,
}
}
```

})
}

export async function getPlayerProjections(playerId, position) {
return getCachedData(`projections-${playerId}`, async () => {
try {
// In production, integrate with projection APIs
// For now, return mock projection data structure
return {
playerId,
position,
remainingGames: 12,
projectedPointsPerGame: 15.0,
totalProjected: 180.0,
strengthOfSchedule: 0.5, // 0-1 scale
upcomingMatchups: [],
}
} catch (error) {
console.error(‘Error fetching projections:’, error)
return null
}
})
}

export async function getInjuryReport() {
return getCachedData(‘injury-report’, async () => {
try {
// Fetch injury data from ESPN
const response = await axios.get(
`${ESPN_API_BASE}/news?limit=100`
)

```
const injuries = []
const news = response.data.articles || []

news.forEach(article => {
if (article.headline?.toLowerCase().includes('injury') ||
article.headline?.toLowerCase().includes('injured')) {
injuries.push({
headline: article.headline,
description: article.description,
published: article.published,
})
}
})

return injuries
} catch (error) {
console.error('Error fetching injury report:', error)
return []
}
```

})
}

export async function getByeWeeks() {
return getCachedData(‘bye-weeks’, async () => {
// NFL bye weeks for 2025 season (example data - update with actual schedule)
return {
5: [‘DET’, ‘LAC’, ‘PHI’, ‘TEN’],
6: [‘KC’, ‘LAR’, ‘MIA’, ‘MIN’],
7: [‘CHI’, ‘DAL’],
9: [‘CLE’, ‘GB’, ‘LV’, ‘PIT’, ‘SF’, ‘SEA’],
10: [‘ATL’, ‘DEN’, ‘HOU’, ‘IND’, ‘NE’, ‘NYJ’],
11: [‘ARI’, ‘CAR’, ‘NYG’, ‘TB’],
12: [‘BAL’, ‘BUF’, ‘CIN’, ‘JAX’, ‘NO’, ‘WAS’],
14: [‘LA’, ‘TB’],
}
})
}

// Helper to get ESPN player search
export async function searchPlayer(playerName) {
try {
const response = await axios.get(
`${ESPN_API_BASE}/athletes?query=${encodeURIComponent(playerName)}&limit=20`
)

```
return response.data.athletes || []
```

} catch (error) {
console.error(‘Error searching player:’, error)
return []
}
}

// Clear cache function (useful for forced refresh)
export function clearCache() {
cache.clear()
}
