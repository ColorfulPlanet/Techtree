/**
 * 仕事の山
 * 従来の「敵基地」に相当する、溜まった家事の山。
 */
class JobPile {
    constructor(jobType, x, y, options = {}) {
        this.jobType = jobType;
        this.x = x;
        this.y = y;
        this.pileSize = options.size || 'normal';
        this.completeFx = 0;
        this.wobble = Math.random() * Math.PI * 2;
        this.justCompleted = false;

        const meta = JobPile.META[jobType];
        this.label = meta.label;
        this.icon = meta.icon;
        this.color = meta.color;
        this.recommend = meta.recommend;
        this.visualScale = 1;

        const preset = JobPile.SIZE[this.pileSize] || JobPile.SIZE.normal;
        this.baseRadius = preset.baseRadius;
        this.workMargin = preset.workMargin;
        this.maxWork = options.maxWork ?? preset.maxWork;
        this.visualScale = preset.visualScale;
        this.stars = options.stars ?? preset.stars;
        this.recommendedLevel = options.recommendedLevel ?? preset.recommendedLevel;
        this.xpReward = options.xp ?? preset.xp;

        if (this.pileSize === 'small') {
            this.label = options.label || meta.smallLabel;
            this.recommend = 'サクラ＋広い';
        } else if (this.pileSize === 'medium') {
            this.label = options.label || meta.mediumLabel;
        } else if (this.pileSize === 'large') {
            this.label = options.label || meta.largeLabel;
            this.recommend = `${meta.recommend}＋囲む`;
        } else if (options.label) {
            this.label = options.label;
        }
        this.remaining = this.maxWork;
        this.radius = this.getCollisionRadius();
        this.workRadius = this.getWorkRadius();
        this.isMain = !!options.isMain;
        this.jobRole = options.role || this.defaultRole();
        if (this.isMain && !options.label) {
            this.label = `メイン：${this.label}`;
        }
    }

    defaultRole() {
        if (this.isMain) return 'main';
        if (this.pileSize === 'small') return 'small';
        if (this.pileSize === 'medium') return 'medium';
        return 'large';
    }

    static META = {
        cleaning: { label: '掃除の山', smallLabel: '小さなゴミ', mediumLabel: '大きなゴミ', largeLabel: '巨大なゴミの山', icon: '🧹', color: '#f9a8d4', recommend: 'サクラ' },
        cooking: { label: '料理の山', smallLabel: '食器のかけら', mediumLabel: '散らかった机', largeLabel: '巨大な料理の山', icon: '🍳', color: '#fdba74', recommend: 'ココ' },
        laundry: { label: '洗濯の山', smallLabel: '小さな洗濯物', mediumLabel: '洗濯物の山', largeLabel: '巨大な洗濯の山', icon: '🧺', color: '#7dd3fc', recommend: 'アオイ' }
    };

    static SIZE = {
        small: {
            baseRadius: 26, workMargin: 52, maxWork: 28, visualScale: 0.52,
            stars: 1, recommendedLevel: 1, xp: 10
        },
        medium: {
            baseRadius: 58, workMargin: 62, maxWork: 88, visualScale: 1.15,
            stars: 2, recommendedLevel: 2, xp: 20
        },
        normal: {
            baseRadius: 72, workMargin: 68, maxWork: 190, visualScale: 1.4,
            stars: 3, recommendedLevel: 3, xp: 50
        },
        large: {
            baseRadius: 178, workMargin: 58, maxWork: 780, visualScale: 5.2,
            stars: 5, recommendedLevel: 5, xp: 100
        }
    };

    isComplete() {
        return this.remaining <= 0;
    }

    getProgress() {
        return 1 - this.remaining / this.maxWork;
    }

    /**
     * 残量に応じて見た目・当たりが小さくなる
     */
    getSizeRatio() {
        if (this.isComplete()) return 0.18;
        return 0.22 + 0.78 * (this.remaining / this.maxWork);
    }

    getCollisionRadius() {
        return this.baseRadius * this.getSizeRatio();
    }

    getWorkRadius() {
        return this.getCollisionRadius() + this.workMargin;
    }

    getStarText() {
        return '★'.repeat(Math.max(1, this.stars || 1));
    }

    /**
     * パーティーレベルと推奨レベルの差で仕事の進みやすさが変わる。
     * 低レベルでは巨大な仕事がほとんど減らない。
     */
    getLevelFactor(partyLevel) {
        const rec = Math.max(1, this.recommendedLevel || 1);
        const level = Math.max(1, partyLevel || 1);
        if (level >= rec) return 1 + (level - rec) * 0.06;
        return Math.max(0.14, Math.pow(level / rec, 1.55));
    }

    applyWork(amount) {
        if (this.isComplete()) return 0;
        const applied = Math.min(this.remaining, amount);
        this.remaining -= applied;
        this.radius = this.getCollisionRadius();
        this.workRadius = this.getWorkRadius();
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
        const r = this.getWorkRadius() + extra;
        return dx * dx + dy * dy <= r * r;
    }

    update() {
        this.wobble += 0.04;
        if (this.completeFx > 0) this.completeFx -= 1;
        this.radius = this.isComplete() ? 0 : this.getCollisionRadius();
        this.workRadius = this.getWorkRadius();
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
        const shrink = this.visualScale * this.getSizeRatio();
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
        const visualR = this.isComplete() ? 36 : Math.max(28, this.getCollisionRadius());
        const w = this.pileSize === 'small' ? 72 : (this.pileSize === 'large' ? 168 : 132);
        const h = this.pileSize === 'small' ? 14 : 22;
        const gx = this.x - w / 2;
        const gy = this.y - visualR - (this.pileSize === 'small' ? 22 : 28);
        const ratio = Math.max(0, this.remaining / this.maxWork);
        const percent = this.isComplete() ? 0 : Math.max(1, Math.ceil(ratio * 100));

        ctx.save();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        ctx.strokeStyle = 'rgba(107, 79, 107, 0.35)';
        ctx.lineWidth = 2;
        roundRect(ctx, gx - 8, gy - 20, w + 16, h + 28, 12);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = this.isComplete() ? '#ca8a04' : '#6b4f6b';
        const caption = this.isComplete() ? '完了！' : `残り ${percent}%`;
        ctx.fillText(caption, this.x, gy - 4);

        ctx.fillStyle = '#e2e8f0';
        roundRect(ctx, gx, gy, w, h, 8);
        ctx.fill();

        const fillW = this.isComplete() ? w : Math.max(ratio > 0 ? 8 : 0, w * ratio);
        if (fillW > 0) {
            ctx.fillStyle = this.isComplete() ? '#fde68a' : this.color;
            roundRect(ctx, gx, gy, fillW, h, 8);
            ctx.fill();
        }

        const segments = 10;
        const gap = 2;
        const segW = (w - gap * (segments - 1)) / segments;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1;
        for (let i = 1; i < segments; i++) {
            const sx = gx + i * (segW + gap) - gap / 2;
            ctx.beginPath();
            ctx.moveTo(sx, gy + 2);
            ctx.lineTo(sx, gy + h - 2);
            ctx.stroke();
        }

        ctx.font = 'bold 13px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.fillStyle = this.isComplete() ? '#92400e' : '#5b3b5b';
        const barText = this.isComplete() ? 'ピカピカ' : `${percent}%`;
        ctx.strokeText(barText, this.x, gy + h / 2 + 1);
        ctx.fillText(barText, this.x, gy + h / 2 + 1);

        ctx.restore();
    }

    drawLabel(ctx) {
        ctx.save();
        ctx.font = this.pileSize === 'small' ? 'bold 11px sans-serif' : 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255,255,255,0.92)';
        const text = this.isComplete() ? `${this.icon} ピカピカ！` : `${this.icon} ${this.label}`;
        ctx.fillStyle = this.isComplete() ? '#ca8a04' : '#6b4f6b';
        const visualR = this.isComplete() ? 36 : Math.max(28, this.getCollisionRadius());
        const labelY = this.y - visualR - (this.pileSize === 'small' ? 40 : 52);
        ctx.strokeText(text, this.x, labelY);
        ctx.fillText(text, this.x, labelY);

        if (!this.isComplete()) {
            ctx.font = this.pileSize === 'small' ? '10px sans-serif' : '12px sans-serif';
            ctx.fillStyle = '#eab308';
            const rec = this.recommendedLevel ? `${this.getStarText()}  目安Lv.${this.recommendedLevel}` : this.getStarText();
            ctx.strokeText(rec, this.x, this.y - visualR - 8);
            ctx.fillText(rec, this.x, this.y - visualR - 8);
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
