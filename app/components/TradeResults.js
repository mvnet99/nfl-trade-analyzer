'use client'

export default function TradeResults({ trades, givingPlayer, loading }) {
if (loading) {
return (
<div className="bg-white rounded-lg shadow-md p-8">
<div className="flex flex-col items-center justify-center space-y-4">
<div className="spinner"></div>
<p className="text-gray-600">Analyzing trades…</p>
</div>
</div>
)
}

if (!trades || trades.length === 0) {
return (
<div className="bg-white rounded-lg shadow-md p-8">
<p className="text-gray-500 text-center">
No trade suggestions available. Try selecting a player and position.
</p>
</div>
)
}

const getScoreColor = (score) => {
if (score >= 80) return ‘text-green-600 bg-green-50’
if (score >= 65) return ‘text-blue-600 bg-blue-50’
if (score >= 50) return ‘text-yellow-600 bg-yellow-50’
return ‘text-red-600 bg-red-50’
}

const getGradeColor = (grade) => {
if (grade === ‘A’) return ‘bg-green-500’
if (grade === ‘B’) return ‘bg-blue-500’
if (grade === ‘C’) return ‘bg-yellow-500’
if (grade === ‘D’) return ‘bg-orange-500’
return ‘bg-red-500’
}

return (
<div className="space-y-4">
<div className="bg-white rounded-lg shadow-md p-6">
<h2 className="text-2xl font-bold text-gray-900 mb-2">
Top 20 Trade Suggestions
</h2>
<p className="text-gray-600 mb-4">
Trading away: <span className="font-semibold">{givingPlayer?.playerName}</span>
</p>
<div className="text-sm text-gray-500">
Found {trades.length} potential trades
</div>
</div>

```
<div className="space-y-3">
{trades.map((trade, index) => {
const { targetPlayer, analysis, targetTeam, targetOwner } = trade
const valueChange = analysis.valueComparison.difference

return (
<div
key={index}
className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 card-hover"
>
<div className="flex items-start justify-between mb-4">
<div className="flex-1">
<div className="flex items-center space-x-3 mb-2">
<span className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${getGradeColor(trade.scoreGrade)}`}>
{trade.scoreGrade}
</span>
<div>
<h3 className="text-lg font-semibold text-gray-900">
{targetPlayer.playerName}
</h3>
<p className="text-sm text-gray-600">
{targetPlayer.position} - {targetPlayer.nflTeam}
</p>
</div>
</div>
<p className="text-sm text-gray-600 mb-1">
From: <span className="font-medium">{targetTeam}</span>
{targetOwner && <span className="text-gray-500"> ({targetOwner})</span>}
</p>
</div>

<div className="text-right">
<div className={`text-2xl font-bold px-4 py-2 rounded-lg ${getScoreColor(analysis.tradeScore)}`}>
{analysis.tradeScore}
</div>
<div className="text-xs text-gray-500 mt-1">
Trade Score
</div>
</div>
</div>

<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
<div>
<div className="text-xs text-gray-600 mb-1">YTD Points</div>
<div className="font-semibold text-gray-900">
{targetPlayer.ytdPoints.toFixed(1)}
</div>
</div>
<div>
<div className="text-xs text-gray-600 mb-1">Projected</div>
<div className="font-semibold text-gray-900">
{targetPlayer.projectedPoints.toFixed(1)}
</div>
</div>
<div>
<div className="text-xs text-gray-600 mb-1">Value Change</div>
<div className={`font-semibold ${valueChange > 0 ? 'text-green-600' : valueChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
{valueChange > 0 ? '+' : ''}{valueChange.toFixed(1)}
{valueChange !== 0 && (
<span className="text-xs ml-1">
({analysis.valueComparison.percentDifference > 0 ? '+' : ''}
{analysis.valueComparison.percentDifference.toFixed(1)}%)
</span>
)}
</div>
</div>
<div>
<div className="text-xs text-gray-600 mb-1">Status</div>
<div className={`font-semibold ${
targetPlayer.injuryStatus === 'Healthy' || !targetPlayer.injuryStatus
? 'text-green-600'
: 'text-red-600'
}`}>
{targetPlayer.injuryStatus || 'Healthy'}
</div>
</div>
</div>

<div className="mb-3">
<div className="text-sm font-semibold text-gray-700 mb-2">
📊 {analysis.recommendation}
</div>
<div className="space-y-1">
{analysis.reasoning.map((reason, i) => (
<div key={i} className="text-sm text-gray-600 flex items-start">
<span className="text-primary-500 mr-2">•</span>
<span>{reason}</span>
</div>
))}
</div>
</div>

<div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
{targetPlayer.byeWeek && (
<span className="badge badge-gray">
Bye Week {targetPlayer.byeWeek}
</span>
)}
<span className={`badge position-${targetPlayer.position}`}>
{targetPlayer.position}
</span>
{analysis.valueComparison.isUpgrade && (
<span className="badge badge-green">
↑ Upgrade
</span>
)}
{analysis.valueComparison.isFair && (
<span className="badge badge-blue">
Fair Value
</span>
)}
</div>
</div>
)
})}
</div>
</div>
```

)
}
