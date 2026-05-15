import { PlayerStats, STATS_LIMITS } from '../state/PlayerStats';
import { Player } from '../entities/Player';

export type UpgradeId =
  | 'ATTACK_UP'
  | 'ATTACK_SPEED'
  | 'MULTI_SHOT'
  | 'PIERCE'
  | 'MAX_HP'
  | 'HEAL'
  | 'MOVE_SPEED'
  | 'ORBIT';

export interface UpgradeDef {
  id: UpgradeId;
  label: string;
  description: string;
  icon: string;
  color: number;
  canTake: (stats: PlayerStats, player: Player) => boolean;
  apply: (stats: PlayerStats, player: Player) => void;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  ATTACK_UP: {
    id: 'ATTACK_UP',
    label: '攻撃力UP',
    description: '矢のダメージ +1',
    icon: '⚔',
    color: 0xffc266,
    canTake: () => true,
    apply: (stats) => {
      stats.damageBonus += 1;
    },
  },
  ATTACK_SPEED: {
    id: 'ATTACK_SPEED',
    label: '連射UP',
    description: '攻撃間隔 -20%',
    icon: '⏱',
    color: 0x9bd2ff,
    canTake: (stats) => stats.attackIntervalMult > STATS_LIMITS.attackIntervalMultMin + 0.01,
    apply: (stats) => {
      stats.attackIntervalMult = Math.max(
        STATS_LIMITS.attackIntervalMultMin,
        stats.attackIntervalMult * 0.8,
      );
    },
  },
  MULTI_SHOT: {
    id: 'MULTI_SHOT',
    label: '多重射撃',
    description: '同時発射数 +1',
    icon: '🏹',
    color: 0xffe066,
    canTake: (stats) => stats.multiShot < STATS_LIMITS.multiShotMax,
    apply: (stats) => {
      stats.multiShot += 1;
    },
  },
  PIERCE: {
    id: 'PIERCE',
    label: '貫通',
    description: '矢がもう1体貫通',
    icon: '→',
    color: 0xff6e9a,
    canTake: (stats) => stats.pierce < STATS_LIMITS.pierceMax,
    apply: (stats) => {
      stats.pierce += 1;
    },
  },
  MAX_HP: {
    id: 'MAX_HP',
    label: 'HP上限UP',
    description: '最大HP +1(+1回復)',
    icon: '❤',
    color: 0x66ff88,
    canTake: () => true,
    apply: (stats, player) => {
      stats.maxHpBonus += 1;
      player.hp = Math.min(stats.maxHp, player.hp + 1);
    },
  },
  HEAL: {
    id: 'HEAL',
    label: '回復',
    description: 'HP +3',
    icon: '+',
    color: 0xa6e9a6,
    canTake: (stats, player) => player.hp < stats.maxHp,
    apply: (stats, player) => {
      player.hp = Math.min(stats.maxHp, player.hp + 3);
    },
  },
  MOVE_SPEED: {
    id: 'MOVE_SPEED',
    label: '機動力UP',
    description: '移動速度 +15%',
    icon: '💨',
    color: 0xc8b6ff,
    canTake: (stats) => stats.moveSpeedMult < STATS_LIMITS.moveSpeedMultMax - 0.01,
    apply: (stats) => {
      stats.moveSpeedMult = Math.min(STATS_LIMITS.moveSpeedMultMax, stats.moveSpeedMult + 0.15);
    },
  },
  ORBIT: {
    id: 'ORBIT',
    label: '周回の矢',
    description: 'プレイヤー周囲を回る矢 +1',
    icon: '○',
    color: 0xffd066,
    canTake: (stats) => stats.orbitCount < STATS_LIMITS.orbitCountMax,
    apply: (stats) => {
      stats.orbitCount += 1;
    },
  },
};

export function rollUpgradeChoices(
  stats: PlayerStats,
  player: Player,
  count = 3,
): UpgradeDef[] {
  const pool = Object.values(UPGRADES).filter((u) => u.canTake(stats, player));
  if (pool.length === 0) return [];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}
