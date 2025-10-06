‘use client’

export default function PlayerSelector({
players,
selectedPlayer,
onSelectPlayer,
label = “Select Player to Trade”
}) {
if (!players || players.length === 0) {
return (
<div className="bg-white rounded-lg shadow-md p-6">
<p className="text-gray-500 text-center">No players available</p>
</div>
)
}

return (
<div className="bg-white rounded-lg shadow-md p-6">
<label className="block text-sm font-medium text-gray-700 mb-2">
{label}
</label>
<select
value={selectedPlayer || ‘’}
onChange={(e) => onSelectPlayer(e.target.value)}
className=“w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg”
>
<option value="">– Choose Player –</option>
{players.map((player) => (
<option key={player.id} value={player.id}>
{player.playerName} - {player.position} ({player.nflTeam}) - {player.ytdPoints.toFixed(1)} pts
{player.injuryStatus && player.injuryStatus !== ‘Healthy’ ? ` - ${player.injuryStatus}` : ‘’}
</option>
))}
</select>

```
{selectedPlayer && (
<div className="mt-4">
{(() => {
const player = players.find(p => p.id === selectedPlayer)
if (!player) return null

return (
<div className="p-4 bg-gray-50 rounded-lg space-y-2">
<div className="flex justify-between items-center">
<span className="font-semibold text-lg">{player.playerName}</span>
<span className={`badge position-${player.position}`}>
{player.position}
</span>
</div>
<div className="grid grid-cols-2 gap-4 text-sm">
<div>
<span className="text-gray-600">Team:</span>
<span className="ml-2 font-medium">{player.nflTeam}</span>
</div>
<div>
<span className="text-gray-600">YTD Points:</span>
<span className="ml-2 font-medium">{player.ytdPoints.toFixed(1)}</span>
</div>
<div>
<span className="text-gray-600">Projected:</span>
<span className="ml-2 font-medium">{player.projectedPoints.toFixed(1)}</span>
</div>
<div>
<span className="text-gray-600">Status:</span>
<span className={`ml-2 font-medium ${
player.injuryStatus === 'Healthy' || !player.injuryStatus
? 'text-green-600'
: 'text-red-600'
}`}>
{player.injuryStatus || 'Healthy'}
</span>
</div>
{player.byeWeek && (
<div>
<span className="text-gray-600">Bye Week:</span>
<span className="ml-2 font-medium">{player.byeWeek}</span>
</div>
)}
</div>
</div>
)
})()}
</div>
)}
</div>
```

)
}
