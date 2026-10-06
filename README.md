# Salud Agroambiental

Esta es la web de Salud Agroambiental. Está hecha con Jekyll y se publica en GitHub Pages. Aquí tienes los pasos para verla en tu ordenador y para ponerla en marcha en GitHub.

## Antes de empezar

Necesitas:

- Una cuenta de GitHub.
- Git instalado en tu ordenador.
- Ruby 3.3 y Bundler para trabajar con la misma versión que usa la publicación automática.

## Ver la web en tu ordenador

Abre PowerShell dentro de la carpeta del proyecto y ejecuta:

```powershell
bundle install
bundle exec jekyll serve
```

Cuando aparezca el mensaje de que el servidor está listo, abre esta dirección en el navegador:

```text
http://localhost:4000
```

Para detener el servidor, vuelve a PowerShell y pulsa `Ctrl+C`.

Cada vez que guardes un cambio, Jekyll actualiza la web local. Si algo no aparece, actualiza la página del navegador.

## Subir el proyecto a GitHub

1. Crea un repositorio en GitHub.
2. Si quieres publicarlo con GitHub Pages usando una cuenta gratuita, el repositorio tiene que ser público. Eso quiere decir que cualquiera podrá ver también el código y los archivos, no solo la web.
3. En PowerShell, desde la carpeta del proyecto, prepara los archivos y crea el primer commit:

   ```powershell
   git add -A
   git status
   git commit -m "Primera versión de la web"
   ```

4. En GitHub, copia la dirección HTTPS del repositorio desde el botón **Code**. Con esa dirección, conecta la carpeta y sube la rama `main`:

   ```powershell
   git remote add origin https://github.com/USUARIO/NOMBRE-DEL-REPOSITORIO.git
   git push -u origin main
   ```

   Cambia la dirección de ejemplo por la que te muestra GitHub.

Antes de publicar, comprueba con `git status` que no vas a subir contraseñas, claves privadas ni archivos personales. No guardes esos datos en el código.

## Activar GitHub Pages

El proyecto incluye un flujo de GitHub Actions que compila y publica la web cuando se suben cambios a `main`.

1. Abre el repositorio en GitHub y entra en **Settings → Pages**.
2. En **Build and deployment**, elige **GitHub Actions** como fuente.
3. Entra en la pestaña **Actions** para ver cómo avanza la primera publicación. La primera compilación puede tardar unos minutos.
4. Cuando termine correctamente, vuelve a **Settings → Pages** para abrir la dirección de la web.

Cada vez que subas cambios a `main`, GitHub volverá a compilar y actualizar el sitio.

**Importante:** GitHub Pages publica la web para cualquiera en Internet. No es un sitio privado ni basta con no compartir el enlace para protegerlo.

## Dónde están las cosas

- `pages/`: páginas de la web, como contacto, quiénes somos y áreas de trabajo.
- `_posts/`: entradas del blog.
- `_layouts/` y `_includes/`: plantillas y piezas compartidas, como la cabecera y el pie.
- `assets/css/`: estilos de la web.
- `assets/js/`: comportamiento de la web.
- `assets/img/`: imágenes.
- `admin/`: panel preparado para editar entradas.
- `.github/workflows/pages.yml`: instrucciones que usa GitHub Actions para compilar y publicar.

La carpeta `_site/` contiene la web ya generada. No hace falta subirla: GitHub Actions la construye al publicar.

## Panel de administración

El panel editorial está en `/admin/` y usa Decap CMS para editar entradas del repositorio. La autenticación OAuth ya está desplegada; no publiques secretos ni contraseñas en el repositorio ni en `admin/config.yml`.

Los cambios de una entrada no se escriben en GitHub hasta que se confirma su publicación. Comprueba el mensaje de cambios guardados antes de salir del editor.

## Funciones aún pendientes

- El formulario de newsletter permanece desactivado en `_config.yml` hasta crear y probar un formulario de suscripción de Brevo. No basta con activar `newsletter.enabled`: el endpoint y los nombres de campos deben corresponder al formulario real. Antes de recopilar correos, completa y revisa la política de privacidad, el consentimiento y la baja de suscripción.
- Los comentarios usan una integración propia preparada con Firebase Authentication (proveedor Google) y Cloud Firestore. Sigue desactivada en `_config.yml`; para prepararla, crea un proyecto Firebase en el plan Spark, habilita Google en Authentication, crea Firestore y añade el dominio publicado a los dominios autorizados de Authentication. Despliega las reglas y el índice con `firebase deploy --only firestore:rules,firestore:indexes`, y copia `apiKey`, `authDomain`, `projectId` y `appId` de la app web de Firebase a `site.comments` en `_config.yml`. Son valores de configuración públicos, no secretos; la protección de datos depende de `firestore.rules`. Antes de poner `comments.enabled: true`, completa y revisa la política de privacidad. Los comentarios se publican inmediatamente y el nombre de Google y el texto son públicos. Los documentos públicos de comentarios no guardan el correo ni el UID, pero Firebase Authentication procesa la cuenta de Google para iniciar sesión. Solo se permite crear comentarios con Google autenticado; la eliminación/moderación se hace desde Firebase Console. El inicio de sesión reduce el spam, pero no lo elimina. Las cuotas gratuitas de Firestore incluyen actualmente 1 GiB almacenado, 50.000 lecturas/día, 20.000 escrituras/día y 10 GiB/mes de salida; no son ilimitadas y Google puede cambiar sus condiciones. No se ha creado ni configurado un proyecto Firebase para este sitio.
- La agenda muestra un aviso mientras se incorporan actividades.

## Migración del blog

Se han importado las 138 entradas públicas disponibles en la API de la web original. El proceso conserva fechas, títulos, categorías y direcciones antiguas; las nuevas entradas también usan el formato de URL histórica con año, mes y día. Copia a `assets/img/blog/wordpress/` las imágenes propias optimizadas a un máximo de 1200 píxeles y mantiene los recursos externos como enlaces externos. Una imagen antigua de la entrada «Premios Ebrópolis 2022» ya no estaba disponible en el origen; se conservó el pie de foto y se omitió esa imagen. Las entradas migradas no activan comentarios automáticamente.

El archivo del blog muestra 12 entradas por página. La migración se puede revisar con `node scripts/migrate-wordpress-posts.mjs` (simulación); `--apply` descarga las imágenes y crea los archivos, pero se detiene si detecta archivos que sobrescribiría.

La política de privacidad se ha ampliado con datos publicados en la web original y con las funciones actuales de este proyecto. Aún quedan datos que la asociación debe confirmar antes de tratarla como definitiva, indicados en la propia página.

## Campos SEO de las entradas

En el panel, el bloque opcional **SEO · buscadores y vista al compartir** permite personalizar el título y la descripción que se incluyen en los metadatos de la página. Si se dejan vacíos, se usan el título y el resumen del artículo. Los buscadores deciden qué texto muestran y en qué posición; completar estos campos no garantiza aparecer primero.

La opción **Ocultar de los resultados de búsqueda (no indexar)** pide a los buscadores que no incluyan la página en sus resultados. No protege el contenido ni lo hace privado.

## Comprobar la compilación

Para generar la web sin iniciar el servidor local:

```powershell
bundle exec jekyll build
```

Si la compilación termina sin errores, los archivos generados estarán en `_site/`.

### Comentarios con Google: configuración de Firebase

1. Crea un proyecto Firebase con el plan Spark gratuito y registra una aplicación web.
2. En **Authentication → Sign-in method**, activa Google. En **Authorized domains**, añade el dominio real del sitio.
3. Crea una base de datos Cloud Firestore. Despliega desde la raíz del repositorio las reglas y el índice versionados aquí:

   ```powershell
   firebase deploy --only firestore:rules,firestore:indexes
   ```

4. Copia la configuración web de Firebase en `comments.api_key`, `comments.auth_domain`, `comments.project_id` y `comments.app_id` de `_config.yml`. Mantén `comments.enabled: false` hasta haber revisado la política de privacidad y probado el flujo en el dominio publicado.
5. Activa `comments.enabled: true` y publica el sitio. Verifica inicio/cierre de sesión, publicación, visualización en otra sesión y eliminación de un comentario de prueba desde Firebase Console.

Las personas comentan con cualquier cuenta Google, no solo direcciones `@gmail.com`. Firestore almacena el nombre público, texto, ruta de la entrada y fecha; los documentos de comentarios no incluyen correo ni UID. Firebase Authentication procesa la cuenta de Google para iniciar sesión. Los comentarios son públicos en cuanto se envían. Las reglas impiden que el cliente edite o borre comentarios; la gestión manual se realiza desde Firebase Console. El inicio de sesión no elimina por completo el riesgo de spam. El formulario pregunta por aceptación de publicación, pero la política de privacidad debe detallar el tratamiento y revisarse antes de activar el servicio. Consulta las cuotas vigentes de [Firebase](https://firebase.google.com/pricing) antes de lanzarlo.
