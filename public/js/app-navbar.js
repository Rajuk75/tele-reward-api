function renderAppNavigation() {
    const header = document.getElementById('appHeader');
    if (!header) return;

    const tracking = header.dataset.activeTab === 'track';
    header.innerHTML = `
        <nav aria-label="Main navigation" class="max-w-md mx-auto px-4 py-2 min-h-[56px] flex items-center justify-between">
            <a href="/" aria-label="adsHamper home" class="min-h-11 flex items-center">
                <img src="/logo/adshamper_logo-removebg-preview.png" alt="adsHamper"
                    width="168" height="40" class="w-[168px] h-10 object-cover object-[center_75%]">
            </a>
            <a href="/status" aria-label="Track earnings" title="Track earnings" ${tracking ? 'aria-current="page"' : ''}
                class="w-11 h-11 grid place-items-center rounded-xl ${tracking ? 'bg-emerald-950 text-emerald-300' : 'text-white hover:bg-neutral-800'}">
                <i class="fa-solid fa-chart-simple text-[24px] leading-none" aria-hidden="true"></i>
            </a>
        </nav>
    `;
}

document.addEventListener('DOMContentLoaded', renderAppNavigation);
