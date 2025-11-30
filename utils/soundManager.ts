
class SoundManager {
  private context: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  constructor() {
    this.isMuted = localStorage.getItem('quatch_muted') === 'true';
    // We defer AudioContext creation to the first interaction to adhere to browser policies,
    // or create it but it might start in 'suspended' state.
  }

  private initContext() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.context = new AudioContext();
        this.masterGain = this.context.createGain();
        this.masterGain.connect(this.context.destination);
        this.updateMuteState();
      }
    } else if (this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  public getMuted(): boolean {
      return this.isMuted;
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('quatch_muted', String(this.isMuted));
    this.updateMuteState();
  }

  private updateMuteState() {
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.context?.currentTime || 0);
    }
  }

  // --- Sound Generators ---

  // Helper: Create White Noise Buffer
  private createNoiseBuffer(): AudioBuffer | null {
    if (!this.context) return null;
    const bufferSize = this.context.sampleRate * 2; // 2 seconds buffer
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Shuffle: Ruffling noise
  public playShuffle() {
    this.initContext();
    if (this.isMuted || !this.context || !this.masterGain) return;

    const t = this.context.currentTime;
    const noise = this.context.createBufferSource();
    noise.buffer = this.createNoiseBuffer();

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.exponentialRampToValueAtTime(3000, t + 0.1);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.4);
  }

  // Deal Process Start: A "Deck Tap" or preparation sound
  public playDeckTap() {
      this.initContext();
      if (this.isMuted || !this.context || !this.masterGain) return;

      const t = this.context.currentTime;

      // Low thud
      const osc = this.context.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.2);
  }

  // Individual Card Deal: "Thwip" / Whoosh
  public playDeal() {
    this.initContext();
    if (this.isMuted || !this.context || !this.masterGain) return;

    const t = this.context.currentTime;
    const noise = this.context.createBufferSource();
    noise.buffer = this.createNoiseBuffer();

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.linearRampToValueAtTime(2000, t + 0.1);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
    gain.gain.linearRampToValueAtTime(0, t + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.2);
  }

  // Place/Play Card: Snap/Click
  public playPlace() {
    this.initContext();
    if (this.isMuted || !this.context || !this.masterGain) return;

    const t = this.context.currentTime;

    // High frequency snap (Noise burst)
    const noise = this.context.createBufferSource();
    noise.buffer = this.createNoiseBuffer();

    const noiseFilter = this.context.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 2000;

    const noiseGain = this.context.createGain();
    noiseGain.gain.setValueAtTime(0.3, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.1);

    // Body of the snap (short sine tone)
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);

    const oscGain = this.context.createGain();
    oscGain.gain.setValueAtTime(0.2, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  // Eat: Slide/Collection sound
  public playEat() {
      this.initContext();
      if (this.isMuted || !this.context || !this.masterGain) return;

      const t = this.context.currentTime;
      const noise = this.context.createBufferSource();
      noise.buffer = this.createNoiseBuffer();

      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, t);
      filter.frequency.linearRampToValueAtTime(1200, t + 0.2);

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.1);
      gain.gain.linearRampToValueAtTime(0, t + 0.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(t);
      noise.stop(t + 0.5);
  }
}

export const soundManager = new SoundManager();
