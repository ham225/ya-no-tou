import Phaser from 'phaser';

const ORBIT_RADIUS = 70;
const ORBIT_ANGULAR_SPEED = 2.6;
const ORBIT_LENGTH = 18;
const ORBIT_WIDTH = 6;
const ORBIT_HIT_COOLDOWN_MS = 500;
export const ORBIT_DAMAGE = 1;
export const ORBIT_HIT_RADIUS = 14;

export class OrbitArrow extends Phaser.GameObjects.Rectangle {
  orbitAngle: number;
  private readonly hitCooldown = new Map<unknown, number>();

  constructor(scene: Phaser.Scene, initialAngle: number) {
    super(scene, 0, 0, ORBIT_LENGTH, ORBIT_WIDTH, 0xffd066);
    scene.add.existing(this);
    this.setDepth(28);
    this.orbitAngle = initialAngle;
  }

  updatePosition(playerX: number, playerY: number, dtSec: number): void {
    this.orbitAngle += ORBIT_ANGULAR_SPEED * dtSec;
    this.x = playerX + Math.cos(this.orbitAngle) * ORBIT_RADIUS;
    this.y = playerY + Math.sin(this.orbitAngle) * ORBIT_RADIUS;
    this.setRotation(this.orbitAngle + Math.PI / 2);
  }

  canDamage(target: unknown, time: number): boolean {
    const cd = this.hitCooldown.get(target);
    return cd === undefined || time >= cd;
  }

  recordHit(target: unknown, time: number): void {
    this.hitCooldown.set(target, time + ORBIT_HIT_COOLDOWN_MS);
  }
}
