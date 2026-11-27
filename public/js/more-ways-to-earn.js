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
            <h2 class="mb-2.5">More ways to earn</h2>
            <div class="grid ${gridCols} gap-2">
                <!-- 1. Join Telegram -->
                <a href="https://t.me/CashExpressOfficial" target="_blank" rel="noopener noreferrer"
                    class="earn-card">
                    <i class="fa-brands fa-telegram text-sky-600" aria-hidden="true"></i>
                    <span>Join Telegram</span>
                </a>

                ${showSpin ? `<!-- 2. Daily Spin -->
                <button type="button" id="moreWaysSpinBtn"
                    class="earn-card">
                    <i class="fa-solid fa-gift text-rose-500" aria-hidden="true"></i>
                    <span>Daily Spin</span>
                </button>` : ''}

                <!-- 3. Track Task -->
                <a href="/status"
                    class="earn-card">
                    <i class="fa-solid fa-list-check text-emerald-600" aria-hidden="true"></i>
                    <span>Track Task</span>
                </a>
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

}

window.renderMoreWaysToEarn = renderMoreWaysToEarn;
document.addEventListener('DOMContentLoaded', () => renderMoreWaysToEarn());
