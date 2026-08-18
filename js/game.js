/**
 * ゲームメインロジック
 * 全システムを統合し、ゲームループを管理
 */
class Game {
    constructor() {
        // Canvas要素
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // キャンバスサイズ
        this.width = 0;
        this.height = 0;
        
        // 隊列管理システム
        this.formation = new FormationManager();
        
        // 入力ハンドラー
        this.inputHandler = null;
        
        // パーティーの移動位置
        this.partyX = 0;
        this.partyY = 0;
        this.partyTargetX = 0;
        this.partyTargetY = 0;
        this.partyMoveSpeed = 0.08;
        
        // UI要素
        this.debugInfo = {
            frontCharacter: document.getElementById('frontCharacter'),
            formationSpacing: document.getElementById('formationSpacing')
        };
        this.gaugeIndicator = document.getElementById('gaugeIndicator');
        
        // タッチ移動用
        this.moveTargetX = null;
        this.moveTargetY = null;
        
        // 初期化
        this.init();
    }
    
    /**
     * 初期化
     */
    init() {
        // キャンバスサイズを設定
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // キャラクターを作成
        this.createCharacters();
        
        // 初期位置を設定
        this.partyX = this.width / 2;
        this.partyY = this.height / 2;
        this.partyTargetX = this.partyX;
        this.partyTargetY = this.partyY;
        this.formation.setCenterPosition(this.partyX, this.partyY);
        
        // 初期位置に配置
        for (const member of this.formation.members) {
            member.setPosition(member.targetX, member.targetY);
        }
        
        // 入力ハンドラーを設定
        this.setupInput();
        
        // キャンバスクリック/タッチで移動
        this.setupCanvasInput();
        
        // UIを更新
        this.updateUI();
        
        // ゲームループ開始
        this.gameLoop();
    }
    
    /**
     * キャンバスサイズを調整
     */
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }
    
    /**
     * キャラクターを作成
     */
    createCharacters() {
        const characterA = new Character('A', 'A', '#ef4444');
        const characterB = new Character('B', 'B', '#3b82f6');
        const characterC = new Character('C', 'C', '#10b981');
        
        this.formation.addMember(characterA);
        this.formation.addMember(characterB);
        this.formation.addMember(characterC);
    }
    
    /**
     * 入力ハンドラーを設定
     */
    setupInput() {
        const button = document.getElementById('formationButton');
        this.inputHandler = new FormationInputHandler(button, this.formation);
        
        // ローテーション時のコールバック
        this.inputHandler.setRotateCallback((frontChar) => {
            this.updateUI();
            console.log(`先頭キャラクター: ${frontChar.name}`);
        });
        
        // 間隔変更時のコールバック
        this.inputHandler.setSpacingChangeCallback((spacing) => {
            this.updateUI();
        });
    }
    
    /**
     * キャンバスの入力を設定
     */
    setupCanvasInput() {
        // タッチイベント
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.moveTargetX = touch.clientX - rect.left;
            this.moveTargetY = touch.clientY - rect.top;
            this.partyTargetX = this.moveTargetX;
            this.partyTargetY = this.moveTargetY;
        }, { passive: false });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.moveTargetX = touch.clientX - rect.left;
            this.moveTargetY = touch.clientY - rect.top;
            this.partyTargetX = this.moveTargetX;
            this.partyTargetY = this.moveTargetY;
        }, { passive: false });
        
        // マウスイベント
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.moveTargetX = e.clientX - rect.left;
            this.moveTargetY = e.clientY - rect.top;
            this.partyTargetX = this.moveTargetX;
            this.partyTargetY = this.moveTargetY;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (e.buttons === 1) {
                const rect = this.canvas.getBoundingClientRect();
                this.moveTargetX = e.clientX - rect.left;
                this.moveTargetY = e.clientY - rect.top;
                this.partyTargetX = this.moveTargetX;
                this.partyTargetY = this.moveTargetY;
            }
        });
    }
    
    /**
     * UIを更新
     */
    updateUI() {
        const frontChar = this.formation.getFrontCharacter();
        if (frontChar) {
            this.debugInfo.frontCharacter.textContent = frontChar.name;
        }
        
        this.debugInfo.formationSpacing.textContent = 
            Math.round(this.formation.formationSpacing);
        
        // ゲージを更新
        const normalized = this.formation.getFormationSpacingNormalized();
        this.gaugeIndicator.style.height = `${normalized * 100}%`;
    }
    
    /**
     * 更新処理
     */
    update() {
        // パーティー全体の移動
        const dx = this.partyTargetX - this.partyX;
        const dy = this.partyTargetY - this.partyY;
        
        this.partyX += dx * this.partyMoveSpeed;
        this.partyY += dy * this.partyMoveSpeed;
        
        // 隊列の中心位置を更新
        this.formation.setCenterPosition(this.partyX, this.partyY);
        
        // 各キャラクターを更新
        this.formation.update();
    }
    
    /**
     * 描画処理
     */
    draw() {
        // 背景をクリア
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // グリッド描画（参考用）
        this.drawGrid();
        
        // 移動目標地点を表示
        if (this.moveTargetX !== null && this.moveTargetY !== null) {
            const distance = Math.hypot(
                this.moveTargetX - this.partyX,
                this.moveTargetY - this.partyY
            );
            
            if (distance > 5) {
                this.ctx.save();
                this.ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.arc(this.moveTargetX, this.moveTargetY, 30, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.restore();
            }
        }
        
        // 隊列を描画
        this.formation.draw(this.ctx);
        
        // 隊列の中心点を表示（デバッグ用）
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(this.partyX, this.partyY, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }
    
    /**
     * グリッド描画
     */
    drawGrid() {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        
        const gridSize = 50;
        
        // 縦線
        for (let x = 0; x < this.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        
        // 横線
        for (let y = 0; y < this.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    /**
     * ゲームループ
     */
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// ゲーム開始
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
