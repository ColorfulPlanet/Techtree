/**
 * 邪魔者（ホコリモンスター）
 * 倒すというより、仕事の邪魔をするものを退治する。
 */
class DustMonster {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 16;
        this.maxHp = 24;
        this.hp = this.maxHp;
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
    }

    update(partyX, partyY) {
        if (!this.alive) {
            if (this.deathTimer > 0) this.deathTimer -= 1;
            return;
        }

        this.anim += 0.08;
        if (this.hitFlash > 0) this.hitFlash -= 1;

        this.wanderTimer -= 1;
        if (this.wanderTimer <= 0) {
            this.wanderAngle += (Math.random() - 0.5) * 1.4;
            this.wanderTimer = 40 + Math.random() * 50;
        }

        const dx = partyX - this.x;
        const dy = partyY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 220 && dist > 1) {
            this.vx += (dx / dist) * 0.04;
            this.vy += (dy / dist) * 0.04;
        } else {
            const hdx = this.homeX - this.x;
            const hdy = this.homeY - this.y;
            this.vx += Math.cos(this.wanderAngle) * 0.03 + hdx * 0.001;
            this.vy += Math.sin(this.wanderAngle) * 0.03 + hdy * 0.001;
        }

        this.vx *= 0.92;
        this.vy *= 0.92;
        this.x += this.vx;
        this.y += this.vy;
    }

    takeDamage(amount) {
        if (!this.alive) return false;
        this.hp -= amount;
        this.hitFlash = 8;
        this.vx *= 0.3;
        this.vy *= 0.3;
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
        const scale = this.alive ? 1 : Math.max(0.1, this.deathTimer / 24);
        const alpha = this.alive ? 1 : this.deathTimer / 24;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.scale(scale, scale);

        ctx.fillStyle = 'rgba(80, 60, 90, 0.18)';
        ctx.beginPath();
        ctx.ellipse(0, 14, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        const body = this.hitFlash > 0 ? '#fff7ed' : '#e2e8f0';
        const dark = this.hitFlash > 0 ? '#fed7aa' : '#cbd5e1';
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(-8, -2 + puff, 10, 0, Math.PI * 2);
        ctx.arc(8, -1 - puff, 11, 0, Math.PI * 2);
        ctx.arc(0, 4, 13, 0, Math.PI * 2);
        ctx.arc(-2, -10, 9, 0, Math.PI * 2);
        ctx.fill();

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

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 2, 3, 0.2, Math.PI - 0.2);
        ctx.stroke();

        ctx.restore();
    }
}
