'use client';

import { Race } from '@/lib/types';
import { differenceInMinutes, format, isPast, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useEffect, useRef } from 'react';
import styles from './RaceTimeline.module.css';

interface Props {
    races: Race[];
    currentDate: Date;
    linkProvider: 'netkeiba' | 'jra';
}

export function RaceTimeline({ races, currentDate, linkProvider }: Props) {
    const now = currentDate;
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to the first active race
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [races]);

    return (
        <div className={styles.container}>
            {races.map((race, index) => {
                const raceTime = parseISO(race.startTime);
                const finished = isPast(raceTime);
                const minutesToStart = differenceInMinutes(raceTime, now);

                // "Imminent" if within 10 mins (and not finished)
                const isImminent = !finished && minutesToStart <= 10 && minutesToStart >= -1;

                // Find the first non-finished race to scroll to
                const isFirstActive = !finished && (index === 0 || isPast(parseISO(races[index - 1].startTime)));

                const cardContent = (
                    <div
                        ref={isFirstActive ? scrollRef : null}
                        className={`${styles.card} ${finished ? styles.finished : ''} ${isImminent ? styles.imminent : ''
                            }`}
                    >
                        <div className={styles.timeBox}>
                            <span className={styles.time}>
                                {format(raceTime, 'HH:mm', { locale: ja })}
                            </span>
                            <span className={styles.diff}>
                                {finished
                                    ? '終了'
                                    : minutesToStart <= 0
                                        ? '発走!!'
                                        : `あと${minutesToStart}分`}
                            </span>
                        </div>

                        <div className={styles.infoBox}>
                            <div className={styles.header}>
                                <span className={`${styles.location} ${styles[getLocationClass(race.location)]}`}>
                                    {race.location} {race.raceNumber}R
                                </span>
                                {race.grade !== 'General' && (
                                    <span className={`${styles.grade} ${styles[race.grade]}`}>
                                        {race.grade}
                                    </span>
                                )}
                            </div>
                            <div className={styles.name}>{race.raceName}</div>
                        </div>
                    </div>
                );

                if (race.url || linkProvider === 'jra') {
                    // Resolve URL safely
                    let href = '#';
                    if (linkProvider === 'jra') {
                        href = 'https://jra.jp/keiba/';
                    } else if (race.url) {
                        try {
                            // race.url is likely relative like "../race/shutuba.html" or absolute
                            // Base must be the location where relative links originate (top/race_list.html)
                            href = new URL(race.url, 'https://race.netkeiba.com/top/').href;
                        } catch (e) {
                            console.error('Invalid URL:', race.url);
                            href = '#';
                        }
                    }

                    return (
                        <a
                            key={race.id}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block no-underline"
                        >
                            {cardContent}
                        </a>
                    );
                }

                return cardContent;
            })}
        </div>
    );
}

function getLocationClass(loc: string) {
    // Simple mapping for colored badges if needed
    if (loc === '東京') return 'tokyo';
    if (loc === '中山') return 'nakayama';
    if (loc === '京都') return 'kyoto';
    if (loc === '阪神') return 'hanshin';
    return 'default';
}
