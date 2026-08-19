/**
 * 屋敷と庭のステージ
 * 指定の庭園マップ画像を背景にし、仕事の山と邪魔者の配置を担当する。
 */
class Stage {
    constructor() {
        this.imageWidth = 1536;
        this.imageHeight = 1024;
        this.bounds = {
            minX: -this.imageWidth / 2 + 48,
            maxX: this.imageWidth / 2 - 48,
            minY: -this.imageHeight / 2 + 48,
            maxY: this.imageHeight / 2 - 48
        };

        this.background = new Image();
        this.backgroundReady = false;
        this.background.onload = () => {
            this.backgroundReady = true;
            this.imageWidth = this.background.naturalWidth || this.imageWidth;
            this.imageHeight = this.background.naturalHeight || this.imageHeight;
        };
        this.background.src = 'assets/garden-background.jpg';
    }

    /**
     * 画像ピクセル座標（左上原点）をワールド座標（中央原点）へ変換
     */
    fromImage(px, py) {
        return {
            x: px - this.imageWidth / 2,
            y: py - this.imageHeight / 2
        };
    }

    createJobPiles() {
        const cleaning = this.fromImage(770, 430);
        const cooking = this.fromImage(430, 310);
        const laundry = this.fromImage(1080, 720);
        return [
            new JobPile(JOB_TYPES.cleaning, cleaning.x, cleaning.y),
            new JobPile(JOB_TYPES.cooking, cooking.x, cooking.y),
            new JobPile(JOB_TYPES.laundry, laundry.x, laundry.y)
        ];
    }

    createEnemies() {
        const spots = [
            [720, 400],
            [820, 470],
            [400, 300],
            [480, 360],
            [1040, 690],
            [1140, 760],
            [1180, 280],
            [1240, 340]
        ];
        return spots.map(([px, py]) => {
            const p = this.fromImage(px, py);
            return new DustMonster(p.x, p.y);
        });
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
        const x = -this.imageWidth / 2;
        const y = -this.imageHeight / 2;
        if (this.backgroundReady) {
            ctx.drawImage(this.background, x, y, this.imageWidth, this.imageHeight);
        } else {
            ctx.fillStyle = '#8ecf5d';
            ctx.fillRect(x, y, this.imageWidth, this.imageHeight);
        }
    }
}
