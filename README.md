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

El panel está en `/admin/`, pero todavía no está listo para guardar cambios en GitHub: su configuración usa valores de ejemplo y el backend de pruebas de Decap CMS.

Antes de usarlo para publicar entradas hay que configurar el repositorio correcto y la autenticación OAuth del CMS. No pongas secretos ni contraseñas en `admin/config.yml`; la autenticación debe configurarse siguiendo el método seguro que se elija para el proyecto.

## Funciones aún pendientes

- El formulario de newsletter está desactivado hasta conectar el servicio y su formulario.
- Los comentarios están desactivados hasta completar la configuración de Giscus.
- La agenda muestra un aviso mientras se incorporan actividades.

## Comprobar la compilación

Para generar la web sin iniciar el servidor local:

```powershell
bundle exec jekyll build
```

Si la compilación termina sin errores, los archivos generados estarán en `_site/`.
