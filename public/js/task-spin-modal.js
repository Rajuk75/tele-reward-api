/**
 * Task Spin Modal Component
 * A self-contained, gamified Lucky Spin Wheel modal to boost user rewards before continuing.
 */
class TaskSpinModal {
    constructor() {
        this.isOpen = false;
        this.isSpinning = false;
        this.hasSpun = false;
        this.baseReward = 0;
        this.wonBonus = 0;
        this.onProceedCallback = null;
        this.segments = [];
        this.currentRotation = 0;
        this.modalEl = null;
        this.canvasEl = null;
    }

    /**
     * Initializes and injects modal DOM if not already present
     */
    initDOM() {
        if (document.getElementById('taskSpinModalOverlay')) {
            return;
        }

        const modalHtml = `
            <div id="taskSpinModalOverlay" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300">
                <div class="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 text-center overflow-hidden animate-in zoom-in-95 duration-200">
                    
                    <!-- Decorative Top Ribbon -->
                    <div class="absolute -top-12 -left-12 w-28 h-28 bg-emerald-400/10 rounded-full blur-xl pointer-events-none"></div>
                    <div class="absolute -top-12 -right-12 w-28 h-28 bg-amber-400/10 rounded-full blur-xl pointer-events-none"></div>

                    <!-- Close Button -->
                    <button type="button" id="btnSpinModalClose" class="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition cursor-pointer">
                        <i class="fa-solid fa-xmark"></i>
                    </button>

                    <!-- Header -->
                    <div class="mb-3">
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                            <i class="fa-solid fa-gift text-amber-600"></i> Lucky Bonus
                        </span>
                        <h2 class="text-base font-black text-slate-900 mt-1">Spin & Win Extra Cash!</h2>
                        <p id="spinModalSubtitle" class="text-[11px] text-slate-500 font-medium">Spin the wheel to boost your reward before starting</p>
                    </div>

                    <!-- Wheel Container with Pointer -->
                    <div class="relative flex justify-center items-center my-3">
                        <!-- Top Pointer Needle -->
                        <div class="absolute -top-2 z-20 flex flex-col items-center">
                            <div class="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[16px] border-t-rose-600 drop-shadow-md"></div>
                        </div>

                        <!-- Canvas Wheel -->
                        <div class="p-1 rounded-full bg-gradient-to-tr from-amber-400 via-emerald-400 to-indigo-500 shadow-xl">
                            <canvas id="spinWheelCanvas" width="230" height="230" class="rounded-full bg-white"></canvas>
                        </div>

                        <!-- Center Spin Button -->
                        <button type="button" id="btnWheelCenterSpin" class="absolute z-10 w-12 h-12 rounded-full bg-slate-900 text-white font-black text-[11px] uppercase tracking-wider shadow-lg flex items-center justify-center border-2 border-white hover:scale-105 active:scale-95 transition cursor-pointer">
                            SPIN
                        </button>
                    </div>

                    <!-- Winning Result Banner (Hidden initially) -->
                    <div id="spinResultCard" class="hidden my-2.5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 animate-in fade-in zoom-in-95">
                        <div class="text-[11px] font-bold text-emerald-800 flex items-center justify-center gap-1">
                            <i class="fa-solid fa-sparkles text-amber-500"></i>
                            <span id="spinResultTitle">Congratulations!</span>
                        </div>
                        <div class="text-sm font-black text-emerald-900 mt-0.5">
                            Total: <span id="spinTotalRewardDisplay" class="text-emerald-700">₹0</span>
                            <span id="spinBonusTag" class="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-800">+₹0 Won</span>
                        </div>
                    </div>

                    <!-- Action Button -->
                    <div class="mt-3">
                        <button type="button" id="btnSpinAction" class="w-full py-3 px-4 rounded-xl text-white font-bold text-xs bg-emerald-600 hover:bg-emerald-700 primary-glow flex items-center justify-center gap-2 transform active:scale-[0.98] transition cursor-pointer shadow-md">
                            <span id="btnSpinActionText">Spin Wheel (Free)</span>
                            <i class="fa-solid fa-arrow-right text-[11px]"></i>
                        </button>
                    </div>

                    <p class="text-[9px] text-slate-400 mt-2">Bonus cash is credited directly to your payout account upon task completion.</p>
                </div>
            </div>
        `;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = modalHtml;
        document.body.appendChild(wrapper.firstElementChild);

        this.modalEl = document.getElementById('taskSpinModalOverlay');
        this.canvasEl = document.getElementById('spinWheelCanvas');

        // Bind event listeners
        document.getElementById('btnSpinModalClose')?.addEventListener('click', () => this.close());
        document.getElementById('btnWheelCenterSpin')?.addEventListener('click', () => this.spin());
        document.getElementById('btnSpinAction')?.addEventListener('click', () => {
            if (!this.hasSpun) {
                this.spin();
            } else {
                this.proceed();
            }
        });
    }

    /**
     * Draws the wheel on Canvas
     */
    drawWheel(angleRad = 0) {
        if (!this.canvasEl || !this.segments.length) return;
        const ctx = this.canvasEl.getContext('2d');
        const numSegments = this.segments.length;
        const arc = (2 * Math.PI) / numSegments;
        const centerX = this.canvasEl.width / 2;
        const centerY = this.canvasEl.height / 2;
        const radius = centerX - 4;

        ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);

        this.segments.forEach((seg, i) => {
            const startAngle = angleRad + i * arc;
            const endAngle = startAngle + arc;

            // Draw Segment Slice
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.fillStyle = seg.color;
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#FFFFFF';
            ctx.stroke();

            // Draw Segment Text
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + arc / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = seg.textColor;
            ctx.font = 'bold 11px sans-serif';
            ctx.shadowColor = 'rgba(0,0,0,0.2)';
            ctx.shadowBlur = 2;
            ctx.fillText(seg.text, radius - 12, 4);
            ctx.restore();
        });

        // Center Pin Rim
        ctx.beginPath();
        ctx.arc(centerX, centerY, 28, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#E2E8F0';
        ctx.stroke();
    }

    /**
     * Opens the modal
     */
    open({ baseReward = 0, slices = null, onProceed = null }) {
        this.initDOM();
        this.baseReward = Number(baseReward) || 0;
        this.onProceedCallback = onProceed;
        this.hasSpun = false;
        this.isSpinning = false;
        this.wonBonus = 0;

        // Configure segments strictly from backend offer slices
        const colors = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#6366F1'];
        this.segments = (Array.isArray(slices) ? slices : []).map((val, idx) => ({
            text: `+₹${val}`,
            value: Number(val),
            color: colors[idx % colors.length],
            textColor: '#FFFFFF'
        }));
        this.drawWheel(0);

        // Reset UI states
        const subtitle = document.getElementById('spinModalSubtitle');
        if (subtitle) {
            subtitle.textContent = 'Spin the wheel to boost your reward before starting';
        }

        const resultCard = document.getElementById('spinResultCard');
        if (resultCard) resultCard.classList.add('hidden');

        const actionBtn = document.getElementById('btnSpinAction');
        const actionBtnText = document.getElementById('btnSpinActionText');
        if (actionBtn && actionBtnText) {
            actionBtn.className = 'w-full py-3 px-4 rounded-xl text-white font-bold text-xs bg-emerald-600 hover:bg-emerald-700 primary-glow flex items-center justify-center gap-2 transform active:scale-[0.98] transition cursor-pointer shadow-md';
            actionBtnText.textContent = 'Spin Wheel';
        }

        const centerBtn = document.getElementById('btnWheelCenterSpin');
        if (centerBtn) {
            centerBtn.disabled = false;
            centerBtn.classList.remove('opacity-50');
        }

        if (this.modalEl) {
            this.modalEl.classList.remove('hidden');
        }
    }

    /**
     * Closes the modal
     */
    close() {
        if (this.modalEl) {
            this.modalEl.classList.add('hidden');
        }
    }

    /**
     * Picks winning segment with weighted probability:
     * - 75% Chance: Least (minimum) bonus amount
     * - 20% Chance: 2nd lowest bonus amount
     * - 5% Chance: Rare high bonus amount
     */
    pickWeightedIndex() {
        if (!this.segments.length) return 0;
        if (this.segments.length === 1) return 0;

        // Map segments with original index and sort ascending by value
        const sorted = this.segments
            .map((seg, originalIdx) => ({ ...seg, originalIdx }))
            .sort((a, b) => a.value - b.value);

        const minAmount = sorted[0].value;
        const lowestSlices = sorted.filter(s => s.value === minAmount);
        const otherSlices = sorted.filter(s => s.value > minAmount);

        const roll = Math.random() * 100; // 0 to 100 roll

        // 75% Chance: Always picks the least bonus amount
        if (roll < 75 || otherSlices.length === 0) {
            const pick = lowestSlices[Math.floor(Math.random() * lowestSlices.length)];
            return pick.originalIdx;
        }

        // 20% Chance: 2nd lowest bonus amount
        if (roll < 95 && otherSlices.length > 0) {
            return otherSlices[0].originalIdx;
        }

        // 5% Chance: Rare higher bonus amount
        const highSlices = otherSlices.slice(1);
        const pick = highSlices.length ? highSlices[Math.floor(Math.random() * highSlices.length)] : otherSlices[0];
        return pick.originalIdx;
    }

    /**
     * Spins the wheel
     */
    spin() {
        if (this.isSpinning || this.hasSpun) return;
        this.isSpinning = true;

        const centerBtn = document.getElementById('btnWheelCenterSpin');
        if (centerBtn) {
            centerBtn.disabled = true;
            centerBtn.classList.add('opacity-50');
        }

        const actionBtn = document.getElementById('btnSpinAction');
        const actionBtnText = document.getElementById('btnSpinActionText');
        if (actionBtn && actionBtnText) {
            actionBtn.disabled = true;
            actionBtnText.textContent = 'Spinning...';
        }

        // Choose winning segment using weighted probability
        const winningIndex = this.pickWeightedIndex();
        const winningSeg = this.segments[winningIndex];

        const numSegments = this.segments.length;
        const arc = (2 * Math.PI) / numSegments;

        // Pointer is at the TOP (angle = 3*PI/2)
        // Target angle calculation
        const targetSliceAngle = (3 * Math.PI / 2) - (winningIndex * arc + arc / 2);
        const extraRounds = 5 + Math.floor(Math.random() * 3); // 5 to 7 full rotations
        const totalAngle = extraRounds * (2 * Math.PI) + targetSliceAngle;

        const duration = 3200; // 3.2 seconds
        const startTime = performance.now();
        const startRotation = this.currentRotation % (2 * Math.PI);

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentAngle = startRotation + (totalAngle - startRotation) * easeOut;

            this.currentRotation = currentAngle;
            this.drawWheel(currentAngle);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isSpinning = false;
                this.hasSpun = true;
                this.onSpinFinished(winningSeg);
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Handles victory celebration and updates total reward
     */
    onSpinFinished(winningSeg) {
        const bonusAmount = Number(winningSeg.value) || 0;
        this.wonBonus = bonusAmount;
        const finalTotal = this.baseReward + bonusAmount;

        // Display winning card
        const resultCard = document.getElementById('spinResultCard');
        const totalDisplay = document.getElementById('spinTotalRewardDisplay');
        const bonusTag = document.getElementById('spinBonusTag');

        if (totalDisplay) totalDisplay.textContent = `₹${finalTotal}`;
        if (bonusTag) bonusTag.textContent = `+₹${bonusAmount} Bonus Won`;
        if (resultCard) resultCard.classList.remove('hidden');

        // Update CTA Button
        const actionBtn = document.getElementById('btnSpinAction');
        const actionBtnText = document.getElementById('btnSpinActionText');
        if (actionBtn && actionBtnText) {
            actionBtn.disabled = false;
            actionBtnText.textContent = `Claim ₹${finalTotal} & Start Task`;
            actionBtn.className = 'w-full py-3.5 px-4 rounded-xl text-white font-black text-xs bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 primary-glow flex items-center justify-center gap-2 transform active:scale-[0.98] transition cursor-pointer shadow-lg';
        }
    }

    /**
     * Proceeds with task flow (closing modal and invoking callback)
     */
    proceed() {
        this.close();
        if (typeof this.onProceedCallback === 'function') {
            this.onProceedCallback({
                baseReward: this.baseReward,
                bonusReward: this.wonBonus,
                totalReward: this.baseReward + this.wonBonus,
            });
        }
    }
}

// Global Singleton Instance
window.TaskSpinModal = new TaskSpinModal();
