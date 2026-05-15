import Phaser from 'phaser';
import { EnemyBullet } from './EnemyBullet';

export const BOSS_HP = 50;
const BOSS_SIZE = 84;
const BOSS_CHASE_SPEED = 42;
const BOSS_CHARGE_SPEED = 280;
const BOSS_PATTERN_INTERVAL_MS = 2700;
const BOSS_BURST_BULLETS = 14;
const BOSS_BURST_SPEED = 220;
const BOSS_INVULNERABLE_MS = 80;

type BossPhase = 'chase' | 'burst' | 'charge';

export class Boss extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.Body;

  hp: number = BOSS_HP;
  readonly maxHp: number = BOSS_HP;
  readonly contactDamage: number = 2;

  private phase: BossPhase = 'chase';
  private phaseUntil = 0;
  private nextPatternAt: number;
  private invulnerableUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, BOSS_SIZE, BOSS_SIZE, 0xff3060);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCollideWorldBounds(true);
    this.setStrokeStyle(3, 0xffffff, 1);
    this.setDepth(15);
    this.nextPatternAt = scene.time.now + BOSS_PATTERN_INTERVAL_MS;
  }

  get isAlive(): boolean {
    return this.hp > 0;
  }

  takeDamage(amount: number, time: number): boolean {
    if (!this.isAlive) return false;
    if (time < this.invulnerableUntil) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableUntil = time + BOSS_INVULNERABLE_MS;
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 0.4, to: 1 },
      duration: 120,
      ease: 'Linear',
    });
    return true;
  }

  updateAI(
    targetX: number,
    targetY: number,
    time: number,
    addBullet: (b: EnemyBullet) => void,
  ): void {
    if (!this.isAlive) {
      this.body.setVelocity(0, 0);
      return;
    }

    if (this.phase !== 'chase' && time >= this.phaseUntil) {
      this.phase = 'chase';
    }

    if (this.phase === 'chase') {
      if (time >= this.nextPatternAt) {
        const pick = Math.random();
        if (pick < 0.55) this.startBurst(time, addBullet);
        else this.startCharge(time, targetX, targetY);
        this.nextPatternAt = time + BOSS_PATTERN_INTERVAL_MS;
      } else {
        this.moveStraight(targetX, targetY, BOSS_CHASE_SPEED);
      }
    }
    // burst: velocity is 0 (set in startBurst); charge: velocity already set
  }

  private startBurst(time: number, addBullet: (b: EnemyBullet) => void): void {
    this.phase = 'burst';
    this.phaseUntil = time + 700;
    this.body.setVelocity(0, 0);
    for (let i = 0; i < BOSS_BURST_BULLETS; i++) {
      const angle = (Math.PI * 2 * i) / BOSS_BURST_BULLETS;
      addBullet(new EnemyBullet(this.scene, this.x, this.y, angle, BOSS_BURST_SPEED));
    }
  }

  private startCharge(time: number, tx: number, ty: number): void {
    this.phase = 'charge';
    this.phaseUntil = time + 750;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    this.body.setVelocity((dx / d) * BOSS_CHARGE_SPEED, (dy / d) * BOSS_CHARGE_SPEED);
  }

  private moveStraight(tx: number, ty: number, speed: number): void {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) {
      this.body.setVelocity(0, 0);
      return;
    }
    this.body.setVelocity((dx / d) * speed, (dy / d) * speed);
  }
}
