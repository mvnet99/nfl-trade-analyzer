// Enhanced player valuation system considering YTD performance and projections

const POSITION_TIERS = {
QB: { elite: 300, high: 250, mid: 200, low: 150, bench: 100 },
RB: { elite: 250, high: 200, mid: 150, low: 100, bench: 50 },
WR: { elite: 250, high: 200, mid: 150, low: 100, bench: 50 },
TE: { elite: 200, high: 150, mid: 100, low: 75, bench: 40 },
DEF: { elite: 150, high: 120, mid: 90, low: 60, bench: 30 },
K: { elite: 130, high: 110, mid: 90, low: 70, bench: 40 },
}

// Weeks remaining in season (adjust based on current week)
const WEEKS_REMAINING = 14
const WEEKS_PLAYED = 4

/**

- Calculate comprehensive player value
- @param {Object} player - Player object with stats
- @param {string} scoringType - “Standard”, “Half-PPR”, or “PPR”
- @returns {number} Player value score
*/
export function calculatePlayerValue(player, scoringType = ‘PPR’) {
if (!player) return 0

const ytdPoints = player.ytdPoints || 0
const projectedPoints = player.projectedPoints || 0
const position = player.position

// Calculate points per game so far
const ppgActual = WEEKS_PLAYED > 0 ? ytdPoints / WEEKS_PLAYED : 0

// Calculate projected points per game for rest of season
const ppgProjected = WEEKS_REMAINING > 0 ? projectedPoints / WEEKS_REMAINING : 0

// Weight actual performance more heavily (60% actual, 40% projected)
const weightedPPG = (ppgActual * 0.6) + (ppgProjected * 0.4)

// Calculate total projected value for rest of season
const totalProjectedValue = (ytdPoints) + (ppgProjected * WEEKS_REMAINING)

// Position scarcity multiplier
const scarcityMultiplier = getPositionScarcity(position, weightedPPG)

// Injury adjustment
const injuryMultiplier = getInjuryMultiplier(player.injuryStatus)

// Final value calculation
const baseValue = totalProjectedValue * scarcityMultiplier * injuryMultiplier

return Math.round(baseValue * 10) / 10
}

/**

- Get position scarcity multiplier
*/
function getPositionScarcity(position, ppg) {
const tiers = POSITION_TIERS[position] || POSITION_TIERS.WR

if (ppg >= tiers.elite / WEEKS_REMAINING) return 1.3
if (ppg >= tiers.high / WEEKS_REMAINING) return 1.15
if (ppg >= tiers.mid / WEEKS_REMAINING) return 1.0
if (ppg >= tiers.low / WEEKS_REMAINING) return 0.85
return 0.7
}

/**

- Injury status multiplier
*/
function getInjuryMultiplier(status) {
if (!status || status === ‘Healthy’) return 1.0
if (status === ‘Questionable’) return 0.9
if (status === ‘Doubtful’) return 0.6
if (status === ‘Out’) return 0.3
if (status === ‘IR’) return 0.1
return 1.0
}

/**

- Compare two players and return value difference
- @returns {Object} Comparison result
*/
export function comparePlayerValues(player1, player2, scoringType = ‘PPR’) {
const value1 = calculatePlayerValue(player1, scoringType)
const value2 = calculatePlayerValue(player2, scoringType)

const difference = value2 - value1
const percentDiff = value1 > 0 ? (difference / value1) * 100 : 0

return {
player1Value: value1,
player2Value: value2,
difference: Math.round(difference * 10) / 10,
percentDifference: Math.round(percentDiff * 10) / 10,
isUpgrade: difference > 0,
isFair: Math.abs(percentDiff) <= 10, // Within 10% is considered fair
}
}

/**

- Get value tier for a player
*/
export function getPlayerTier(player, scoringType = ‘PPR’) {
const value = calculatePlayerValue(player, scoringType)
const position = player.position
const tiers = POSITION_TIERS[position] || POSITION_TIERS.WR

if (value >= tiers.elite) return ‘Elite’
if (value >= tiers.high) return ‘High-End’
if (value >= tiers.mid) return ‘Mid-Tier’
if (value >= tiers.low) return ‘Low-End’
return ‘Bench/Waiver’
}

/**

- Calculate positional advantage
*/
export function calculatePositionalAdvantage(player, allPlayers, scoringType = ‘PPR’) {
const playerValue = calculatePlayerValue(player, scoringType)
const samePositionPlayers = allPlayers.filter(p => p.position === player.position)

const rankedValues = samePositionPlayers
.map(p => calculatePlayerValue(p, scoringType))
.sort((a, b) => b - a)

const playerRank = rankedValues.findIndex(v => v <= playerValue) + 1
const totalPlayers = rankedValues.length

return {
rank: playerRank,
total: totalPlayers,
percentile: Math.round((1 - playerRank / totalPlayers) * 100),
}
}

/**

- Adjust value based on team needs
*/
export function adjustValueForTeamNeeds(player, teamRoster, scoringType = ‘PPR’) {
const position = player.position
const positionPlayers = teamRoster.filter(p => p.position === position)

// If team is weak at this position, increase value
if (positionPlayers.length < 2) {
return calculatePlayerValue(player, scoringType) * 1.2
}

// If team is deep at this position, decrease value
if (positionPlayers.length > 4) {
return calculatePlayerValue(player, scoringType) * 0.8
}

return calculatePlayerValue(player, scoringType)
}

/**

- Calculate strength of schedule impact
- @param {Array} upcomingOpponents - Array of opponent defenses
*/
export function calculateScheduleImpact(upcomingOpponents = []) {
if (upcomingOpponents.length === 0) return 1.0

// Average opponent difficulty (0.5 = average, higher = harder)
const avgDifficulty = upcomingOpponents.reduce((sum, opp) => sum + (opp.difficulty || 0.5), 0) / upcomingOpponents.length

// Convert to multiplier (easier schedule = higher multiplier)
return 1.0 + (0.5 - avgDifficulty) * 0.3
}
