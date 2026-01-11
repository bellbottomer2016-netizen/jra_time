export class AudioController {
    private context: AudioContext | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.context = new AudioContextClass();
            }
        }
    }

    // Must be called on user interaction to unlock audio
    public async init() {
        if (!this.context) return;

        if (this.context.state === 'suspended') {
            await this.context.resume();
        }

        // iOS Hack: Play a silent buffer to fully unlock the audio engine
        const buffer = this.context.createBuffer(1, 1, 22050);
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.connect(this.context.destination);
        source.start(0);

        // Prime Speech Synthesis (iOS requires 1st speak to be in gesture)
        if ('speechSynthesis' in window) {
            const emptyUtterance = new SpeechSynthesisUtterance('');
            emptyUtterance.volume = 0;
            window.speechSynthesis.speak(emptyUtterance);
        }
    }

    public async playAlert(type: 'deadline' | 'pre-warning', useVoice: boolean = false, raceName: string = '') {
        if (!this.context) return;

        // Ensure context is running (iOS suspends it in background)
        if (this.context.state === 'suspended') {
            try {
                await this.context.resume();
            } catch (e) {
                console.error('Failed to resume audio context:', e);
            }
        }

        // Voice Alert Mode (Speech Synthesis)
        if (useVoice && 'speechSynthesis' in window) {
            // Cancel any pending speech
            window.speechSynthesis.cancel();

            const text = type === 'deadline'
                ? `まもなく、${raceName}の締切です。`
                : `${raceName}の検討を開始します。`;

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ja-JP';
            utterance.rate = 1.0;
            utterance.volume = 1.0; // Max volume

            // Try to force Japanese voice if available
            const voices = window.speechSynthesis.getVoices();
            const jaVoice = voices.find(v => v.lang.includes('ja'));
            if (jaVoice) utterance.voice = jaVoice;

            window.speechSynthesis.speak(utterance);
            return; // Exit, don't play beep
        }

        // Standard Beep Mode (Oscillator)
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.connect(gain);
        gain.connect(this.context.destination);

        if (type === 'deadline') {
            // High pitched, urgent beeps
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, this.context.currentTime); // A5
            osc.frequency.setValueAtTime(880, this.context.currentTime + 0.1);
            osc.frequency.setValueAtTime(0, this.context.currentTime + 0.11); // Silence
            osc.frequency.setValueAtTime(880, this.context.currentTime + 0.2);
            osc.frequency.setValueAtTime(880, this.context.currentTime + 0.3);

            gain.gain.setValueAtTime(0.5, this.context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);

            osc.start();
            osc.stop(this.context.currentTime + 0.35);
        } else {
            // Gentle chime (Fanfare-ish) for Pre-warning
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, this.context.currentTime); // C5
            osc.frequency.linearRampToValueAtTime(659.25, this.context.currentTime + 0.1); // E5
            osc.frequency.linearRampToValueAtTime(783.99, this.context.currentTime + 0.2); // G5

            gain.gain.setValueAtTime(0.3, this.context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 1.5);

            osc.start();
            osc.stop(this.context.currentTime + 1.5);
        }
    }
}
