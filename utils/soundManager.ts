
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

  // Shuffle: Louder and crisper
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
    // Increased peak gain from 0.3 to 0.8
    gain.gain.linearRampToValueAtTime(0.8, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.4);
  }

  // Deal Start: More pronounced tap
  public playDeckTap() {
      this.initContext();
      if (this.isMuted || !this.context || !this.masterGain) return;

      const t = this.context.currentTime;

      const osc = this.context.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, t); // Slightly higher pitch
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);

      const gain = this.context.createGain();
      // Increased gain from 0.5 to 0.8
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.2);
  }

  // Card Deal: Sharper Thwip
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
    // Increased peak gain from 0.15 to 0.5
    gain.gain.linearRampToValueAtTime(0.5, t + 0.02);
    gain.gain.linearRampToValueAtTime(0, t + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.2);
  }

  // Place Card: Harder Snap
  public playPlace() {
    this.initContext();
    if (this.isMuted || !this.context || !this.masterGain || !this.noiseBuffer) return;

    const t = this.context.currentTime;

    // Snap (Noise)
    const noise = this.context.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const noiseFilter = this.context.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 2500;

    const noiseGain = this.context.createGain();
    // Increased gain from 0.3 to 0.7
    noiseGain.gain.setValueAtTime(0.7, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.1);

    // Body (Sine)
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);

    const oscGain = this.context.createGain();
    // Increased gain from 0.2 to 0.5
    oscGain.gain.setValueAtTime(0.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // Eat: Louder Slide
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
      // Increased gain from 0.2 to 0.6
      gain.gain.linearRampToValueAtTime(0.6, t + 0.1);
      gain.gain.linearRampToValueAtTime(0, t + 0.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(t);
      noise.stop(t + 0.5);
  }

  // Notification: Pleasant Chime
  public playNotification() {
    this.initContext();
    if (this.isMuted || !this.context || !this.masterGain) return;

    const t = this.context.currentTime;

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, t); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.50, t + 0.1); // C6

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  // Error: Low Buzz/Thud
  public playError() {
    this.initContext();
    if (this.isMuted || !this.context || !this.masterGain) return;

    const t = this.context.currentTime;

    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(100, t + 0.15);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  // Victory: Arpeggio
  public playVictory() {
    this.initContext();
    if (this.isMuted || !this.context || !this.masterGain) return;

    const t = this.context.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio

    notes.forEach((freq, index) => {
        const osc = this.context!.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + index * 0.1);

        const gain = this.context!.createGain();
        gain.gain.setValueAtTime(0, t + index * 0.1);
        gain.gain.linearRampToValueAtTime(0.3, t + index * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, t + index * 0.1 + 0.4);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(t + index * 0.1);
        osc.stop(t + index * 0.1 + 0.5);
    });
  }
}

export const soundManager = new SoundManager();
