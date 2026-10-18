/**
 * Sintetizador de audio procedimental con Web Audio API.
 * Señales sutiles de HMI industrial sin archivos externos.
 */
class SonidoHMI {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private get ready(): AudioContext | null {
    if (!this.ctx) {
      const Cls = window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Cls) this.ctx = new Cls();
    }
    if (this.ctx?.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private tono(tipo: OscillatorType, f0: number, f1: number, dur: number, vol: number) {
    const ctx = this.ready;
    if (!ctx || !this.enabled) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(f0, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(f1, ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  /** Detección de vehículo por sensor de carril. */
  deteccion() {
    this.tono("sine", 440, 880, 0.25, 0.08);
  }

  /** Talanquera abriéndose. */
  talanquera() {
    this.tono("triangle", 320, 540, 0.4, 0.05);
  }

  /** Plaza ocupada / parqueo exitoso (doble chime). */
  parqueo() {
    const ctx = this.ready;
    if (!ctx || !this.enabled) return;
    [587.33, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
      gain.gain.setValueAtTime(0.06, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.2);
    });
  }

  /** Alerta de parqueadero lleno o bloqueo. */
  lleno() {
    this.tono("sawtooth", 280, 220, 0.35, 0.07);
  }
}

export const sonido = new SonidoHMI();
