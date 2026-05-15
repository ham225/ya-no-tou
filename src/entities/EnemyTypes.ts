export enum EnemyType {
  BASIC = 'basic',
  SPEEDY = 'speedy',
  TANK = 'tank',
  SHOOTER = 'shooter',
  ZIGZAG = 'zigzag',
  SPLITTER = 'splitter',
  MINI = 'mini',
  BOMB = 'bomb',
  SHIELD = 'shield',
  CHASER = 'chaser',
}

export type EnemyAI = 'chase' | 'zigzag' | 'shooter' | 'chaser';
export type EnemyOnDeath = 'split' | 'explode';

export interface EnemyTypeDef {
  label: string;
  hp: number;
  speed: number;
  contactDamage: number;
  color: number;
  size: number;
  ai: EnemyAI;
  onDeath?: EnemyOnDeath;
}

const C = {
  red: 0xff5e5e,
  orange: 0xff9a3c,
  darkred: 0xa83232,
  purple: 0xc864ff,
  pink: 0xff8fc2,
  green: 0x66dd66,
  lightgreen: 0xa6e9a6,
  yellow: 0xffe066,
  bluegray: 0x6a8aa8,
  deeppurple: 0x6440a0,
} as const;

export const ENEMY_TYPE_DEFS: Record<EnemyType, EnemyTypeDef> = {
  [EnemyType.BASIC]:    { label: '雑魚',   hp: 1, speed: 60,  contactDamage: 1, color: C.red,         size: 32, ai: 'chase' },
  [EnemyType.SPEEDY]:   { label: '高速',   hp: 1, speed: 115, contactDamage: 1, color: C.orange,      size: 28, ai: 'chase' },
  [EnemyType.TANK]:     { label: 'タンク', hp: 4, speed: 40,  contactDamage: 2, color: C.darkred,     size: 44, ai: 'chase' },
  [EnemyType.SHOOTER]:  { label: '射手',   hp: 2, speed: 35,  contactDamage: 1, color: C.purple,      size: 32, ai: 'shooter' },
  [EnemyType.ZIGZAG]:   { label: 'ジグザグ', hp: 1, speed: 80,  contactDamage: 1, color: C.pink,        size: 30, ai: 'zigzag' },
  [EnemyType.SPLITTER]: { label: '分裂',   hp: 2, speed: 55,  contactDamage: 1, color: C.green,       size: 40, ai: 'chase', onDeath: 'split' },
  [EnemyType.MINI]:     { label: '子分',   hp: 1, speed: 95,  contactDamage: 1, color: C.lightgreen,  size: 20, ai: 'chase' },
  [EnemyType.BOMB]:     { label: '爆弾',   hp: 1, speed: 55,  contactDamage: 1, color: C.yellow,      size: 30, ai: 'chase', onDeath: 'explode' },
  [EnemyType.SHIELD]:   { label: '盾持ち', hp: 6, speed: 32,  contactDamage: 2, color: C.bluegray,    size: 40, ai: 'chase' },
  [EnemyType.CHASER]:   { label: '追跡者', hp: 3, speed: 50,  contactDamage: 1, color: C.deeppurple,  size: 32, ai: 'chaser' },
};
