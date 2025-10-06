import { calculatePlayerValue, comparePlayerValues, getPlayerTier } from ‘./playerValuation’

/**

- Main trade analyzer function
- Finds top 20 trade targets from other teams
- @param {Object} userTeam - User’s team with roster
- @param {Array} otherTeams - Array of other 11 teams
- @param {Object} tradePlayer - Player user wants to trade away
- @param {string} desiredPosition - Position user wants to receive
- @param {string} scoringType - League scoring type
- @returns {Array} Top 20 trade suggestions
*/
export function analyzeTrades(userTeam, otherTeams, tradePlayer, desiredPosition, scoringType = ‘PPR’) {
const allSuggestions = []

// Calculate value of player being traded
const tradePlayerValue = calculatePlayerValue(tradePlayer, scoringType)

otherTeams.forEach(team => {
// Find candidates from this team
const candidates = findTradeCandidates(
team,
tradePlayer,
desiredPosition,
scoringType
)

```
candidates.forEach(candidate => {
const analysis = analyzeTradeMatch(
userTeam,
team,
tradePlayer,
candidate,
scoringType
)

allSuggestions.push({
targetTeam: team.teamName,
targetTeamNumber: team.teamNumber,
targetOwner: team.ownerName,
targetPlayer: candidate,
analysis,
})
})
```

})

// Sort by trade quality score and return top 20
return allSuggestions
.sort((a, b) => b.analysis.tradeScore - a.analysis.tradeScore)
.slice(0, 20)
}

/**

- Find potential trade candidates from a team
*/
function findTradeCandidates(team, tradePlayer, desiredPosition, scoringType) {
const candidates = []

// Primary position match
const primaryMatches = team.players.filter(p =>
p.position === desiredPosition &&
p.rosterSlot !== ‘IR’
)

candidates.push(…primaryMatches)

// If desired position is not found or limited, check FLEX alternatives
if (candidates.length < 3) {
const flexPositions = getFlexAlternatives(desiredPosition)

```
flexPositions.forEach(flexPos => {
const flexMatches = team.players.filter(p =>
p.position === flexPos &&
p.rosterSlot !== 'IR' &&
!candidates.find(c => c.id === p.id)
)
candidates.push(...flexMatches)
})
```

}

return candidates
}

/**

- Get FLEX position alternatives based on desired position
*/
function getFlexAlternatives(position) {
const flexHierarchy = {
RB: [‘WR’, ‘TE’],
WR: [‘RB’, ‘TE’],
TE: [‘WR’, ‘RB’],
QB: [], // QBs typically don’t FLEX
DEF: [],
K: [],
}

return flexHierarchy[position] || []
}

/**

- Analyze a specific trade match
*/
function analyzeTradeMatch(userTeam, targetTeam, givingPlayer, receivingPlayer, scoringType) {
const comparison = comparePlayerValues(givingPlayer, receivingPlayer, scoringType)

// Check if target team needs the position we’re offering
const targetTeamNeeds = assessTeamNeeds(targetTeam, givingPlayer.position)

// Check if we need the position we’re receiving
const userTeamNeeds = assessTeamNeeds(userTeam, receivingPlayer.position)

// Calculate trade fairness score
const tradeScore = calculateTradeScore(
comparison,
targetTeamNeeds,
userTeamNeeds,
givingPlayer,
receivingPlayer
)

return {
tradeScore,
valueComparison: comparison,
targetTeamNeeds,
userTeamNeeds,
recommendation: getTradeRecommendation(comparison, tradeScore),
reasoning: generateTradeReasoning(
givingPlayer,
receivingPlayer,
comparison,
targetTeamNeeds,
userTeamNeeds
),
}
}

/**

- Assess team needs for a specific position
*/
function assessTeamNeeds(team, position) {
const positionPlayers = team.players.filter(p =>
p.position === position && p.rosterSlot !== ‘IR’
)

const starterCount = positionPlayers.filter(p => p.rosterSlot === ‘STARTER’).length
const benchCount = positionPlayers.filter(p => p.rosterSlot === ‘BENCH’).length

const needLevel = {
starters: starterCount,
bench: benchCount,
total: positionPlayers.length,
needScore: 0,
}

// Calculate need score (higher = more need)
if (starterCount === 0) needLevel.needScore = 100
else if (starterCount === 1 && benchCount === 0) needLevel.needScore = 80
else if (starterCount === 1) needLevel.needScore = 60
else if (starterCount === 2 && benchCount === 0) needLevel.needScore = 40
else if (starterCount === 2) needLevel.needScore = 20
else needLevel.needScore = 10

return needLevel
}

/**

- Calculate overall trade score (0-100)
*/
function calculateTradeScore(comparison, targetNeeds, userNeeds, givingPlayer, receivingPlayer) {
let score = 50 // Base score

// Value comparison component (30 points)
if (comparison.isUpgrade) {
score += Math.min(30, comparison.percentDifference * 0.5)
} else {
score -= Math.min(15, Math.abs(comparison.percentDifference) * 0.3)
}

// Team needs component (30 points)
score += (targetNeeds.needScore * 0.15) // They need what we’re offering
score += (userNeeds.needScore * 0.15) // We need what they’re offering

// Position premium (10 points)
const positionPremium = {
RB: 5,
WR: 4,
TE: 3,
QB: 2,
DEF: 1,
K: 0,
}
score += positionPremium[receivingPlayer.position] || 0

// Injury concern penalty (10 points)
if (receivingPlayer.injuryStatus && receivingPlayer.injuryStatus !== ‘Healthy’) {
score -= 10
}

// Bonus for getting equal or higher tier player (10 points)
const givingTier = getPlayerTier(givingPlayer)
const receivingTier = getPlayerTier(receivingPlayer)

const tierRanks = { ‘Elite’: 5, ‘High-End’: 4, ‘Mid-Tier’: 3, ‘Low-End’: 2, ‘Bench/Waiver’: 1 }

if (tierRanks[receivingTier] >= tierRanks[givingTier]) {
score += 10
}

return Math.max(0, Math.min(100, Math.round(score)))
}

/**

- Get trade recommendation text
*/
function getTradeRecommendation(comparison, tradeScore) {
if (tradeScore >= 80) return ‘Highly Recommended’
if (tradeScore >= 65) return ‘Recommended’
if (tradeScore >= 50) return ‘Fair Trade’
if (tradeScore >= 35) return ‘Consider Carefully’
return ‘Not Recommended’
}

/**

- Generate detailed reasoning for trade suggestion
*/
function generateTradeReasoning(givingPlayer, receivingPlayer, comparison, targetNeeds, userNeeds) {
const reasons = []

// Value analysis
if (comparison.isUpgrade && comparison.percentDifference > 15) {
reasons.push(`You'd receive a significantly better player (+${comparison.percentDifference.toFixed(1)}% value)`)
} else if (comparison.isUpgrade && comparison.percentDifference > 5) {
reasons.push(`Slight upgrade in player value (+${comparison.percentDifference.toFixed(1)}%)`)
} else if (comparison.isFair) {
reasons.push(‘Fair value exchange between players’)
} else {
reasons.push(`You'd give up more value (${Math.abs(comparison.percentDifference).toFixed(1)}% difference)`)
}

// Team needs analysis
if (targetNeeds.needScore >= 60) {
reasons.push(`Target team has high need at ${givingPlayer.position}`)
} else if (targetNeeds.needScore >= 40) {
reasons.push(`Target team has moderate need at ${givingPlayer.position}`)
}

if (userNeeds.needScore >= 60) {
reasons.push(`You have high need at ${receivingPlayer.position}`)
} else if (userNeeds.needScore >= 40) {
reasons.push(`You have moderate need at ${receivingPlayer.position}`)
}

// Player tier comparison
const givingTier = getPlayerTier(givingPlayer)
const receivingTier = getPlayerTier(receivingPlayer)

if (givingTier !== receivingTier) {
reasons.push(`Trading ${givingTier} for ${receivingTier} player`)
}

// Injury considerations
if (receivingPlayer.injuryStatus && receivingPlayer.injuryStatus !== ‘Healthy’) {
reasons.push(`⚠️ Target player is ${receivingPlayer.injuryStatus}`)
}

if (givingPlayer.injuryStatus && givingPlayer.injuryStatus !== ‘Healthy’) {
reasons.push(`Your player is currently ${givingPlayer.injuryStatus}`)
}

// Performance trends
if (receivingPlayer.ytdPoints > givingPlayer.ytdPoints) {
reasons.push(`Target player has more YTD points (${receivingPlayer.ytdPoints.toFixed(1)} vs ${givingPlayer.ytdPoints.toFixed(1)})`)
}

if (receivingPlayer.projectedPoints > givingPlayer.projectedPoints) {
reasons.push(`Better ROS projection for target player`)
}

return reasons
}

/**

- Helper to format trade suggestion for display
*/
export function formatTradeSuggestion(suggestion) {
const { targetTeam, targetPlayer, analysis } = suggestion

return {
…suggestion,
displayText: `${targetTeam}: ${targetPlayer.playerName} (${targetPlayer.position} - ${targetPlayer.nflTeam})`,
scoreGrade: getScoreGrade(analysis.tradeScore),
valueChange: analysis.valueComparison.difference > 0 ?
`+${analysis.valueComparison.difference}` :
`${analysis.valueComparison.difference}`,
}
}

function getScoreGrade(score) {
if (score >= 80) return ‘A’
if (score >= 70) return ‘B’
if (score >= 60) return ‘C’
if (score >= 50) return ‘D’
return ‘F’
}
