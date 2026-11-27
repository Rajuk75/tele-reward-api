/**
 * Reusable "More ways to earn" Section Component
 * Renders into any <section id="moreWaysSection"></section> container.
 */
function renderMoreWaysToEarn(options = {}) {
    const container = document.getElementById('moreWaysSection');
    if (!container) return;

    const showSpin = options.spinEnabled !== false;
    const gridCols = showSpin ? 'grid-cols-3' : 'grid-cols-2';

    container.innerHTML = `
        <div class="bg-transparent py-1">
            <h2 class="mb-2.5 flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                <span aria-hidden="true">🔥</span>
                <span>More ways to earn</span>
            </h2>
            <div class="grid ${gridCols} gap-2">
                <!-- 1. Join Telegram -->
                <a href="https://t.me/CashExpressOfficial" target="_blank" rel="noopener noreferrer"
                    class="relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-blue-100 bg-blue-50/80 px-2 py-3 text-center transition hover:bg-blue-50">
                    <span class="grid size-9 shrink-0 place-items-center rounded-full bg-sky-500 text-white text-lg shadow-xs">
                        <i class="fa-brands fa-telegram" aria-hidden="true"></i>
                    </span>
                    <p class="text-[11px] font-bold text-slate-900 leading-tight">Join Telegram</p>
                </a>

                ${showSpin ? `<!-- 2. Daily Spin -->
                <button type="button" id="moreWaysSpinBtn"
                    class="relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-rose-100 bg-rose-50/70 px-2 py-3 text-center transition hover:bg-rose-50 cursor-pointer">
                    <span class="grid size-9 shrink-0 place-items-center text-rose-500 text-2xl">
                        <i class="fa-solid fa-gift" aria-hidden="true"></i>
                    </span>
                    <p class="text-[11px] font-bold text-slate-900 leading-tight">Daily Spin</p>
                </button>` : ''}

                <!-- 3. Complete Tasks -->
                <button type="button" id="moreWaysTasksBtn"
                    class="relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-2 py-3 text-center transition hover:bg-emerald-50 cursor-pointer">
                    <span class="grid size-9 shrink-0 place-items-center text-emerald-500 text-2xl">
                        <i class="fa-regular fa-calendar-check" aria-hidden="true"></i>
                    </span>
                    <p class="text-[11px] font-bold text-slate-900 leading-tight">Complete Tasks</p>
                </button>
            </div>
        </div>
    `;

    document.getElementById('moreWaysSpinBtn')?.addEventListener('click', () => {
        if (window.taskApp && typeof window.taskApp.openPreSpinModal === 'function') {
            const offer = window.taskApp.currentOffer;
            if (offer?.spinSettings?.enabled && !offer?.spinStatus?.alreadySpun) {
                window.taskApp.openPreSpinModal();
                return;
            }
        }
        const strip = document.getElementById('spinBonusStrip');
        if (strip && !strip.hidden) {
            strip.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            window.location.href = '/status';
        }
    });

    document.getElementById('moreWaysTasksBtn')?.addEventListener('click', () => {
        const steps = document.getElementById('stepsSection');
        if (steps && !steps.hidden) {
            steps.open = true;
            steps.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            window.location.href = '/status';
        }
    });
}

window.renderMoreWaysToEarn = renderMoreWaysToEarn;
document.addEventListener('DOMContentLoaded', () => renderMoreWaysToEarn());
