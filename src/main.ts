import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const GAME_WIDTH = 540;
const GAME_HEIGHT = 960;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0a0a1f',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [GameScene],
  input: {
    activePointers: 2,
  },
};

new Phaser.Game(config);
