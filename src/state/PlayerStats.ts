export const STATS_BASE = {
  attackIntervalMs: 500,
  damage: 1,
  moveSpeed: 220,
  maxHp: 5,
} as const;

export const STATS_LIMITS = {
  attackIntervalMultMin: 0.2,
  moveSpeedMultMax: 2,
  multiShotMax: 5,
  pierceMax: 3,
  orbitCountMax: 4,
} as const;

export class PlayerStats {
  attackIntervalMult = 1;
  damageBonus = 0;
  moveSpeedMult = 1;
  maxHpBonus = 0;
  multiShot = 1;
  pierce = 0;
  orbitCount = 0;

  get attackIntervalMs(): number {
    return Math.max(100, STATS_BASE.attackIntervalMs * this.attackIntervalMult);
  }
  get damage(): number {
    return STATS_BASE.damage + this.damageBonus;
  }
  get moveSpeed(): number {
    return STATS_BASE.moveSpeed * this.moveSpeedMult;
  }
  get maxHp(): number {
    return STATS_BASE.maxHp + this.maxHpBonus;
  }

  reset(): void {
    this.attackIntervalMult = 1;
    this.damageBonus = 0;
    this.moveSpeedMult = 1;
    this.maxHpBonus = 0;
    this.multiShot = 1;
    this.pierce = 0;
    this.orbitCount = 0;
  }
}
