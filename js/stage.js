/**
 * 屋敷と庭のステージ
 * 背景・装飾・仕事の山と邪魔者の配置を担当する。
 */
class Stage {
    constructor() {
        this.bounds = {
            minX: -780,
            maxX: 780,
            minY: -560,
            maxY: 560
        };
        this.flowers = this.scatterDecor(90, (rng) => ({
            x: this.lerp(-760, 760, rng()),
            y: this.lerp(-520, 540, rng()),
            color: ['#f9a8d4', '#fde68a', '#fda4af', '#c4b5fd', '#fff'][Math.floor(rng() * 5)],
            size: 3 + rng() * 3
        }));
        this.bushes = [
            { x: -620, y: -180, s: 1.1 },
            { x: -560, y: 220, s: 0.9 },
            { x: 610, y: -80, s: 1.2 },
            { x: 540, y: 260, s: 0.85 },
            { x: -120, y: 430, s: 1 },
            { x: 260, y: -420, s: 0.8 }
        ];
    }

    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    scatterDecor(count, factory) {
        const rng = mulberry32(20260819);
        const list = [];
        for (let i = 0; i < count; i++) list.push(factory(rng));
        return list;
    }

    createJobPiles() {
        return [
            new JobPile(JOB_TYPES.cleaning, -480, -20),
            new JobPile(JOB_TYPES.cooking, 430, -250),
            new JobPile(JOB_TYPES.laundry, 40, 330)
        ];
    }

    createEnemies() {
        return [
            new DustMonster(-430, 50),
            new DustMonster(-520, -80),
            new DustMonster(390, -200),
            new DustMonster(480, -300),
            new DustMonster(90, 280),
            new DustMonster(-40, 370),
            new DustMonster(600, 90),
            new DustMonster(660, 160)
        ];
    }

    createRescue() {
        return new RescueMaid(630, 120, 'tidy');
    }

    clamp(x, y) {
        return {
            x: Math.max(this.bounds.minX, Math.min(this.bounds.maxX, x)),
            y: Math.max(this.bounds.minY, Math.min(this.bounds.maxY, y))
        };
    }

    drawGround(ctx, cameraX, cameraY, width, height) {
        ctx.fillStyle = '#9ed36a';
        ctx.fillRect(0, 0, width, height);

        const tile = 48;
        const offsetX = (width / 2 - cameraX) % tile;
        const offsetY = (height / 2 - cameraY) % tile;
        ctx.fillStyle = 'rgba(122, 186, 74, 0.28)';
        for (let y = offsetY - tile; y < height + tile; y += tile) {
            for (let x = offsetX - tile; x < width + tile; x += tile) {
                if ((Math.floor((x + cameraX) / tile) + Math.floor((y + cameraY) / tile)) % 2 === 0) {
                    ctx.fillRect(x, y, tile, tile);
                }
            }
        }
    }

    drawWorld(ctx) {
        this.drawMansion(ctx);
        this.drawPaths(ctx);
        this.drawFountain(ctx);
        for (const bush of this.bushes) this.drawBush(ctx, bush);
        for (const flower of this.flowers) this.drawFlower(ctx, flower);
        this.drawHedge(ctx);
    }

    drawPaths(ctx) {
        ctx.save();
        ctx.strokeStyle = '#f6e6c4';
        ctx.lineWidth = 54;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 40);
        ctx.lineTo(-480, -20);
        ctx.moveTo(0, 40);
        ctx.lineTo(430, -250);
        ctx.moveTo(0, 40);
        ctx.lineTo(40, 330);
        ctx.moveTo(0, 40);
        ctx.lineTo(0, -320);
        ctx.stroke();

        ctx.strokeStyle = '#f0d9a6';
        ctx.lineWidth = 6;
        ctx.setLineDash([12, 16]);
        ctx.beginPath();
        ctx.moveTo(0, 40);
        ctx.lineTo(-480, -20);
        ctx.moveTo(0, 40);
        ctx.lineTo(430, -250);
        ctx.moveTo(0, 40);
        ctx.lineTo(40, 330);
        ctx.stroke();
        ctx.restore();
    }

    drawMansion(ctx) {
        ctx.save();
        ctx.translate(0, -430);

        ctx.fillStyle = '#fbcfe8';
        roundRect(ctx, -160, -40, 320, 150, 12);
        ctx.fill();
        ctx.fillStyle = '#fb7185';
        ctx.beginPath();
        ctx.moveTo(-180, -30);
        ctx.lineTo(0, -110);
        ctx.lineTo(180, -30);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fff7ed';
        [[-100, 20], [-20, 20], [60, 20]].forEach(([x, y]) => {
            roundRect(ctx, x, y, 44, 36, 6);
            ctx.fill();
            ctx.strokeStyle = '#fda4af';
            ctx.stroke();
        });

        ctx.fillStyle = '#f9a8d4';
        roundRect(ctx, -28, 70, 56, 42, 8);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('メイド屋敷', 0, -50);
        ctx.restore();
    }

    drawFountain(ctx) {
        ctx.save();
        ctx.translate(0, 40);
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.ellipse(0, 8, 42, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7dd3fc';
        ctx.beginPath();
        ctx.ellipse(0, 6, 28, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(0, -8, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawBush(ctx, bush) {
        ctx.save();
        ctx.translate(bush.x, bush.y);
        ctx.scale(bush.s, bush.s);
        ctx.fillStyle = '#65a30d';
        ctx.beginPath();
        ctx.arc(-12, 4, 16, 0, Math.PI * 2);
        ctx.arc(12, 6, 15, 0, Math.PI * 2);
        ctx.arc(0, -8, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#86efac';
        ctx.beginPath();
        ctx.arc(-4, -10, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawFlower(ctx, flower) {
        ctx.save();
        ctx.fillStyle = flower.color;
        ctx.beginPath();
        ctx.arc(flower.x, flower.y, flower.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(flower.x, flower.y, flower.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawHedge(ctx) {
        const b = this.bounds;
        ctx.save();
        ctx.strokeStyle = '#4d7c0f';
        ctx.lineWidth = 28;
        ctx.lineJoin = 'round';
        ctx.strokeRect(b.minX - 20, b.minY - 20, (b.maxX - b.minX) + 40, (b.maxY - b.minY) + 40);
        ctx.strokeStyle = '#65a30d';
        ctx.lineWidth = 14;
        ctx.strokeRect(b.minX - 20, b.minY - 20, (b.maxX - b.minX) + 40, (b.maxY - b.minY) + 40);
        ctx.restore();
    }
}

function mulberry32(a) {
    return function () {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
