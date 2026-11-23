/**
 * Shared App Navigation Component (Option 1: Native Mobile App Standard)
 * - Mobile (< md): Clean Top Header (Logo + Bell) + Bottom Navigation Tabs (Offer, Track, Refer).
 * - Desktop (>= md): Top Header has Logo + Center Nav Tabs + Bell (Bottom bar hidden).
 */
function renderAppNavigation(activeTab = 'offer') {
    const isOfferActive = activeTab === 'offer' || activeTab === 'home';
    const isTrackActive = activeTab === 'track' || activeTab === 'status';
    const isReferActive = activeTab === 'refer';

    // 1. Top Bar
    const header = document.getElementById('appHeader');
    if (header) {
        header.className = 'bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm';

        const desktopOfferClass = isOfferActive
            ? 'bg-slate-100 text-slate-900 border border-slate-200/80 font-bold'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold';

        const desktopTrackClass = isTrackActive
            ? 'bg-slate-100 text-slate-900 border border-slate-200/80 font-bold'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold';

        const desktopReferClass = isReferActive
            ? 'bg-slate-100 text-slate-900 border border-slate-200/80 font-bold'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold';

        header.innerHTML = `
            <div class="max-w-md mx-auto px-4 py-3 min-h-[56px] flex items-center justify-between">
                <!-- Brand Logo -->
                <a href="/" class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white text-xs shadow-sm">
                        <i class="fa-solid fa-bolt text-emerald-400"></i>
                    </div>
                    <span class="font-black text-slate-900 tracking-tight text-sm">adsHamper</span>
                </a>

                <!-- Desktop Nav Links (Hidden on mobile, visible on desktop/tablet) -->
                <nav class="hidden md:flex items-center gap-1 text-xs">
                    <a href="/" class="px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${desktopOfferClass}">
                        <i class="fa-solid fa-house text-[11px] text-slate-400"></i>
                        <span>Offer</span>
                    </a>
                    <a href="/status" class="px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${desktopTrackClass}">
                        <i class="fa-solid fa-chart-simple text-[11px] ${isTrackActive ? 'text-emerald-600' : 'text-slate-400'}"></i>
                        <span>Track</span>
                    </a>
                </nav>

                <!-- Notification Bell -->
                <button type="button" aria-label="Notifications" class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 transition cursor-pointer">
                    <i class="fa-regular fa-bell text-sm"></i>
                </button>
            </div>
        `;
    }

    // 2. Bottom Floating Navigation Bar (Mobile Only: md:hidden)
    const bottomNav = document.getElementById('appBottomNav');
    if (bottomNav) {
        const offerClass = isOfferActive
            ? 'bg-emerald-100/80 text-emerald-900 font-bold'
            : 'text-slate-400 hover:text-slate-600 font-medium';

        const trackClass = isTrackActive
            ? 'bg-emerald-100/80 text-emerald-900 font-bold'
            : 'text-slate-400 hover:text-slate-600 font-medium';

        const referClass = isReferActive
            ? 'bg-emerald-100/80 text-emerald-900 font-bold'
            : 'text-slate-400 hover:text-slate-600 font-medium';

        bottomNav.innerHTML = `
            <div class="max-w-md mx-auto px-6 py-2 flex items-center justify-around">
                <a href="/" class="flex flex-col items-center justify-center py-1.5 px-6 rounded-2xl transition ${offerClass}">
                    <i class="fa-solid fa-house text-sm"></i>
                    <span class="text-[10px] mt-0.5 tracking-tight">Offer</span>
                </a>

                <a href="/status" class="flex flex-col items-center justify-center py-1.5 px-6 rounded-2xl transition ${trackClass}">
                    <i class="fa-solid fa-chart-simple text-sm"></i>
                    <span class="text-[10px] mt-0.5 tracking-tight">Track</span>
                </a>
            </div>
        `;
    }
}

// Auto mount on DOM load
document.addEventListener('DOMContentLoaded', () => {
    const bottomNav = document.getElementById('appBottomNav');
    const tab = bottomNav?.getAttribute('data-active-tab') || 'offer';
    renderAppNavigation(tab);
});
