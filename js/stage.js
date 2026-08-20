/**
 * 屋敷探索ステージ
 * 既存の移動・隊列は触らず、広めの複数エリアと仕事配置だけを担当する。
 */
class StageObstacle {
    constructor(x, y, radius, kind = 'hedge') {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.kind = kind;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.kind === 'crate') {
            ctx.fillStyle = '#b08968';
            ctx.strokeStyle = '#7c5a3b';
            ctx.lineWidth = 2;
            const s = this.radius * 1.5;
            ctx.fillRect(-s / 2, -s / 2, s, s);
            ctx.strokeRect(-s / 2, -s / 2, s, s);
            ctx.beginPath();
            ctx.moveTo(-s / 2, 0);
            ctx.lineTo(s / 2, 0);
            ctx.stroke();
        } else if (this.kind === 'fountain') {
            ctx.fillStyle = 'rgba(125, 211, 252, 0.55)';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.fillStyle = '#e0f2fe';
            ctx.beginPath();
            ctx.arc(0, -2, this.radius * 0.35, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.kind === 'pillar') {
            ctx.fillStyle = '#e7e0d4';
            ctx.strokeStyle = '#c4b5a0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillStyle = '#5b8c3a';
            ctx.beginPath();
            ctx.ellipse(0, 4, this.radius * 1.05, this.radius * 0.72, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#4d7c30';
            ctx.beginPath();
            ctx.arc(-this.radius * 0.25, -2, this.radius * 0.62, 0, Math.PI * 2);
            ctx.arc(this.radius * 0.28, -4, this.radius * 0.55, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

class Stage {
    constructor() {
        this.imageWidth = 1536;
        this.imageHeight = 1024;
        this.worldScale = 1.5;
        this.areas = this.createAreas();
        this.obstacles = this.createObstacles();
        this.updateBounds();

        this.background = new Image();
        this.backgroundReady = false;
        this.background.onload = () => {
            this.backgroundReady = true;
        };
        this.background.src = 'assets/garden-background.jpg';
    }

    createAreas() {
        return [
            { id: 'garden', name: '庭', x: -720, y: 80, w: 1440, h: 980, floor: '#8ecf5d', accent: '#7cbc4d' },
            { id: 'hall', name: '廊下', x: -360, y: -280, w: 720, h: 480, floor: '#e8d5b5', accent: '#d4bc94' },
            { id: 'courtyard', name: '中庭', x: -520, y: -780, w: 1040, h: 640, floor: '#9ccc65', accent: '#7cb342' },
            { id: 'west_hall', name: '西廊下', x: -960, y: 20, w: 360, h: 420, floor: '#efe4d0', accent: '#dcc9a8' },
            { id: 'dining', name: '食堂', x: -1560, y: -80, w: 780, h: 700, floor: '#f3e0c8', accent: '#e0c8a0' },
            { id: 'kitchen', name: '厨房', x: -1560, y: -820, w: 820, h: 820, floor: '#fde8d0', accent: '#f0c9a0' },
            { id: 'north_path', name: '北の通路', x: -960, y: -540, w: 560, h: 380, floor: '#efe4d0', accent: '#dcc9a8' },
            { id: 'laundry', name: '洗濯場', x: 420, y: -420, w: 1140, h: 980, floor: '#dbeafe', accent: '#bfdbfe' },
            { id: 'warehouse', name: '倉庫', x: -1560, y: 500, w: 980, h: 560, floor: '#d6c7a8', accent: '#c4b18c' }
        ];
    }

    createObstacles() {
        const hedgeLine = (x0, y0, x1, y1, gap = 46, radius = 22) => {
            const dx = x1 - x0;
            const dy = y1 - y0;
            const dist = Math.hypot(dx, dy);
            const steps = Math.max(1, Math.floor(dist / gap));
            const list = [];
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                list.push(new StageObstacle(x0 + dx * t, y0 + dy * t, radius, 'hedge'));
            }
            return list;
        };

        return [
            new StageObstacle(220, 900, 36, 'fountain'),
            ...hedgeLine(-680, 140, -500, 140, 50, 20),
            ...hedgeLine(500, 140, 680, 140, 50, 20),
            ...hedgeLine(-640, 1000, 640, 1000, 52, 22),
            ...hedgeLine(-480, -740, -480, -520, 54, 18),
            new StageObstacle(-200, -40, 20, 'pillar'),
            new StageObstacle(200, -40, 20, 'pillar'),
            new StageObstacle(-1180, 180, 26, 'crate'),
            new StageObstacle(-1080, 800, 24, 'crate'),
            new StageObstacle(-1400, 640, 22, 'crate'),
            new StageObstacle(1480, 180, 24, 'crate'),
            new StageObstacle(720, -80, 22, 'crate'),
            new StageObstacle(1380, -280, 26, 'crate'),
            new StageObstacle(-1480, -700, 22, 'pillar'),
            new StageObstacle(-760, -280, 20, 'pillar')
        ];
    }

    updateBounds() {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const area of this.areas) {
            minX = Math.min(minX, area.x);
            minY = Math.min(minY, area.y);
            maxX = Math.max(maxX, area.x + area.w);
            maxY = Math.max(maxY, area.y + area.h);
        }
        const pad = 36;
        this.bounds = {
            minX: minX + pad,
            maxX: maxX - pad,
            minY: minY + pad,
            maxY: maxY - pad
        };
    }

    fromImage(px, py) {
        return {
            x: (px - this.imageWidth / 2) * this.worldScale,
            y: (py - this.imageHeight / 2) * this.worldScale
        };
    }

    startPosition() {
        return { x: 0, y: 560 };
    }

    createJobPiles() {
        return [
            new JobPile(JOB_TYPES.cleaning, -240, 540, { size: 'small' }),
            new JobPile(JOB_TYPES.cleaning, 250, 520, { size: 'small' }),
            new JobPile(JOB_TYPES.laundry, 50, 720, { size: 'small' }),
            new JobPile(JOB_TYPES.cleaning, -1180, 640, { size: 'small', label: '倉庫のホコリ' }),
            new JobPile(JOB_TYPES.laundry, 860, 420, { size: 'small' }),
            new JobPile(JOB_TYPES.cleaning, -380, 220, { size: 'small' }),

            new JobPile(JOB_TYPES.cooking, -980, 140, { size: 'medium' }),
            new JobPile(JOB_TYPES.cleaning, 0, -320, { size: 'medium', label: '落ち葉の山' }),
            new JobPile(JOB_TYPES.laundry, 1120, 80, { size: 'medium' }),

            new JobPile(JOB_TYPES.cleaning, 0, -480, { size: 'normal', label: '大きなゴミ' }),

            new JobPile(JOB_TYPES.cooking, -1180, -520, { size: 'large' }),
            new JobPile(JOB_TYPES.cleaning, 0, 300, { size: 'large', isMain: true })
        ];
    }

    createEnemies() {
        const spawn = (x, y, kind, powerLevel) =>
            new DustMonster(x, y, kind, { powerLevel });

        return [
            spawn(-90, 620, 'small', 1),
            spawn(130, 660, 'small', 1),
            spawn(-320, 600, 'small', 1),

            spawn(-860, 200, 'small', 2),
            spawn(-1100, 80, 'small', 2),
            spawn(80, -80, 'small', 2),
            spawn(900, 280, 'small', 2),
            spawn(1180, 40, 'small', 2),
            spawn(-1240, 700, 'small', 2),
            spawn(-1400, 700, 'small', 2),
            spawn(-1400, 700, 'small', 2),

            spawn(-220, 480, 'small', 5),
            spawn(230, 470, 'small', 5),
            spawn(-280, 180, 'large', 5),
            spawn(300, 200, 'large', 5),

            spawn(-260, 40, 'small', 4),
            spawn(260, 20, 'small', 4),
            spawn(0, -320, 'small', 3),
            spawn(60, -560, 'large', 4),

            spawn(-1080, -380, 'large', 5),
            spawn(-1280, -600, 'large', 5)
        ];
    }

    createRescue() {
        return new RescueMaid(-1460, 820, 'tidy');
    }

    pointInArea(x, y, area, pad = 0) {
        return x >= area.x + pad
            && x <= area.x + area.w - pad
            && y >= area.y + pad
            && y <= area.y + area.h - pad;
    }

    clamp(x, y) {
        const pad = 28;
        for (const area of this.areas) {
            if (this.pointInArea(x, y, area, pad)) return { x, y };
        }
        let best = { x, y };
        let bestDist = Infinity;
        for (const area of this.areas) {
            const cx = Math.max(area.x + pad, Math.min(area.x + area.w - pad, x));
            const cy = Math.max(area.y + pad, Math.min(area.y + area.h - pad, y));
            const dist = (cx - x) * (cx - x) + (cy - y) * (cy - y);
            if (dist < bestDist) {
                bestDist = dist;
                best = { x: cx, y: cy };
            }
        }
        return best;
    }

    drawGround(ctx, cameraX, cameraY, width, height) {
        ctx.fillStyle = '#6b7280';
        ctx.fillRect(0, 0, width, height);
    }

    drawWorld(ctx) {
        for (const area of this.areas) {
            this.drawAreaFloor(ctx, area);
        }

        const garden = this.areas.find((area) => area.id === 'garden');
        if (garden && this.backgroundReady) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(garden.x, garden.y, garden.w, garden.h);
            ctx.clip();
            ctx.globalAlpha = 0.82;
            ctx.drawImage(this.background, garden.x, garden.y, garden.w, garden.h);
            ctx.restore();
        }

        for (const area of this.areas) {
            this.drawAreaLabel(ctx, area);
        }
        for (const obstacle of this.obstacles) {
            obstacle.draw(ctx);
        }
    }

    drawAreaFloor(ctx, area) {
        ctx.save();
        ctx.fillStyle = area.floor;
        ctx.fillRect(area.x, area.y, area.w, area.h);
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 6;
        ctx.strokeRect(area.x + 4, area.y + 4, area.w - 8, area.h - 8);

        ctx.strokeStyle = area.accent;
        ctx.globalAlpha = 0.18;
        ctx.lineWidth = 1;
        const step = area.id === 'hall' || area.id === 'dining' || area.id === 'west_hall' || area.id === 'north_path' ? 46 : 64;
        if (area.id === 'hall' || area.id === 'dining' || area.id === 'warehouse' || area.id === 'west_hall' || area.id === 'north_path') {
            for (let x = area.x; x < area.x + area.w; x += step) {
                ctx.beginPath();
                ctx.moveTo(x, area.y);
                ctx.lineTo(x, area.y + area.h);
                ctx.stroke();
            }
        } else {
            for (let y = area.y; y < area.y + area.h; y += step) {
                ctx.beginPath();
                ctx.moveTo(area.x, y);
                ctx.lineTo(area.x + area.w, y);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    drawAreaLabel(ctx, area) {
        ctx.save();
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(107, 79, 107, 0.28)';
        ctx.fillText(area.name, area.x + area.w / 2, area.y + 28);
        ctx.restore();
    }
}
