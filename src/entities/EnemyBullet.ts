import Phaser from 'phaser';

const BULLET_RADIUS = 5;
const BULLET_DEFAULT_SPEED = 260;
export const ENEMY_BULLET_DAMAGE = 1;

export class EnemyBullet extends Phaser.GameObjects.Arc {
  declare body: Phaser.Physics.Arcade.Body;
  readonly damage: number = ENEMY_BULLET_DAMAGE;

  constructor(scene: Phaser.Scene, x: number, y: number, angleRad: number, speed: number = BULLET_DEFAULT_SPEED) {
    super(scene, x, y, BULLET_RADIUS, 0, 360, false, 0xff60aa);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCircle(BULLET_RADIUS);
    this.body.setAllowGravity(false);
    this.body.setVelocity(Math.cos(angleRad) * speed, Math.sin(angleRad) * speed);
    this.setDepth(25);
  }
}
