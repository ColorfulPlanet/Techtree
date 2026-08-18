/**
 * タッチ入力処理
 * タップとスライドを判定し、隊列操作を行う
 */
class FormationInputHandler {
    constructor(buttonElement, formationManager) {
        this.button = buttonElement;
        this.formation = formationManager;
        
        // タッチ状態
        this.isTouching = false;
        this.touchStartY = 0;
        this.touchCurrentY = 0;
        this.touchStartTime = 0;
        
        // タップ判定の閾値（ピクセル）
        this.tapThreshold = 50;
        
        // スライド感度
        this.slideSensitivity = 0.5;
        
        // 初期間隔を記憶
        this.initialSpacing = 0;
        
        // イベントリスナーを設定
        this.setupEventListeners();
        
        // コールバック
        this.onRotate = null;
        this.onSpacingChange = null;
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
        
        // 現在の隊列間隔を記憶
        this.initialSpacing = this.formation.formationSpacing;
        
        // ボタンのビジュアルフィードバック
        this.button.style.transform = 'scale(0.95)';
    }
    
    /**
     * タッチ/ドラッグ移動処理
     */
    moveTouch(clientY) {
        this.touchCurrentY = clientY;
        const deltaY = this.touchStartY - this.touchCurrentY;
        
        // 一定以上の移動があればスライドとして扱う
        if (Math.abs(deltaY) > 10) {
            // スライド中は隊列間隔を変更
            const spacingDelta = deltaY * this.slideSensitivity;
            const newSpacing = this.initialSpacing + spacingDelta;
            this.formation.setFormationSpacing(newSpacing);
            
            // コールバック実行
            if (this.onSpacingChange) {
                this.onSpacingChange(this.formation.formationSpacing);
            }
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
        this.button.style.transform = '';
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
