/**
 * Sintetizador de audio procedimental con Web Audio API
 * Genera señales sonoras sutiles de HMI industrial sin fricción y sin descargas externas
 */

class SoundEffectsService {
  private audioCtx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Chime suave de llegada de moto / detección de sensor
   */
  public playVehicleDetected() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.audioCtx.currentTime); // A4
      osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.25);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Sonido de talanquera abriéndose
   */
  public playGateOpening() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, this.audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(540, this.audioCtx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.4);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Chime de bahía ocupada / éxito de parqueo
   */
  public playSpotOccupied() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      [587.33, 880].forEach((freq, i) => {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0.06, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.2);
      });
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Alerta de parqueadero lleno
   */
  public playParkingFull() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, this.audioCtx.currentTime);
      osc.frequency.setValueAtTime(220, this.audioCtx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.07, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.35);
    } catch {
      // Audio autoplay policy fallback
    }
  }
}

export const soundEffects = new SoundEffectsService();
