/**
 * 屋敷と庭のステージ
 * 指定の庭園マップ画像を背景にし、仕事の山と邪魔者の配置を担当する。
 */
class Stage {
    constructor() {
        this.imageWidth = 1536;
        this.imageHeight = 1024;
        this.worldScale = 1.5;
        this.updateBounds();

        this.background = new Image();
        this.backgroundReady = false;
        this.background.onload = () => {
            this.backgroundReady = true;
            this.imageWidth = this.background.naturalWidth || this.imageWidth;
            this.imageHeight = this.background.naturalHeight || this.imageHeight;
            this.updateBounds();
        };
        this.background.src = 'assets/garden-background.jpg';
    }

    updateBounds() {
        const w = this.imageWidth * this.worldScale;
        const h = this.imageHeight * this.worldScale;
        const pad = 48 * this.worldScale;
        this.bounds = {
            minX: -w / 2 + pad,
            maxX: w / 2 - pad,
            minY: -h / 2 + pad,
            maxY: h / 2 - pad
        };
    }

    /**
     * 画像ピクセル座標（左上原点）をワールド座標（中央原点）へ変換
     */
    fromImage(px, py) {
        return {
            x: (px - this.imageWidth / 2) * this.worldScale,
            y: (py - this.imageHeight / 2) * this.worldScale
        };
    }

    startPosition() {
        return this.fromImage(768, 592);
    }

    createJobPiles() {
        const start = this.fromImage(768, 592);
        const cleaningGiant = this.fromImage(770, 430);
        const cookingGiant = this.fromImage(430, 310);
        const laundry = this.fromImage(1080, 720);
        const desk = this.fromImage(620, 520);
        const bigTrash = this.fromImage(770, 560);

        return [
            new JobPile(JOB_TYPES.cleaning, start.x - 110, start.y + 8, { size: 'small' }),
            new JobPile(JOB_TYPES.cleaning, start.x + 125, start.y - 24, { size: 'small' }),
            new JobPile(JOB_TYPES.laundry, start.x + 46, start.y + 92, { size: 'small' }),
            new JobPile(JOB_TYPES.cleaning, start.x - 170, start.y + 78, { size: 'small' }),
            new JobPile(JOB_TYPES.cooking, desk.x, desk.y, { size: 'medium' }),
            new JobPile(JOB_TYPES.laundry, laundry.x + 70, laundry.y + 36, { size: 'medium' }),
            new JobPile(JOB_TYPES.cleaning, bigTrash.x, bigTrash.y, { size: 'normal', label: '大きなゴミ' }),
            new JobPile(JOB_TYPES.laundry, laundry.x, laundry.y, { size: 'normal' }),
            new JobPile(JOB_TYPES.cleaning, cleaningGiant.x, cleaningGiant.y, { size: 'large' }),
            new JobPile(JOB_TYPES.cooking, cookingGiant.x, cookingGiant.y, { size: 'large' })
        ];
    }

    createEnemies() {
        const weakSpots = [
            [780, 630],
            [720, 650],
            [840, 610]
        ];
        const midSpots = [
            [1040, 690],
            [1140, 760],
            [1100, 640]
        ];
        const guardSpots = [
            [700, 390],
            [760, 470],
            [840, 400],
            [800, 510],
            [720, 330],
            [880, 450]
        ];
        const largeSpots = [
            [400, 300],
            [500, 360]
        ];
        return [
            ...weakSpots.map(([px, py]) => {
                const p = this.fromImage(px, py);
                return new DustMonster(p.x, p.y, 'small', { powerLevel: 1 });
            }),
            ...midSpots.map(([px, py]) => {
                const p = this.fromImage(px, py);
                return new DustMonster(p.x, p.y, 'small', { powerLevel: 2 });
            }),
            ...guardSpots.map(([px, py]) => {
                const p = this.fromImage(px, py);
                return new DustMonster(p.x, p.y, 'small', { powerLevel: 4 });
            }),
            ...largeSpots.map(([px, py]) => {
                const p = this.fromImage(px, py);
                return new DustMonster(p.x, p.y, 'large', { powerLevel: 5 });
            })
        ];
    }

    createRescue() {
        const p = this.fromImage(1180, 250);
        return new RescueMaid(p.x, p.y, 'tidy');
    }

    clamp(x, y) {
        return {
            x: Math.max(this.bounds.minX, Math.min(this.bounds.maxX, x)),
            y: Math.max(this.bounds.minY, Math.min(this.bounds.maxY, y))
        };
    }

    drawGround(ctx, cameraX, cameraY, width, height) {
        ctx.fillStyle = '#6fae4e';
        ctx.fillRect(0, 0, width, height);
    }

    drawWorld(ctx) {
        const w = this.imageWidth * this.worldScale;
        const h = this.imageHeight * this.worldScale;
        const x = -w / 2;
        const y = -h / 2;
        if (this.backgroundReady) {
            ctx.drawImage(this.background, x, y, w, h);
        } else {
            ctx.fillStyle = '#8ecf5d';
            ctx.fillRect(x, y, w, h);
        }
    }
}
