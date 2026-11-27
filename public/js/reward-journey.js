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
        .map((label, idx) => `
            <li${idx === 0 ? ' aria-current="step"' : ''}>
                <span class="journey-number">${idx + 1}</span>
                ${escapeHtml(label)}
            </li>
        `)
        .join('');

    container.innerHTML = `
        <div class="journey" aria-labelledby="journeyHeading">
            <h2 id="journeyHeading">Your reward journey</h2>
            <ol>${stepItems}</ol>
            <p>Click Continue to start your reward journey.</p>
        </div>
    `;
}
window.renderRewardJourney = renderRewardJourney;
