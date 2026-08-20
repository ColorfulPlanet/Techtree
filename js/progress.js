/**
 * パーティー共有の経験値・レベル
 * 個別レベルや選択式強化は持たず、後から足せるように成長値だけ分離する。
 */
class PartyProgress {
    constructor() {
        this.reset();
    }

    reset() {
        this.level = 1;
        this.xp = 0;
        // 将来のレベルアップ3択用。今回は使わない。
        this.pendingChoices = [];
    }

    /**
     * 次のレベルに必要な経験値。後から調整しやすいよう数式1本にする。
     * Lv1→2: 100, Lv2→3: 150, Lv3→4: 200 ...
     */
    xpNeededFor(level) {
        return 50 + level * 50;
    }

    get xpToNext() {
        return this.xpNeededFor(this.level);
    }

    get xpRatio() {
        const need = this.xpToNext;
        return need > 0 ? Math.min(1, this.xp / need) : 1;
    }

    /**
     * レベルに応じた基本成長。スキル選択はここへ足せる。
     */
    getGrowth(level = this.level) {
        const steps = Math.max(0, level - 1);
        return {
            hpMul: 1 + steps * 0.10,
            attackMul: 1 + steps * 0.10,
            workMul: 1 + steps * 0.12,
            cooldownMul: Math.max(0.68, 1 - steps * 0.05)
        };
    }

    grantXp(amount) {
        const gained = Math.max(0, Math.round(amount));
        if (gained <= 0) {
            return { amount: 0, levelsGained: 0, level: this.level };
        }
        this.xp += gained;
        let levelsGained = 0;
        while (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level += 1;
            levelsGained += 1;
        }
        return { amount: gained, levelsGained, level: this.level };
    }
}
