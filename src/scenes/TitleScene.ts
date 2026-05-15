import Phaser from 'phaser';
import { Storage } from '../state/Storage';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height * 0.18, '矢の塔', {
        fontFamily: 'sans-serif',
        fontSize: '72px',
        color: '#ffffff',
        stroke: '#1a1a2e',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.18 + 70, 'Ya no Tou', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#8aa0ff',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.4, 'スクロール型ローグライク', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ffe066',
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height * 0.5,
        '【操作】\n画面のどこでもドラッグして移動\n止まると自動で矢を撃つ\n敵を全滅させてステージを進め',
        {
          fontFamily: 'sans-serif',
          fontSize: '16px',
          color: '#cccccc',
          align: 'center',
          lineSpacing: 6,
        },
      )
      .setOrigin(0.5);

    const best = Storage.getBest();
    if (best) {
      this.add
        .text(
          width / 2,
          height * 0.68,
          `ベスト: ステージ ${best.stage} / 撃破 ${best.kills}`,
          {
            fontFamily: 'sans-serif',
            fontSize: '16px',
            color: '#ffd866',
          },
        )
        .setOrigin(0.5);
    }

    const startText = this.add
      .text(width / 2, height * 0.82, 'タップでスタート', {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        color: '#ffffff',
        stroke: '#000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: startText,
      alpha: 0.35,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.input.once('pointerdown', () => {
      this.scene.start('GameScene');
    });
  }
}
