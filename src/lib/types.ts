export interface Settings {
  heavyPrizeMode: boolean;
  g1OnlyMode: boolean;
  audioEnabled: boolean;
  notifyOnlyHeavy: boolean;
  notificationsEnabled: boolean;
  useVoiceAlert: boolean;
}

export type Grade = 'G1' | 'G2' | 'G3' | 'Listed' | 'General';

export interface Race {
  id: string; // Unique ID (e.g., "202401060601")
  location: string; // e.g., "中山"
  raceNumber: number; // 1-12
  raceName: string; // e.g., "中山金杯"
  grade: Grade;
  startTime: string; // ISO String
  url?: string; // Link to race details
}

export interface ScraperResult {
  races: Race[];
  fetchedAt: string;
  source: 'live' | 'mock';
}
