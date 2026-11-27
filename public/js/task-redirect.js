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
            @keyframes trPulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.7; }
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
            #${this.overlayId} .tr-icon-active {
                animation: trPulse 1.1s ease-in-out infinite;
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

    start() {
        this.ensureStyles();
        this.remove();

        const overlay = document.createElement('div');
        overlay.id = this.overlayId;
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Opening your task');
        overlay.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm';

        overlay.innerHTML = `
            <div class="tr-card w-full max-w-[310px] bg-white rounded-[24px] p-6 border border-slate-200/80 shadow-2xl text-left">
                <h3 class="text-base font-extrabold text-slate-900 tracking-tight text-center">
                    Opening Your Task
                </h3>

                <div class="mt-4 space-y-3 bg-slate-50/90 border border-slate-200/70 rounded-2xl p-3.5">
                    <div class="flex items-center gap-3 text-xs font-semibold text-emerald-700" data-tr-step="1">
                        <span class="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <i class="fa-solid fa-indian-rupee-sign text-[11px]"></i>
                        </span>
                        <span>Verifying your payout</span>
                    </div>
                    <div class="flex items-center gap-3 text-xs font-bold text-slate-900" data-tr-step="2">
                        <span class="tr-icon-active w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <i class="fa-solid fa-building-columns text-[11px]"></i>
                        </span>
                        <span>Securing your bank details</span>
                    </div>
                    <div class="flex items-center gap-3 text-xs font-medium text-slate-400" data-tr-step="3">
                        <span class="w-6 h-6 rounded-lg bg-slate-200/70 text-slate-400 flex items-center justify-center shrink-0">
                            <i class="fa-solid fa-lock text-[11px]"></i>
                        </span>
                        <span>Securely redirecting</span>
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
            step2.className = 'flex items-center gap-3 text-xs font-semibold text-emerald-700';
            const badge2 = step2.querySelector('span');
            if (badge2) badge2.className = 'w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0';
        }

        const step3 = overlay.querySelector('[data-tr-step="3"]');
        if (step3) {
            step3.className = 'flex items-center gap-3 text-xs font-bold text-slate-900';
            const badge3 = step3.querySelector('span');
            if (badge3) badge3.className = 'tr-icon-active w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0';
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
