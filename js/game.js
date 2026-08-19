/**
 * ゲームメインロジック
 * 全システムを統合し、ゲームループを管理
 *
 * 既存の移動・隊列・入力は変更せず、メイドのお仕事システムを追加する。
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
        this.jobHudItems = {
            cleaning: document.getElementById('jobCleaning'),
            cooking: document.getElementById('jobCooking'),
            laundry: document.getElementById('jobLaundry')
        };
        this.clearOverlay = document.getElementById('clearOverlay');
        this.hintText = document.getElementById('hintText');
        
        // メイドゲームシステム（隊列ロジックとは独立）
        this.stage = new Stage();
        this.particles = new ParticleSystem();
        this.jobPiles = [];
        this.enemies = [];
        this.rescue = null;
        this.workTextTimer = 0;
        this.cleared = false;
        this.hintTimer = 240;
        this.swapOverlay = document.getElementById('swapOverlay');
        this.swapMessage = document.getElementById('swapMessage');
        this.swapButtons = document.getElementById('swapButtons');
        
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
        const start = this.stage.startPosition();
        this.partyX = start.x;
        this.partyY = start.y;
        this.cameraX = start.x;
        this.cameraY = start.y;
        
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
        
        this.resetStageEntities();
        this.setupClearUi();
        this.setupSwapUi();
        
        // UIを更新
        this.updateUI();
        
        // ゲームループ開始
        this.gameLoop();
    }

    resetStageEntities() {
        this.jobPiles = this.stage.createJobPiles();
        this.enemies = this.stage.createEnemies();
        this.rescue = this.stage.createRescue();
        this.particles = new ParticleSystem();
        this.cleared = false;
        if (this.clearOverlay) this.clearOverlay.classList.add('hidden');
        if (this.swapOverlay) this.swapOverlay.classList.add('hidden');
        this.updateJobHud();
    }

    setupClearUi() {
        const retry = document.getElementById('retryButton');
        if (retry) {
            retry.addEventListener('click', () => {
                const start = this.stage.startPosition();
                this.partyX = start.x;
                this.partyY = start.y;
                this.partyVelocityX = 0;
                this.partyVelocityY = 0;
                this.cameraX = start.x;
                this.cameraY = start.y;
                this.formation.members.length = 0;
                this.formation.frontIndex = 0;
                this.createCharacters();
                this.formation.setCenterPosition(this.partyX, this.partyY);
                this.formation.updateFormationPositions();
                for (const member of this.formation.members) {
                    member.setPosition(member.targetX, member.targetY);
                }
                this.resetStageEntities();
                this.hintTimer = 180;
                this.updateUI();
            });
        }
    }

    setupSwapUi() {
        const cancel = document.getElementById('swapCancel');
        if (cancel) {
            cancel.addEventListener('click', () => this.closeSwapOffer());
        }
    }

    openSwapOffer() {
        if (!this.rescue || !this.swapOverlay || !this.swapButtons) return;
        this.rescue.state = 'offered';
        const candidate = this.rescue.waitingMaid;
        if (this.swapMessage) {
            this.swapMessage.textContent = `${candidate.name}が仲間になりました！誰と交代する？`;
        }
        this.swapButtons.innerHTML = '';
        this.formation.members.forEach((member, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'swap-member';
            btn.textContent = member.name;
            btn.addEventListener('click', () => this.swapPartyMember(index));
            this.swapButtons.appendChild(btn);
        });
        this.swapOverlay.classList.remove('hidden');
        this.particles.addText(candidate.x, candidate.y - 40, `${candidate.name}が仲間になりました！`, candidate.color);
    }

    closeSwapOffer() {
        if (this.swapOverlay) this.swapOverlay.classList.add('hidden');
        if (this.rescue) this.rescue.markHandled();
    }

    swapPartyMember(index) {
        if (!this.rescue) return;
        const outgoing = this.formation.members[index];
        const incoming = this.rescue.waitingMaid;
        incoming.setPosition(outgoing.x, outgoing.y);
        incoming.setTarget(outgoing.targetX, outgoing.targetY);
        this.formation.members[index] = incoming;
        outgoing.setPosition(this.rescue.homeX, this.rescue.homeY);
        outgoing.setTarget(this.rescue.homeX, this.rescue.homeY);
        this.rescue.waitingMaid = outgoing;
        this.rescue.markHandled();
        this.particles.addText(incoming.x, incoming.y - 36, `${incoming.name}加入！`, incoming.color);
        this.closeSwapOffer();
        this.updateUI();
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
        const cleaningMaid = new Maid('cleaning');
        const cookingMaid = new Maid('cooking');
        const laundryMaid = new Maid('laundry');
        
        this.formation.addMember(cleaningMaid);
        this.formation.addMember(cookingMaid);
        this.formation.addMember(laundryMaid);
    }
    
    /**
     * 隊列操作の入力ハンドラーを設定
     */
    setupFormationInput() {
        const button = document.getElementById('formationButton');
        const slider = document.getElementById('formationSlider');
        this.inputHandler = new FormationInputHandler(button, slider, this.formation);
        
        // ローテーション時のコールバック
        this.inputHandler.setRotateCallback((frontChar) => {
            this.updateUI();
            if (frontChar && frontChar.workLabel) {
                this.particles.addText(
                    frontChar.x,
                    frontChar.y - 36,
                    `${frontChar.name}が先頭！`,
                    frontChar.color
                );
            }
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

        this.updateJobHud();
    }

    updateJobHud() {
        for (const pile of this.jobPiles) {
            const item = this.jobHudItems[pile.jobType];
            if (!item) continue;
            const check = item.querySelector('.job-check');
            const remain = item.querySelector('.job-remain');
            const fill = item.querySelector('.job-bar-fill');
            const ratio = Math.max(0, pile.remaining / pile.maxWork);
            const percent = pile.isComplete() ? 0 : Math.max(1, Math.ceil(ratio * 100));
            if (fill) fill.style.width = `${pile.isComplete() ? 0 : percent}%`;
            if (remain) remain.textContent = pile.isComplete() ? '完了' : `残り ${percent}%`;
            if (!check) continue;
            if (pile.isComplete()) {
                item.classList.add('done');
                check.textContent = '✨';
            } else {
                item.classList.remove('done');
                check.textContent = '○';
            }
        }
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

        const clamped = this.stage.clamp(this.partyX, this.partyY);
        this.partyX = clamped.x;
        this.partyY = clamped.y;
        
        // カメラをパーティーに追従
        this.cameraX = this.partyX;
        this.cameraY = this.partyY;
        
        // 隊列の中心位置を更新
        this.formation.setCenterPosition(this.partyX, this.partyY);
        
        // 移動方向を隊列に伝える
        this.formation.setMovementDirection(this.partyVelocityX, this.partyVelocityY);
        
        // 各キャラクターを更新
        this.formation.update();

        if (!this.cleared) {
            this.updateWork();
            this.updateCombat();
            this.updateEnemies();
            this.updateRescue();
            this.checkClear();
        }

        this.particles.update();
        if (this.hintTimer > 0) this.hintTimer -= 1;
        if (this.hintText) {
            this.hintText.style.opacity = this.hintTimer > 0 ? '1' : '0';
        }
    }

    updateWork() {
        const front = this.formation.getFrontCharacter();
        for (const member of this.formation.members) {
            member.isWorking = false;
        }

        this.workTextTimer -= 1;

        for (const pile of this.jobPiles) {
            pile.update();
            if (pile.justCompleted) {
                pile.justCompleted = false;
                this.particles.spawnComplete(pile.x, pile.y);
                this.particles.addText(pile.x, pile.y - 40, `${pile.label} 完了！`, '#ca8a04');
            }
            if (pile.isComplete()) continue;

            let anyoneWorking = false;
            for (const member of this.formation.members) {
                if (!pile.containsPoint(member.x, member.y, member.radius)) continue;
                const isFront = member === front;
                const power = member.getWorkPower(pile.jobType, isFront);
                pile.applyWork(power);
                member.isWorking = true;
                member.workFlash = 8;
                anyoneWorking = true;

                if (Math.random() < 0.18) {
                    this.particles.spawnWork(
                        (member.x + pile.x) / 2,
                        (member.y + pile.y) / 2,
                        member.specialty
                    );
                }
            }

            if (anyoneWorking && this.workTextTimer <= 0 && front && front.isWorking) {
                const rank = front.getAptitudeRank(pile.jobType);
                const label = rank === '得意' ? front.attackLabel : (rank === '苦手' ? 'がんばります…' : 'おてつだい');
                this.particles.addText(front.x, front.y - 34, label, front.color);
                this.workTextTimer = 50;
            }
        }

        this.updateJobHud();
    }

    updateCombat() {
        const front = this.formation.getFrontCharacter();
        for (const member of this.formation.members) {
            if (member.attackCooldown > 0) continue;
            const isFront = member === front;
            const range = isFront ? 88 : 68;
            let closest = null;
            let closestDist = range;
            for (const enemy of this.enemies) {
                if (!enemy.alive) continue;
                const dx = enemy.x - member.x;
                const dy = enemy.y - member.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) {
                    closest = enemy;
                    closestDist = dist;
                }
            }
            if (!closest) continue;

            const damage = isFront ? 8 : 3;
            const defeated = closest.takeDamage(damage);
            member.attackCooldown = isFront ? 22 : 38;
            member.isAttacking = 10;
            this.particles.spawnAttack(
                (member.x + closest.x) / 2,
                (member.y + closest.y) / 2,
                member.specialty
            );
            if (Math.random() < 0.35) {
                this.particles.addText(member.x, member.y - 30, member.attackLabel, member.color);
            }
            if (defeated) {
                this.particles.spawnDefeat(closest.x, closest.y);
                this.particles.addText(closest.x, closest.y - 10, 'キレイ！', '#fbbf24');
            }
        }
    }

    updateEnemies() {
        for (const enemy of this.enemies) {
            enemy.update(this.partyX, this.partyY);
        }
    }

    updateRescue() {
        if (!this.rescue) return;
        const shouldOffer = this.rescue.update(this.enemies, this.partyX, this.partyY);
        if (shouldOffer) this.openSwapOffer();
    }

    checkClear() {
        if (this.jobPiles.length === 0) return;
        const allDone = this.jobPiles.every((pile) => pile.isComplete());
        if (!allDone) return;
        this.cleared = true;
        if (this.clearOverlay) this.clearOverlay.classList.remove('hidden');
        this.particles.spawnComplete(this.partyX, this.partyY);
        this.updateJobHud();
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
        this.stage.drawGround(this.ctx, this.cameraX, this.cameraY, this.width, this.height);
        
        // カメラの変換を保存
        this.ctx.save();
        
        // カメラの変換を適用
        // スクリーン中央にキャラクターを配置
        this.ctx.translate(
            this.width / 2 - this.cameraX,
            this.height / 2 - this.cameraY
        );

        this.stage.drawWorld(this.ctx);

        for (const pile of this.jobPiles) {
            if (pile.isComplete()) pile.draw(this.ctx);
        }
        for (const pile of this.jobPiles) {
            if (!pile.isComplete()) pile.draw(this.ctx);
        }
        for (const enemy of this.enemies) {
            enemy.draw(this.ctx);
        }
        if (this.rescue) this.rescue.draw(this.ctx);
        
        // 隊列を描画（ワールド座標）
        this.formation.draw(this.ctx);

        this.particles.draw(this.ctx);
        
        // カメラの変換を復元
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
    // 画面の向きをランドスケープに固定（可能な場合）
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(err => {
            console.log('画面の向きのロックに失敗:', err);
        });
    }
    
    new Game();
});
