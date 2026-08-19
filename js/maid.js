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
    getWorkPower(jobType, isFront) {
        const apt = this.aptitude[jobType] ?? APTITUDE.weak;
        const roleMul = isFront ? 1.0 : 0.22;
        return 0.22 * apt * roleMul;
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

        this.animTime += this.isWorking || this.isAttacking > 0 ? 0.18 : 0.08;
        if (this.isAttacking > 0) this.isAttacking -= 1;
        if (this.attackCooldown > 0) this.attackCooldown -= 1;
        if (this.workFlash > 0) this.workFlash -= 1;

        super.update();
    }

    draw(ctx, isFront = false) {
        const bob = Math.sin(this.animTime * 3.2) * (this.isWorking ? 2.4 : 1.2);
        const x = this.x;
        const y = this.y + bob;
        const face = this.facing;

        if (isFront) this.drawCaptainMarker(ctx);

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(face * this.drawScale, this.drawScale);

        this.drawShadow(ctx);

        this.drawDress(ctx);
        this.drawHairBack(ctx);
        this.drawHead(ctx);
        this.drawHairFront(ctx);
        this.drawHeaddress(ctx);
        this.drawTool(ctx);

        ctx.restore();

        this.drawNameplate(ctx, isFront);
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
        ctx.beginPath();
        ctx.ellipse(-3.5, -10, 1.4, 2.1, 0, 0, Math.PI * 2);
        ctx.ellipse(3.5, -10, 1.4, 2.1, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-3.0, -10.7, 0.6, 0, Math.PI * 2);
        ctx.arc(4.0, -10.7, 0.6, 0, Math.PI * 2);
        ctx.fill();

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
}
