import { fetchRaceData } from '@/lib/scraper';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const data = await fetchRaceData();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching races:', error);
        return NextResponse.json(
            { error: 'Failed to fetch race data' },
            { status: 500 }
        );
    }
}
