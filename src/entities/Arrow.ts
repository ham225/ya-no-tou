import Phaser from 'phaser';

const ARROW_LENGTH = 18;
const ARROW_WIDTH = 4;
export const ARROW_SPEED = 540;
export const ARROW_DAMAGE = 1;

export class Arrow extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.Body;

  readonly damage: number = ARROW_DAMAGE;

  constructor(scene: Phaser.Scene, x: number, y: number, angleRad: number) {
    super(scene, x, y, ARROW_LENGTH, ARROW_WIDTH, 0xffe066);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(30);
    this.setRotation(angleRad);
    this.body.setVelocity(Math.cos(angleRad) * ARROW_SPEED, Math.sin(angleRad) * ARROW_SPEED);
    this.body.setAllowGravity(false);
  }
}
