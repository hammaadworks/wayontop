PINS: Public Infrastructure Navigation System

Navigating India's massive public infrastructure is broken.

Take Bengaluru's 240-acre Lalbagh Botanical Garden. Google Maps fails inside, signage is inadequate, and the official website offers little to no practical wayfinding. 

With over 4 million annual visitors, and a quarter being first-time tourists, getting lost can mean wasted time, effort, and a frustrating experience. Unbiased AI research surfaced the same pain point and my on-ground interviews validated it. 92% of visitors said they needed a reliable map.

PINS is a mobile-first, offline-resilient, multilingual and accessible navigation engine built for public spaces. Starting with Lalbagh (www.lalbagh.top), visitors get turn-by-turn AR arrow guide to their route.

But PINS goes beyond navigation. Authorities get crowd management and event tools, while visitors can explore playing Pokemon Go style stamp hunts and track walks like Strava. I built a custom mapping tool that makes digitising and maintaining infrastructure simple for officials. 

Under the hood, PINS combines A* algorithm for routing, polyline edges to avoid data bloat, R-trees for spatial indexing, Web Workers to offload computation, and aggressive prefetching to work offline, comfortably supporting 10K+ nodes. Codex drove the implementation while I directed the architecture.

The outcome is simple: save time, money, and effort; improve safety; and eliminate the anxiety of not knowing where you are!

Lalbagh is the proving ground. PINS can eventually map India's hospitals, metros, universities, and other public infrastructure, putting navigation back in citizens' hands.