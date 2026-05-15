import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy, EnemyDeathContext } from '../entities/Enemy';
import { EnemyType } from '../entities/EnemyTypes';
import { Arrow } from '../entities/Arrow';
import { EnemyBullet } from '../entities/EnemyBullet';
import { Boss } from '../entities/Boss';
import { OrbitArrow, ORBIT_DAMAGE, ORBIT_HIT_RADIUS } from '../entities/OrbitArrow';
import { STAGES } from '../config/Stages';
import { PlayerStats } from '../state/PlayerStats';
import { UpgradeDef, rollUpgradeChoices } from '../upgrades/Upgrades';

const JOYSTICK_RADIUS = 80;
const JOYSTICK_DEADZONE = 8;
const OVERLAY_TAP_LOCK_MS = 500;
const HP_BAR_WIDTH = 156;
const BOSS_BAR_WIDTH = 360;
const MULTISHOT_SPREAD_RAD = 0.22;

type GameState = 'playing' | 'upgradeSelect' | 'gameOver' | 'allClear';

export class GameScene extends Phaser.Scene {
  private playerStats!: PlayerStats;
  private player!: Player;
  private enemies!: Phaser.GameObjects.Group;
  private arrows!: Phaser.GameObjects.Group;
  private enemyBullets!: Phaser.GameObjects.Group;
  private orbitArrows: OrbitArrow[] = [];
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

  private upgradeUI: Phaser.GameObjects.GameObject[] = [];

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

    this.playerStats = new PlayerStats();
    this.player = new Player(this, width / 2, height * 0.75, this.playerStats);
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
    this.updateOrbits(time, dtSec);
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

    this.reconcileOrbits();

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
    const scaling = {
      hpMult: 1 + (this.currentStage - 1) * 0.2,
      speedMult: 1 + (this.currentStage - 1) * 0.04,
    };
    spawns.forEach((s) => {
      for (let i = 0; i < s.count; i++) {
        const x = Phaser.Math.Between(50, this.scale.width - 50);
        const y = Phaser.Math.Between(100, 240);
        this.enemies.add(new Enemy(this, x, y, s.type, scaling));
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
    const speed = this.player.moveSpeed;
    if (this.joystickOrigin && this.joystickCurrent) {
      const dx = this.joystickCurrent.x - this.joystickOrigin.x;
      const dy = this.joystickCurrent.y - this.joystickOrigin.y;
      const dist = Math.hypot(dx, dy);
      if (dist > JOYSTICK_DEADZONE) {
        const intensity = Math.min(dist, JOYSTICK_RADIUS) / JOYSTICK_RADIUS;
        const nx = dx / dist;
        const ny = dy / dist;
        this.player.body.setVelocity(nx * speed * intensity, ny * speed * intensity);
        return;
      }
    }
    this.player.body.setVelocity(0, 0);
  }

  private updateEnemies(time: number, dtSec: number): void {
    const addBullet = (b: EnemyBullet): void => {
      this.enemyBullets.add(b);
    };
    [...this.enemies.getChildren()].forEach((obj) => {
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

  private updateOrbits(time: number, dtSec: number): void {
    if (this.orbitArrows.length === 0) return;
    const px = this.player.x;
    const py = this.player.y;
    this.orbitArrows.forEach((orb) => {
      orb.updatePosition(px, py, dtSec);
      [...this.enemies.getChildren()].forEach((eObj) => {
        const e = eObj as Enemy;
        if (!e.isAlive || !orb.canDamage(e, time)) return;
        const hitRange = (e.def.size + ORBIT_HIT_RADIUS) / 2;
        if (Phaser.Math.Distance.Between(orb.x, orb.y, e.x, e.y) < hitRange) {
          this.damageEnemy(e, ORBIT_DAMAGE);
          orb.recordHit(e, time);
        }
      });
      if (this.boss && this.boss.isAlive && orb.canDamage(this.boss, time)) {
        const hitRange = (84 + ORBIT_HIT_RADIUS) / 2;
        if (Phaser.Math.Distance.Between(orb.x, orb.y, this.boss.x, this.boss.y) < hitRange) {
          this.boss.takeDamage(ORBIT_DAMAGE, time);
          orb.recordHit(this.boss, time);
        }
      }
    });
  }

  private tryAutoAttack(time: number): void {
    if (this.player.isMoving) return;
    if (!this.player.canAttack(time)) return;
    const target = this.findClosestTarget();
    if (!target) return;
    const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    const count = this.playerStats.multiShot;
    const totalSpread = (count - 1) * MULTISHOT_SPREAD_RAD;
    const startAngle = baseAngle - totalSpread / 2;
    const step = count > 1 ? totalSpread / (count - 1) : 0;
    for (let i = 0; i < count; i++) {
      const a = startAngle + step * i;
      const arrow = new Arrow(
        this,
        this.player.x,
        this.player.y,
        a,
        this.playerStats.damage,
        this.playerStats.pierce,
      );
      this.arrows.add(arrow);
    }
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

  private makeDeathContext(): EnemyDeathContext {
    return {
      scene: this,
      playerX: this.player.x,
      playerY: this.player.y,
      damagePlayer: (amount) => {
        this.player.takeDamage(amount, this.time.now);
      },
      spawnEnemy: (type, x, y) => {
        const cx = Phaser.Math.Clamp(x, 30, this.scale.width - 30);
        const cy = Phaser.Math.Clamp(y, 30, this.scale.height - 30);
        this.enemies.add(new Enemy(this, cx, cy, type));
      },
    };
  }

  private damageEnemy(enemy: Enemy, amount: number): void {
    if (!enemy.isAlive) return;
    enemy.takeDamage(amount);
    if (!enemy.isAlive) {
      enemy.handleDeath(this.makeDeathContext());
      enemy.destroy();
      this.killCount++;
    }
  }

  private handleArrowHitEnemy = (arrowObj: unknown, enemyObj: unknown): void => {
    const arrow = arrowObj as Arrow;
    const enemy = enemyObj as Enemy;
    if (!enemy.isAlive) return;
    if (arrow.hitTargets.has(enemy)) return;
    arrow.hitTargets.add(enemy);
    this.damageEnemy(enemy, arrow.damage);
    if (arrow.shouldDestroyAfterHit()) {
      arrow.destroy();
    }
  };

  private handleArrowHitBoss = (arrowObj: unknown, _bossObj: unknown): void => {
    const arrow = arrowObj as Arrow;
    if (!this.boss || !this.boss.isAlive) {
      arrow.destroy();
      return;
    }
    if (arrow.hitTargets.has(this.boss)) return;
    arrow.hitTargets.add(this.boss);
    this.boss.takeDamage(arrow.damage, this.time.now);
    if (arrow.shouldDestroyAfterHit()) {
      arrow.destroy();
    }
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

  private reconcileOrbits(): void {
    while (this.orbitArrows.length < this.playerStats.orbitCount) {
      this.orbitArrows.push(new OrbitArrow(this, 0));
    }
    while (this.orbitArrows.length > this.playerStats.orbitCount) {
      const orb = this.orbitArrows.pop();
      orb?.destroy();
    }
    const n = this.orbitArrows.length;
    if (n > 0) {
      this.orbitArrows.forEach((o, i) => {
        o.orbitAngle = (Math.PI * 2 * i) / n;
      });
    }
  }

  private enterStageCleared(time: number): void {
    this.player.body.setVelocity(0, 0);
    this.enemyBullets.clear(true, true);
    this.clearJoystick();

    if (this.currentStage >= STAGES.length) {
      this.gameState = 'allClear';
      this.overlayTitle.setText('全クリア!').setVisible(true);
      this.overlaySub
        .setText(`撃破数 ${this.killCount}\nタップでステージ1から再挑戦`)
        .setVisible(true);
      this.overlayLockedUntil = time + OVERLAY_TAP_LOCK_MS;
      return;
    }

    this.gameState = 'upgradeSelect';
    this.showUpgradeChoices();
  }

  private enterGameOver(time: number): void {
    this.gameState = 'gameOver';
    this.player.body.setVelocity(0, 0);
    this.enemyBullets.clear(true, true);
    this.overlayTitle.setText('ゲームオーバー').setVisible(true);
    this.overlaySub
      .setText(`到達ステージ ${this.currentStage} / 撃破 ${this.killCount}\nタップでリトライ`)
      .setVisible(true);
    this.overlayLockedUntil = time + OVERLAY_TAP_LOCK_MS;
    this.clearJoystick();
  }

  private showUpgradeChoices(): void {
    const { width, height } = this.scale;
    const choices = rollUpgradeChoices(this.playerStats, this.player, 3);

    const dimmer = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.65)
      .setDepth(190);
    this.upgradeUI.push(dimmer);

    const title = this.add
      .text(width / 2, 200, '強化を1つ選ぼう', {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        color: '#ffffff',
        stroke: '#000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(200);
    this.upgradeUI.push(title);

    const subtitle = this.add
      .text(width / 2, 240, `ステージ ${this.currentStage} クリア`, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ffe066',
      })
      .setOrigin(0.5)
      .setDepth(200);
    this.upgradeUI.push(subtitle);

    if (choices.length === 0) {
      const msg = this.add
        .text(width / 2, height / 2, 'これ以上強化できません\nタップで次へ', {
          fontFamily: 'sans-serif',
          fontSize: '18px',
          color: '#ffffff',
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(200)
        .setInteractive({ useHandCursor: true });
      msg.on('pointerdown', () => {
        this.clearUpgradeUI();
        this.startStage(this.currentStage + 1);
      });
      this.upgradeUI.push(msg);
      return;
    }

    const cardW = width - 60;
    const cardH = 130;
    const gap = 16;
    const totalH = choices.length * cardH + (choices.length - 1) * gap;
    const startY = height / 2 - totalH / 2 + cardH / 2;

    choices.forEach((upgrade, idx) => {
      const cy = startY + idx * (cardH + gap);
      const card = this.add
        .rectangle(width / 2, cy, cardW, cardH, upgrade.color, 0.92)
        .setStrokeStyle(3, 0xffffff)
        .setDepth(200)
        .setInteractive({ useHandCursor: true });

      const iconText = this.add
        .text(width / 2 - cardW / 2 + 50, cy, upgrade.icon, {
          fontFamily: 'sans-serif',
          fontSize: '44px',
          color: '#1a1a2e',
        })
        .setOrigin(0.5)
        .setDepth(201);

      const labelText = this.add
        .text(width / 2 + 10, cy - 22, upgrade.label, {
          fontFamily: 'sans-serif',
          fontSize: '22px',
          color: '#1a1a2e',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(201);

      const descText = this.add
        .text(width / 2 + 10, cy + 18, upgrade.description, {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#1a1a2e',
        })
        .setOrigin(0.5)
        .setDepth(201);

      card.on('pointerdown', () => this.selectUpgrade(upgrade));

      this.upgradeUI.push(card, iconText, labelText, descText);
    });
  }

  private selectUpgrade(upgrade: UpgradeDef): void {
    upgrade.apply(this.playerStats, this.player);
    this.clearUpgradeUI();
    this.startStage(this.currentStage + 1);
  }

  private clearUpgradeUI(): void {
    this.upgradeUI.forEach((o) => o.destroy());
    this.upgradeUI = [];
  }

  private resetRun(): void {
    this.playerStats.reset();
    this.orbitArrows.forEach((o) => o.destroy());
    this.orbitArrows = [];
    this.killCount = 0;
    this.player.reset(this.scale.width / 2, this.scale.height * 0.75);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.gameState === 'upgradeSelect') return;
    if (this.gameState !== 'playing') {
      if (this.time.now < this.overlayLockedUntil) return;
      this.resetRun();
      this.startStage(1);
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
