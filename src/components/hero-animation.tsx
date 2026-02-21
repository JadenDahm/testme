'use client';

import { useEffect, useRef } from 'react';
import p5 from 'p5';

/*--------------------
Vars
--------------------*/
const deg = (a: number) => (Math.PI / 180) * a;
const rand = (v1: number, v2: number) => Math.floor(v1 + Math.random() * (v2 - v1));

interface Opt {
  particles: number;
  noiseScale: number;
  angle: number;
  h1: number;
  h2: number;
  s1: number;
  s2: number;
  l1: number;
  l2: number;
  strokeWeight: number;
  tail: number;
}

/*--------------------
Particle
--------------------*/
class Particle {
  x: number;
  y: number;
  lx: number;
  ly: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  hueSemen: number;
  hue: number;
  sat: number;
  light: number;
  maxSpeed: number;
  p: p5;
  opt: Opt;

  constructor(x: number, y: number, p: p5, opt: Opt) {
    this.p = p;
    this.opt = opt;
    this.x = x;
    this.y = y;
    this.lx = x;
    this.ly = y;
    this.vx = 0;
    this.vy = 0;
    this.ax = 0;
    this.ay = 0;
    this.hueSemen = Math.random();
    this.hue = this.hueSemen > 0.5 ? 20 + opt.h1 : 20 + opt.h2;
    this.sat = this.hueSemen > 0.5 ? opt.s1 : opt.s2;
    this.light = this.hueSemen > 0.5 ? opt.l1 : opt.l2;
    this.maxSpeed = this.hueSemen > 0.5 ? 3 : 2;
  }

  randomize() {
    this.hueSemen = Math.random();
    this.hue = this.hueSemen > 0.5 ? 20 + this.opt.h1 : 20 + this.opt.h2;
    this.sat = this.hueSemen > 0.5 ? this.opt.s1 : this.opt.s2;
    this.light = this.hueSemen > 0.5 ? this.opt.l1 : this.opt.l2;
    this.maxSpeed = this.hueSemen > 0.5 ? 6 : 4; // Doppelt so schnell = längere Linien
  }

  update() {
    this.follow();

    this.vx += this.ax;
    this.vy += this.ay;

    const p = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const a = Math.atan2(this.vy, this.vx);
    const m = Math.min(this.maxSpeed, p);
    this.vx = Math.cos(a) * m;
    this.vy = Math.sin(a) * m;

    this.x += this.vx;
    this.y += this.vy;
    this.ax = 0;
    this.ay = 0;

    this.edges();
  }

  follow() {
    const angle =
      this.p.noise(
        this.x * this.opt.noiseScale,
        this.y * this.opt.noiseScale,
        (window as any).time * this.opt.noiseScale
      ) *
        Math.PI *
        0.5 +
      this.opt.angle;

    this.ax += Math.cos(angle);
    this.ay += Math.sin(angle);
  }

  updatePrev() {
    this.lx = this.x;
    this.ly = this.y;
  }

  edges() {
    const width = this.p.width;
    const height = this.p.height;

    if (this.x < 0) {
      this.x = width;
      this.updatePrev();
    }
    if (this.x > width) {
      this.x = 0;
      this.updatePrev();
    }
    if (this.y < 0) {
      this.y = height;
      this.updatePrev();
    }
    if (this.y > height) {
      this.y = 0;
      this.updatePrev();
    }
  }

  render() {
    // Blau-Töne für Light-Mode - gut sichtbar
    const alpha = 0.6; // Höhere Opazität für bessere Sichtbarkeit
    this.p.stroke(`hsla(${this.hue}, ${this.sat}%, ${this.light}%, ${alpha})`);
    this.p.line(this.x, this.y, this.lx, this.ly);
    this.updatePrev();
  }
}

export function HeroAnimation({ showGUI = false }: { showGUI?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const optRef = useRef<Opt>({
    particles: typeof window !== 'undefined' && window.innerWidth ? Math.floor((window.innerWidth / 50) * 3) : 6000,
    noiseScale: 0.009,
    angle: Math.PI / 180 * -90,
    h1: 210, // Blau
    h2: 210, // Blau
    s1: 70, // Höhere Sättigung für bessere Sichtbarkeit
    s2: 70,
    l1: 45, // Dunklere Helligkeit für bessere Sichtbarkeit
    l2: 45,
    strokeWeight: 2.0, // Doppelt so dick
    tail: 40, // Weniger Tail für längere Linien
  });
  const timeRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const opt = optRef.current;
    let particles = particlesRef.current;
    let time = timeRef.current;

    const sketch = (p: p5) => {
      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        particles = [];
        for (let i = 0; i < opt.particles; i++) {
          particles.push(new Particle(p.random(p.width), p.random(p.height), p, opt));
        }
        p.strokeWeight(opt.strokeWeight);
      };

      p.draw = () => {
        time++;
        (window as any).time = time;
        
        // Helles Grau für Light-Mode - weniger Fade für bessere Sichtbarkeit
        p.background(248, 249, 250, 100 - opt.tail);

        for (const particle of particles) {
          particle.update();
          particle.render();
        }
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
      };

      // Click handler für Farbwechsel
      p.mousePressed = () => {
        opt.h1 = rand(0, 360);
        opt.h2 = rand(0, 360);
        opt.s1 = rand(20, 90);
        opt.s2 = rand(20, 90);
        opt.l1 = rand(30, 80);
        opt.l2 = rand(30, 80);
        opt.angle += deg(rand(60, 60)) * (Math.random() > 0.5 ? 1 : -1);

        for (const particle of particles) {
          particle.randomize();
        }
      };
    };

    const p5Instance = new p5(sketch, containerRef.current);
    p5InstanceRef.current = p5Instance;
    particlesRef.current = particles;
    timeRef.current = time;

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
