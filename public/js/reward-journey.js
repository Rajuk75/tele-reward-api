/**
 * Reusable "Your reward journey" Stepper Component
 * Renders dynamically from offerData.journeySteps into <section id="rewardJourneySection"></section>.
 */
function renderRewardJourney(steps = []) {
    const container = document.getElementById('rewardJourneySection');
    if (!container) return;

    const cleanSteps = Array.isArray(steps)
        ? steps.map((s) => String(s || '').trim()).filter(Boolean)
        : [];

    if (cleanSteps.length === 0) {
        container.innerHTML = '';
        container.hidden = true;
        return;
    }

    container.hidden = false;

    const escapeHtml = (str) =>
        str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const stepItems = cleanSteps
        .map((label, idx) => {
            const isFirst = idx === 0;
            const circleCls = isFirst
                ? 'bg-violet-600 text-white ring-4 ring-violet-100 shadow-xs font-extrabold'
                : 'border border-slate-200 bg-slate-100 text-slate-500 font-bold';
            const labelCls = isFirst
                ? 'font-bold text-violet-600'
                : 'font-medium text-slate-500';

            return `
                <li class="flex flex-col items-center gap-1.5 min-w-0">
                    <span class="grid size-8 place-items-center rounded-full text-xs ${circleCls}">${idx + 1}</span>
                    <span class="text-[11px] leading-tight truncate max-w-full ${labelCls}" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
                </li>
            `;
        })
        .join('');

    container.innerHTML = `
        <div class="rounded-[22px] border border-[#e2e8f0] bg-white p-5 shadow-xs" aria-labelledby="journeyHeading">
            <div>
                <h2 id="journeyHeading" class="text-[15px] font-extrabold text-slate-900 leading-tight">Your reward journey</h2>
            </div>

            <div class="relative mt-5 px-1">
                <div class="absolute top-4 left-5 right-5 h-0.5 bg-slate-200" aria-hidden="true"></div>
                <ol class="relative grid gap-1 text-center" style="grid-template-columns: repeat(${cleanSteps.length}, minmax(0, 1fr));">
                    ${stepItems}
                </ol>
            </div>

            <p class="mt-4 text-center text-xs text-slate-500">Click Continue to start your reward journey.</p>
        </div>
    `;
}

window.renderRewardJourney = renderRewardJourney;
