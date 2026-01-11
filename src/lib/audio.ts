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
        if (this.context && this.context.state === 'suspended') {
            await this.context.resume();
        }
    }

    public playAlert(type: 'deadline' | 'pre-warning') {
        if (!this.context) return;

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
