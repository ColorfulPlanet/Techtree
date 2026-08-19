/**
 * 統合された隊列操作入力処理
 * タップでローテーション、スライダー上でドラッグして間隔変更
 */
class FormationInputHandler {
    constructor(buttonElement, sliderElement, formationManager) {
        this.button = buttonElement;
        this.slider = sliderElement;
        this.formation = formationManager;
        
        // タッチ状態
        this.isTouching = false;
        this.touchStartY = 0;
        this.touchCurrentY = 0;
        this.touchStartTime = 0;
        
        // タップ判定の閾値（ピクセル）
        this.tapThreshold = 15;
        
        // スライダーの範囲
        this.sliderTop = 0;
        this.sliderBottom = 0;
        this.sliderHeight = 0;
        
        // 現在のボタン位置（0.0～1.0、0が上）
        this.buttonPosition = 0.5;
        
        // イベントリスナーを設定
        this.setupEventListeners();
        
        // コールバック
        this.onRotate = null;
        this.onSpacingChange = null;
        
        // 初期化
        this.updateSliderBounds();
        this.updateButtonPosition();
    }
    
    /**
     * スライダーの境界を更新
     */
    updateSliderBounds() {
        const rect = this.slider.getBoundingClientRect();
        this.sliderTop = rect.top;
        this.sliderBottom = rect.bottom;
        this.sliderHeight = rect.height;
    }
    
    /**
     * ボタンの位置を更新
     */
    updateButtonPosition() {
        // 0.0（上）～1.0（下）の位置をパーセンテージに変換
        const percent = this.buttonPosition * 100;
        
        // CSSのtopで位置を設定（中央揃えのため-50%のtranslateYを考慮）
        this.button.style.top = `${percent}%`;
        
        // 位置から隊列間隔を計算（上が広い、下が狭い）
        // 0.0（上） → max、1.0（下） → min
        const spacing = this.formation.formationSpacingMax - 
            (this.formation.formationSpacingMax - this.formation.formationSpacingMin) * this.buttonPosition;
        
        this.formation.setFormationSpacing(spacing);
        
        // コールバック実行
        if (this.onSpacingChange) {
            this.onSpacingChange(spacing);
        }
    }
    
    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        // タッチイベント（モバイル）
        this.button.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.button.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.button.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        this.button.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });
        
        // マウスイベント（PC）
        this.button.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // リサイズ時にスライダーの境界を更新
        window.addEventListener('resize', () => this.updateSliderBounds());
    }
    
    /**
     * タッチ開始
     */
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.startTouch(touch.clientY);
    }
    
    /**
     * タッチ移動
     */
    handleTouchMove(e) {
        e.preventDefault();
        if (!this.isTouching) return;
        
        const touch = e.touches[0];
        this.moveTouch(touch.clientY);
    }
    
    /**
     * タッチ終了
     */
    handleTouchEnd(e) {
        e.preventDefault();
        this.endTouch();
    }
    
    /**
     * マウスダウン
     */
    handleMouseDown(e) {
        e.preventDefault();
        this.startTouch(e.clientY);
    }
    
    /**
     * マウス移動
     */
    handleMouseMove(e) {
        if (!this.isTouching) return;
        this.moveTouch(e.clientY);
    }
    
    /**
     * マウスアップ
     */
    handleMouseUp(e) {
        if (!this.isTouching) return;
        this.endTouch();
    }
    
    /**
     * タッチ/クリック開始処理
     */
    startTouch(clientY) {
        this.isTouching = true;
        this.touchStartY = clientY;
        this.touchCurrentY = clientY;
        this.touchStartTime = Date.now();
        
        // スライダーの境界を更新
        this.updateSliderBounds();
        
        // ボタンのビジュアルフィードバック
        this.button.style.transform = 'translateY(-50%) scale(0.95)';
    }
    
    /**
     * タッチ/ドラッグ移動処理
     */
    moveTouch(clientY) {
        this.touchCurrentY = clientY;
        const deltaY = this.touchCurrentY - this.touchStartY;
        
        // 一定以上の移動があればドラッグとして扱う
        if (Math.abs(deltaY) > 5) {
            // スライダー内での相対位置を計算
            const relativeY = clientY - this.sliderTop;
            let newPosition = relativeY / this.sliderHeight;
            
            // 0.0～1.0の範囲に制限
            newPosition = Math.max(0.0, Math.min(1.0, newPosition));
            
            this.buttonPosition = newPosition;
            this.updateButtonPosition();
        }
    }
    
    /**
     * タッチ/クリック終了処理
     */
    endTouch() {
        if (!this.isTouching) return;
        
        const deltaY = Math.abs(this.touchStartY - this.touchCurrentY);
        const deltaTime = Date.now() - this.touchStartTime;
        
        // タップ判定：移動量が少なく、時間も短い
        if (deltaY < this.tapThreshold && deltaTime < 300) {
            // 隊列をローテーション
            const frontChar = this.formation.rotateFormation();
            
            // コールバック実行
            if (this.onRotate && frontChar) {
                this.onRotate(frontChar);
            }
        }
        
        this.isTouching = false;
        
        // ボタンのビジュアルフィードバックをリセット
        this.button.style.transform = 'translateY(-50%)';
    }
    
    /**
     * ローテーション時のコールバックを設定
     */
    setRotateCallback(callback) {
        this.onRotate = callback;
    }
    
    /**
     * 間隔変更時のコールバックを設定
     */
    setSpacingChangeCallback(callback) {
        this.onSpacingChange = callback;
    }
}
