import Phaser from 'phaser';
import { Player, PLAYER_SPEED } from '../entities/Player';
import { Enemy, EnemyDeathContext } from '../entities/Enemy';
import { EnemyType } from '../entities/EnemyTypes';
import { Arrow } from '../entities/Arrow';
import { EnemyBullet } from '../entities/EnemyBullet';
import { Boss } from '../entities/Boss';
import { STAGES } from '../config/Stages';

const JOYSTICK_RADIUS = 80;
const JOYSTICK_DEADZONE = 8;
const OVERLAY_TAP_LOCK_MS = 500;
const HP_BAR_WIDTH = 156;
const BOSS_BAR_WIDTH = 360;

type GameState = 'playing' | 'stageCleared' | 'gameOver' | 'allClear';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: Phaser.GameObjects.Group;
  private arrows!: Phaser.GameObjects.Group;
  private enemyBullets!: Phaser.GameObjects.Group;
  private boss: Boss | null = null;

  private joystickOrigin: Phaser.Math.Vector2 | null = null;
  private joystickCurrent: Phaser.Math.Vector2 | null = null;
  private joystickPointerId: number | null = null;
  private baseCircle!: Phaser.GameObjects.Arc;
  private knobCircle!: Phaser.GameObjects.Arc;

  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private stageText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private bossBarBg!: Phaser.GameObjects.Rectangle;
  private bossBarFill!: Phaser.GameObjects.Rectangle;
  private bossLabel!: Phaser.GameObjects.Text;
  private overlayTitle!: Phaser.GameObjects.Text;
  private overlaySub!: Phaser.GameObjects.Text;

  private currentStage = 1;
  private killCount = 0;
  private gameState: GameState = 'playing';
  private overlayLockedUntil = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.physics.world.setBounds(0, 0, width, height);

    this.player = new Player(this, width / 2, height * 0.75);
    this.enemies = this.add.group();
    this.arrows = this.add.group();
    this.enemyBullets = this.add.group();

    this.baseCircle = this.add
      .circle(0, 0, JOYSTICK_RADIUS, 0xffffff, 0.12)
      .setVisible(false)
      .setDepth(50);
    this.knobCircle = this.add
      .circle(0, 0, JOYSTICK_RADIUS * 0.4, 0xffffff, 0.35)
      .setVisible(false)
      .setDepth(51);

    this.createHUD();

    this.physics.add.overlap(
      this.arrows,
      this.enemies,
      this.handleArrowHitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.handleEnemyHitPlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.enemyBullets,
      this.handleBulletHitPlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);

    this.startStage(1);
  }

  update(time: number, delta: number): void {
    if (this.gameState !== 'playing') return;
    const dtSec = delta / 1000;

    this.updatePlayerMovement();
    this.updateEnemies(time, dtSec);
    this.updateBoss(time);
    this.tryAutoAttack(time);
    this.cullOffscreen();
    this.updateHUD();

    if (!this.player.isAlive) {
      this.enterGameOver(time);
      return;
    }

    if (this.boss) {
      if (!this.boss.isAlive) {
        this.boss.destroy();
        this.boss = null;
        this.enemyBullets.clear(true, true);
        this.bossBarBg.setVisible(false);
        this.bossBarFill.setVisible(false);
        this.bossLabel.setVisible(false);
        this.enterStageCleared(time);
      }
    } else if (this.enemies.countActive(true) === 0) {
      this.enterStageCleared(time);
    }
  }

  private createHUD(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, 14, '矢の塔', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#e9e9ff',
      })
      .setOrigin(0.5, 0)
      .setDepth(100);

    this.add
      .rectangle(20, 60, HP_BAR_WIDTH + 4, 18, 0x333344, 0.85)
      .setOrigin(0, 0.5)
      .setDepth(100);
    this.hpBarFill = this.add
      .rectangle(22, 60, HP_BAR_WIDTH, 14, 0x66ff88)
      .setOrigin(0, 0.5)
      .setDepth(101);
    this.hpText = this.add
      .text(22 + HP_BAR_WIDTH / 2, 60, '', {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: '#000',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(102);

    this.stageText = this.add
      .text(width / 2, 60, '', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#e9e9ff',
        align: 'center',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(100);

    this.killText = this.add
      .text(width - 20, 60, '', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#e9e9ff',
      })
      .setOrigin(1, 0.5)
      .setDepth(100);

    this.bossBarBg = this.add
      .rectangle(width / 2, 100, BOSS_BAR_WIDTH + 4, 16, 0x222233, 0.9)
      .setOrigin(0.5)
      .setDepth(100)
      .setVisible(false);
    this.bossBarFill = this.add
      .rectangle(width / 2 - BOSS_BAR_WIDTH / 2, 100, BOSS_BAR_WIDTH, 12, 0xff3060)
      .setOrigin(0, 0.5)
      .setDepth(101)
      .setVisible(false);
    this.bossLabel = this.add
      .text(width / 2, 84, 'BOSS', {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#ff8aa0',
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setVisible(false);

    this.overlayTitle = this.add
      .text(width / 2, height / 2 - 30, '', {
        fontFamily: 'sans-serif',
        fontSize: '40px',
        color: '#ffffff',
        stroke: '#000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setVisible(false);
    this.overlaySub = this.add
      .text(width / 2, height / 2 + 30, '', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#ffe066',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setVisible(false);
  }

  private updateHUD(): void {
    const hpRatio = this.player.hp / this.player.maxHp;
    this.hpBarFill.width = HP_BAR_WIDTH * hpRatio;
    this.hpText.setText(`HP ${this.player.hp}/${this.player.maxHp}`);

    const stage = STAGES[this.currentStage - 1];
    const stageName = stage ? stage.name : '???';
    this.stageText.setText(`ステージ ${this.currentStage}\n${stageName}`);

    this.killText.setText(`撃破: ${this.killCount}`);

    if (this.boss) {
      const ratio = this.boss.hp / this.boss.maxHp;
      this.bossBarFill.width = BOSS_BAR_WIDTH * ratio;
    }
  }

  private startStage(stage: number): void {
    if (stage > STAGES.length) {
      this.gameState = 'allClear';
      this.overlayTitle.setText('全クリア!').setVisible(true);
      this.overlaySub
        .setText(`撃破数 ${this.killCount}\nタップでステージ1から再挑戦`)
        .setVisible(true);
      this.overlayLockedUntil = this.time.now + OVERLAY_TAP_LOCK_MS;
      this.clearJoystick();
      return;
    }

    this.currentStage = stage;
    this.enemies.clear(true, true);
    this.arrows.clear(true, true);
    this.enemyBullets.clear(true, true);
    if (this.boss) {
      this.boss.destroy();
      this.boss = null;
    }
    this.bossBarBg.setVisible(false);
    this.bossBarFill.setVisible(false);
    this.bossLabel.setVisible(false);

    const cfg = STAGES[stage - 1];
    if (cfg.isBoss) {
      this.spawnBoss();
    } else {
      this.spawnStageEnemies(cfg.spawns);
    }

    this.gameState = 'playing';
    this.overlayTitle.setVisible(false);
    this.overlaySub.setVisible(false);
    this.updateHUD();
  }

  private spawnStageEnemies(spawns: { type: EnemyType; count: number }[]): void {
    spawns.forEach((s) => {
      for (let i = 0; i < s.count; i++) {
        const x = Phaser.Math.Between(50, this.scale.width - 50);
        const y = Phaser.Math.Between(100, 240);
        this.enemies.add(new Enemy(this, x, y, s.type));
      }
    });
  }

  private spawnBoss(): void {
    const { width } = this.scale;
    this.boss = new Boss(this, width / 2, 180);
    this.physics.add.overlap(
      this.arrows,
      this.boss,
      this.handleArrowHitBoss as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.boss,
      this.handleBossHitPlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );
    this.bossBarBg.setVisible(true);
    this.bossBarFill.setVisible(true);
    this.bossLabel.setVisible(true);
  }

  private updatePlayerMovement(): void {
    if (this.joystickOrigin && this.joystickCurrent) {
      const dx = this.joystickCurrent.x - this.joystickOrigin.x;
      const dy = this.joystickCurrent.y - this.joystickOrigin.y;
      const dist = Math.hypot(dx, dy);
      if (dist > JOYSTICK_DEADZONE) {
        const intensity = Math.min(dist, JOYSTICK_RADIUS) / JOYSTICK_RADIUS;
        const nx = dx / dist;
        const ny = dy / dist;
        this.player.body.setVelocity(nx * PLAYER_SPEED * intensity, ny * PLAYER_SPEED * intensity);
        return;
      }
    }
    this.player.body.setVelocity(0, 0);
  }

  private updateEnemies(time: number, dtSec: number): void {
    const addBullet = (b: EnemyBullet): void => {
      this.enemyBullets.add(b);
    };
    this.enemies.getChildren().forEach((obj) => {
      const enemy = obj as Enemy;
      enemy.updateAI(this.player.x, this.player.y, time, dtSec, addBullet);
    });
  }

  private updateBoss(time: number): void {
    if (!this.boss) return;
    const addBullet = (b: EnemyBullet): void => {
      this.enemyBullets.add(b);
    };
    this.boss.updateAI(this.player.x, this.player.y, time, addBullet);
  }

  private tryAutoAttack(time: number): void {
    if (this.player.isMoving) return;
    if (!this.player.canAttack(time)) return;
    const target = this.findClosestTarget();
    if (!target) return;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    const arrow = new Arrow(this, this.player.x, this.player.y, angle);
    this.arrows.add(arrow);
    this.player.markAttacked(time);
  }

  private cullOffscreen(): void {
    const margin = 30;
    const w = this.scale.width;
    const h = this.scale.height;
    const isOutside = (x: number, y: number): boolean =>
      x < -margin || x > w + margin || y < -margin || y > h + margin;

    this.arrows.getChildren().forEach((obj) => {
      const a = obj as Arrow;
      if (isOutside(a.x, a.y)) a.destroy();
    });
    this.enemyBullets.getChildren().forEach((obj) => {
      const b = obj as EnemyBullet;
      if (isOutside(b.x, b.y)) b.destroy();
    });
  }

  private findClosestTarget(): { x: number; y: number } | null {
    let closest: { x: number; y: number } | null = null;
    let best = Infinity;
    this.enemies.getChildren().forEach((obj) => {
      const e = obj as Enemy;
      if (!e.isAlive) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (d < best) {
        best = d;
        closest = e;
      }
    });
    if (this.boss && this.boss.isAlive) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
      if (d < best) {
        best = d;
        closest = this.boss;
      }
    }
    return closest;
  }

  private handleArrowHitEnemy = (arrowObj: unknown, enemyObj: unknown): void => {
    const arrow = arrowObj as Arrow;
    const enemy = enemyObj as Enemy;
    if (!enemy.isAlive) {
      arrow.destroy();
      return;
    }
    enemy.takeDamage(arrow.damage);
    arrow.destroy();
    if (!enemy.isAlive) {
      const ctx: EnemyDeathContext = {
        scene: this,
        playerX: this.player.x,
        playerY: this.player.y,
        damagePlayer: (amount) => {
          this.player.takeDamage(amount, this.time.now);
        },
        spawnEnemy: (type, x, y) => {
          const clampedX = Phaser.Math.Clamp(x, 30, this.scale.width - 30);
          const clampedY = Phaser.Math.Clamp(y, 30, this.scale.height - 30);
          this.enemies.add(new Enemy(this, clampedX, clampedY, type));
        },
      };
      enemy.handleDeath(ctx);
      enemy.destroy();
      this.killCount++;
    }
  };

  private handleArrowHitBoss = (arrowObj: unknown, _bossObj: unknown): void => {
    const arrow = arrowObj as Arrow;
    if (!this.boss || !this.boss.isAlive) {
      arrow.destroy();
      return;
    }
    this.boss.takeDamage(arrow.damage, this.time.now);
    arrow.destroy();
  };

  private handleEnemyHitPlayer = (_playerObj: unknown, enemyObj: unknown): void => {
    const enemy = enemyObj as Enemy;
    if (!enemy.isAlive) return;
    this.player.takeDamage(enemy.contactDamage, this.time.now);
  };

  private handleBossHitPlayer = (): void => {
    if (!this.boss || !this.boss.isAlive) return;
    this.player.takeDamage(this.boss.contactDamage, this.time.now);
  };

  private handleBulletHitPlayer = (_playerObj: unknown, bulletObj: unknown): void => {
    const bullet = bulletObj as EnemyBullet;
    this.player.takeDamage(bullet.damage, this.time.now);
    bullet.destroy();
  };

  private enterStageCleared(time: number): void {
    this.gameState = 'stageCleared';
    this.player.body.setVelocity(0, 0);
    this.enemyBullets.clear(true, true);
    if (this.currentStage >= STAGES.length) {
      this.overlayTitle.setText('全クリア!').setVisible(true);
      this.overlaySub
        .setText(`撃破数 ${this.killCount}\nタップでステージ1から再挑戦`)
        .setVisible(true);
    } else {
      this.overlayTitle.setText('ステージクリア!').setVisible(true);
      this.overlaySub.setText('タップで次のステージへ').setVisible(true);
    }
    this.overlayLockedUntil = time + OVERLAY_TAP_LOCK_MS;
    this.clearJoystick();
  }

  private enterGameOver(time: number): void {
    this.gameState = 'gameOver';
    this.player.body.setVelocity(0, 0);
    this.enemyBullets.clear(true, true);
    this.overlayTitle.setText('ゲームオーバー').setVisible(true);
    this.overlaySub.setText('タップでリトライ').setVisible(true);
    this.overlayLockedUntil = time + OVERLAY_TAP_LOCK_MS;
    this.clearJoystick();
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.gameState !== 'playing') {
      if (this.time.now < this.overlayLockedUntil) return;
      if (this.gameState === 'stageCleared') {
        if (this.currentStage >= STAGES.length) {
          this.killCount = 0;
          this.player.reset(this.scale.width / 2, this.scale.height * 0.75);
          this.startStage(1);
        } else {
          this.startStage(this.currentStage + 1);
        }
      } else if (this.gameState === 'gameOver') {
        this.killCount = 0;
        this.player.reset(this.scale.width / 2, this.scale.height * 0.75);
        this.startStage(1);
      } else if (this.gameState === 'allClear') {
        this.killCount = 0;
        this.player.reset(this.scale.width / 2, this.scale.height * 0.75);
        this.startStage(1);
      }
      return;
    }
    if (this.joystickPointerId !== null) return;
    this.joystickPointerId = pointer.id;
    this.joystickOrigin = new Phaser.Math.Vector2(pointer.x, pointer.y);
    this.joystickCurrent = this.joystickOrigin.clone();
    this.baseCircle.setPosition(pointer.x, pointer.y).setVisible(true);
    this.knobCircle.setPosition(pointer.x, pointer.y).setVisible(true);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.joystickPointerId || !this.joystickOrigin) return;
    this.joystickCurrent = new Phaser.Math.Vector2(pointer.x, pointer.y);
    const dx = pointer.x - this.joystickOrigin.x;
    const dy = pointer.y - this.joystickOrigin.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, JOYSTICK_RADIUS);
    const angle = Math.atan2(dy, dx);
    this.knobCircle.setPosition(
      this.joystickOrigin.x + Math.cos(angle) * clamped,
      this.joystickOrigin.y + Math.sin(angle) * clamped,
    );
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.joystickPointerId) return;
    this.clearJoystick();
  }

  private clearJoystick(): void {
    this.joystickPointerId = null;
    this.joystickOrigin = null;
    this.joystickCurrent = null;
    this.baseCircle.setVisible(false);
    this.knobCircle.setVisible(false);
  }
}
