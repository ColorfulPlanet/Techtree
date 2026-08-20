/**
 * 邪魔者
 * 小型の群れと、狭い隊列向きの大型を用意する。
 */
class DustMonster {
    constructor(x, y, kind = 'small', options = {}) {
        this.x = x;
        this.y = y;
        this.kind = kind;
        this.alive = true;
        this.anim = Math.random() * Math.PI * 2;
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderTimer = 0;
        this.vx = 0;
        this.vy = 0;
        this.hitFlash = 0;
        this.deathTimer = 0;
        this.homeX = x;
        this.homeY = y;
        this.slowTimer = 0;
        this.powerLevel = options.powerLevel || 1;

        if (kind === 'large') {
            this.radius = 36;
            this.maxHp = 120;
            this.drawScale = 2.05;
            this.chaseSpeed = 0.028;
            this.attackType = 'aoe';
            this.attackDamage = 9;
            this.attackInterval = 140;
            this.attackRange = 102;
            this.aoeRadius = 118;
            this.windupDuration = 48;
            this.xpReward = 8;
        } else {
            this.radius = 16;
            this.maxHp = 30;
            this.drawScale = 1.15;
            this.chaseSpeed = 0.05;
            this.attackType = 'single';
            this.attackDamage = 6;
            this.attackInterval = 90;
            this.attackRange = 88;
            this.aoeRadius = 0;
            this.windupDuration = 28;
            this.xpReward = 3;
        }

        const power = this.powerLevel;
        if (power > 1) {
            this.maxHp = Math.round(this.maxHp * (1 + (power - 1) * 0.42));
            this.attackDamage = Math.round(this.attackDamage * (1 + (power - 1) * 0.28));
            this.xpReward += (power - 1) * 2;
        }
        this.hp = this.maxHp;
        this.attackCooldown = 20 + Math.random() * 40;
        this.attackState = 'move';
        this.windupTimer = 0;
        this.recoverTimer = 0;
        this.aimX = x;
        this.aimY = y;
    }

    nearestMaid(maids) {
        let best = null;
        let bestDist = Infinity;
        for (const maid of maids) {
            if (!maid || maid.downed) continue;
            const dist = Math.hypot(maid.x - this.x, maid.y - this.y);
            if (dist < bestDist) {
                best = maid;
                bestDist = dist;
            }
        }
        return { maid: best, dist: bestDist };
    }

    update(livingMaids) {
        if (!this.alive) {
            if (this.deathTimer > 0) this.deathTimer -= 1;
            return null;
        }

        this.anim += this.attackState === 'windup' ? 0.16 : 0.08;
        if (this.hitFlash > 0) this.hitFlash -= 1;
        if (this.slowTimer > 0) this.slowTimer -= 1;
        if (this.attackCooldown > 0 && this.attackState === 'move') this.attackCooldown -= 1;

        const { maid, dist } = this.nearestMaid(livingMaids || []);
        if (this.attackState === 'windup') {
            this.vx = 0;
            this.vy = 0;
            if (maid) {
                this.aimX = maid.x;
                this.aimY = maid.y;
            }
            this.windupTimer -= 1;
            if (this.windupTimer <= 0) {
                this.attackState = 'recover';
                this.recoverTimer = 18;
                this.attackCooldown = this.attackInterval;
                if (this.attackType === 'aoe') {
                    return { type: 'aoe', x: this.x, y: this.y, radius: this.aoeRadius, damage: this.attackDamage };
                }
                return {
                    type: 'shot',
                    shot: new EnemyShot(this.x, this.y, this.aimX, this.aimY, this.attackDamage)
                };
            }
            return null;
        }

        if (this.attackState === 'recover') {
            this.recoverTimer -= 1;
            this.vx *= 0.8;
            this.vy *= 0.8;
            this.x += this.vx;
            this.y += this.vy;
            if (this.recoverTimer <= 0) this.attackState = 'move';
            return null;
        }

        this.wanderTimer -= 1;
        if (this.wanderTimer <= 0) {
            this.wanderAngle += (Math.random() - 0.5) * 1.4;
            this.wanderTimer = 40 + Math.random() * 50;
        }

        const slow = this.slowTimer > 0 ? 0.35 : 1;
        if (maid && dist > 1) {
            const dx = maid.x - this.x;
            const dy = maid.y - this.y;
            if (dist > this.attackRange) {
                this.vx += (dx / dist) * this.chaseSpeed * slow;
                this.vy += (dy / dist) * this.chaseSpeed * slow;
            } else if (this.attackCooldown <= 0) {
                this.attackState = 'windup';
                this.windupTimer = this.windupDuration;
                this.aimX = maid.x;
                this.aimY = maid.y;
                this.vx = 0;
                this.vy = 0;
                return null;
            }
        } else {
            const hdx = this.homeX - this.x;
            const hdy = this.homeY - this.y;
            this.vx += (Math.cos(this.wanderAngle) * 0.03 + hdx * 0.001) * slow;
            this.vy += (Math.sin(this.wanderAngle) * 0.03 + hdy * 0.001) * slow;
        }

        this.vx *= 0.92;
        this.vy *= 0.92;
        this.x += this.vx;
        this.y += this.vy;
        return null;
    }

    applyHit(fromX, fromY, knockback, slow) {
        const dx = this.x - fromX;
        const dy = this.y - fromY;
        const dist = Math.hypot(dx, dy) || 1;
        this.vx += (dx / dist) * knockback;
        this.vy += (dy / dist) * knockback;
        if (slow > 0) this.slowTimer = Math.max(this.slowTimer, slow);
    }

    takeDamage(amount) {
        if (!this.alive) return false;
        this.hp -= amount;
        this.hitFlash = 8;
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
            this.deathTimer = 24;
            return true;
        }
        return false;
    }

    draw(ctx) {
        if (!this.alive && this.deathTimer <= 0) return;

        const puff = Math.sin(this.anim * 2.4) * 2;
        const scale = (this.alive ? 1 : Math.max(0.1, this.deathTimer / 24)) * this.drawScale;
        const alpha = this.alive ? 1 : this.deathTimer / 24;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.scale(scale, scale);

        ctx.fillStyle = 'rgba(80, 60, 90, 0.18)';
        ctx.beginPath();
        ctx.ellipse(0, 14, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        const body = this.hitFlash > 0 ? '#fff7ed' : (this.kind === 'large' ? '#cbd5e1' : '#e2e8f0');
        const dark = this.hitFlash > 0 ? '#fed7aa' : '#94a3b8';
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(-8, -2 + puff, 10, 0, Math.PI * 2);
        ctx.arc(8, -1 - puff, 11, 0, Math.PI * 2);
        ctx.arc(0, 4, 13, 0, Math.PI * 2);
        ctx.arc(-2, -10, 9, 0, Math.PI * 2);
        ctx.fill();

        if (this.kind === 'large') {
            ctx.fillStyle = '#64748b';
            ctx.beginPath();
            ctx.ellipse(0, 2, 11, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.arc(-6, 2, 3, 0, Math.PI * 2);
        ctx.arc(7, 0, 2.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.ellipse(-4, -2, 1.6, 2.2, 0, 0, Math.PI * 2);
        ctx.ellipse(5, -2, 1.6, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-3.4, -2.8, 0.6, 0, Math.PI * 2);
        ctx.arc(5.6, -2.8, 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = this.slowTimer > 0 ? '#38bdf8' : '#94a3b8';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 2, 3, 0.2, Math.PI - 0.2);
        ctx.stroke();

        ctx.restore();

        if (this.alive && this.attackState === 'windup') {
            this.drawTelegraph(ctx);
        }

        if (this.alive && (this.kind === 'large' || this.hp < this.maxHp)) {
            this.drawHp(ctx);
        }
    }

    drawTelegraph(ctx) {
        const t = 1 - this.windupTimer / this.windupDuration;
        ctx.save();
        if (this.attackType === 'aoe') {
            const r = this.aoeRadius * (0.45 + t * 0.55);
            ctx.strokeStyle = `rgba(251, 191, 36, ${0.35 + t * 0.55})`;
            ctx.fillStyle = `rgba(253, 224, 71, ${0.12 + t * 0.12})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.strokeStyle = `rgba(148, 163, 184, ${0.5 + t * 0.4})`;
            ctx.setLineDash([6, 6]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.aimX, this.aimY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#cbd5e1';
            ctx.beginPath();
            ctx.arc(this.x, this.y - 18, 6 + t * 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawHp(ctx) {
        const w = this.kind === 'large' ? 54 : 28;
        const h = 5;
        const x = this.x - w / 2;
        const y = this.y - (this.kind === 'large' ? 48 : 28);
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = this.kind === 'large' ? '#fb7185' : '#67e8f9';
        ctx.fillRect(x, y, w * (this.hp / this.maxHp), h);
        if (this.kind === 'large') {
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#be123c';
            ctx.fillText('大型', this.x, y - 3);
        }
        ctx.restore();
    }
}

class EnemyShot {
    constructor(x, y, tx, ty, damage) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.radius = 11;
        this.alive = true;
        const dx = tx - x;
        const dy = ty - y;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 5.4;
        this.vx = (dx / dist) * speed;
        this.vy = (dy / dist) * speed;
        this.life = 70;
        this.anim = 0;
    }

    update() {
        if (!this.alive) return;
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 1;
        this.anim += 0.2;
        if (this.life <= 0) this.alive = false;
    }

    hits(maid) {
        if (!this.alive || !maid || maid.downed) return false;
        return Math.hypot(this.x - maid.x, this.y - maid.y) <= this.radius + maid.radius;
    }

    draw(ctx) {
        if (!this.alive) return;
        const puff = Math.sin(this.anim) * 1.5;
        ctx.save();
        ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.beginPath();
        ctx.arc(this.x - 4, this.y, 7 + puff, 0, Math.PI * 2);
        ctx.arc(this.x + 5, this.y - 2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(this.x - 2, this.y - 1, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
