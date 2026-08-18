/**
 * 仮想ジョイスティック
 * タッチ操作でアナログスティック風の入力を実現
 */
class VirtualJoystick {
    constructor(containerElement) {
        this.container = containerElement;
        this.base = null;
        this.stick = null;
        
        // ジョイスティックの状態
        this.active = false;
        this.touchId = null;
        
        // ジョイスティックの位置
        this.baseX = 0;
        this.baseY = 0;
        this.stickX = 0;
        this.stickY = 0;
        
        // 最大移動距離
        this.maxDistance = 50;
        
        // 入力値（-1.0 ～ 1.0）
        this.inputX = 0;
        this.inputY = 0;
        
        // デッドゾーン
        this.deadZone = 0.15;
        
        this.setupElements();
        this.setupEventListeners();
    }
    
    /**
     * DOM要素を作成
     */
    setupElements() {
        // ベース
        this.base = document.createElement('div');
        this.base.className = 'joystick-base';
        this.base.style.display = 'none';
        
        // スティック
        this.stick = document.createElement('div');
        this.stick.className = 'joystick-stick';
        
        this.base.appendChild(this.stick);
        this.container.appendChild(this.base);
    }
    
    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        // タッチイベント
        this.container.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        this.container.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        this.container.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
        this.container.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });
        
        // マウスイベント（PC用）
        this.container.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
    }
    
    /**
     * タッチ開始
     */
    onTouchStart(e) {
        // 既に他のタッチがアクティブな場合は無視
        if (this.active) return;
        
        // 隊列ボタンをタッチしている場合は無視
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && (target.id === 'formationButton' || target.closest('#formationButton'))) {
            return;
        }
        
        e.preventDefault();
        
        this.active = true;
        this.touchId = touch.identifier;
        
        const rect = this.container.getBoundingClientRect();
        this.baseX = touch.clientX - rect.left;
        this.baseY = touch.clientY - rect.top;
        
        this.showJoystick(this.baseX, this.baseY);
    }
    
    /**
     * タッチ移動
     */
    onTouchMove(e) {
        if (!this.active) return;
        
        e.preventDefault();
        
        // 該当するタッチを探す
        let touch = null;
        for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === this.touchId) {
                touch = e.touches[i];
                break;
            }
        }
        
        if (!touch) return;
        
        const rect = this.container.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        
        this.updateStick(touchX, touchY);
    }
    
    /**
     * タッチ終了
     */
    onTouchEnd(e) {
        if (!this.active) return;
        
        // 該当するタッチが終了したか確認
        let touchEnded = true;
        for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === this.touchId) {
                touchEnded = false;
                break;
            }
        }
        
        if (touchEnded) {
            this.hideJoystick();
        }
    }
    
    /**
     * マウスダウン
     */
    onMouseDown(e) {
        if (this.active) return;
        
        // 隊列ボタンをクリックしている場合は無視
        if (e.target.id === 'formationButton' || e.target.closest('#formationButton')) {
            return;
        }
        
        this.active = true;
        
        const rect = this.container.getBoundingClientRect();
        this.baseX = e.clientX - rect.left;
        this.baseY = e.clientY - rect.top;
        
        this.showJoystick(this.baseX, this.baseY);
    }
    
    /**
     * マウス移動
     */
    onMouseMove(e) {
        if (!this.active) return;
        
        const rect = this.container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        this.updateStick(mouseX, mouseY);
    }
    
    /**
     * マウスアップ
     */
    onMouseUp(e) {
        if (!this.active) return;
        this.hideJoystick();
    }
    
    /**
     * ジョイスティックを表示
     */
    showJoystick(x, y) {
        this.base.style.display = 'block';
        this.base.style.left = `${x}px`;
        this.base.style.top = `${y}px`;
        
        this.stickX = 0;
        this.stickY = 0;
        this.updateStickPosition();
    }
    
    /**
     * ジョイスティックを非表示
     */
    hideJoystick() {
        this.active = false;
        this.touchId = null;
        this.base.style.display = 'none';
        
        this.inputX = 0;
        this.inputY = 0;
    }
    
    /**
     * スティック位置を更新
     */
    updateStick(touchX, touchY) {
        const deltaX = touchX - this.baseX;
        const deltaY = touchY - this.baseY;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > this.maxDistance) {
            const angle = Math.atan2(deltaY, deltaX);
            this.stickX = Math.cos(angle) * this.maxDistance;
            this.stickY = Math.sin(angle) * this.maxDistance;
        } else {
            this.stickX = deltaX;
            this.stickY = deltaY;
        }
        
        // 入力値を計算（-1.0 ～ 1.0）
        this.inputX = this.stickX / this.maxDistance;
        this.inputY = this.stickY / this.maxDistance;
        
        // デッドゾーン適用
        const inputDistance = Math.sqrt(this.inputX * this.inputX + this.inputY * this.inputY);
        if (inputDistance < this.deadZone) {
            this.inputX = 0;
            this.inputY = 0;
        }
        
        this.updateStickPosition();
    }
    
    /**
     * スティックの描画位置を更新
     */
    updateStickPosition() {
        this.stick.style.transform = `translate(${this.stickX}px, ${this.stickY}px)`;
    }
    
    /**
     * 入力値を取得
     */
    getInput() {
        return {
            x: this.inputX,
            y: this.inputY,
            active: this.active
        };
    }
}
