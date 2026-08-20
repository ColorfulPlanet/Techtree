/**
 * メイドキャラクター
 * 既存 Character を拡張し、仕事適性と見た目だけを追加する。
 * 移動・追従ロジックは Character / FormationManager に委譲する。
 */
const JOB_TYPES = {
    cleaning: 'cleaning',
    cooking: 'cooking',
    laundry: 'laundry'
};

const APTITUDE = {
    expert: 1.6,
    normal: 1.0,
    weak: 0.45
};

const MAID_PRESETS = {
    cleaning: {
        id: 'sakura',
        name: 'サクラ',
        specialty: JOB_TYPES.cleaning,
        color: '#f472b6',
        hairColor: '#f9a8d4',
        hairDark: '#ec4899',
        dressColor: '#fda4af',
        accentColor: '#fb7185',
        skinColor: '#ffe4d6',
        aptitude: {
            cleaning: APTITUDE.expert,
            cooking: APTITUDE.weak,
            laundry: APTITUDE.normal
        },
        attackLabel: 'ピカーン！',
        workLabel: 'おそうじ'
    },
    cooking: {
        id: 'coco',
        name: 'ココ',
        specialty: JOB_TYPES.cooking,
        color: '#f59e0b',
        hairColor: '#b45309',
        hairDark: '#92400e',
        dressColor: '#fdba74',
        accentColor: '#f97316',
        skinColor: '#ffe8d6',
        aptitude: {
            cleaning: APTITUDE.weak,
            cooking: APTITUDE.expert,
            laundry: APTITUDE.normal
        },
        attackLabel: 'ポーン！',
        workLabel: 'お料理'
    },
    laundry: {
        id: 'aoi',
        name: 'アオイ',
        specialty: JOB_TYPES.laundry,
        color: '#38bdf8',
        hairColor: '#7dd3fc',
        hairDark: '#0ea5e9',
        dressColor: '#93c5fd',
        accentColor: '#60a5fa',
        skinColor: '#fff1e8',
        aptitude: {
            cleaning: APTITUDE.normal,
            cooking: APTITUDE.weak,
            laundry: APTITUDE.expert
        },
        attackLabel: 'ポワポワ！',
        workLabel: 'おせんたく'
    },
    tidy: {
        id: 'hina',
        name: 'ヒナ',
        specialty: JOB_TYPES.cleaning,
        color: '#a3e635',
        hairColor: '#fde68a',
        hairDark: '#fbbf24',
        dressColor: '#bbf7d0',
        accentColor: '#4ade80',
        skinColor: '#fff7ed',
        aptitude: {
            cleaning: APTITUDE.normal,
            cooking: APTITUDE.normal,
            laundry: APTITUDE.normal
        },
        attackLabel: 'えい！',
        workLabel: 'おかたづけ'
    }
};

class Maid extends Character {
    constructor(presetKey) {
        const preset = MAID_PRESETS[presetKey];
        super(preset.id, preset.name, preset.color);

        this.presetKey = presetKey;
        this.specialty = preset.specialty;
        this.hairColor = preset.hairColor;
        this.hairDark = preset.hairDark;
        this.dressColor = preset.dressColor;
        this.accentColor = preset.accentColor;
        this.skinColor = preset.skinColor;
        this.aptitude = { ...preset.aptitude };
        this.attackLabel = preset.attackLabel;
        this.workLabel = preset.workLabel;

        this.maxHp = preset.maxHp ?? 100;
        this.hp = this.maxHp;
        this.defense = preset.defense ?? 0;
        this.invulnFrames = 30;
        this.invulnTimer = 0;
        this.hitFlash = 0;
        this.downed = false;

        this.radius = 24;
        this.drawScale = 1.35;
        this.animTime = Math.random() * Math.PI * 2;
        this.facing = 1;
        this.isWorking = false;
        this.isAttacking = 0;
        this.attackCooldown = 0;
        this.workFlash = 0;
        this.lastX = 0;
        this.lastY = 0;
    }

    /**
     * 仕事タイプに対する処理量（1フレームあたり）
     * 先頭=メイン作業、後衛=サブ作業
     */
    getWorkPower(jobType, isFront, context = {}) {
        const apt = this.aptitude[jobType] ?? APTITUDE.weak;
        const roleMul = isFront ? 1.0 : 0.22;
        let power = 0.22 * apt * roleMul;
        const spread = context.spread ?? 0.5;
        const pileSize = context.pileSize || 'normal';
        const workers = context.workers ?? 1;

        if (isFront && this.specialty === 'cooking') {
            power *= pileSize === 'large' ? 2.3 : 1.35;
        }
        if (isFront && this.specialty === 'cleaning') {
            power *= pileSize === 'small' ? 1.8 : 1.05;
        }
        if (isFront && this.specialty === 'laundry' && pileSize !== 'large') {
            power *= 1.2;
        }
        if (spread <= 0.34 && workers >= 2 && pileSize === 'large') {
            power *= 1.7;
        }
        if (spread >= 0.66 && pileSize === 'small') {
            power *= 1.45;
        }
        if (spread >= 0.66 && pileSize === 'large') {
            power *= 0.7;
        }
        return power;
    }

    getAptitudeRank(jobType) {
        const apt = this.aptitude[jobType] ?? APTITUDE.weak;
        if (apt >= APTITUDE.expert) return '得意';
        if (apt <= APTITUDE.weak) return '苦手';
        return '普通';
    }

    update() {
        const dx = this.x - this.lastX;
        if (Math.abs(dx) > 0.15) {
            this.facing = dx >= 0 ? 1 : -1;
        }
        this.lastX = this.x;
        this.lastY = this.y;

        this.animTime += this.downed
            ? 0.05
            : (this.isWorking || this.isAttacking > 0 ? 0.18 : 0.08);
        if (this.isAttacking > 0) this.isAttacking -= 1;
        if (this.attackCooldown > 0) this.attackCooldown -= 1;
        if (this.workFlash > 0) this.workFlash -= 1;
        if (this.invulnTimer > 0) this.invulnTimer -= 1;
        if (this.hitFlash > 0) this.hitFlash -= 1;

        if (this.downed) {
            this.targetX = this.x;
            this.targetY = this.y;
            return;
        }

        super.update();
    }

    takeDamage(amount) {
        if (this.downed || this.invulnTimer > 0) return 0;
        const reduced = Math.max(1, Math.round(amount * (1 - this.defense)));
        this.hp = Math.max(0, this.hp - reduced);
        this.invulnTimer = this.invulnFrames;
        this.hitFlash = 10;
        if (this.hp <= 0) {
            this.hp = 0;
            this.downed = true;
            this.isWorking = false;
            this.isAttacking = 0;
        }
        return reduced;
    }

    isCombatReady() {
        return !this.downed;
    }

    draw(ctx, isFront = false) {
        if (this.invulnTimer > 0 && Math.floor(this.invulnTimer / 3) % 2 === 0 && !this.downed) {
            this.drawHpBar(ctx);
            this.drawNameplate(ctx, isFront);
            return;
        }

        const bob = this.downed ? 0 : Math.sin(this.animTime * 3.2) * (this.isWorking ? 2.4 : 1.2);
        const x = this.x;
        const y = this.y + bob;
        const face = this.facing;

        if (isFront && !this.downed) this.drawCaptainMarker(ctx);

        ctx.save();
        ctx.translate(x, y + (this.downed ? 6 : 0));
        ctx.scale(face * this.drawScale, this.drawScale * (this.downed ? 0.72 : 1));

        this.drawShadow(ctx);

        this.drawDress(ctx);
        this.drawHairBack(ctx);
        this.drawHead(ctx);
        this.drawHairFront(ctx);
        this.drawHeaddress(ctx);
        if (!this.downed) this.drawTool(ctx);

        ctx.restore();

        if (this.downed) this.drawZzz(ctx);
        this.drawHpBar(ctx);
        this.drawNameplate(ctx, isFront && !this.downed);
    }

    drawShadow(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(80, 50, 80, 0.22)';
        ctx.beginPath();
        ctx.ellipse(0, 18, 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawCaptainMarker(ctx) {
        const pulse = 0.82 + Math.sin(this.animTime * 3.4) * 0.18;
        ctx.save();
        ctx.translate(this.x, this.y + 26);

        ctx.fillStyle = `rgba(251, 191, 36, ${0.32 * pulse})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, 32, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(251, 191, 36, ${0.95})`;
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 24, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    drawDress(ctx) {
        ctx.save();
        ctx.fillStyle = this.dressColor;
        ctx.beginPath();
        ctx.moveTo(-8, -2);
        ctx.lineTo(8, -2);
        ctx.lineTo(16, 18);
        ctx.lineTo(-16, 18);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(5, 0);
        ctx.lineTo(8, 16);
        ctx.lineTo(-8, 16);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = this.accentColor;
        ctx.fillRect(-8, -2, 16, 3);

        ctx.fillStyle = this.skinColor;
        ctx.beginPath();
        ctx.arc(-11, 6, 3.2, 0, Math.PI * 2);
        ctx.arc(11, 6, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawHairBack(ctx) {
        ctx.save();
        ctx.fillStyle = this.hairDark;
        ctx.beginPath();
        ctx.ellipse(0, -10, 14, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-11, 0, 5, 8, -0.3, 0, Math.PI * 2);
        ctx.ellipse(11, 0, 5, 8, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawHead(ctx) {
        ctx.save();
        ctx.fillStyle = this.skinColor;
        ctx.beginPath();
        ctx.arc(0, -10, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#3f2a2a';
        if (this.downed) {
            ctx.strokeStyle = '#3f2a2a';
            ctx.lineWidth = 1.1;
            [[-3.5, -10], [3.5, -10]].forEach(([ex, ey]) => {
                ctx.beginPath();
                ctx.arc(ex, ey, 2.2, 0, Math.PI * 1.6);
                ctx.stroke();
            });
        } else {
            ctx.beginPath();
            ctx.ellipse(-3.5, -10, 1.4, 2.1, 0, 0, Math.PI * 2);
            ctx.ellipse(3.5, -10, 1.4, 2.1, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(-3.0, -10.7, 0.6, 0, Math.PI * 2);
            ctx.arc(4.0, -10.7, 0.6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = 'rgba(255, 130, 150, 0.45)';
        ctx.beginPath();
        ctx.ellipse(-5.5, -7.2, 2.2, 1.3, 0, 0, Math.PI * 2);
        ctx.ellipse(5.5, -7.2, 2.2, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#d48a8a';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(0, -7.5, 2.4, 0.15, Math.PI - 0.15);
        ctx.stroke();
        ctx.restore();
    }

    drawHairFront(ctx) {
        ctx.save();
        ctx.fillStyle = this.hairColor;
        ctx.beginPath();
        ctx.ellipse(-5, -16, 5, 4, -0.4, 0, Math.PI * 2);
        ctx.ellipse(5, -16, 5, 4, 0.4, 0, Math.PI * 2);
        ctx.ellipse(0, -17, 6, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawHeaddress(ctx) {
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(0, -19, 9, 3.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.accentColor;
        ctx.beginPath();
        ctx.arc(-6, -19, 2.2, 0, Math.PI * 2);
        ctx.arc(6, -19, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawTool(ctx) {
        const swing = Math.sin(this.animTime * 5) * (this.isWorking || this.isAttacking > 0 ? 0.45 : 0.08);
        ctx.save();
        ctx.translate(12, 4);
        ctx.rotate(swing);

        if (this.presetKey === 'tidy') {
            ctx.fillStyle = '#fef3c7';
            ctx.strokeStyle = '#d6bf7a';
            ctx.lineWidth = 1.5;
            ctx.fillRect(-4, 2, 12, 10);
            ctx.strokeRect(-4, 2, 12, 10);
            ctx.fillRect(-1, -4, 12, 10);
            ctx.strokeRect(-1, -4, 12, 10);
        } else if (this.specialty === JOB_TYPES.cleaning) {
            ctx.strokeStyle = '#c4a574';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(10, 16);
            ctx.stroke();
            ctx.fillStyle = '#67e8f9';
            ctx.beginPath();
            ctx.ellipse(12, 18, 7, 4, 0.4, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.specialty === JOB_TYPES.cooking) {
            ctx.fillStyle = '#6b7280';
            ctx.fillRect(-1, 0, 3, 10);
            ctx.fillStyle = '#374151';
            ctx.beginPath();
            ctx.ellipse(1, 14, 8, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.ellipse(1, 13, 5, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = '#e0f2fe';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-6, 4);
            ctx.lineTo(8, 4);
            ctx.lineTo(6, 14);
            ctx.lineTo(-8, 14);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#f9a8d4';
            ctx.fillRect(-3, 1, 8, 4);
        }
        ctx.restore();
    }

    drawNameplate(ctx, isFront) {
        ctx.save();
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillStyle = isFront ? '#b45309' : '#6b4f6b';
        ctx.strokeText(this.name, this.x, this.y + 30);
        ctx.fillText(this.name, this.x, this.y + 30);
        ctx.restore();
    }

    drawHpBar(ctx) {
        const w = 30;
        const h = 5;
        const x = this.x - w / 2;
        const y = this.y - 38;
        const ratio = this.maxHp > 0 ? this.hp / this.maxHp : 0;
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = ratio > 0.35 ? '#4ade80' : (ratio > 0.15 ? '#fbbf24' : '#fb7185');
        ctx.fillRect(x, y, Math.max(0, w * ratio), h);
        ctx.restore();
    }

    drawZzz(ctx) {
        const bounce = Math.sin(this.animTime * 2) * 3;
        ctx.save();
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#64748b';
        ctx.fillText('Zzz', this.x + 16, this.y - 18 + bounce);
        ctx.restore();
    }
}
