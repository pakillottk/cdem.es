// Swiper expone los CSS via su "exports" map pero sin tipos; estos imports de
// efecto solo cargan estilos, así que basta declararlos como módulos vacíos.
declare module 'swiper/css';
declare module 'swiper/css/navigation';
declare module 'swiper/css/pagination';
