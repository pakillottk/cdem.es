/**
 * Aparición de las tarjetas de festivales/conciertos al hacer scroll (Intersection Observer).
 * Cuando cada listado entra en vista, se añade la clase is-visible a sus tarjetas;
 * el retardo escalonado se define en eventos.css.
 */
function initEventosScroll() {
	const lists = document.querySelectorAll('.eventos-festivales-list');
	if (!lists.length) return;

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.querySelectorAll('.eventos-festival-card').forEach((el) => {
						el.classList.add('is-visible');
					});
				}
			});
		},
		{ rootMargin: '0px 0px -40px 0px', threshold: 0.1 }
	);

	lists.forEach((list) => observer.observe(list));
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initEventosScroll);
} else {
	initEventosScroll();
}
