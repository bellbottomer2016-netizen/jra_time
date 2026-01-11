'use client';

import { Race } from '@/lib/types';
import { differenceInSeconds } from 'date-fns';
import { useEffect, useState } from 'react';

interface Props {
    nextAlertTime: Date | null;
    message: string;
    currentDate: Date;
}

export function CountdownTimer({ nextAlertTime, message, currentDate }: Props) {
    // If we receive updates via prop every second, we don't need internal state for time
    // But we might want internal calc for immediate feedback? 
    // For simplicity with Time Travel, let's rely on props.

    if (!nextAlertTime) return null;

    const diff = differenceInSeconds(nextAlertTime, currentDate);
    let timeLeft = '--:--';

    if (diff <= 0) {
        timeLeft = '00:00';
    } else {
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        timeLeft = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    return (
        <div className="bg-card p-6 rounded mb-4 border text-center relative overflow-hidden">
            <div
                className="absolute top-0 left-0 w-full h-1 bg-green-500 animate-pulse"
            ></div>
            <div className="text-secondary text-sm mb-1">{message}</div>
            <div className="text-5xl font-bold font-mono tracking-wider text-white">
                {timeLeft}
            </div>
        </div>
    );
}
