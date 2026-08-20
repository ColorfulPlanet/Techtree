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
        this.basePartyMaxSpeed = 3;
        this.partyAcceleration = 0.65;
        this.partyFriction = 0.85;
        // スティックを離したときの余韻を短くする
        this.partyStopFriction = 0.42;
        // 逆方向入力時にぬるっと滑らないよう強く減速する
        this.partyReverseFriction = 0.38;
        this.partyStopSpeed = 0.08;
        // 当たりから隊列へ戻る速度（通常の追従は速いまま）
        this.followSnapSpeed = 8;
        this.followReturnSpeed = 1.85;
        this.followBlockedSpeed = 1.25;
        // 隊長切り替え時はカメラを瞬間移動させず、追いつくまで移動する
        this.cameraSnapDistance = 14;
        this.cameraMoveSpeed = 6.2;
        
        // UI要素
        this.debugInfo = {
            frontCharacter: document.getElementById('frontCharacter'),
            formationSpacing: document.getElementById('formationSpacing'),
            frontAttack: document.getElementById('frontAttack'),
            spreadMode: document.getElementById('spreadMode')
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
        this.combat = new CombatSystem();
        this.lastSpreadMode = null;
        this.downedMaids = [];
        this.enemyShots = [];
        this.gameOver = false;
        this.partyHud = document.getElementById('partyHp');
        this.gameOverOverlay = document.getElementById('gameOverOverlay');
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
        this.combat = new CombatSystem();
        this.cleared = false;
        this.gameOver = false;
        this.enemyShots = [];
        if (this.clearOverlay) this.clearOverlay.classList.add('hidden');
        if (this.swapOverlay) this.swapOverlay.classList.add('hidden');
        if (this.gameOverOverlay) this.gameOverOverlay.classList.add('hidden');
        this.updateJobHud();
        this.updatePartyHud();
    }

    setupClearUi() {
        const retry = document.getElementById('retryButton');
        const overRetry = document.getElementById('gameOverRetry');
        const restart = () => this.restartRun();
        if (retry) retry.addEventListener('click', restart);
        if (overRetry) overRetry.addEventListener('click', restart);
    }

    restartRun() {
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
        this.downedMaids = [];
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
            if (frontChar) {
                const name = this.combat.getAttackName(frontChar);
                this.particles.addText(
                    frontChar.x,
                    frontChar.y - 40,
                    `${frontChar.name}：${name}`,
                    frontChar.color
                );
            }
        });
        
        this.inputHandler.setSpacingChangeCallback((spacing) => {
            this.updateUI();
            const mode = this.combat.getSpreadMode(this.formation);
            if (mode !== this.lastSpreadMode) {
                this.lastSpreadMode = mode;
                const front = this.formation.getFrontCharacter();
                const label = mode === 'narrow' ? '集中！' : (mode === 'wide' ? '分散！' : '標準');
                if (front) this.particles.addText(front.x, front.y - 42, label, '#a78bfa');
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
            if (this.debugInfo.frontAttack) {
                this.debugInfo.frontAttack.textContent = this.combat.getAttackName(frontChar);
            }
        }
        
        this.debugInfo.formationSpacing.textContent = 
            Math.round(this.formation.formationSpacing);
        if (this.debugInfo.spreadMode) {
            const mode = this.combat.getSpreadMode(this.formation);
            this.debugInfo.spreadMode.textContent =
                mode === 'narrow' ? '狭い・集中' : (mode === 'wide' ? '広い・分散' : '標準');
        }

        this.updateJobHud();
        this.updatePartyHud();
    }

    rosterMaids() {
        return [...this.formation.members, ...this.downedMaids];
    }

    updatePartyHud() {
        if (!this.partyHud) return;
        const maids = this.rosterMaids();
        this.partyHud.innerHTML = maids.map((maid) => {
            const pct = maid.maxHp > 0 ? Math.round(maid.hp / maid.maxHp * 100) : 0;
            const status = maid.downed ? 'へとへと' : `${maid.hp}`;
            return `<div class="hp-row${maid.downed ? ' down' : ''}">
                <span class="hp-name">${maid.name}</span>
                <div class="hp-bar"><div class="hp-fill" style="width:${pct}%;background:${maid.color}"></div></div>
                <span class="hp-val">${status}</span>
            </div>`;
        }).join('');
    }

    updateJobHud() {
        const totals = {};
        for (const pile of this.jobPiles) {
            if (!totals[pile.jobType]) totals[pile.jobType] = { remaining: 0, max: 0 };
            totals[pile.jobType].remaining += pile.remaining;
            totals[pile.jobType].max += pile.maxWork;
        }
        for (const [jobType, item] of Object.entries(this.jobHudItems)) {
            if (!item) continue;
            const total = totals[jobType];
            if (!total) continue;
            const check = item.querySelector('.job-check');
            const remain = item.querySelector('.job-remain');
            const fill = item.querySelector('.job-bar-fill');
            const done = total.remaining <= 0;
            const percent = done ? 0 : Math.max(1, Math.ceil(total.remaining / total.max * 100));
            if (fill) fill.style.width = `${percent}%`;
            if (remain) remain.textContent = done ? '完了' : `残り ${percent}%`;
            if (!check) continue;
            if (done) {
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
        const front = this.formation.getFrontCharacter();
        this.partyMaxSpeed = (front && front.specialty === 'cleaning')
            ? this.basePartyMaxSpeed * 1.22
            : this.basePartyMaxSpeed;
        
        const hasInput = input.active && (Math.abs(input.x) > 0 || Math.abs(input.y) > 0);

        // 入力に応じて加速。逆方向は先に強く減速してから加速する
        if (hasInput) {
            if (this.partyVelocityX * input.x < 0) {
                this.partyVelocityX *= this.partyReverseFriction;
            }
            if (this.partyVelocityY * input.y < 0) {
                this.partyVelocityY *= this.partyReverseFriction;
            }
            this.partyVelocityX += input.x * this.partyAcceleration;
            this.partyVelocityY += input.y * this.partyAcceleration;
        }
        
        // 摩擦を適用（無入力時はより強く減速）
        const friction = hasInput ? this.partyFriction : this.partyStopFriction;
        this.partyVelocityX *= friction;
        this.partyVelocityY *= friction;
        
        // 最大速度を制限
        const speed = Math.sqrt(
            this.partyVelocityX * this.partyVelocityX + 
            this.partyVelocityY * this.partyVelocityY
        );

        if (!hasInput && speed < this.partyStopSpeed) {
            this.partyVelocityX = 0;
            this.partyVelocityY = 0;
        } else if (speed > this.partyMaxSpeed) {
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
        
        // 隊列の中心位置を更新
        this.formation.setCenterPosition(this.partyX, this.partyY);
        
        // 隊列の向きはスティック操作中だけ更新する。
        // 慣性の速度方向で回し続けると、離したあともグルグル回り切ってしまう。
        if (hasInput) {
            this.formation.setMovementDirection(input.x, input.y);
        } else {
            this.formation.setMovementDirection(0, 0);
        }
        
        // 各キャラクターを更新
        this.rememberMaidPositions();
        this.formation.update();
        this.limitMaidFollowStep();
        this.resolveCollisions();
        this.anchorPartyToCaptain();

        if (!this.cleared && !this.gameOver) {
            this.updateWork();
            this.updateCombat();
            this.updateEnemies();
            this.updateRescue();
            this.checkClear();
        }

        this.resolveCollisions();
        this.anchorPartyToCaptain();

        for (const maid of this.downedMaids) maid.update();
        this.updatePartyHud();

        this.particles.update();
        this.updateCamera();
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

            const workers = this.formation.members.filter((member) =>
                !member.downed && pile.containsPoint(member.x, member.y, member.radius)
            );
            const spread = this.combat.getSpread(this.formation);
            const surrounded = this.combat.isEncircling(
                pile.x,
                pile.y,
                this.formation.members,
                pile.getWorkRadius() + 24
            );
            let anyoneWorking = false;
            for (const member of workers) {
                const isFront = member === front;
                const power = member.getWorkPower(pile.jobType, isFront, {
                    spread,
                    pileSize: pile.pileSize,
                    workers: workers.length,
                    surrounded
                });
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
                const label = surrounded
                    ? '囲み集中！'
                    : (rank === '得意' ? front.attackLabel : (rank === '苦手' ? 'がんばります…' : 'おてつだい'));
                this.particles.addText(front.x, front.y - 34, label, surrounded ? '#fbbf24' : front.color);
                this.workTextTimer = surrounded ? 40 : 50;
            }
        }

        this.updateJobHud();
    }

    updateCombat() {
        this.combat.update(this.formation, this.enemies, this.particles);
    }

    rememberMaidPositions() {
        for (const maid of this.formation.members) {
            maid.prevX = maid.x;
            maid.prevY = maid.y;
        }
    }

    /**
     * 隊長の実位置を本体座標にする。
     * 隊長が壁に引っかかっているときは、そこからスクロールも進まない。
     */
    anchorPartyToCaptain() {
        const front = this.formation.getFrontCharacter();
        if (!front || front.downed) return;

        const corrX = front.x - front.targetX;
        const corrY = front.y - front.targetY;
        const err = Math.hypot(corrX, corrY);

        if (front.hitSolid || err > 8) {
            this.partyX += corrX;
            this.partyY += corrY;
            const clamped = this.stage.clamp(this.partyX, this.partyY);
            this.partyX = clamped.x;
            this.partyY = clamped.y;
            this.formation.setCenterPosition(this.partyX, this.partyY);
            this.formation.updateFormationPositions();

            if (front.hitSolid && err > 0.01) {
                const nx = corrX / err;
                const ny = corrY / err;
                const intoWall = this.partyVelocityX * nx + this.partyVelocityY * ny;
                if (intoWall < 0) {
                    this.partyVelocityX -= intoWall * nx;
                    this.partyVelocityY -= intoWall * ny;
                }
            }
        }
    }

    /**
     * カメラは隊長を追う。通常移動は密着、隊長切り替えは移動して追いつく。
     */
    updateCamera() {
        const front = this.formation.getFrontCharacter();
        const targetX = (front && !front.downed) ? front.x : this.partyX;
        const targetY = (front && !front.downed) ? front.y : this.partyY;
        const dx = targetX - this.cameraX;
        const dy = targetY - this.cameraY;
        const dist = Math.hypot(dx, dy);

        if (dist <= this.cameraSnapDistance) {
            this.cameraX = targetX;
            this.cameraY = targetY;
            return;
        }

        const step = Math.min(dist, this.cameraMoveSpeed);
        this.cameraX += (dx / dist) * step;
        this.cameraY += (dy / dist) * step;
    }

    limitMaidFollowStep() {
        for (const maid of this.formation.members) {
            if (maid.downed) continue;
            const px = maid.prevX ?? maid.x;
            const py = maid.prevY ?? maid.y;
            const dx = maid.x - px;
            const dy = maid.y - py;
            const step = Math.hypot(dx, dy);
            const distToSlot = Math.hypot(maid.targetX - px, maid.targetY - py);
            let maxStep = this.followSnapSpeed;
            if (maid.hitSolid) maxStep = this.followBlockedSpeed;
            else if (distToSlot > 42) maxStep = this.followReturnSpeed;
            if (step > maxStep && step > 0.0001) {
                maid.x = px + (dx / step) * maxStep;
                maid.y = py + (dy / step) * maxStep;
            }
        }
    }

    separateFromStatic(body, ox, oy, minDist) {
        const dx = body.x - ox;
        const dy = body.y - oy;
        let dist = Math.hypot(dx, dy);
        if (dist >= minDist) return false;
        if (dist < 0.001) {
            body.x += minDist;
            if (body.hitSolid !== undefined) body.hitSolid = true;
            return true;
        }
        const push = minDist - dist;
        body.x += (dx / dist) * push;
        body.y += (dy / dist) * push;
        if (body.hitSolid !== undefined) body.hitSolid = true;
        return true;
    }

    separateBodies(a, b, ar, br, aMass, bMass) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        const minDist = ar + br;
        if (dist >= minDist) return false;
        if (dist < 0.001) dist = 0.001;
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        const total = aMass + bMass;
        a.x -= nx * overlap * (bMass / total);
        a.y -= ny * overlap * (bMass / total);
        b.x += nx * overlap * (aMass / total);
        b.y += ny * overlap * (aMass / total);
        if (typeof b.vx === 'number') {
            b.vx += nx * 0.12;
            b.vy += ny * 0.12;
        }
        if (a.hitSolid !== undefined) a.hitSolid = true;
        if (b.hitSolid !== undefined) b.hitSolid = true;
        return true;
    }

    resolveCollisions() {
        const maids = this.formation.members.filter((maid) => !maid.downed);
        for (const maid of maids) maid.hitSolid = false;
        const piles = this.jobPiles.filter((pile) => !pile.isComplete());
        const enemies = this.enemies.filter((enemy) => enemy.alive);

        for (const maid of maids) {
            for (const pile of piles) {
                this.separateFromStatic(
                    maid,
                    pile.x,
                    pile.y,
                    pile.getCollisionRadius() + maid.radius
                );
            }
            for (const enemy of enemies) {
                this.separateBodies(maid, enemy, maid.radius, enemy.radius, 1, 1.15);
            }
            const clamped = this.stage.clamp(maid.x, maid.y);
            maid.x = clamped.x;
            maid.y = clamped.y;
        }

        for (const enemy of enemies) {
            for (const pile of piles) {
                this.separateFromStatic(
                    enemy,
                    pile.x,
                    pile.y,
                    pile.getCollisionRadius() + enemy.radius
                );
            }
            const clamped = this.stage.clamp(enemy.x, enemy.y);
            enemy.x = clamped.x;
            enemy.y = clamped.y;
        }
    }

    hurtMaid(maid, amount) {
        if (!maid || maid.downed) return;
        const dealt = maid.takeDamage(amount);
        if (dealt <= 0) return;
        this.particles.addText(maid.x, maid.y - 28, `-${dealt}`, '#fb7185');
        this.particles.spawnBurst(maid.x, maid.y, 'star', 5, '#fda4af');
        if (maid.downed) {
            this.dropFromFormation(maid);
            this.particles.addText(maid.x, maid.y - 48, 'へとへと…', '#64748b');
        }
        this.updatePartyHud();
    }

    dropFromFormation(maid) {
        const idx = this.formation.members.indexOf(maid);
        if (idx === -1) return;
        this.formation.members.splice(idx, 1);
        if (idx < this.formation.frontIndex) this.formation.frontIndex -= 1;
        if (!this.downedMaids.includes(maid)) this.downedMaids.push(maid);
        if (this.formation.members.length === 0) {
            this.formation.frontIndex = 0;
            this.triggerGameOver();
            this.updatePartyHud();
            return;
        }
        this.formation.frontIndex = this.formation.frontIndex % this.formation.members.length;
        if (!this.downedMaids.includes(maid)) this.downedMaids.push(maid);
        this.updateUI();
    }

    triggerGameOver() {
        this.gameOver = true;
        if (this.gameOverOverlay) this.gameOverOverlay.classList.remove('hidden');
    }

    updateEnemies() {
        const living = this.formation.members;
        for (const enemy of this.enemies) {
            const action = enemy.update(living);
            if (!action) continue;
            if (action.type === 'shot' && action.shot) {
                this.enemyShots.push(action.shot);
            } else if (action.type === 'aoe') {
                this.particles.spawnBurst(action.x, action.y, 'sparkle', 16, '#fde68a');
                this.particles.addText(action.x, action.y - 24, 'ドカン！', '#f59e0b');
                for (const maid of living) {
                    if (Math.hypot(maid.x - action.x, maid.y - action.y) <= action.radius + maid.radius) {
                        this.hurtMaid(maid, action.damage);
                    }
                }
            }
        }

        for (const shot of this.enemyShots) {
            shot.update();
            if (!shot.alive) continue;
            for (const maid of this.formation.members) {
                if (shot.hits(maid)) {
                    this.hurtMaid(maid, shot.damage);
                    shot.alive = false;
                    break;
                }
            }
        }
        this.enemyShots = this.enemyShots.filter((shot) => shot.alive);
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
        for (const maid of this.downedMaids) maid.draw(this.ctx, false);
        
        // 隊列を描画（ワールド座標）
        this.formation.draw(this.ctx);
        this.combat.draw(this.ctx);
        for (const shot of this.enemyShots) shot.draw(this.ctx);

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
