import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const LEAGUE_KEY = 'nfl_trade_league_data';

// GET - Retrieve league data
export async function GET() {
  try {
    const leagueData = await kv.get(LEAGUE_KEY);
    
    if (!leagueData) {
      // Return empty league structure if none exists
      return NextResponse.json({
        leagueSettings: {
          scoring: 'half',
          rosterSize: 9,
          teamCount: 12
        },
        teams: Array.from({ length: 12 }, (_, i) => ({
          id: i + 1,
          name: `Team ${i + 1}`,
          roster: []
        }))
      });
    }

    return NextResponse.json(leagueData);
  } catch (error) {
    console.error('Error fetching league data:', error);
    // Fallback to empty league if KV isn't set up yet
    return NextResponse.json({
      leagueSettings: {
        scoring: 'half',
        rosterSize: 9,
        teamCount: 12
      },
      teams: Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        name: `Team ${i + 1}`,
        roster: []
      }))
    });
  }
}

// POST - Save league data
export async function POST(request) {
  try {
    const data = await request.json();
    
    // Validate data structure
    if (!data.leagueSettings || !data.teams) {
      return NextResponse.json(
        { error: 'Invalid data structure' },
        { status: 400 }
      );
    }

    // Save to Vercel KV
    await kv.set(LEAGUE_KEY, data);

    return NextResponse.json({ 
      success: true,
      message: 'League data saved successfully' 
    });
  } catch (error) {
    console.error('Error saving league data:', error);
    return NextResponse.json(
      { error: 'Failed to save league data' },
      { status: 500 }
    );
  }
}

// DELETE - Clear league data
export async function DELETE() {
  try {
    await kv.del(LEAGUE_KEY);
    return NextResponse.json({ 
      success: true,
      message: 'League data cleared successfully' 
    });
  } catch (error) {
    console.error('Error clearing league data:', error);
    return NextResponse.json(
      { error: 'Failed to clear league data' },
      { status: 500 }
    );
  }
}
