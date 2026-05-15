import Phaser from 'phaser';
import { Player, PLAYER_SPEED } from '../entities/Player';
import { Enemy, EnemyConfig } from '../entities/Enemy';
import { Arrow } from '../entities/Arrow';

const JOYSTICK_RADIUS = 80;
const JOYSTICK_DEADZONE = 8;
const OVERLAY_TAP_LOCK_MS = 500;

type GameState = 'playing' | 'stageCleared' | 'gameOver';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: Phaser.GameObjects.Group;
  private arrows!: Phaser.GameObjects.Group;

  private joystickOrigin: Phaser.Math.Vector2 | null = null;
  private joystickCurrent: Phaser.Math.Vector2 | null = null;
  private joystickPointerId: number | null = null;
  private baseCircle!: Phaser.GameObjects.Arc;
  private knobCircle!: Phaser.GameObjects.Arc;

  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private stageText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
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

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);

    this.startStage(1);
  }

  update(time: number): void {
    if (this.gameState !== 'playing') return;

    this.updatePlayerMovement();
    this.updateEnemyAI();
    this.tryAutoAttack(time);
    this.cullOffscreenArrows();
    this.updateHUD();

    if (this.enemies.countActive(true) === 0) {
      this.enterStageCleared(time);
    } else if (!this.player.isAlive) {
      this.enterGameOver(time);
    }
  }

  private createHUD(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, 16, '矢の塔', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#e9e9ff',
      })
      .setOrigin(0.5, 0)
      .setDepth(100);

    this.hpBarBg = this.add
      .rectangle(20, 60, 160, 18, 0x333344, 0.85)
      .setOrigin(0, 0.5)
      .setDepth(100);
    this.hpBarFill = this.add
      .rectangle(22, 60, 156, 14, 0x66ff88)
      .setOrigin(0, 0.5)
      .setDepth(101);
    this.hpText = this.add
      .text(this.hpBarBg.x + this.hpBarBg.width / 2, 60, '', {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: '#000',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(102);

    this.stageText = this.add
      .text(width / 2, 60, '', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#e9e9ff',
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
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setVisible(false);
  }

  private updateHUD(): void {
    const ratio = this.player.hp / this.player.maxHp;
    this.hpBarFill.width = 156 * ratio;
    this.hpText.setText(`HP ${this.player.hp}/${this.player.maxHp}`);
    this.stageText.setText(`ステージ ${this.currentStage}`);
    this.killText.setText(`撃破: ${this.killCount}`);
  }

  private startStage(stage: number): void {
    this.currentStage = stage;
    this.enemies.clear(true, true);
    this.arrows.clear(true, true);

    const enemyCount = 4 + stage;
    const config: EnemyConfig = {
      hp: 1 + Math.floor((stage - 1) / 3),
      speed: 60 + (stage - 1) * 5,
      contactDamage: 1,
    };

    for (let i = 0; i < enemyCount; i++) {
      const x = Phaser.Math.Between(50, this.scale.width - 50);
      const y = Phaser.Math.Between(100, 220);
      const enemy = new Enemy(this, x, y, config);
      this.enemies.add(enemy);
    }

    this.gameState = 'playing';
    this.overlayTitle.setVisible(false);
    this.overlaySub.setVisible(false);
    this.updateHUD();
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

  private updateEnemyAI(): void {
    this.enemies.getChildren().forEach((obj) => {
      const enemy = obj as Enemy;
      enemy.moveToward(this.player.x, this.player.y);
    });
  }

  private tryAutoAttack(time: number): void {
    if (this.player.isMoving) return;
    if (!this.player.canAttack(time)) return;
    const target = this.findClosestEnemy();
    if (!target) return;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    const arrow = new Arrow(this, this.player.x, this.player.y, angle);
    this.arrows.add(arrow);
    this.player.markAttacked(time);
  }

  private cullOffscreenArrows(): void {
    const margin = 20;
    const w = this.scale.width;
    const h = this.scale.height;
    this.arrows.getChildren().forEach((obj) => {
      const arrow = obj as Arrow;
      if (arrow.x < -margin || arrow.x > w + margin || arrow.y < -margin || arrow.y > h + margin) {
        arrow.destroy();
      }
    });
  }

  private findClosestEnemy(): Enemy | null {
    let closest: Enemy | null = null;
    let bestDist = Infinity;
    this.enemies.getChildren().forEach((obj) => {
      const enemy = obj as Enemy;
      if (!enemy.isAlive) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (d < bestDist) {
        bestDist = d;
        closest = enemy;
      }
    });
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
      enemy.destroy();
      this.killCount++;
    }
  };

  private handleEnemyHitPlayer = (_playerObj: unknown, enemyObj: unknown): void => {
    const enemy = enemyObj as Enemy;
    if (!enemy.isAlive) return;
    this.player.takeDamage(enemy.contactDamage, this.time.now);
  };

  private enterStageCleared(time: number): void {
    this.gameState = 'stageCleared';
    this.player.body.setVelocity(0, 0);
    this.overlayTitle.setText('ステージクリア!').setVisible(true);
    this.overlaySub.setText('タップで次のステージへ').setVisible(true);
    this.overlayLockedUntil = time + OVERLAY_TAP_LOCK_MS;
    this.clearJoystick();
  }

  private enterGameOver(time: number): void {
    this.gameState = 'gameOver';
    this.player.body.setVelocity(0, 0);
    this.overlayTitle.setText('ゲームオーバー').setVisible(true);
    this.overlaySub.setText('タップでリトライ').setVisible(true);
    this.overlayLockedUntil = time + OVERLAY_TAP_LOCK_MS;
    this.clearJoystick();
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.gameState !== 'playing') {
      if (this.time.now < this.overlayLockedUntil) return;
      if (this.gameState === 'stageCleared') {
        this.startStage(this.currentStage + 1);
      } else {
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
