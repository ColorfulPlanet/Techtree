/**
 * 助けを求めているメイド
 * 周囲の邪魔者を片付けると仲間候補になり、3人パーティーと入れ替えできる。
 * 隊列の追加・削除APIは使わず、既存 members 配列の中身だけを入れ替える。
 */
class RescueMaid {
    constructor(x, y, presetKey) {
        this.homeX = x;
        this.homeY = y;
        this.presetKey = presetKey;
        this.maid = new Maid(presetKey);
        this.maid.setPosition(x, y);
        this.state = 'trapped'; // trapped | waiting | offered
        this.bubbleTimer = 0;
        this.waitingMaid = this.maid;
        this.needsLeave = false;
    }

    nearbyEnemies(enemies, radius = 150) {
        return enemies.filter((e) => {
            if (!e.alive) return false;
            const dx = e.x - this.homeX;
            const dy = e.y - this.homeY;
            return dx * dx + dy * dy <= radius * radius;
        });
    }

    canRecruit(enemies) {
        return this.nearbyEnemies(enemies).length === 0;
    }

    isPartyNear(partyX, partyY, radius = 95) {
        const dx = partyX - this.homeX;
        const dy = partyY - this.homeY;
        return dx * dx + dy * dy <= radius * radius;
    }

    update(enemies, partyX, partyY) {
        this.bubbleTimer += 1;
        this.waitingMaid.animTime += 0.08;
        this.waitingMaid.x = this.homeX;
        this.waitingMaid.y = this.homeY;
        this.waitingMaid.targetX = this.homeX;
        this.waitingMaid.targetY = this.homeY;

        const near = this.isPartyNear(partyX, partyY);
        if (!near) this.needsLeave = false;

        if (this.state === 'trapped' && this.canRecruit(enemies)) {
            this.state = 'waiting';
        }

        if (this.needsLeave || this.state === 'offered' || this.state === 'trapped') {
            return false;
        }

        return this.canRecruit(enemies) && near;
    }

    markHandled() {
        this.state = 'waiting';
        this.needsLeave = true;
    }

    draw(ctx) {
        this.waitingMaid.draw(ctx, false);
        this.drawBubble(ctx);
    }

    drawBubble(ctx) {
        const bounce = Math.sin(this.bubbleTimer * 0.08) * 3;
        const text = this.state === 'trapped'
            ? 'た、大変です～！仕事が終わりません～！'
            : '仲間にしてください～！';

        ctx.save();
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        const width = Math.max(180, ctx.measureText(text).width + 24);
        const x = this.homeX;
        const y = this.homeY - 54 + bounce;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        roundRect(ctx, x - width / 2, y - 22, width, 28, 10);
        ctx.fill();
        ctx.fillStyle = '#6b4f6b';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y - 8);
        ctx.restore();
    }
}
