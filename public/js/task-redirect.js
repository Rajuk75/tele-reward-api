/**
 * Task Redirect Component
 * Standalone overlay component showing live background steps while click API runs.
 */
const TaskRedirect = {
    overlayId: 'taskRedirectOverlay',
    styleId: 'taskRedirectStyles',

    ensureStyles() {
        if (document.getElementById(this.styleId)) return;

        const style = document.createElement('style');
        style.id = this.styleId;
        style.textContent = `
            @keyframes trFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes trPopUp {
                from { opacity: 0; transform: translateY(10px) scale(0.97); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes trDotPulse {
                0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.45); }
                50% { transform: scale(1.12); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
            }
            @keyframes trIndeterminate {
                0% { transform: translateX(-100%); width: 45%; }
                50% { transform: translateX(65%); width: 55%; }
                100% { transform: translateX(220%); width: 45%; }
            }
            #${this.overlayId} {
                animation: trFadeIn 0.15s ease-out forwards;
            }
            #${this.overlayId} .tr-card {
                animation: trPopUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            #${this.overlayId} .tr-dot-active {
                animation: trDotPulse 1.2s ease-in-out infinite;
            }
            #${this.overlayId} .tr-progress-bar {
                animation: trIndeterminate 1.1s ease-in-out infinite;
            }
        `;
        document.head.appendChild(style);
    },

    remove() {
        const existing = document.getElementById(this.overlayId);
        if (existing) existing.remove();
    },

    start(rewardAmountINR) {
        this.ensureStyles();
        this.remove();

        const numericReward = Number(rewardAmountINR) || 0;
        const rewardBadgeHtml = numericReward > 0
            ? `<span class="inline-block px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-extrabold mb-3">
                   ₹${numericReward} Reward Tracked
               </span>`
            : '';

        const overlay = document.createElement('div');
        overlay.id = this.overlayId;
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Preparing your task');
        overlay.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm';

        overlay.innerHTML = `
            <div class="tr-card w-full max-w-[310px] bg-white rounded-[24px] p-6 border border-slate-200/80 shadow-2xl text-left">
                <div class="text-center">
                    ${rewardBadgeHtml}
                    <h3 class="text-base font-extrabold text-slate-900 tracking-tight">
                        Preparing Your Task
                    </h3>
                </div>

                <div class="mt-4 space-y-3 bg-slate-50/90 border border-slate-200/70 rounded-2xl p-3.5">
                    <div class="flex items-center gap-2.5 text-xs font-semibold text-emerald-700" data-tr-step="1">
                        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                        <span>Payout details verified</span>
                    </div>
                    <div class="flex items-center gap-2.5 text-xs font-bold text-slate-900" data-tr-step="2">
                        <span class="tr-dot-active w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                        <span>Creating tracking session...</span>
                    </div>
                    <div class="flex items-center gap-2.5 text-xs font-medium text-slate-400" data-tr-step="3">
                        <span class="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0"></span>
                        <span>Opening offer link</span>
                    </div>
                </div>

                <div class="mt-4 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div class="tr-progress-bar h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    },

    complete() {
        const overlay = document.getElementById(this.overlayId);
        if (!overlay) return;

        const step2 = overlay.querySelector('[data-tr-step="2"]');
        if (step2) {
            step2.className = 'flex items-center gap-2.5 text-xs font-semibold text-emerald-700';
            const dot2 = step2.querySelector('span');
            if (dot2) dot2.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0';
            const label2 = step2.querySelectorAll('span')[1];
            if (label2) label2.textContent = 'Tracking session created';
        }

        const step3 = overlay.querySelector('[data-tr-step="3"]');
        if (step3) {
            step3.className = 'flex items-center gap-2.5 text-xs font-bold text-slate-900';
            const dot3 = step3.querySelector('span');
            if (dot3) dot3.className = 'tr-dot-active w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0';
            const label3 = step3.querySelectorAll('span')[1];
            if (label3) label3.textContent = 'Opening offer link...';
        }
    },

    show(rewardAmountINR, onCompletedCallback) {
        this.start(rewardAmountINR);
        if (typeof onCompletedCallback === 'function') {
            onCompletedCallback();
        }
        return Promise.resolve();
    }
};

// Clear overlay if user navigates back via browser BFCache
window.addEventListener('pageshow', () => TaskRedirect.remove());
window.addEventListener('pagehide', () => TaskRedirect.remove());

window.TaskRedirect = TaskRedirect;
