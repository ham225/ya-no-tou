import Phaser from 'phaser';
import { EnemyType, EnemyTypeDef, ENEMY_TYPE_DEFS } from './EnemyTypes';
import { EnemyBullet } from './EnemyBullet';

const SHOOTER_INTERVAL_MS = 1400;
const SHOOTER_STOP_DISTANCE = 220;
const ZIGZAG_AMPLITUDE = 1.0;
const ZIGZAG_FREQ = 0.005;
const CHASER_MAX_MULT = 2.2;
const CHASER_ACCEL_PER_SEC = 0.4;
const BOMB_RADIUS = 90;
const BOMB_DAMAGE = 2;
const SPLITTER_CHILDREN = 2;

export interface EnemyScaling {
  hpMult: number;
  speedMult: number;
}

export interface EnemyDeathContext {
  scene: Phaser.Scene;
  playerX: number;
  playerY: number;
  damagePlayer: (amount: number) => void;
  spawnEnemy: (type: EnemyType, x: number, y: number) => void;
}

export class Enemy extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.Body;

  hp: number;
  readonly maxHp: number;
  readonly contactDamage: number;
  readonly type: EnemyType;
  readonly def: EnemyTypeDef;
  readonly speed: number;

  private lastShotTime = 0;
  private readonly spawnedAt: number;
  private readonly zigzagPhase: number;
  private chaserMult = 1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: EnemyType,
    scaling: EnemyScaling = { hpMult: 1, speedMult: 1 },
  ) {
    const def = ENEMY_TYPE_DEFS[type];
    super(scene, x, y, def.size, def.size, def.color);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCollideWorldBounds(true);
    this.setDepth(10);

    this.type = type;
    this.def = def;
    this.hp = Math.max(1, Math.ceil(def.hp * scaling.hpMult));
    this.maxHp = this.hp;
    this.speed = def.speed * scaling.speedMult;
    this.contactDamage = def.contactDamage;
    this.spawnedAt = scene.time.now;
    this.zigzagPhase = Math.random() * Math.PI * 2;
  }

  get isAlive(): boolean {
    return this.hp > 0;
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

  updateAI(
    targetX: number,
    targetY: number,
    time: number,
    dtSec: number,
    addBullet: (b: EnemyBullet) => void,
  ): void {
    if (!this.isAlive) return;
    switch (this.def.ai) {
      case 'chase':
        this.moveStraight(targetX, targetY, this.speed);
        break;
      case 'zigzag':
        this.moveZigzag(targetX, targetY, time);
        break;
      case 'shooter':
        this.shooterBehavior(targetX, targetY, time, addBullet);
        break;
      case 'chaser':
        this.chaserMult = Math.min(CHASER_MAX_MULT, this.chaserMult + CHASER_ACCEL_PER_SEC * dtSec);
        this.moveStraight(targetX, targetY, this.speed * this.chaserMult);
        break;
    }
  }

  handleDeath(ctx: EnemyDeathContext): void {
    if (this.def.onDeath === 'split') {
      for (let i = 0; i < SPLITTER_CHILDREN; i++) {
        const offset = (i - (SPLITTER_CHILDREN - 1) / 2) * 32;
        ctx.spawnEnemy(EnemyType.MINI, this.x + offset, this.y);
      }
    } else if (this.def.onDeath === 'explode') {
      const dx = ctx.playerX - this.x;
      const dy = ctx.playerY - this.y;
      const d = Math.hypot(dx, dy);
      if (d <= BOMB_RADIUS) {
        ctx.damagePlayer(BOMB_DAMAGE);
      }
      const ring = ctx.scene.add
        .circle(this.x, this.y, BOMB_RADIUS, 0xffe066, 0.35)
        .setDepth(30);
      ctx.scene.tweens.add({
        targets: ring,
        alpha: 0,
        scale: 1.2,
        duration: 260,
        ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      });
    }
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

  private moveZigzag(tx: number, ty: number, time: number): void {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) {
      this.body.setVelocity(0, 0);
      return;
    }
    const nx = dx / d;
    const ny = dy / d;
    const wave = Math.sin((time - this.spawnedAt) * ZIGZAG_FREQ + this.zigzagPhase) * ZIGZAG_AMPLITUDE;
    const speed = this.speed;
    this.body.setVelocity((nx + -ny * wave) * speed, (ny + nx * wave) * speed);
  }

  private shooterBehavior(
    tx: number,
    ty: number,
    time: number,
    addBullet: (b: EnemyBullet) => void,
  ): void {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d > SHOOTER_STOP_DISTANCE) {
      this.moveStraight(tx, ty, this.speed);
    } else {
      this.body.setVelocity(0, 0);
    }
    if (time - this.lastShotTime >= SHOOTER_INTERVAL_MS) {
      this.lastShotTime = time;
      const angle = Math.atan2(dy, dx);
      addBullet(new EnemyBullet(this.scene, this.x, this.y, angle));
    }
  }
}
