/**
 * Aparición/desaparición de las tarjetas de servicios según scroll (Intersection Observer con histéresis).
 */
function initServicesScroll() {
	const THRESHOLD_IN = 0.2;
	const THRESHOLD_OUT = 0.05;

	document.querySelectorAll('.services-flow-card').forEach((el) => {
		const io = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					const ratio = entry.intersectionRatio;
					if (ratio >= THRESHOLD_IN) {
						entry.target.classList.add('is-visible');
					} else if (ratio < THRESHOLD_OUT) {
						entry.target.classList.remove('is-visible');
					}
				});
			},
			{
				threshold: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.5, 0.75, 1],
				rootMargin: '0px 0px -40px 0px',
			}
		);
		io.observe(el);
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initServicesScroll);
} else {
	initServicesScroll();
}
