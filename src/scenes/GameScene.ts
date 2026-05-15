import Phaser from 'phaser';

const PLAYER_SPEED = 220;
const PLAYER_SIZE = 36;
const JOYSTICK_RADIUS = 80;
const JOYSTICK_DEADZONE = 8;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private statusText!: Phaser.GameObjects.Text;

  private joystickOrigin: Phaser.Math.Vector2 | null = null;
  private joystickCurrent: Phaser.Math.Vector2 | null = null;
  private joystickPointerId: number | null = null;

  private baseCircle!: Phaser.GameObjects.Arc;
  private knobCircle!: Phaser.GameObjects.Arc;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, 40, '矢の塔 — Phase 1', {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#e9e9ff',
      })
      .setOrigin(0.5, 0);

    this.statusText = this.add
      .text(width / 2, 80, '画面をドラッグして移動', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#8aa0ff',
      })
      .setOrigin(0.5, 0);

    this.player = this.add.rectangle(
      width / 2,
      height * 0.7,
      PLAYER_SIZE,
      PLAYER_SIZE,
      0x6ad7ff,
    );
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCollideWorldBounds(true);

    this.baseCircle = this.add
      .circle(0, 0, JOYSTICK_RADIUS, 0xffffff, 0.12)
      .setVisible(false);
    this.knobCircle = this.add
      .circle(0, 0, JOYSTICK_RADIUS * 0.4, 0xffffff, 0.35)
      .setVisible(false);

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);
  }

  update(): void {
    if (this.joystickOrigin && this.joystickCurrent) {
      const dx = this.joystickCurrent.x - this.joystickOrigin.x;
      const dy = this.joystickCurrent.y - this.joystickOrigin.y;
      const dist = Math.hypot(dx, dy);

      if (dist > JOYSTICK_DEADZONE) {
        const clamped = Math.min(dist, JOYSTICK_RADIUS);
        const nx = dx / dist;
        const ny = dy / dist;
        const intensity = clamped / JOYSTICK_RADIUS;
        this.playerBody.setVelocity(
          nx * PLAYER_SPEED * intensity,
          ny * PLAYER_SPEED * intensity,
        );
        this.statusText.setText('移動中');
      } else {
        this.playerBody.setVelocity(0, 0);
        this.statusText.setText('停止中(自動攻撃予定地)');
      }
    } else {
      this.playerBody.setVelocity(0, 0);
      this.statusText.setText('画面をドラッグして移動');
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
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
    this.joystickPointerId = null;
    this.joystickOrigin = null;
    this.joystickCurrent = null;
    this.baseCircle.setVisible(false);
    this.knobCircle.setVisible(false);
  }
}
