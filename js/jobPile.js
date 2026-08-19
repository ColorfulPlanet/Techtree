/**
 * 仕事の山
 * 従来の「敵基地」に相当する、溜まった家事の山。
 */
class JobPile {
    constructor(jobType, x, y) {
        this.jobType = jobType;
        this.x = x;
        this.y = y;
        this.radius = 52;
        this.workRadius = 120;
        this.maxWork = 100;
        this.remaining = 100;
        this.completeFx = 0;
        this.wobble = Math.random() * Math.PI * 2;
        this.justCompleted = false;

        const meta = JobPile.META[jobType];
        this.label = meta.label;
        this.icon = meta.icon;
        this.color = meta.color;
        this.recommend = meta.recommend;
    }

    static META = {
        cleaning: { label: '掃除の山', icon: '🧹', color: '#f9a8d4', recommend: 'サクラ' },
        cooking: { label: '料理の山', icon: '🍳', color: '#fdba74', recommend: 'ココ' },
        laundry: { label: '洗濯の山', icon: '🧺', color: '#7dd3fc', recommend: 'アオイ' }
    };

    isComplete() {
        return this.remaining <= 0;
    }

    getProgress() {
        return 1 - this.remaining / this.maxWork;
    }

    applyWork(amount) {
        if (this.isComplete()) return 0;
        const applied = Math.min(this.remaining, amount);
        this.remaining -= applied;
        if (this.remaining <= 0) {
            this.remaining = 0;
            this.justCompleted = true;
            this.completeFx = 90;
        }
        return applied;
    }

    containsPoint(px, py, extra = 0) {
        const dx = px - this.x;
        const dy = py - this.y;
        const r = this.workRadius + extra;
        return dx * dx + dy * dy <= r * r;
    }

    update() {
        this.wobble += 0.04;
        if (this.completeFx > 0) this.completeFx -= 1;
    }

    draw(ctx) {
        if (this.isComplete()) {
            this.drawCleanState(ctx);
        } else {
            this.drawMessyState(ctx);
        }
        this.drawGauge(ctx);
        this.drawLabel(ctx);
    }

    drawCleanState(ctx) {
        const spark = 0.55 + Math.sin(this.wobble * 2) * 0.2;
        ctx.save();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 8, 48, 22, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(250, 204, 21, ${spark})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#86efac';
        ctx.beginPath();
        ctx.ellipse(this.x - 12, this.y + 4, 8, 5, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f9a8d4';
        ctx.beginPath();
        ctx.ellipse(this.x + 14, this.y + 6, 7, 5, 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(253, 224, 71, ${spark})`;
        for (let i = 0; i < 5; i++) {
            const a = this.wobble + i * 1.26;
            const r = 22 + (i % 2) * 8;
            ctx.beginPath();
            ctx.arc(this.x + Math.cos(a) * r, this.y - 6 + Math.sin(a * 1.4) * 8, 2.4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawMessyState(ctx) {
        const shrink = 0.55 + this.remaining / this.maxWork * 0.45;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(shrink, shrink);

        if (this.jobType === JOB_TYPES.cleaning) {
            this.drawTrashPile(ctx);
        } else if (this.jobType === JOB_TYPES.cooking) {
            this.drawDishPile(ctx);
        } else {
            this.drawLaundryPile(ctx);
        }
        ctx.restore();
    }

    drawTrashPile(ctx) {
        const blobs = [
            { x: 0, y: 8, w: 42, h: 20, c: '#d6c7a1' },
            { x: -18, y: 4, w: 22, h: 16, c: '#c4b5a0' },
            { x: 16, y: 6, w: 20, h: 14, c: '#b8c4a8' },
            { x: -6, y: -8, w: 26, h: 18, c: '#e7d7b1' },
            { x: 10, y: -14, w: 16, h: 12, c: '#cbd5e1' }
        ];
        blobs.forEach((b) => {
            ctx.fillStyle = b.c;
            ctx.beginPath();
            ctx.ellipse(b.x, b.y, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.beginPath();
        ctx.arc(-22, -6, 10, 0, Math.PI * 2);
        ctx.arc(20, -10, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(-8, 0, 10, 8);
        ctx.fillStyle = '#fda4af';
        ctx.fillRect(6, 4, 8, 6);
    }

    drawDishPile(ctx) {
        const plates = ['#fff7ed', '#ffedd5', '#fed7aa', '#fffbeb', '#fecaca'];
        plates.forEach((c, i) => {
            ctx.fillStyle = c;
            ctx.strokeStyle = '#fdba74';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(0, 12 - i * 7, 28 - i * 2, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
        ctx.fillStyle = '#9ca3af';
        ctx.beginPath();
        ctx.ellipse(18, -4, 12, 8, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(-22, 2, 8, 14);
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.ellipse(-18, -6, 5, 10, -0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    drawLaundryPile(ctx) {
        const clothes = [
            { x: -8, y: 10, w: 36, h: 16, c: '#dbeafe', r: -0.2 },
            { x: 10, y: 4, w: 28, h: 14, c: '#fce7f3', r: 0.3 },
            { x: -12, y: -4, w: 30, h: 14, c: '#fef9c3', r: -0.15 },
            { x: 4, y: -14, w: 24, h: 12, c: '#e0e7ff', r: 0.25 }
        ];
        clothes.forEach((c) => {
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.r);
            ctx.fillStyle = c.c;
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            roundRect(ctx, -c.w / 2, -c.h / 2, c.w, c.h, 6);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(-16, 14, 3, 0, Math.PI * 2);
        ctx.arc(14, 12, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    drawGauge(ctx) {
        const w = 70;
        const h = 8;
        const gx = this.x - w / 2;
        const gy = this.y - 58;
        const ratio = this.remaining / this.maxWork;

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        roundRect(ctx, gx - 2, gy - 2, w + 4, h + 4, 6);
        ctx.fill();

        ctx.fillStyle = '#f1f5f9';
        roundRect(ctx, gx, gy, w, h, 4);
        ctx.fill();

        if (ratio > 0) {
            ctx.fillStyle = this.color;
            roundRect(ctx, gx, gy, Math.max(4, w * ratio), h, 4);
            ctx.fill();
        } else {
            ctx.fillStyle = '#fde68a';
            roundRect(ctx, gx, gy, w, h, 4);
            ctx.fill();
        }
        ctx.restore();
    }

    drawLabel(ctx) {
        ctx.save();
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255,255,255,0.92)';
        const text = this.isComplete() ? `${this.icon} ピカピカ！` : `${this.icon} ${this.label}`;
        ctx.fillStyle = this.isComplete() ? '#ca8a04' : '#6b4f6b';
        ctx.strokeText(text, this.x, this.y - 62);
        ctx.fillText(text, this.x, this.y - 62);

        if (!this.isComplete()) {
            ctx.font = '10px sans-serif';
            ctx.fillStyle = '#9d7a9d';
            ctx.strokeText(`おすすめ ${this.recommend}`, this.x, this.y - 48);
            ctx.fillText(`おすすめ ${this.recommend}`, this.x, this.y - 48);
        }
        ctx.restore();
    }
}

function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}
