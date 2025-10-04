'use client';

import { useState, useEffect } from 'react';
import { Search, TrendingUp, Users, ArrowRight, AlertCircle, Calendar, Loader2, RefreshCw } from 'lucide-react';

export default function NFLTradeAnalyzer() {
  const [view, setView] = useState('setup');
  const [loading, setLoading] = useState(true);
  const [leagueSettings, setLeagueSettings] = useState({
    scoring: 'half',
    rosterSize: 9,
    teamCount: 12
  });
  const [teams, setTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [targetPosition, setTargetPosition] = useState('');
  const [tradeResults, setTradeResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(5);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load NFL players
      const playersRes = await fetch('/api/players');
      const playersData = await playersRes.json();
      setAllPlayers(playersData.players || []);
      setCurrentWeek(playersData.currentWeek || 5);

      // Load league data
      const leagueRes = await fetch('/api/league');
      const leagueData = await leagueRes.json();
      setLeagueSettings(leagueData.leagueSettings);
      setTeams(leagueData.teams);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (updatedTeams) => {
    setSaving(true);
    try {
      await fetch('/api/league', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueSettings,
          teams: updatedTeams
        })
      });
    } catch (error) {
      console.error('Error saving data:', error);
    } finally {
      setSaving(false);
    }
  };

  const addPlayerToTeam = (teamId, player) => {
    const updatedTeams = teams.map(team => {
      if (team.id === teamId) {
        if (team.roster.some(p => p.id === player.id)) {
          return team;
        }
        return { ...team, roster: [...team.roster, player] };
      }
      return team;
    });
    setTeams(updatedTeams);
    saveData(updatedTeams);
  };

  const removePlayerFromTeam = (teamId, playerId) => {
    const updatedTeams = teams.map(team => {
      if (team.id === teamId) {
        return { ...team, roster: team.roster.filter(p => p.id !== playerId) };
      }
      return team;
    });
    setTeams(updatedTeams);
    saveData(updatedTeams);
  };

  const updateTeamName = (teamId, name) => {
    const updatedTeams = teams.map(team => 
      team.id === teamId ? { ...team, name } : team
    );
    setTeams(updatedTeams);
    saveData(updatedTeams);
  };

  const getPlayerPoints = (player) => {
    const scoring = leagueSettings.scoring;
    if (scoring === 'standard') return player.fantasyPoints.standard;
    if (scoring === 'half') return player.fantasyPoints.halfPPR;
    return player.fantasyPoints.fullPPR;
  };

  const analyzeTeamNeeds = (team) => {
    const positionCounts = {
      QB: 0, RB: 0, WR: 0, TE: 0, DEF: 0, K: 0
    };
    
    team.roster.forEach(player => {
      positionCounts[player.position]++;
    });

    const needs = [];
    if (positionCounts.QB < 1) needs.push('QB');
    if (positionCounts.RB < 2) needs.push('RB');
    if (positionCounts.WR < (leagueSettings.rosterSize === 10 ? 3 : 2)) needs.push('WR');
    if (positionCounts.TE < 1) needs.push('TE');
    if (positionCounts.DEF < 1) needs.push('DEF');
    if (positionCounts.K < 1) needs.push('K');

    return { counts: positionCounts, needs };
  };

  const findTradeTargets = () => {
    if (!selectedPlayer || !targetPosition) return;

    const myTeam = teams.find(t => t.id === selectedTeam);
    const otherTeams = teams.filter(t => t.id !== selectedTeam);
    
    const myPlayerValue = getPlayerPoints(selectedPlayer);
    const candidates = [];

    otherTeams.forEach(team => {
      const teamNeeds = analyzeTeamNeeds(team);
      
      const needsMyPosition = teamNeeds.needs.includes(selectedPlayer.position) || 
        (teamNeeds.counts[selectedPlayer.position] < 2 && ['RB', 'WR', 'TE'].includes(selectedPlayer.position));

      team.roster.forEach(player => {
        if (player.position === targetPosition || 
            (targetPosition === 'FLEX' && ['RB', 'WR', 'TE'].includes(player.position))) {
          
          const playerValue = getPlayerPoints(player);
          const valueDiff = Math.abs(playerValue - myPlayerValue);
          const valueRatio = playerValue / myPlayerValue;

          const needScore = needsMyPosition ? 100 : 0;
          const valueScore = Math.max(0, 100 - (valueDiff / myPlayerValue * 100));
          const fairnessScore = valueRatio >= 0.85 && valueRatio <= 1.15 ? 50 : 0;

          const totalScore = needScore + valueScore + fairnessScore;

          candidates.push({
            team: team.name,
            player,
            playerValue,
            valueDiff,
            valueRatio,
            needsMyPosition,
            score: totalScore,
            teamNeeds: teamNeeds.needs
          });
        }
      });
    });

    candidates.sort((a, b) => b.score - a.score);
    setTradeResults(candidates.slice(0, 5));
  };

  const availablePlayers = allPlayers.filter(player => 
    !teams.some(team => team.roster.some(p => p.id === player.id)) &&
    (player.searchKey?.includes(searchTerm.toLowerCase()) || 
     player.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Loading NFL Players...</p>
        </div>
      </div>
    );
  }

  if (view === 'setup') {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">NFL Trade Analyzer</h1>
                <p className="text-blue-200">Live NFL data • {allPlayers.length} active players • Week {currentWeek}</p>
              </div>
              <button
                onClick={loadData}
                className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Refresh Data
              </button>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">League Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-blue-200 mb-2">Scoring Format</label>
                <select 
                  value={leagueSettings.scoring}
                  onChange={(e) => {
                    const newSettings = {...leagueSettings, scoring: e.target.value};
                    setLeagueSettings(newSettings);
                  }}
                  className="w-full bg-white/20 text-white border border-white/30 rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
                >
                  <option value="standard">Standard</option>
                  <option value="half">0.5 PPR</option>
                  <option value="full">1 PPR</option>
                </select>
              </div>
              <div>
                <label className="block text-blue-200 mb-2">Active Roster Size</label>
                <select 
                  value={leagueSettings.rosterSize}
                  onChange={(e) => {
                    const newSettings = {...leagueSettings, rosterSize: parseInt(e.target.value)};
                    setLeagueSettings(newSettings);
                  }}
                  className="w-full bg-white/20 text-white border border-white/30 rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
                >
                  <option value="9">9 Players</option>
                  <option value="10">10 Players</option>
                </select>
              </div>
              <div>
                <label className="block text-blue-200 mb-2">Teams</label>
                <input 
                  type="text" 
                  value="12 Teams" 
                  disabled 
                  className="w-full bg-white/10 text-white/50 border border-white/30 rounded-lg p-3"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-4">Team Rosters</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto">
                  {teams.map(team => (
                    <div key={team.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                      <input
                        type="text"
                        value={team.name}
                        onChange={(e) => updateTeamName(team.id, e.target.value)}
                        className="w-full bg-white/20 text-white font-bold border border-white/30 rounded p-2 mb-3"
                      />
                      <div className="space-y-2">
                        {team.roster.map(player => (
                          <div key={player.id} className="flex items-center justify-between bg-white/10 p-2 rounded">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                player.position === 'QB' ? 'bg-purple-500' :
                                player.position === 'RB' ? 'bg-green-500' :
                                player.position === 'WR' ? 'bg-blue-500' :
                                player.position === 'TE' ? 'bg-yellow-500' :
                                player.position === 'DEF' ? 'bg-red-500' :
                                'bg-gray-500'
                              } text-white`}>
                                {player.position}
                              </span>
                              <div>
                                <div className="text-white text-sm font-semibold">{player.name}</div>
                                <div className="text-white/60 text-xs">{player.team} • {getPlayerPoints(player)} pts</div>
                              </div>
                            </div>
                            <button
                              onClick={() => removePlayerFromTeam(team.id, player.id)}
                              className="text-red-400 hover:text-red-300 text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        {team.roster.length === 0 && (
                          <p className="text-white/50 text-sm text-center py-4">No players added</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 sticky top-6">
                <h2 className="text-2xl font-bold text-white mb-4">Add Players ({allPlayers.length} available)</h2>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 text-white/50" size={20} />
                    <input
                      type="text"
                      placeholder="Search players..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white/20 text-white border border-white/30 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {availablePlayers.slice(0, 50).map(player => {
                    const points = getPlayerPoints(player);
                    return (
                      <div key={player.id} className="bg-white/10 p-3 rounded-lg border border-white/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              player.position === 'QB' ? 'bg-purple-500' :
                              player.position === 'RB' ? 'bg-green-500' :
                              player.position === 'WR' ? 'bg-blue-500' :
                              player.position === 'TE' ? 'bg-yellow-500' :
                              player.position === 'DEF' ? 'bg-red-500' :
                              'bg-gray-500'
                            } text-white`}>
                              {player.position}
                            </span>
                            <span className="text-white font-semibold text-sm">{player.name}</span>
                          </div>
                          <span className="text-white/70 text-xs">{player.team}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="text-white/80">Proj: {points} pts</span>
                          <span className="text-white/60">Bye: {player.bye}</span>
                        </div>
                        {player.status !== 'Active' && (
                          <div className="mb-2">
                            <span className="bg-red-500/30 text-red-200 px-2 py-1 rounded text-xs">
                              {player.status}
                            </span>
                          </div>
                        )}
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              addPlayerToTeam(parseInt(e.target.value), player);
                              e.target.value = '';
                            }
                          }}
                          className="w-full bg-white/20 text-white border border-white/30 rounded p-2 text-sm"
                        >
                          <option value="">Add to team...</option>
                          {teams.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setView('analyzer')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg flex items-center gap-2"
            >
              Go to Trade Analyzer <ArrowRight size={20} />
            </button>
          </div>

          {saving && (
            <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              Saving...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Trade Analyzer</h1>
              <p className="text-blue-200">Find the best trade targets for your team</p>
            </div>
            <button
              onClick={() => setView('setup')}
              className="bg-white/20 text-white px-6 py-3 rounded-lg hover:bg-white/30 transition-all"
            >
              Back to Setup
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <label className="block text-white font-bold mb-3 flex items-center gap-2">
              <Users size={20} />
              Select Your Team
            </label>
            <select
              value={selectedTeam || ''}
              onChange={(e) => {
                setSelectedTeam(parseInt(e.target.value));
                setSelectedPlayer(null);
                setTargetPosition('');
                setTradeResults([]);
              }}
              className="w-full bg-white/20 text-white border border-white/30 rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Choose team...</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <label className="block text-white font-bold mb-3 flex items-center gap-2">
              <TrendingUp size={20} />
              Player to Trade
            </label>
            <select
              value={selectedPlayer?.id || ''}
              onChange={(e) => {
                const player = teams.find(t => t.id === selectedTeam)?.roster.find(p => p.id === e.target.value);
                setSelectedPlayer(player);
                setTradeResults([]);
              }}
              disabled={!selectedTeam}
              className="w-full bg-white/20 text-white border border-white/30 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
            >
              <option value="">Choose player...</option>
              {selectedTeam && teams.find(t => t.id === selectedTeam)?.roster.map(player => (
                <option key={player.id} value={player.id}>
                  {player.position} - {player.name} ({getPlayerPoints(player)} pts)
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <label className="block text-white font-bold mb-3 flex items-center gap-2">
              <AlertCircle size={20} />
              Position Needed
            </label>
            <select
              value={targetPosition}
              onChange={(e) => {
                setTargetPosition(e.target.value);
                setTradeResults([]);
              }}
              disabled={!selectedPlayer}
              className="w-full bg-white/20 text-white border border-white/30 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
            >
              <option value="">Choose position...</option>
              <option value="QB">QB</option>
              <option value="RB">RB</option>
              <option value="WR">WR</option>
              <option value="TE">TE</option>
              <option value="FLEX">FLEX (RB/WR/TE)</option>
              <option value="DEF">DEF</option>
              <option value="K">K</option>
            </select>
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <button
            onClick={findTradeTargets}
            disabled={!selectedPlayer || !targetPosition}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-12 py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <TrendingUp size={24} />
            Find Trade Targets
          </button>
        </div>

        {tradeResults.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Top 5 Trade Targets</h2>
            <div className="space-y-4">
              {tradeResults.map((result, idx) => {
                const myPoints = getPlayerPoints(selectedPlayer);
                const theirPoints = getPlayerPoints(result.player);
                return (
                  <div key={idx} className="bg-white/10 rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">
                          #{idx + 1}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">{result.team}</h3>
                          <p className="text-blue-200 text-sm">
                            {result.needsMyPosition ? '✓ Needs your position' : 'Could upgrade'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-400">
                          {Math.round(result.score)}
                        </div>
                        <div className="text-xs text-white/60">Match Score</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-400/30">
                        <div className="text-white/70 text-sm mb-2">You Trade</div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            selectedPlayer.position === 'QB' ? 'bg-purple-500' :
                            selectedPlayer.position === 'RB' ? 'bg-green-500' :
                            selectedPlayer.position === 'WR' ? 'bg-blue-500' :
                            selectedPlayer.position === 'TE' ? 'bg-yellow-500' :
                            'bg-gray-500'
                          } text-white`}>
                            {selectedPlayer.position}
                          </span>
                          <span className="text-white font-bold">{selectedPlayer.name}</span>
                        </div>
                        <div className="text-sm text-white/80 mb-1">
                          {selectedPlayer.team} • Proj: {myPoints} pts
                        </div>
                        {selectedPlayer.status !== 'Active' && (
                          <span className="bg-red-500/30 text-red-200 px-2 py-1 rounded text-xs">
                            {selectedPlayer.status}
                          </span>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-white/60">
                          <Calendar size={14} />
                          Bye Week {selectedPlayer.bye}
                        </div>
                      </div>

                      <div className="bg-green-500/20 rounded-lg p-4 border border-green-400/30">
                        <div className="text-white/70 text-sm mb-2">You Receive</div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            result.player.position === 'QB' ? 'bg-purple-500' :
                            result.player.position === 'RB' ? 'bg-green-500' :
                            result.player.position === 'WR' ? 'bg-blue-500' :
                            result.player.position === 'TE' ? 'bg-yellow-500' :
                            'bg-gray-500'
                          } text-white`}>
                            {result.player.position}
                          </span>
                          <span className="text-white font-bold">{result.player.name}</span>
                        </div>
                        <div className="text-sm text-white/80 mb-1">
                          {result.player.team} • Proj: {theirPoints} pts
                        </div>
                        {result.player.status !== 'Active' && (
                          <span className="bg-red-500/30 text-red-200 px-2 py-1 rounded text-xs">
                            {result.player.status}
                          </span>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-white/60">
                          <Calendar size={14} />
                          Bye Week {result.player.bye}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                      <div className="text-sm text-white/80">
                        Value Difference: <span className={theirPoints > myPoints ? 'text-green-400' : 'text-red-400'}>
                          {theirPoints > myPoints ? '+' : ''}{(theirPoints - myPoints).toFixed(1)} pts
                        </span>
                      </div>
                      <div className="text-sm text-white/80">
                        Their Team Needs: {result.teamNeeds.length > 0 ? result.teamNeeds.join(', ') : 'Well-balanced'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
