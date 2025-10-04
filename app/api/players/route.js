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

    // Filter and format active NFL players
    const activePlayers = Object.values(allPlayers)
      .filter(player => 
        player.active &&
        player.position &&
        ['QB', 'RB', 'WR', 'TE', 'DEF', 'K'].includes(player.position) &&
        player.team
      )
      .map(player => ({
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
        // Fantasy points (estimated from player stats)
        fantasyPoints: {
          standard: calculatePoints(player, 'standard'),
          halfPPR: calculatePoints(player, 'half'),
          fullPPR: calculatePoints(player, 'full')
        },
        // Stats for current season
        stats: player.stats || {},
        // Search helper
        searchKey: `${player.full_name} ${player.team} ${player.position}`.toLowerCase()
      }))
      .sort((a, b) => {
        // Sort by fantasy points (half PPR)
        return b.fantasyPoints.halfPPR - a.fantasyPoints.halfPPR;
      });

    return NextResponse.json({
      players: activePlayers,
      currentWeek: nflState.week || 5,
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

// NFL team bye weeks for 2025 (example - update annually)
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

// Calculate fantasy points based on typical season averages
function calculatePoints(player, scoringType) {
  const pos = player.position;
  const team = player.team;
  
  // Base projections by position and team quality (simplified)
  const baseProjections = {
    'QB': { min: 180, max: 370 },
    'RB': { min: 80, max: 290 },
    'WR': { min: 70, max: 270 },
    'TE': { min: 50, max: 196 },
    'DEF': { min: 60, max: 118 },
    'K': { min: 60, max: 105 }
  };

  if (!baseProjections[pos]) return 0;

  // Use player stats if available, otherwise estimate
  let basePoints = 0;
  
  if (player.stats && player.stats['2024']) {
    // Use last season's stats as baseline
    const stats = player.stats['2024'];
    basePoints = estimateFromStats(stats, pos, scoringType);
  } else {
    // Estimate based on position range (higher for established players)
    const range = baseProjections[pos];
    const yearsExp = player.years_exp || 0;
    const expFactor = Math.min(yearsExp / 5, 1); // Veterans get higher projections
    basePoints = range.min + (range.max - range.min) * expFactor * 0.7;
  }

  // Adjust for scoring type (PPR adds value to pass-catchers)
  if (scoringType === 'half' && ['RB', 'WR', 'TE'].includes(pos)) {
    basePoints *= 1.15;
  } else if (scoringType === 'full' && ['RB', 'WR', 'TE'].includes(pos)) {
    basePoints *= 1.30;
  }

  return Math.round(basePoints);
}

function estimateFromStats(stats, position, scoringType) {
  let points = 0;

  // Passing stats
  if (stats.pass_yd) {
    points += stats.pass_yd * 0.04; // 1 pt per 25 yards
    points += (stats.pass_td || 0) * 4;
    points -= (stats.pass_int || 0) * 2;
  }

  // Rushing stats
  if (stats.rush_yd) {
    points += stats.rush_yd * 0.1; // 1 pt per 10 yards
    points += (stats.rush_td || 0) * 6;
  }

  // Receiving stats
  if (stats.rec_yd) {
    points += stats.rec_yd * 0.1;
    points += (stats.rec_td || 0) * 6;
    
    // PPR bonuses
    if (scoringType === 'half') {
      points += (stats.rec || 0) * 0.5;
    } else if (scoringType === 'full') {
      points += (stats.rec || 0) * 1.0;
    }
  }

  // Defense/Special Teams
  if (position === 'DEF') {
    points += (stats.def_td || 0) * 6;
    points += (stats.sack || 0) * 1;
    points += (stats.int || 0) * 2;
    points += (stats.fum_rec || 0) * 2;
  }

  // Kicker
  if (position === 'K') {
    points += (stats.fgm || 0) * 3;
    points += (stats.xpm || 0) * 1;
  }

  return points;
}
