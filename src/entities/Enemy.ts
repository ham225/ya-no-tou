import Phaser from 'phaser';

export const ENEMY_SIZE = 32;

export interface EnemyConfig {
  hp: number;
  speed: number;
  contactDamage: number;
  color?: number;
}

export class Enemy extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.Body;

  hp: number;
  readonly maxHp: number;
  readonly speed: number;
  readonly contactDamage: number;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyConfig) {
    super(scene, x, y, ENEMY_SIZE, ENEMY_SIZE, config.color ?? 0xff5e5e);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCollideWorldBounds(true);
    this.setDepth(10);

    this.hp = config.hp;
    this.maxHp = config.hp;
    this.speed = config.speed;
    this.contactDamage = config.contactDamage;
  }

  get isAlive(): boolean {
    return this.hp > 0;
  }

  moveToward(targetX: number, targetY: number): void {
    if (!this.isAlive) return;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) {
      this.body.setVelocity(0, 0);
      return;
    }
    this.body.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed);
  }

  takeDamage(amount: number): boolean {
    if (!this.isAlive) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 0.4, to: 1 },
      duration: 120,
      ease: 'Linear',
    });
    return true;
  }
}
