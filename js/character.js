/**
 * キャラクタークラス
 * パーティーメンバーを表現
 */
class Character {
    constructor(id, name, color) {
        this.id = id;
        this.name = name;
        this.color = color;
        
        // 現在位置
        this.x = 0;
        this.y = 0;
        
        // 目標位置
        this.targetX = 0;
        this.targetY = 0;
        
        // 描画サイズ
        this.radius = 20;
        
        // 移動速度（補間用）
        this.moveSpeed = 0.15;
    }
    
    /**
     * 目標位置を設定
     */
    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }
    
    /**
     * 位置を即座に設定
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
    }
    
    /**
     * 更新処理（滑らかな移動）
     */
    update() {
        // 線形補間で滑らかに移動
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        
        this.x += dx * this.moveSpeed;
        this.y += dy * this.moveSpeed;
    }
    
    /**
     * 描画処理
     */
    draw(ctx, isFront = false) {
        // 影
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x + 3, this.y + 3, this.radius, this.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // キャラクター本体
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 先頭キャラクターには枠を表示
        if (isFront) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 3;
            ctx.stroke();
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.restore();
        
        // 名前表示
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.name, this.x, this.y);
        ctx.restore();
    }
}
