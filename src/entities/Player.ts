import Phaser from 'phaser';

export const PLAYER_SIZE = 36;
export const PLAYER_SPEED = 220;
export const PLAYER_MAX_HP = 5;
const PLAYER_ATTACK_INTERVAL_MS = 500;
const PLAYER_INVULNERABLE_MS = 600;
const MOVING_VELOCITY_THRESHOLD = 5;

export class Player extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.Body;

  hp: number = PLAYER_MAX_HP;
  readonly maxHp: number = PLAYER_MAX_HP;

  private lastAttackTime = 0;
  private invulnerableUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, PLAYER_SIZE, PLAYER_SIZE, 0x6ad7ff);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCollideWorldBounds(true);
    this.setDepth(20);
  }

  get isAlive(): boolean {
    return this.hp > 0;
  }

  get isMoving(): boolean {
    return Math.hypot(this.body.velocity.x, this.body.velocity.y) > MOVING_VELOCITY_THRESHOLD;
  }

  canAttack(time: number): boolean {
    return time - this.lastAttackTime >= PLAYER_ATTACK_INTERVAL_MS;
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
    this.hp = this.maxHp;
    this.lastAttackTime = 0;
    this.invulnerableUntil = 0;
    this.setPosition(x, y);
    this.setAlpha(1);
    this.body.setVelocity(0, 0);
  }
}
