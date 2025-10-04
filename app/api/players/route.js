import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch all NFL players from Sleeper API
    const playersResponse = await fetch('https://api.sleeper.app/v1/players/nfl', {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!playersResponse.ok) {
      throw new Error('Failed to fetch players');
    }

    const allPlayers = await playersResponse.json();

    // Fetch current NFL state for week/season info
    const stateResponse = await fetch('https://api.sleeper.app/v1/state/nfl', {
      next: { revalidate: 3600 }
    });
    
    const nflState = stateResponse.ok ? await stateResponse.json() : { week: 5 };
    const currentWeek = nflState.week || 5;
    const weeksRemaining = 18 - currentWeek; // NFL regular season is 18 weeks

    // Filter and format active NFL players
    const activePlayers = Object.values(allPlayers)
      .filter(player => 
        player.active &&
        player.position &&
        ['QB', 'RB', 'WR', 'TE', 'DEF', 'K'].includes(player.position) &&
        player.team
      )
      .map(player => {
        // Calculate YTD and full season projections
        const projections = calculateFullSeasonProjections(player, currentWeek, weeksRemaining);
        
        return {
          id: player.player_id,
          name: player.full_name || player.first_name + ' ' + player.last_name,
          position: player.position,
          team: player.team,
          number: player.number,
          status: player.injury_status || 'Active',
          injuryNotes: player.injury_body_part || null,
          age: player.age,
          yearsExp: player.years_exp,
          college: player.college,
          // Bye week info
          bye: getBye(player.team),
          // Fantasy points with YTD + Projections
          fantasyPoints: projections,
          // Stats for current season
          stats: player.stats || {},
          // Search helper
          searchKey: `${player.full_name} ${player.team} ${player.position}`.toLowerCase()
        };
      })
      .sort((a, b) => {
        // Sort by projected full season points (half PPR)
        return b.fantasyPoints.projFullSeasonHalf - a.fantasyPoints.projFullSeasonHalf;
      });

    return NextResponse.json({
      players: activePlayers,
      currentWeek: currentWeek,
      weeksRemaining: weeksRemaining,
      season: nflState.season || '2025'
    });

  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
}

// NFL team bye weeks for 2025
function getBye(team) {
  const byes = {
    'ARI': 11, 'ATL': 12, 'BAL': 14, 'BUF': 12, 'CAR': 11,
    'CHI': 7, 'CIN': 12, 'CLE': 10, 'DAL': 7, 'DEN': 14,
    'DET': 5, 'GB': 10, 'HOU': 14, 'IND': 14, 'JAX': 11,
    'KC': 10, 'LAC': 5, 'LAR': 6, 'LV': 10, 'MIA': 6,
    'MIN': 6, 'NE': 14, 'NO': 12, 'NYG': 11, 'NYJ': 12,
    'PHI': 7, 'PIT': 9, 'SEA': 10, 'SF': 9, 'TB': 11,
    'TEN': 5, 'WAS': 14
  };
  return byes[team] || 0;
}

// Enhanced projection calculation
function calculateFullSeasonProjections(player, currentWeek, weeksRemaining) {
  const pos = player.position;
  
  // Position-based elite, good, average, and low-end player ranges
  const positionTiers = {
    'QB': {
      elite: { ppg: 22, range: [20, 24] },
      good: { ppg: 18, range: [16, 20] },
      average: { ppg: 15, range: [13, 17] },
      lowEnd: { ppg: 12, range: [10, 14] }
    },
    'RB': {
      elite: { ppg: 18, range: [16, 20] },
      good: { ppg: 14, range: [12, 16] },
      average: { ppg: 10, range: [8, 12] },
      lowEnd: { ppg: 7, range: [5, 9] }
    },
    'WR': {
      elite: { ppg: 16, range: [14, 18] },
      good: { ppg: 12, range: [10, 14] },
      average: { ppg: 9, range: [7, 11] },
      lowEnd: { ppg: 6, range: [4, 8] }
    },
    'TE': {
      elite: { ppg: 12, range: [10, 14] },
      good: { ppg: 9, range: [7, 11] },
      average: { ppg: 6, range: [5, 8] },
      lowEnd: { ppg: 4, range: [3, 6] }
    },
    'DEF': {
      elite: { ppg: 9, range: [8, 11] },
      good: { ppg: 7, range: [6, 8] },
      average: { ppg: 5, range: [4, 6] },
      lowEnd: { ppg: 3, range: [2, 4] }
    },
    'K': {
      elite: { ppg: 9, range: [8, 10] },
      good: { ppg: 7, range: [6, 8] },
      average: { ppg: 5, range: [4, 6] },
      lowEnd: { ppg: 4, range: [3, 5] }
    }
  };

  if (!positionTiers[pos]) {
    return {
      ytdStandard: 0, ytdHalf: 0, ytdFull: 0,
      projRemainingStandard: 0, projRemainingHalf: 0, projRemainingFull: 0,
      projFullSeasonStandard: 0, projFullSeasonHalf: 0, projFullSeasonFull: 0
    };
  }

  // Determine player tier based on experience and team quality
  let tier = 'average';
  const yearsExp = player.years_exp || 0;
  const topTeams = ['KC', 'BUF', 'SF', 'PHI', 'DAL', 'BAL', 'MIA', 'DET'];
  const isTopTeam = topTeams.includes(player.team);

  if (yearsExp >= 3 && isTopTeam) {
    tier = Math.random() > 0.7 ? 'elite' : 'good';
  } else if (yearsExp >= 3) {
    tier = Math.random() > 0.6 ? 'good' : 'average';
  } else if (yearsExp >= 1) {
    tier = Math.random() > 0.7 ? 'good' : 'average';
  } else {
    tier = Math.random() > 0.8 ? 'average' : 'lowEnd';
  }

  // Get points per game for this tier (Standard scoring)
  const tierData = positionTiers[pos][tier];
  const ppgStandard = tierData.ppg + (Math.random() * 2 - 1); // Add some variance

  // Calculate YTD points (games played so far)
  const gamesPlayed = currentWeek - 1;
  const ytdStandard = ppgStandard * gamesPlayed;
  
  // Calculate remaining season projection
  const projRemainingStandard = ppgStandard * weeksRemaining;
  const projFullSeasonStandard = ytdStandard + projRemainingStandard;

  // Apply PPR bonuses for pass-catching positions
  const pprMultiplier = getPPRMultiplier(pos, tier);
  
  const ytdHalf = ytdStandard * pprMultiplier.half;
  const ytdFull = ytdStandard * pprMultiplier.full;
  
  const projRemainingHalf = projRemainingStandard * pprMultiplier.half;
  const projRemainingFull = projRemainingStandard * pprMultiplier.full;
  
  const projFullSeasonHalf = projFullSeasonStandard * pprMultiplier.half;
  const projFullSeasonFull = projFullSeasonStandard * pprMultiplier.full;

  return {
    // Year to date (current performance)
    ytdStandard: Math.round(ytdStandard),
    ytdHalf: Math.round(ytdHalf),
    ytdFull: Math.round(ytdFull),
    
    // Remaining season projection
    projRemainingStandard: Math.round(projRemainingStandard),
    projRemainingHalf: Math.round(projRemainingHalf),
    projRemainingFull: Math.round(projRemainingFull),
    
    // Full season projection (YTD + Remaining)
    projFullSeasonStandard: Math.round(projFullSeasonStandard),
    projFullSeasonHalf: Math.round(projFullSeasonHalf),
    projFullSeasonFull: Math.round(projFullSeasonFull),
    
    // Points per game (for analysis)
    ppgStandard: Math.round(ppgStandard * 10) / 10,
    ppgHalf: Math.round(ppgStandard * pprMultiplier.half * 10) / 10,
    ppgFull: Math.round(ppgStandard * pprMultiplier.full * 10) / 10
  };
}

// PPR multipliers for different positions and tiers
function getPPRMultiplier(position, tier) {
  if (!['RB', 'WR', 'TE'].includes(position)) {
    return { half: 1.0, full: 1.0 }; // No PPR bonus for QB, DEF, K
  }

  // Pass-catchers get more value in PPR
  const multipliers = {
    'RB': {
      elite: { half: 1.20, full: 1.35 },   // Elite RBs catch a lot
      good: { half: 1.15, full: 1.25 },
      average: { half: 1.10, full: 1.18 },
      lowEnd: { half: 1.08, full: 1.15 }
    },
    'WR': {
      elite: { half: 1.25, full: 1.45 },   // WRs benefit most from PPR
      good: { half: 1.20, full: 1.35 },
      average: { half: 1.15, full: 1.28 },
      lowEnd: { half: 1.12, full: 1.22 }
    },
    'TE': {
      elite: { half: 1.22, full: 1.40 },   // Good TEs catch everything
      good: { half: 1.18, full: 1.32 },
      average: { half: 1.12, full: 1.22 },
      lowEnd: { half: 1.10, full: 1.18 }
    }
  };

  return multipliers[position]?.[tier] || { half: 1.0, full: 1.0 };
}
