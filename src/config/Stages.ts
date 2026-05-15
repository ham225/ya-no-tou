import { EnemyType } from '../entities/EnemyTypes';

export interface EnemySpawn {
  type: EnemyType;
  count: number;
}

export interface StageConfig {
  name: string;
  spawns: EnemySpawn[];
  isBoss?: boolean;
}

export const STAGES: StageConfig[] = [
  { name: '入口',         spawns: [{ type: EnemyType.BASIC,    count: 5 }] },
  { name: '速き者',       spawns: [{ type: EnemyType.BASIC,    count: 3 }, { type: EnemyType.SPEEDY,  count: 3 }] },
  { name: '波打つ庭',     spawns: [{ type: EnemyType.BASIC,    count: 2 }, { type: EnemyType.ZIGZAG,  count: 4 }] },
  { name: '射手の間',     spawns: [{ type: EnemyType.BASIC,    count: 2 }, { type: EnemyType.SHOOTER, count: 3 }] },
  { name: '鋼の壁',       spawns: [{ type: EnemyType.BASIC,    count: 3 }, { type: EnemyType.TANK,    count: 2 }] },
  { name: '分裂洞',       spawns: [{ type: EnemyType.SPLITTER, count: 3 }, { type: EnemyType.BASIC,   count: 2 }] },
  { name: '爆弾魔',       spawns: [{ type: EnemyType.BOMB,     count: 4 }, { type: EnemyType.SPEEDY,  count: 2 }] },
  { name: '盾持ちの間',   spawns: [{ type: EnemyType.SHOOTER,  count: 2 }, { type: EnemyType.SHIELD,  count: 2 }] },
  { name: '追跡の塔',     spawns: [{ type: EnemyType.CHASER,   count: 3 }, { type: EnemyType.ZIGZAG,  count: 3 }] },
  { name: 'タワーマスター', spawns: [], isBoss: true },
];
