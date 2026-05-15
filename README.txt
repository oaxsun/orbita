# Órbita Web v2

Archivos incluidos:
- index.html: home
- article.html: página de artículo/post
- styles.css: diseño responsive, modo claro/oscuro, cursor y layout
- script.js: hashtags, filtros, toggle de tema, cursor, render de artículos
- data.js: base de datos temporal de artículos

Para verlo:
1. Descomprime el ZIP.
2. Abre index.html en Chrome.
3. Haz clic en un hashtag para filtrar artículos.
4. Haz clic en una nota para abrir article.html.

Tema:
- Se activa oscuro automáticamente de 7 PM a 7 AM.
- Se activa claro automáticamente de 7 AM a 7 PM.
- El botón de tema guarda tu preferencia en localStorage.

Cómo agregar artículos por ahora:
Edita data.js y duplica un objeto dentro de ARTICLES.

Siguiente paso recomendado:
Conectar un CMS headless como Sanity, Strapi, Directus o Decap CMS para no subir artículos manualmente a GitHub.


v3:
- Barra de hashtags solo con temas musicales.
- Botón de búsqueda eliminado.
- Cursor custom tipo flecha.
- Barra de últimas noticias rosa, con hover en contraste.
- Hero con noticia destacada + dos rectángulos verticales: Lo más leído y Agenda.


v4:
- Cursor regresado a normal.
- Barra de últimas noticias eliminada.
- Hero vuelve al estilo más grande/limpio de la versión anterior.
- Panel lateral reducido a un solo rectángulo de Agenda.
- Ranking y Escenas reemplazados por En Rotación + Newsletter.


v5:
- Noticias destacadas ahora es un carrusel ancho de 3 notas principales.
- Cambia automáticamente cada 15 segundos.
- También se puede deslizar con mouse/touch o usar flechas/dots.
- NEW TOPICS ahora muestra 5 noticias con estilo de recuadro destacado.
- Botón 'Ver más noticias' abre news.html con la lista completa.
- En Rotación y Newsletter se conservaron.


v6:
- Noticias destacadas ocupa 3/5 del ancho.
- Eventos ocupa 2/5 del ancho a la derecha.
- Eventos muestra 5 próximos eventos y botón dentro del contenedor.
- No se modificaron New Topics, En Rotación ni Newsletter.


v7:
- Destacadas ocupa 4/5 del ancho.
- Eventos ocupa 1/5 del ancho.
- Eventos reducido a 4 próximos eventos en home.
- Botón Ver más eventos abre events.html.
- Arreglados controles del carrusel para no salirse del contenedor.
- En artículo: Relacionados cambió a Lo más leído.
- Kicker NOTICIA ahora tiene color visible en modo claro.


v9:
- Hero completo centrado a 4/6 del ancho en desktop.
- Dentro del hero: destacadas ocupa 3/6 y eventos 1/6.
- New Topics, En Rotación y Newsletter también ocupan 4/6 del ancho.


v10: Ajustes de destacadas, New Topics y página de eventos.


v11:
- Mobile: controles del carrusel más pequeños y dentro del contenedor.
- Mobile: botón Leer Artículo separado del preview text.
- Mobile: panel de eventos más limpio.
- Desktop: imagen de New Topics con difuminado más estético.
