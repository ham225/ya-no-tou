import Phaser from 'phaser';
import { PlayerStats } from '../state/PlayerStats';

export const PLAYER_SIZE = 36;
const PLAYER_INVULNERABLE_MS = 600;
const MOVING_VELOCITY_THRESHOLD = 5;

export class Player extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.Body;

  hp: number;
  readonly stats: PlayerStats;

  private lastAttackTime = 0;
  private invulnerableUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, stats: PlayerStats) {
    super(scene, x, y, PLAYER_SIZE, PLAYER_SIZE, 0x6ad7ff);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCollideWorldBounds(true);
    this.setDepth(20);
    this.stats = stats;
    this.hp = stats.maxHp;
  }

  get maxHp(): number {
    return this.stats.maxHp;
  }

  get moveSpeed(): number {
    return this.stats.moveSpeed;
  }

  get isAlive(): boolean {
    return this.hp > 0;
  }

  get isMoving(): boolean {
    return Math.hypot(this.body.velocity.x, this.body.velocity.y) > MOVING_VELOCITY_THRESHOLD;
  }

  canAttack(time: number): boolean {
    return time - this.lastAttackTime >= this.stats.attackIntervalMs;
  }

  markAttacked(time: number): void {
    this.lastAttackTime = time;
  }

  takeDamage(amount: number, time: number): boolean {
    if (time < this.invulnerableUntil || !this.isAlive) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableUntil = time + PLAYER_INVULNERABLE_MS;
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 0.3, to: 1 },
      duration: PLAYER_INVULNERABLE_MS,
      ease: 'Linear',
    });
    return true;
  }

  reset(x: number, y: number): void {
    this.hp = this.stats.maxHp;
    this.lastAttackTime = 0;
    this.invulnerableUntil = 0;
    this.setPosition(x, y);
    this.setAlpha(1);
    this.body.setVelocity(0, 0);
  }
}
