
class SoundManager {
  private context: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    try {
      this.isMuted = localStorage.getItem('quatch_muted') === 'true';
    } catch (e) {
      console.warn('LocalStorage access denied, default to unmuted.');
      this.isMuted = false;
    }
  }

  private initContext() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.context = new AudioContext();
        this.masterGain = this.context.createGain();
        this.masterGain.connect(this.context.destination);
        this.updateMuteState();
        this.createNoiseBuffer(); // Pre-generate buffer
      }
    } else if (this.context.state === 'suspended') {
      this.context.resume().catch(e => console.error("Audio resume failed", e));
    }
  }

  public getMuted(): boolean {
      return this.isMuted;
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('quatch_muted', String(this.isMuted));
    } catch (e) {
      // ignore
    }
    this.updateMuteState();
  }

  private updateMuteState() {
    if (this.masterGain && this.context) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.context.currentTime);
    }
  }

  private createNoiseBuffer() {
    if (!this.context || this.noiseBuffer) return;
    const bufferSize = this.context.sampleRate * 2; // 2 seconds
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  // Shuffle: Bandpass Noise (7/10 - Preserved)
  public playShuffle() {
    this.initContext();
    if (this.isMuted || !this.context || !this.masterGain || !this.noiseBuffer) return;

    const t = this.context.currentTime;
    const noise = this.context.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(3500, t + 0.1);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.8, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.4);
  }

  // Deal Start: Triangle Osc (8/10 - Preserved)
  public playDeckTap() {
      this.initContext();
      if (this.isMuted || !this.context || !this.masterGain) return;

      const t = this.context.currentTime;

      const osc = this.context.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.2);
  }

  // Card Deal: Lowpass Noise (8/10 - Preserved)
  public playDeal() {
    this.initContext();
    if (this.isMuted || !this.context || !this.masterGain || !this.noiseBuffer) return;

    const t = this.context.currentTime;
    const noise = this.context.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.linearRampToValueAtTime(2500, t + 0.1);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.02);
    gain.gain.linearRampToValueAtTime(0, t + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.2);
  }

  // Eat: Lowpass Slide (10/10 - Preserved)
  public playEat() {
      this.initContext();
      if (this.isMuted || !this.context || !this.masterGain || !this.noiseBuffer) return;

      const t = this.context.currentTime;
      const noise = this.context.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, t);
      filter.frequency.linearRampToValueAtTime(1200, t + 0.2);

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.6, t + 0.1);
      gain.gain.linearRampToValueAtTime(0, t + 0.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(t);
      noise.stop(t + 0.5);
  }

  // Place Card: Hard Snap (Foley Style)
  // Layer 1: High frequency snap (Highpass Noise)
  // Layer 2: Table impact body (Low frequency bandpass)
  public playPlace() {
    this.initContext();
    if (this.isMuted || !this.context || !this.masterGain || !this.noiseBuffer) return;

    const t = this.context.currentTime;

    // Layer 1: The Snap (High frequency crack)
    const snapSource = this.context.createBufferSource();
    snapSource.buffer = this.noiseBuffer;

    const snapFilter = this.context.createBiquadFilter();
    snapFilter.type = 'highpass';
    snapFilter.frequency.setValueAtTime(3000, t);
    snapFilter.frequency.exponentialRampToValueAtTime(1000, t + 0.05);

    const snapGain = this.context.createGain();
    snapGain.gain.setValueAtTime(0.8, t);
    snapGain.gain.exponentialRampToValueAtTime(0.01, t + 0.04); // Very short

    snapSource.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(this.masterGain);
    snapSource.start(t);
    snapSource.stop(t + 0.1);

    // Layer 2: The Body (Table Thud)
    const bodySource = this.context.createBufferSource();
    bodySource.buffer = this.noiseBuffer;

    const bodyFilter = this.context.createBiquadFilter();
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(400, t);

    const bodyGain = this.context.createGain();
    bodyGain.gain.setValueAtTime(0.5, t);
    bodyGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    bodySource.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(this.masterGain);
    bodySource.start(t);
    bodySource.stop(t + 0.15);
  }

  // Notification (Clear/Reset): Card Flourish/Whoosh (Diegetic)
  public playNotification() {
    this.initContext();
    if (this.isMuted || !this.context || !this.masterGain || !this.noiseBuffer) return;

    const t = this.context.currentTime;

    // Whoosh (Bandpass Sweep)
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1;
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(2000, t + 0.3);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.1); // Swell
    gain.gain.linearRampToValueAtTime(0, t + 0.4);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start(t);
    source.stop(t + 0.5);

    // Subtle "Ding" (Coin/Chip sound) to accent
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, t + 0.2);

    const oscGain = this.context.createGain();
    oscGain.gain.setValueAtTime(0, t + 0.2);
    oscGain.gain.linearRampToValueAtTime(0.1, t + 0.21);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t + 0.2);
    osc.stop(t + 0.6);
  }

  // Error: Dull Thud (Diegetic - Card Reject)
  public playError() {
    this.initContext();
    if (this.isMuted || !this.context || !this.masterGain || !this.noiseBuffer) return;

    const t = this.context.currentTime;

    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;

    // Heavy lowpass for "dead" sound
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1); // Short thud

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(t);
    source.stop(t + 0.2);
  }

  // Victory: Card Cascade (Diegetic - Card Waterfall)
  public playVictory() {
    this.initContext();
    if (this.isMuted || !this.context || !this.masterGain || !this.noiseBuffer) return;

    const t = this.context.currentTime;

    // Trigger multiple "deal-like" sounds rapidly
    const count = 15;
    for (let i = 0; i < count; i++) {
        const offset = i * 0.08;

        const source = this.context.createBufferSource();
        source.buffer = this.noiseBuffer;

        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';
        // Vary frequency slightly for texture
        const startFreq = 800 + Math.random() * 400;
        filter.frequency.setValueAtTime(startFreq, t + offset);
        filter.frequency.linearRampToValueAtTime(startFreq + 1000, t + offset + 0.1);

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0, t + offset);
        gain.gain.linearRampToValueAtTime(0.15, t + offset + 0.02);
        gain.gain.linearRampToValueAtTime(0, t + offset + 0.15);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        source.start(t + offset);
        source.stop(t + offset + 0.2);
    }
  }
}

export const soundManager = new SoundManager();
