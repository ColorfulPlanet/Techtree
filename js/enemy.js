/**
 * 邪魔者
 * 小型の群れと、狭い隊列向きの大型を用意する。
 */
class DustMonster {
    constructor(x, y, kind = 'small') {
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

        if (kind === 'large') {
            this.radius = 36;
            this.maxHp = 120;
            this.drawScale = 2.05;
            this.chaseSpeed = 0.028;
        } else {
            this.radius = 16;
            this.maxHp = 12;
            this.drawScale = 1.15;
            this.chaseSpeed = 0.05;
        }
        this.hp = this.maxHp;
    }

    update(partyX, partyY) {
        if (!this.alive) {
            if (this.deathTimer > 0) this.deathTimer -= 1;
            return;
        }

        this.anim += 0.08;
        if (this.hitFlash > 0) this.hitFlash -= 1;
        if (this.slowTimer > 0) this.slowTimer -= 1;

        this.wanderTimer -= 1;
        if (this.wanderTimer <= 0) {
            this.wanderAngle += (Math.random() - 0.5) * 1.4;
            this.wanderTimer = 40 + Math.random() * 50;
        }

        const dx = partyX - this.x;
        const dy = partyY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const slow = this.slowTimer > 0 ? 0.35 : 1;

        if (dist < (this.kind === 'large' ? 280 : 220) && dist > 1) {
            this.vx += (dx / dist) * this.chaseSpeed * slow;
            this.vy += (dy / dist) * this.chaseSpeed * slow;
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

        if (this.alive && (this.kind === 'large' || this.hp < this.maxHp)) {
            this.drawHp(ctx);
        }
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
