'use client';

import { useEffect, useState, useRef } from 'react';
import { Race, Settings } from '@/lib/types';
import { RaceTimeline } from '@/components/RaceTimeline';
import { SettingsPanel } from '@/components/SettingsPanel';
import { CountdownTimer } from '@/components/CountdownTimer';
import { AudioController } from '@/lib/audio';
import { addMinutes, differenceInSeconds, parseISO, format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function Home() {
  const [races, setRaces] = useState<Race[]>([]);
  const [settings, setSettings] = useState<Settings>({
    heavyPrizeMode: false,
    g1OnlyMode: false,
    audioEnabled: true, // User request: Default ON (Note: Browser may still require interaction)
    notifyOnlyHeavy: false, // Default: Filter OFF (Notify all at 1 min)
    notificationsEnabled: false,
    linkProvider: 'netkeiba',
  });
  const [nextAlert, setNextAlert] = useState<{ time: Date; message: string } | null>(null);

  // Persistence: Load settings
  useEffect(() => {
    const saved = localStorage.getItem('jra_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
  }, []);

  // Persistence: Save settings
  useEffect(() => {
    localStorage.setItem('jra_settings', JSON.stringify(settings));
  }, [settings]);

  // Time Travel State
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [appTime, setAppTime] = useState<Date>(new Date());
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [manualTimeInput, setManualTimeInput] = useState(''); // For manual input

  const audioRef = useRef<AudioController | null>(null);

  // Initialize Audio
  useEffect(() => {
    audioRef.current = new AudioController();

    // Auto-unlock audio on first user interaction anywhere
    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current.init().then(() => {
          console.log('Audio Context Resumed');
        });
      }
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  const enableAudio = async () => {
    if (audioRef.current) {
      await audioRef.current.init();
      // Force resume just in case
      setSettings((s) => ({ ...s, audioEnabled: true }));
      audioRef.current?.playAlert('pre-warning');
    }
  };

  const toggleSetting = (key: keyof Settings) => {
    if (key === 'notificationsEnabled' && !settings.notificationsEnabled) {
      // User is turning ON notifications -> Request permission
      if ('Notification' in window) {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            setSettings((s) => ({ ...s, [key]: !s[key] }));
            new Notification('通知が有効になりました');
          } else {
            alert('通知の権限が拒否されました。ブラウザの設定を確認してください。');
          }
        });
        return; // Wait for promise, don't toggle immediately
      }
    }
    setSettings((s) => ({ ...s, [key]: !s[key] }));
  };

  // Main Clock Loop using Web Worker for background stability
  useEffect(() => {
    // Initialize Worker
    const worker = new Worker('/timer-worker.js');

    worker.onmessage = () => {
      const now = new Date(Date.now() + timeOffset);
      setAppTime(now);
    };

    worker.postMessage('start');

    return () => {
      worker.terminate();
    };
  }, [timeOffset]);

  // Fetch Data
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function loadData() {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/races');
      const data = await res.json();
      if (data.races) {
        setRaces(data.races);
      }
    } catch (e) {
      console.error(e);
      alert('データの取得に失敗しました');
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
    // Refresh every minute to keep data fresh (or logic check)
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Alert Logic
  useEffect(() => {
    const checkAlerts = () => {
      const now = appTime; // Use simulated time
      let nextTarget: { time: Date; message: string } | null = null;
      let minDiff = Infinity;

      races.forEach((race) => {
        const raceTime = parseISO(race.startTime);

        // Is this race "Heavy" (Eligible for Heavy Mode)?
        const isHeavy = ['G1', 'G2', 'G3'].includes(race.grade);
        const isG1 = race.grade === 'G1';

        // Filter logic: If "notifyOnlyHeavy" is ON, ignore non-heavy races completely.
        if (settings.notifyOnlyHeavy && !isHeavy) {
          return;
        }

        // 1. Deadline Alert (changed to 2 mins before)
        const deadlineTime = addMinutes(raceTime, -2);
        const diffDeadline = differenceInSeconds(deadlineTime, now);

        if (diffDeadline > 0 && diffDeadline < minDiff) {
          minDiff = diffDeadline;
          nextTarget = { time: deadlineTime, message: `次のアラート: ${race.raceName} 締切2分前` };
        }

        // Trigger if exactly now (within 1 sec)
        if (Math.abs(diffDeadline) < 1) {
          if (settings.audioEnabled) {
            audioRef.current?.playAlert('deadline');
          }
          if (settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(nextTarget?.message || '締切直前です', { body: `${race.raceName} 締切まで残り2分` });
          }
        }

        // 2. Pre-warning Alert (10 mins before) for Heavy/G1
        let shouldWarn = false;
        if (settings.g1OnlyMode && isG1) shouldWarn = true;
        else if (settings.heavyPrizeMode && isHeavy) shouldWarn = true;

        if (shouldWarn) {
          const warnTime = addMinutes(raceTime, -10);
          const diffWarn = differenceInSeconds(warnTime, now);

          if (diffWarn > 0 && diffWarn < minDiff) {
            minDiff = diffWarn;
            nextTarget = { time: warnTime, message: `次のアラート: ${race.raceName} 検討開始` };
          }

          // Trigger
          if (Math.abs(diffWarn) < 1) {
            if (settings.audioEnabled) {
              audioRef.current?.playAlert('pre-warning');
            }
            if (settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(nextTarget?.message || '予鈴', { body: `${race.raceName} 10分前です` });
            }
          }
        }
      });
      setNextAlert(nextTarget);
    };

    // Run check every second when appTime updates
    // Actually, appTime updates trigger render, so we can just run this effect on appTime change
    checkAlerts();
  }, [appTime, races, settings]);

  // Debug Helpers
  const jumpTo = (dateStr: string) => {
    const target = new Date(dateStr);
    const now = new Date();
    const offset = target.getTime() - now.getTime();
    setTimeOffset(offset);
  };

  const handleManualJump = () => {
    if (!manualTimeInput) return;
    const [hours, mins] = manualTimeInput.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(mins)) {
      const now = new Date();
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, mins, 0);
      jumpTo(target.toISOString());
    }
  };

  return (
    <main className="container min-h-screen pb-20 relative">
      <header className="py-6 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">🐎 JRA Race Alert</h1>
        <p className="text-secondary text-sm">締切を逃さないための予鈴ツール</p>
        <div className="text-xs text-secondary mt-1 font-mono" suppressHydrationWarning>
          Current Time: {appTime ? format(appTime, 'yyyy/MM/dd HH:mm:ss', { locale: ja }) : '--'}
        </div>
      </header>

      <SettingsPanel
        settings={settings}
        onToggle={toggleSetting}
        onEnableAudio={enableAudio}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
      />

      <CountdownTimer
        nextAlertTime={nextAlert?.time || null}
        message={nextAlert?.message || '次のアラート待機中...'}
        currentDate={appTime}
      />

      <RaceTimeline races={races} currentDate={appTime} linkProvider={settings.linkProvider || 'netkeiba'} />

      {/* Debug Panel */}
      <div className="fixed bottom-0 left-0 w-full bg-black/80 backdrop-blur text-white p-2 text-xs border-t border-gray-700">
        <button
          onClick={() => setIsDebugOpen(!isDebugOpen)}
          className="w-full text-center text-gray-400 hover:text-white mb-2"
        >
          {isDebugOpen ? '▼ デバッグパネルを閉じる' : '▲ デバッグ・時刻シミュレーション'}
        </button>

        {isDebugOpen && (
          <div className="grid grid-cols-2 gap-2 p-2">
            <div className="col-span-2 flex gap-2 mb-2 p-2 bg-gray-800 rounded">
              <input
                type="time"
                className="text-black p-1 rounded flex-grow"
                value={manualTimeInput}
                onChange={(e) => setManualTimeInput(e.target.value)}
              />
              <button
                onClick={handleManualJump}
                className="bg-green-700 px-3 py-1 rounded hover:bg-green-600 whitespace-nowrap"
              >
                時間指定ジャンプ
              </button>
            </div>

            <button
              onClick={() => {
                const now = new Date();
                // Today 9:50
                jumpTo(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 50).toISOString());
              }}
              className="bg-blue-900 p-2 rounded hover:bg-blue-800"
            >
              本日 9:50 (開催前)
            </button>
            <button
              onClick={() => {
                const now = new Date();
                // Today 15:25
                jumpTo(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 25).toISOString());
              }}
              className="bg-purple-900 p-2 rounded hover:bg-purple-800"
            >
              本日 15:25 (中山金杯直前)
            </button>
            <button
              onClick={() => {
                const now = new Date();
                // Today 15:40
                jumpTo(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 40).toISOString());
              }}
              className="bg-red-900 p-2 rounded hover:bg-red-800"
            >
              本日 15:40 (京都金杯直前)
            </button>
            <button
              onClick={() => setTimeOffset(0)}
              className="bg-gray-700 p-2 rounded hover:bg-gray-600"
            >
              現在時刻 (Real Time)
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
