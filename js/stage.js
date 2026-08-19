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
        const cleaningCenter = this.fromImage(770, 430);
        const cooking = this.fromImage(430, 310);
        const laundry = this.fromImage(1080, 720);
        const offsets = [
            [0, 0],
            [-70, -40],
            [80, -30],
            [-50, 55],
            [60, 50]
        ];
        const cleaningBits = offsets.map(([ox, oy]) =>
            new JobPile(JOB_TYPES.cleaning, cleaningCenter.x + ox * this.worldScale, cleaningCenter.y + oy * this.worldScale, { size: 'small' })
        );
        return [
            ...cleaningBits,
            new JobPile(JOB_TYPES.cooking, cooking.x, cooking.y, { size: 'large' }),
            new JobPile(JOB_TYPES.laundry, laundry.x, laundry.y, { size: 'normal' }),
            new JobPile(JOB_TYPES.laundry, laundry.x + 90, laundry.y - 50, { size: 'small' }),
            new JobPile(JOB_TYPES.laundry, laundry.x - 80, laundry.y + 40, { size: 'small' })
        ];
    }

    createEnemies() {
        const smallSpots = [
            [700, 390],
            [760, 470],
            [840, 400],
            [800, 510],
            [720, 330],
            [880, 450],
            [1040, 690],
            [1140, 760],
            [1100, 640]
        ];
        const largeSpots = [
            [400, 300],
            [500, 360]
        ];
        return [
            ...smallSpots.map(([px, py]) => {
                const p = this.fromImage(px, py);
                return new DustMonster(p.x, p.y, 'small');
            }),
            ...largeSpots.map(([px, py]) => {
                const p = this.fromImage(px, py);
                return new DustMonster(p.x, p.y, 'large');
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
