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


v12:
- En Rotación ahora es curaduría musical / Now Playing, no otra lista de noticias.
- Mobile: controles del carrusel forzados dentro del contenedor.
- Mobile: destacadas y eventos tienen el mismo ancho.
- Mobile: New Topics compacto, horizontal y sin imagen.


v13:
- En Rotación ahora tiene 5 selecciones.
- Al hacer clic en una selección se actualiza el visor izquierdo.
- El botón ahora dice LEER y abre una reseña/artículo del álbum o selección.
- Se agregaron artículos de reseña en data.js.


v14:
- En Rotación ahora muestra portada visual del álbum/reseña.
- El botón LEER se posicionó en la esquina inferior derecha del viewer.


v15:
- Eliminado el icono/símbolo encima de la portada del álbum en En Rotación.


v16:
- Mobile: dots del carrusel más pequeños.
- Mobile: New Topics recupera imagen de fondo con degradado y preview text.
- Todas las News: se eliminó número izquierdo.
- Todas las News mantiene degradado de imagen.


v17:
- Los hashtags ahora abren news.html filtrando por ese hashtag.
- Mobile: la imagen de cada nota cubre todo el contenedor con degradado.
- Desktop News: las imágenes del archivo tienen el mismo desvanecido estético que New Topics.


v18:
- Página Todas las News centrada a 4/6 del ancho.
- Corregido desvanecido de imagen en News para que no se vea división.
- Menú actualizado: Home, News, Eventos, Tags.


v19:
- Agregado panel /admin.
- Tres accesos: Contenido Hero, Artículos y Eventos.
- Artículos: crear, editar y eliminar.
- Eventos: crear, editar y eliminar.
- Contenido Hero: seleccionar destacadas, New Topics y En Rotación.
- Exportación JSON para preparar integración con GitHub/Decap.
IMPORTANTE: por ser GitHub Pages estático, este admin guarda en localStorage y exporta JSON; para publicar directo al repo se requiere conectar Decap CMS o GitHub API.


v20:
- Eventos elimina automáticamente eventos pasados al abrir el admin.
- Artículos ahora tiene búsqueda.
- Artículos tiene tabs: Todos, Publicados y No publicados.
- Artículos permite programar publicación por fecha/hora.
- Artículos tiene switch Publicado/No publicado.
- Contenido Hero: Destacadas y En Rotación usan popup con búsqueda + últimos 10 artículos.
- New Topics ahora toma automáticamente las últimas 10 entradas publicadas.
- En Rotación filtra solo artículos con categoría RESEÑA.


v21:
- Destacadas ahora permite de 3 a 5 artículos.
- Cada destacada tiene botón X para eliminarla cuando hay más de 3.
- Botón Agregar destacada abre selector con búsqueda.
- Parámetro automático para usar diariamente los 3 artículos más recientes como destacadas.
- Categorías agregadas: Concurso, Arte, Podcast, Highlight.


v22:
- Destacadas ahora permite reordenar con botones ↑ / ↓.
- Artículos se mantienen ordenados del más reciente al más antiguo.
- Estado de artículo ahora es texto simple, no burbuja verde.


v23:
- Eliminados botones de subir/bajar en Destacadas.
- Reordenamiento de Destacadas con drag & drop.
- Agregado login al admin.
- Usuario: wolffel
- Password: okcomputer
Nota: este login es protección visual/client-side; para producción real debe conectarse a auth del CMS/GitHub.


v23b:
- Corregido bug visual donde el admin colapsaba hacia la izquierda.
- Restaurado layout correcto del contenido principal.


v23c:
- Login ahora aparece como pantalla completa real.
- El admin queda oculto hasta iniciar sesión.
- Se evita entrada automática por sesiones previas del navegador.


v24:
- Login conectado a Firebase Authentication.
- Eliminados usuario/password hardcodeados.
- Sesión real mediante Firebase Auth.
- El panel permanece oculto hasta autenticar correctamente.

IMPORTANTE:
- Usa el EMAIL del usuario creado en Firebase Auth.
- Ya no uses "wolffel", ahora usa el email registrado.


v25:
- Admin conectado a Firestore.
- Sitio público lee contenido desde Firestore.
- Incluye firestore.rules y FIREBASE_SETUP.txt.


v26:
- Corrección crítica: el sitio público ahora usa ORBITA_ARTICLES desde Firestore en lugar del const ARTICLES de data.js.
- Antes Firebase sí podía cargar artículos, pero la web seguía leyendo el fallback local.
- Agregado console.info para verificar cuántos artículos se cargan desde Firebase.


v27:
- Corrección pública completa: script.js ahora sí espera cargar Firestore antes de renderizar.
- Home, News, Article y Events usan ORBITA_ARTICLES/ORBITA_EVENTS/ORBITA_HERO si existen.
- El fallback data.js solo se usa si Firestore falla o no tiene datos.


v28:
- Corrección final del sitio público para Firestore.
- El sitio ya no muestra data.js si Firebase carga correctamente.
- Se removió ADMIN del menú público.
- Carga pública sin orderBy para evitar fallos por campos faltantes.
- Console log: "Órbita Firebase loaded" muestra cuántos artículos/eventos cargó.
