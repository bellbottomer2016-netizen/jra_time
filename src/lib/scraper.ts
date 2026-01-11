import { Race, ScraperResult, Grade } from './types';
import * as cheerio from 'cheerio';


export async function fetchRaceData(): Promise<ScraperResult> {
    try {
        // Fetch Today's Racing List
        // 1. Fetch Date List to find the "Active" date (default view)
        // race.netkeiba.com/top/race_list.html loads this to decide which tab is active.
        const dateRes = await fetch('https://race.netkeiba.com/top/race_list_get_date_list.html', {
            cache: 'no-store',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        let targetDate = '';
        if (dateRes.ok) {
            const dateHtml = await dateRes.text();
            const $date = cheerio.load(dateHtml);
            // Find the active tab
            targetDate = $date('#date_list_sub .Active').attr('date') || '';
        }

        // 2. Fetch Race List for the Target Date
        // If targetDate is empty, it falls back to default (which caused the bug, but better than nothing)
        const url = targetDate
            ? `https://race.netkeiba.com/top/race_list_sub.html?kaisai_date=${targetDate}`
            : 'https://race.netkeiba.com/top/race_list_sub.html';

        const res = await fetch(url, {
            cache: 'no-store',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch netkeiba: ${res.status}`);
        }

        const html = await res.text();
        const $ = cheerio.load(html);
        const races: Race[] = [];
        const now = new Date();

        // Check if the page is actually for "Today"
        // Netkeiba URL might contain date param if we are deeper, but top page redirects.
        // We will assume the displayed data is what the user wants to see (today or next/current).
        // To be safe for "JRA_time" which is a clock, we should map the time to TODAY's date 
        // regardless of whether the race is actually today (for testing on weekdays) 
        // OR filtering strictly for today.

        // For this user request "This weekend", we want reliable data.
        // Let's parse the races found.

        // 1. Loop through Venues
        // The structure is RaceList_Box -> [dl.RaceList_DataList, dl.RaceList_DataList, ...]
        // We must iterate .RaceList_DataList to get each venue correctly.
        $('.RaceList_DataList').each((_, venueEl) => {
            const venueName = $(venueEl).find('.RaceList_DataTitle').text().trim().split(' ')[1] || 'Unknown';

            // 2. Loop through Races in this Venue
            // RaceList_Data (dd) contains the ul list of races.
            // We need to find the specific dd associated with this dt, but typical cheerio traversal:
            // The structure is usually dl > dt > ... dd > ul > li
            const raceList = $(venueEl).find('.RaceList_Data .RaceList_DataItem');

            raceList.each((_, raceEl) => {
                const raceNumText = $(raceEl).find('.Race_Num').text().trim(); // "1R"
                const raceName = $(raceEl).find('.ItemTitle').text().trim();
                const startTimeText = $(raceEl).find('.RaceList_Itemtime').text().trim(); // "09:50"

                // Parse Grade
                let grade: Grade = 'General';
                const gradeIcon = $(raceEl).find('.Icon_GradeType');
                if (gradeIcon.length > 0) {
                    if (gradeIcon.hasClass('Icon_GradeType1')) grade = 'G1';
                    else if (gradeIcon.hasClass('Icon_GradeType2')) grade = 'G2';
                    else if (gradeIcon.hasClass('Icon_GradeType3')) grade = 'G3';
                    else if (gradeIcon.hasClass('Icon_GradeType15')) grade = 'Listed';
                    // Others map to General/Listed/etc. For now keep simple.
                }

                // Parse Time
                if (startTimeText && raceNumText) {
                    const [hours, mins] = startTimeText.split(':').map(Number);
                    if (!isNaN(hours) && !isNaN(mins)) {
                        // Create Date object for Today with this time
                        // Note: If the race logic needs exact date matching (e.g. tomorrow), 
                        // we'd need to parse the date header. 
                        // For the purpose of "Clock", let's map to Today so alerts work 'now'.
                        const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, mins).toISOString();

                        races.push({
                            id: `netkeiba-${venueName}-${raceNumText}`, // unique path
                            location: venueName,
                            raceNumber: parseInt(raceNumText.replace('R', '')),
                            raceName: raceName,
                            grade: grade,
                            startTime: startTime,
                            url: $(raceEl).find('a').attr('href')
                        });
                    }
                }
            });
        });

        // Parse date from header to check if it matches today (Optional validation)
        // const dateHeader = $('#date_list .Active').text(); // e.g. "1/11(土)"

        return {
            races: races.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
            fetchedAt: new Date().toISOString(),
            source: 'live'
        };

    } catch (error) {
        console.error('Scraper Error:', error);
        return {
            races: [],
            fetchedAt: new Date().toISOString(),
            source: 'mock' // or error state
        };
    }
}
