/**
 * 隊列管理システム
 * パーティーメンバーの隊列配置とローテーションを管理
 */
class FormationManager {
    constructor() {
        // パーティーメンバー
        this.members = [];
        
        // 先頭キャラクターのインデックス
        this.frontIndex = 0;
        
        // 隊列間隔
        this.formationSpacingMin = 60;
        this.formationSpacingMax = 360;
        this.formationSpacing = 150;
        
        // 隊列変更時の移動時間（秒）
        this.transitionDuration = 0.2;
        
        // 隊列の基準位置
        this.centerX = 0;
        this.centerY = 0;
        
        // 隊列の向き（ラジアン、0 = 上方向）
        this.formationAngle = 0;
        this.targetAngle = 0;
        
        // 回転速度の基本値（小さな向き修正用）
        this.baseRotationSpeed = 0.10;
        // 大きな方向転換でグルグル回らないよう、1フレームの最大回転量
        this.maxRotationStep = 0.035;
    }
    
    /**
     * パーティーメンバーを追加
     */
    addMember(character) {
        this.members.push(character);
    }
    
    /**
     * 隊列の中心位置を設定
     */
    setCenterPosition(x, y) {
        this.centerX = x;
        this.centerY = y;
    }
    
    /**
     * 移動方向を設定（隊列の向きを更新）
     * 操作が終わった場合は、移動向きまで回り切らず現在の向きで止める。
     */
    setMovementDirection(dirX, dirY) {
        const speed = Math.sqrt(dirX * dirX + dirY * dirY);
        if (speed < 0.1) {
            this.targetAngle = this.formationAngle;
            return;
        }
        
        // 移動方向の角度を計算（上方向を0として時計回り）
        this.targetAngle = Math.atan2(dirX, -dirY);
    }
    
    /**
     * 隊列をローテーション（時計回り）
     */
    rotateFormation() {
        if (this.members.length === 0) return;
        
        this.frontIndex = (this.frontIndex + 1) % this.members.length;
        this.updateFormationPositions();
        
        return this.getFrontCharacter();
    }
    
    /**
     * 隊列間隔を設定
     */
    setFormationSpacing(spacing) {
        this.formationSpacing = Math.max(
            this.formationSpacingMin,
            Math.min(this.formationSpacingMax, spacing)
        );
        this.updateFormationPositions();
    }
    
    /**
     * 隊列間隔を変更（相対値）
     */
    adjustFormationSpacing(delta) {
        this.setFormationSpacing(this.formationSpacing + delta);
    }
    
    /**
     * 隊列間隔の正規化された値を取得（0.0～1.0）
     */
    getFormationSpacingNormalized() {
        return (this.formationSpacing - this.formationSpacingMin) / 
               (this.formationSpacingMax - this.formationSpacingMin);
    }
    
    /**
     * 先頭キャラクターを取得
     */
    getFrontCharacter() {
        if (this.members.length === 0) return null;
        return this.members[this.frontIndex];
    }
    
    /**
     * 隊列の向きを更新
     */
    updateFormationAngle() {
        // 角度差を計算
        let angleDiff = this.targetAngle - this.formationAngle;
        
        // 角度差を-π～πの範囲に正規化
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // 隊列間隔が広いほど回転が遅くなる
        // formationSpacingが大きいほど、回転速度が遅くなる
        const spacingFactor = this.formationSpacing / this.formationSpacingMax;
        const rotationSpeed = this.baseRotationSpeed * (1.0 - spacingFactor * 0.5);
        
        // 角度を徐々に目標に近づける（大回りは角速度を制限して勢いよく回らないようにする）
        let step = angleDiff * rotationSpeed;
        const maxStep = this.maxRotationStep * (1.0 - spacingFactor * 0.5);
        if (step > maxStep) step = maxStep;
        if (step < -maxStep) step = -maxStep;
        this.formationAngle += step;
        
        // 角度を-π～πの範囲に正規化
        while (this.formationAngle > Math.PI) this.formationAngle -= Math.PI * 2;
        while (this.formationAngle < -Math.PI) this.formationAngle += Math.PI * 2;
    }
    
    /**
     * 隊列位置を更新
     * 
     * 配置パターン：
     *        Front
     *       /     \
     *   RearLeft  RearRight
     */
    updateFormationPositions() {
        if (this.members.length === 0) return;
        
        const spacing = this.formationSpacing;
        const angle = Math.PI / 6; // 30度
        
        // 各キャラクターの隊列内位置を計算
        for (let i = 0; i < this.members.length; i++) {
            const relativeIndex = (i - this.frontIndex + this.members.length) % this.members.length;
            const character = this.members[i];
            
            let offsetX = 0;
            let offsetY = 0;
            
            if (relativeIndex === 0) {
                // 先頭キャラクター（進行方向の前）
                offsetX = 0;
                offsetY = -spacing * 0.5;
            } else if (relativeIndex === 1) {
                // 後衛左
                offsetX = -spacing * Math.sin(angle);
                offsetY = spacing * 0.3;
            } else if (relativeIndex === 2) {
                // 後衛右
                offsetX = spacing * Math.sin(angle);
                offsetY = spacing * 0.3;
            }
            
            // 隊列の向きに応じて回転
            const cos = Math.cos(this.formationAngle);
            const sin = Math.sin(this.formationAngle);
            const rotatedX = offsetX * cos - offsetY * sin;
            const rotatedY = offsetX * sin + offsetY * cos;
            
            // 目標位置を設定
            character.setTarget(
                this.centerX + rotatedX,
                this.centerY + rotatedY
            );
        }
    }
    
    /**
     * 全キャラクターを更新
     */
    update() {
        // 隊列の向きを更新
        this.updateFormationAngle();
        
        // 隊列位置を更新
        this.updateFormationPositions();
        
        // 各キャラクターを更新
        for (const member of this.members) {
            member.update();
        }
    }
    
    /**
     * 全キャラクターを描画
     */
    draw(ctx) {
        const frontChar = this.getFrontCharacter();
        
        // 後衛を先に描画
        for (const member of this.members) {
            if (member !== frontChar) {
                member.draw(ctx, false);
            }
        }
        
        // 先頭を最後に描画（最前面）
        if (frontChar) {
            frontChar.draw(ctx, true);
        }
    }
    
    /**
     * キャラクター数を取得
     */
    getMemberCount() {
        return this.members.length;
    }
    
    /**
     * インデックスでキャラクターを取得
     */
    getMember(index) {
        if (index < 0 || index >= this.members.length) return null;
        return this.members[index];
    }
}
