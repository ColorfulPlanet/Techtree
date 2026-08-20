/**
 * 可愛いポップな演出（星・ハート・泡・キラキラ）
 */
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.floatTexts = [];
    }

    spawnBurst(x, y, type, count = 8, color = '#fde68a') {
        for (let i = 0; i < count; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 0.6 + Math.random() * 2.2;
            this.particles.push({
                x,
                y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 0.8,
                life: 28 + Math.random() * 18,
                maxLife: 40,
                size: 2.5 + Math.random() * 3.5,
                color,
                type
            });
        }
    }

    spawnWork(x, y, specialty) {
        const type = specialty === 'cleaning' ? 'sparkle'
            : specialty === 'cooking' ? 'heart'
            : 'bubble';
        const color = specialty === 'cleaning' ? '#67e8f9'
            : specialty === 'cooking' ? '#fdba74'
            : '#bae6fd';
        this.spawnBurst(x, y, type, 2, color);
    }

    spawnAttack(x, y, specialty) {
        const type = specialty === 'cleaning' ? 'sparkle'
            : specialty === 'cooking' ? 'star'
            : 'bubble';
        const color = specialty === 'cleaning' ? '#a5f3fc'
            : specialty === 'cooking' ? '#fbbf24'
            : '#e0f2fe';
        this.spawnBurst(x, y, type, 6, color);
    }

    spawnDefeat(x, y) {
        this.spawnBurst(x, y, 'star', 14, '#fde68a');
        this.spawnBurst(x, y, 'heart', 6, '#fda4af');
        this.spawnBurst(x, y, 'sparkle', 8, '#fff');
    }

    spawnComplete(x, y) {
        this.spawnBurst(x, y, 'sparkle', 18, '#fde68a');
        this.spawnBurst(x, y, 'star', 10, '#86efac');
        this.spawnBurst(x, y, 'heart', 8, '#f9a8d4');
    }

    spawnLevelUp(x, y) {
        this.spawnBurst(x, y, 'star', 16, '#fde68a');
        this.spawnBurst(x, y, 'sparkle', 18, '#fff7ae');
        this.spawnBurst(x, y, 'heart', 8, '#fda4af');
        this.spawnBurst(x, y - 12, 'sparkle', 10, '#86efac');
    }

    addText(x, y, text, color = '#fb7185') {
        this.floatTexts.push({
            x,
            y,
            text,
            color,
            life: 50,
            maxLife: 50
        });
    }

    update() {
        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy -= 0.03;
            p.life -= 1;
        }
        this.particles = this.particles.filter((p) => p.life > 0);

        for (const t of this.floatTexts) {
            t.y -= 0.55;
            t.life -= 1;
        }
        this.floatTexts = this.floatTexts.filter((t) => t.life > 0);
    }

    draw(ctx) {
        for (const p of this.particles) {
            const a = Math.max(0, p.life / p.maxLife);
            ctx.save();
            ctx.globalAlpha = a;
            ctx.fillStyle = p.color;
            ctx.translate(p.x, p.y);
            if (p.type === 'star') {
                this.drawStar(ctx, p.size);
            } else if (p.type === 'heart') {
                this.drawHeart(ctx, p.size);
            } else if (p.type === 'bubble') {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = a * 0.25;
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        for (const t of this.floatTexts) {
            const a = Math.max(0, t.life / t.maxLife);
            ctx.save();
            ctx.globalAlpha = a;
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(255,255,255,0.95)';
            ctx.fillStyle = t.color;
            ctx.strokeText(t.text, t.x, t.y);
            ctx.fillText(t.text, t.x, t.y);
            ctx.restore();
        }
    }

    drawStar(ctx, r) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
            const b = a + Math.PI / 5;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            ctx.lineTo(Math.cos(b) * r * 0.45, Math.sin(b) * r * 0.45);
        }
        ctx.closePath();
        ctx.fill();
    }

    drawHeart(ctx, r) {
        ctx.beginPath();
        ctx.moveTo(0, r * 0.35);
        ctx.bezierCurveTo(r, -r * 0.4, r * 0.4, -r, 0, -r * 0.35);
        ctx.bezierCurveTo(-r * 0.4, -r, -r, -r * 0.4, 0, r * 0.35);
        ctx.fill();
    }
}
