import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const LEAGUE_KEY = 'nfl_trade_league_data';

// GET - Retrieve league data
export async function GET() {
  try {
    const leagueData = await kv.get(LEAGUE_KEY);
    
    if (leagueData) {
      console.log('League data loaded from Redis');
      return NextResponse.json(leagueData);
    }
    
    // Return empty league structure if none exists
    console.log('No league data found, returning empty structure');
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
  } catch (error) {
    console.error('Error fetching from Redis:', error);
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

    console.log('Saving league data to Redis:', data.teams.length, 'teams');

    // Save to Redis
    await kv.set(LEAGUE_KEY, data);
    
    console.log('Data saved to Redis successfully');
    
    return NextResponse.json({ 
      success: true,
      message: 'League data saved to cloud storage',
      storage: 'redis'
    });
  } catch (error) {
    console.error('Error saving to Redis:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save to cloud storage',
        details: error.message 
      },
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
      message: 'League data cleared from cloud storage' 
    });
  } catch (error) {
    console.error('Error clearing Redis data:', error);
    return NextResponse.json(
      { error: 'Failed to clear data' },
      { status: 500 }
    );
  }
}
