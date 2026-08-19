/**
 * 隊長×隊列幅の攻撃・ターゲット処理
 * 隊列位置計算やスライダーは触らず、自動攻撃の中身だけを差別化する。
 */
const SPREAD_NARROW = 0.34;
const SPREAD_WIDE = 0.66;

const ATTACK_NAMES = {
    cleaning: 'モップ薙ぎ払い',
    cooking: 'フライパン強打',
    laundry: '泡の遠距離',
    tidy: 'おかたづけ'
};

class CombatSystem {
    constructor() {
        this.effects = [];
    }

    getSpread(formation) {
        return formation.getFormationSpacingNormalized();
    }

    getSpreadMode(formation) {
        const spread = this.getSpread(formation);
        if (spread <= SPREAD_NARROW) return 'narrow';
        if (spread >= SPREAD_WIDE) return 'wide';
        return 'mid';
    }

    getAttackName(member) {
        return ATTACK_NAMES[member.specialty] || member.attackLabel;
    }

    getProfile(member, isFront, mode) {
        const specialty = member.specialty || 'cleaning';
        const front = isFront ? 1 : 0.38;

        if (specialty === 'cooking') {
            return {
                kind: 'smash',
                range: isFront ? 56 : 50,
                damage: (isFront ? 24 : 7) * (mode === 'narrow' ? 1.45 : 1),
                cooldown: isFront ? 24 : 36,
                aoe: false,
                knockback: 1.2,
                slow: 0
            };
        }
        if (specialty === 'laundry') {
            return {
                kind: 'bubble',
                range: isFront ? 200 : 160,
                damage: (isFront ? 10 : 4) * (mode === 'narrow' ? 1.15 : 0.95),
                cooldown: isFront ? 18 : 30,
                aoe: mode === 'wide',
                splash: mode === 'wide' ? 70 : 0,
                knockback: mode === 'narrow' ? 10 : 5,
                slow: mode === 'wide' ? 50 : 28
            };
        }
        return {
            kind: 'sweep',
            range: isFront ? (mode === 'wide' ? 125 : 100) : 85,
            sweepWidth: isFront
                ? (mode === 'wide' ? 230 : mode === 'narrow' ? 150 : 180)
                : (mode === 'wide' ? 140 : 90),
            damage: (isFront ? 5.5 : 2.2) * front / (isFront ? 1 : 0.38),
            cooldown: isFront ? 16 : 28,
            aoe: true,
            knockback: 0.6,
            slow: 0
        };
    }

    pickSharedFocus(formation, enemies, range) {
        const front = formation.getFrontCharacter();
        if (!front) return null;
        return this.closestAlive(front.x, front.y, enemies, range);
    }

    closestAlive(x, y, enemies, range, claimed = null) {
        let best = null;
        let bestDist = range;
        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            if (claimed && claimed.has(enemy)) continue;
            const dist = Math.hypot(enemy.x - x, enemy.y - y);
            if (dist <= bestDist) {
                best = enemy;
                bestDist = dist;
            }
        }
        return best;
    }

    inSweep(maid, enemy, profile, angle) {
        const dx = enemy.x - maid.x;
        const dy = enemy.y - maid.y;
        const dist = Math.hypot(dx, dy);
        if (dist > profile.range + enemy.radius) return false;
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;
        return Math.abs(lx) <= profile.sweepWidth / 2 && ly < 28 && ly > -profile.range;
    }

    update(formation, enemies, particles) {
        const front = formation.getFrontCharacter();
        const mode = this.getSpreadMode(formation);
        const angle = formation.formationAngle;
        const claimed = new Set();

        const maxRange = 220;
        const sharedFocus = mode === 'narrow'
            ? this.pickSharedFocus(formation, enemies, maxRange)
            : null;

        for (const member of formation.members) {
            if (member.attackCooldown > 0) continue;
            const isFront = member === front;
            const profile = this.getProfile(member, isFront, mode);

            let targets = [];
            if (profile.aoe && profile.kind === 'sweep') {
                targets = enemies.filter((enemy) =>
                    enemy.alive && this.inSweep(member, enemy, profile, angle)
                );
                if (mode === 'narrow' && sharedFocus && sharedFocus.alive) {
                    const focused = targets.filter((enemy) => enemy === sharedFocus ||
                        Math.hypot(enemy.x - sharedFocus.x, enemy.y - sharedFocus.y) < 70);
                    if (focused.length) targets = focused;
                }
            } else {
                let preferred = null;
                if (mode === 'narrow' && sharedFocus && sharedFocus.alive) {
                    const dist = Math.hypot(sharedFocus.x - member.x, sharedFocus.y - member.y);
                    if (dist <= profile.range + sharedFocus.radius) preferred = sharedFocus;
                }
                if (!preferred) {
                    preferred = this.closestAlive(
                        member.x,
                        member.y,
                        enemies,
                        profile.range + 24,
                        mode === 'wide' ? claimed : null
                    );
                }
                if (preferred) {
                    targets = [preferred];
                    if (profile.aoe && profile.splash) {
                        for (const enemy of enemies) {
                            if (!enemy.alive || enemy === preferred) continue;
                            if (Math.hypot(enemy.x - preferred.x, enemy.y - preferred.y) <= profile.splash) {
                                targets.push(enemy);
                            }
                        }
                    }
                }
            }

            if (targets.length === 0) continue;

            member.attackCooldown = profile.cooldown;
            member.isAttacking = 12;
            if (mode === 'wide') {
                for (const target of targets) claimed.add(target);
            }

            this.spawnAttackFx(member, targets[0], profile, angle, isFront);
            particles.spawnAttack(member.x, member.y, member.specialty);

            if (isFront && Math.random() < 0.4) {
                particles.addText(member.x, member.y - 38, this.getAttackName(member), member.color);
            }

            for (const target of targets) {
                const dmg = profile.damage * (target === targets[0] ? 1 : 0.55);
                const defeated = target.takeDamage(dmg);
                target.applyHit(member.x, member.y, profile.knockback, profile.slow);
                if (defeated) {
                    particles.spawnDefeat(target.x, target.y);
                    particles.addText(target.x, target.y - 10, 'キレイ！', '#fbbf24');
                }
            }
        }

        for (const fx of this.effects) fx.update();
        this.effects = this.effects.filter((fx) => fx.life > 0);
    }

    spawnAttackFx(member, target, profile, angle, isFront) {
        this.effects.push(new AttackFx({
            kind: profile.kind,
            x: member.x,
            y: member.y,
            tx: target.x,
            ty: target.y,
            angle,
            range: profile.range,
            width: profile.sweepWidth || 40,
            color: member.color,
            life: isFront ? 14 : 10
        }));
    }

    draw(ctx) {
        for (const fx of this.effects) fx.draw(ctx);
    }
}

class AttackFx {
    constructor(opts) {
        this.kind = opts.kind;
        this.x = opts.x;
        this.y = opts.y;
        this.tx = opts.tx;
        this.ty = opts.ty;
        this.angle = opts.angle || 0;
        this.range = opts.range || 80;
        this.width = opts.width || 40;
        this.color = opts.color || '#fff';
        this.life = opts.life;
        this.maxLife = opts.life;
        this.px = opts.x;
        this.py = opts.y;
    }

    update() {
        this.life -= 1;
        if (this.kind === 'bubble') {
            const t = 1 - this.life / this.maxLife;
            this.px = this.x + (this.tx - this.x) * t;
            this.py = this.y + (this.ty - this.y) * t;
        }
    }

    draw(ctx) {
        const a = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = Math.min(1, a * 1.2);

        if (this.kind === 'sweep') {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.strokeStyle = this.color;
            ctx.fillStyle = this.color;
            ctx.globalAlpha = a * 0.28;
            ctx.beginPath();
            ctx.ellipse(0, -this.range * 0.35, this.width * 0.48, this.range * 0.42, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = a * 0.9;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(0, 0, this.range * 0.72, -Math.PI * 0.85, -Math.PI * 0.15);
            ctx.stroke();
        } else if (this.kind === 'smash') {
            const r = 18 + (1 - a) * 26;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(this.tx, this.ty, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#fde68a';
            ctx.globalAlpha = a * 0.45;
            ctx.beginPath();
            ctx.arc(this.tx, this.ty, r * 0.55, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = '#e0f2fe';
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.px, this.py, 9 + (1 - a) * 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(this.px + 6, this.py - 8, 5, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }
}
