‘use client’

export default function TeamSelector({ teams, selectedTeam, onSelectTeam }) {
return (
<div className="bg-white rounded-lg shadow-md p-6">
<label className="block text-sm font-medium text-gray-700 mb-2">
Select Your Team
</label>
<select
value={selectedTeam || ‘’}
onChange={(e) => onSelectTeam(e.target.value)}
className=“w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg”
>
<option value="">– Choose Your Team –</option>
{teams.map((team) => (
<option key={team.id} value={team.id}>
Team {team.teamNumber}: {team.teamName}
{team.ownerName ? ` (${team.ownerName})` : ‘’}
</option>
))}
</select>

```
{selectedTeam && (
<div className="mt-4 p-4 bg-primary-50 rounded-lg">
<p className="text-sm text-primary-700">
✓ Team selected successfully
</p>
</div>
)}
</div>
```

)
}
