/**
 * Aparición de las tarjetas de festivales al hacer scroll (Intersection Observer).
 * Cuando el listado entra en vista, se añade la clase is-visible a todas las tarjetas;
 * el retardo escalonado se define en eventos.css.
 */
function initEventosScroll() {
	const list = document.getElementById('eventos-festivales-list');
	if (!list) return;

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					list.querySelectorAll('.eventos-festival-card').forEach((el) => {
						el.classList.add('is-visible');
					});
				}
			});
		},
		{ rootMargin: '0px 0px -40px 0px', threshold: 0.1 }
	);
	observer.observe(list);
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initEventosScroll);
} else {
	initEventosScroll();
}
