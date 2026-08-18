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
        
        // 入力ハンドラー（隊列操作用）
        this.inputHandler = null;
        
        // 仮想ジョイスティック
        this.joystick = null;
        
        // カメラ位置（ワールド座標）
        this.cameraX = 0;
        this.cameraY = 0;
        
        // パーティーの位置（ワールド座標）
        this.partyX = 0;
        this.partyY = 0;
        
        // パーティーの速度
        this.partyVelocityX = 0;
        this.partyVelocityY = 0;
        this.partyMaxSpeed = 3;
        this.partyAcceleration = 0.5;
        this.partyFriction = 0.85;
        
        // UI要素
        this.debugInfo = {
            frontCharacter: document.getElementById('frontCharacter'),
            formationSpacing: document.getElementById('formationSpacing')
        };
        this.gaugeIndicator = document.getElementById('gaugeIndicator');
        
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
        
        // 初期位置を設定（ワールド座標の中心）
        this.partyX = 0;
        this.partyY = 0;
        this.cameraX = 0;
        this.cameraY = 0;
        
        this.formation.setCenterPosition(this.partyX, this.partyY);
        
        // 初期位置に配置
        for (const member of this.formation.members) {
            member.setPosition(member.targetX, member.targetY);
        }
        
        // 仮想ジョイスティックを作成
        const joystickContainer = document.getElementById('joystickArea');
        this.joystick = new VirtualJoystick(joystickContainer);
        
        // 隊列操作の入力ハンドラーを設定
        this.setupFormationInput();
        
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
     * 隊列操作の入力ハンドラーを設定
     */
    setupFormationInput() {
        const button = document.getElementById('formationButton');
        this.inputHandler = new FormationInputHandler(button, this.formation);
        
        // ローテーション時のコールバック
        this.inputHandler.setRotateCallback((frontChar) => {
            this.updateUI();
        });
        
        // 間隔変更時のコールバック
        this.inputHandler.setSpacingChangeCallback((spacing) => {
            this.updateUI();
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
        // ジョイスティック入力を取得
        const input = this.joystick.getInput();
        
        // 入力に応じて加速
        if (input.active && (Math.abs(input.x) > 0 || Math.abs(input.y) > 0)) {
            this.partyVelocityX += input.x * this.partyAcceleration;
            this.partyVelocityY += input.y * this.partyAcceleration;
        }
        
        // 摩擦を適用
        this.partyVelocityX *= this.partyFriction;
        this.partyVelocityY *= this.partyFriction;
        
        // 最大速度を制限
        const speed = Math.sqrt(
            this.partyVelocityX * this.partyVelocityX + 
            this.partyVelocityY * this.partyVelocityY
        );
        
        if (speed > this.partyMaxSpeed) {
            const ratio = this.partyMaxSpeed / speed;
            this.partyVelocityX *= ratio;
            this.partyVelocityY *= ratio;
        }
        
        // 位置を更新（ワールド座標）
        this.partyX += this.partyVelocityX;
        this.partyY += this.partyVelocityY;
        
        // カメラをパーティーに追従
        this.cameraX = this.partyX;
        this.cameraY = this.partyY;
        
        // 隊列の中心位置を更新
        this.formation.setCenterPosition(this.partyX, this.partyY);
        
        // 各キャラクターを更新
        this.formation.update();
    }
    
    /**
     * ワールド座標からスクリーン座標に変換
     */
    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.cameraX + this.width / 2,
            y: worldY - this.cameraY + this.height / 2
        };
    }
    
    /**
     * 描画処理
     */
    draw() {
        // 背景をクリア
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // グリッド描画（参考用、カメラに追従）
        this.drawGrid();
        
        // カメラの変換を保存
        this.ctx.save();
        
        // カメラの変換を適用
        // スクリーン中央にキャラクターを配置
        this.ctx.translate(
            this.width / 2 - this.cameraX,
            this.height / 2 - this.cameraY
        );
        
        // 隊列を描画（ワールド座標）
        this.formation.draw(this.ctx);
        
        // パーティーの中心点を表示（デバッグ用）
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(this.partyX, this.partyY, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // カメラの変換を復元
        this.ctx.restore();
        
        // 画面中央のクロスヘア（参考用）
        this.drawCenterCrosshair();
    }
    
    /**
     * グリッド描画
     */
    drawGrid() {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        
        const gridSize = 50;
        
        // カメラ位置を考慮したオフセット
        const offsetX = (this.width / 2 - this.cameraX) % gridSize;
        const offsetY = (this.height / 2 - this.cameraY) % gridSize;
        
        // 縦線
        for (let x = offsetX; x < this.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        
        // 横線
        for (let y = offsetY; y < this.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    /**
     * 画面中央のクロスヘア描画
     */
    drawCenterCrosshair() {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const size = 10;
        
        // 横線
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - size, centerY);
        this.ctx.lineTo(centerX + size, centerY);
        this.ctx.stroke();
        
        // 縦線
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY - size);
        this.ctx.lineTo(centerX, centerY + size);
        this.ctx.stroke();
        
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
