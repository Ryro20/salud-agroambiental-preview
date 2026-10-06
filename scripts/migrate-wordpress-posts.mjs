import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const postsDirectory = join(root, "_posts");
const mediaDirectory = join(root, "assets", "img", "blog", "wordpress");
const apiUrl = "https://public-api.wordpress.com/rest/v1.1/sites/saludagroambiental.org/posts/";
const applyChanges = process.argv.includes("--apply");
const allowedImageHosts = new Set([
  "saludagroambiental.org",
  "www.saludagroambiental.org",
  "saludagroambiental.wordpress.com",
  "saludagroambiental.files.wordpress.com",
]);
const fallbackTitles = new Map([
  [2338, "Un paseo recogiendo residuos por el barrio Oliver"],
  [1789, "Campañas para dar una segunda vida a los residuos"],
  [940, "Recogida de cepillos de dientes para reciclar"],
]);

function decodeEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    nbsp: " ",
    gt: ">",
    lt: "<",
    quot: '"',
    hellip: "…",
    ndash: "–",
    mdash: "—",
    ldquo: "“",
    rdquo: "”",
    lsquo: "‘",
    rsquo: "’",
  };

  return value
    .replace(/&#(?:x([0-9a-f]+)|(\d+));?/gi, (entity, hex, decimal) => {
      const codePoint = Number.parseInt(hex || decimal, hex ? 16 : 10);
      return Number.isFinite(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    })
    .replace(/&([a-z]+);/gi, (entity, name) => named[name.toLowerCase()] ?? entity);
}

function plainText(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .replace(/\s*\[?…\]?\s*$/, "")
    .trim();
}

function yamlString(value) {
  return JSON.stringify(value ?? "");
}

function mapCategory(categories) {
  const names = categories.map(({ name }) => name.toLocaleLowerCase("es")).join(" ");
  if (/(educación ?ambiental|educaciónambiental)/u.test(names)) return "Educación ambiental";
  if (names.includes("animal")) return "Bienestar animal";
  if (names.includes("agroecología")) return "Agroecología";
  if (names.includes("naturaleza")) return "Naturaleza";
  if (/(residu|recicl|tap[oó]n|basuraleza)/u.test(names)) return "Residuos y reciclaje";
  if (/(charla|taller|campa[nñ]|proyecto|actividad|voluntariado)/u.test(names)) return "Actividades";
  if (names.includes("asociación")) return "Asociación";
  return "Actualidad";
}

function mediaReference(value) {
  if (!value) return null;

  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (!allowedImageHosts.has(url.hostname) || !url.pathname.includes("/wp-content/uploads/")) {
    return null;
  }

  const relativePath = url.pathname.split("/wp-content/uploads/")[1]
    .split("/")
    .map((part) => decodeURIComponent(part))
    .filter(Boolean);
  if (relativePath.length < 3 || relativePath.some((part) => part === "." || part === "..")) {
    throw new Error(`Ruta de imagen no válida: ${value}`);
  }

  const safePath = relativePath.map((part) => part.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_"));
  const diskPath = join(mediaDirectory, ...safePath);
  const publicPath = `/assets/img/blog/wordpress/${safePath.join("/")}`
    .split("/")
    .map((part, index) => index === 0 ? part : encodeURIComponent(part))
    .join("/");
  url.search = "";
  url.searchParams.set("w", "1200");
  url.hash = "";
  return { sourceUrl: url.href, diskPath, publicPath };
}

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

function setAttribute(tag, name, value) {
  const expression = new RegExp(`\\s${name}\\s*=\\s*(?:\"[^\"]*\"|'[^']*'|[^\\s>]+)`, "i");
  if (expression.test(tag)) {
    return tag.replace(expression, ` ${name}="${value}"`);
  }
  return tag.replace(/\/?>$/, (ending) => ` ${name}="${value}"${ending}`);
}

function liquidUrl(publicPath) {
  return `{{ '${publicPath}' | relative_url }}`;
}

function postFilename(post) {
  const date = post.date.slice(0, 10);
  const slug = decodeURIComponent(post.slug)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !slug || slug.startsWith("-") || slug.endsWith("-")) {
    throw new Error(`Fecha o slug no válido para la entrada ${post.ID}.`);
  }
  return join(postsDirectory, `${date}-${slug}.html`);
}

function postTitle(post) {
  const title = decodeEntities(post.title).trim();
  if (title) return title;
  const fallback = fallbackTitles.get(post.ID);
  if (!fallback) throw new Error(`La entrada ${post.ID} no tiene título; revísala antes de migrar.`);
  return fallback;
}

function sourcePath(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

function removeDuplicateCover(content, featuredImage) {
  const featuredPath = sourcePath(featuredImage);
  if (!featuredPath) return content;
  let removed = false;

  return content.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, (figure) => {
    if (removed) return figure;
    const image = figure.match(/<img\b[^>]*>/i)?.[0];
    if (!image) return figure;
    const source = getAttribute(image, "data-orig-file") || getAttribute(image, "src");
    if (sourcePath(source) !== featuredPath) return figure;
    removed = true;
    return "";
  });
}

function simplifySiteEmbeds(content) {
  return content.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, (figure) => {
    if (!figure.includes("wp-embedded-content")) return figure;
    const iframe = figure.match(/<iframe\b[^>]*>/i)?.[0];
    const link = figure.match(/<a\b[^>]*>[\s\S]*?<\/a>/i)?.[0];
    if (!iframe || !link) return figure;

    let hostname;
    try {
      hostname = new URL(getAttribute(iframe, "src")).hostname;
    } catch {
      return figure;
    }
    if (!["saludagroambiental.org", "www.saludagroambiental.org"].includes(hostname)) {
      return figure;
    }
    return `<p>${link}</p>`;
  });
}

function transformContent(post, localMedia) {
  let content = simplifySiteEmbeds(removeDuplicateCover(post.content, post.featured_image))
    .replace(/\{\{/g, "&#123;{")
    .replace(/\{%/g, "&#123;%");

  content = content.replace(/<img\b[^>]*>/gi, (tag) => {
    const original = getAttribute(tag, "data-orig-file") || getAttribute(tag, "src");
    const media = mediaReference(original);
    if (!media) return tag;
    localMedia.set(media.diskPath, media);
    let updated = tag.replace(
      /\s+(?:srcset|sizes|data-orig-file|data-large-file|data-orig-size|data-attachment-id|data-permalink|data-comments-opened|data-image-title|data-image-description|data-image-caption)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
      "",
    );
    return setAttribute(updated, "src", liquidUrl(media.publicPath));
  });

  return content.replace(
    /https?:\/\/[^/\s"'<>]+\/wp-content\/uploads\/[^"'<>\s)]*/gi,
    (url) => {
      const media = mediaReference(url);
      if (!media) return url;
      localMedia.set(media.diskPath, media);
      return liquidUrl(media.publicPath);
    },
  );
}

function createPostFile(post, localMedia) {
  const filename = postFilename(post);
  const categories = Object.values(post.terms?.category ?? {});
  const tags = Object.values(post.terms?.post_tag ?? {}).map(({ name }) => name);
  const feature = mediaReference(post.featured_image);
  if (feature) localMedia.set(feature.diskPath, feature);

  const featuredAttachment = Object.values(post.attachments ?? {}).find(
    (attachment) => sourcePath(attachment.URL) === sourcePath(post.featured_image),
  );
  const excerpt = plainText(post.excerpt) || plainText(post.content).slice(0, 280);
  const permalink = new URL(post.URL).pathname;
  const frontmatter = [
    "---",
    "layout: post",
    `title: ${yamlString(postTitle(post))}`,
    `date: ${yamlString(new Date(post.date).toISOString())}`,
    `permalink: ${yamlString(permalink.endsWith("/") ? permalink : `${permalink}/`)}`,
    `excerpt: ${yamlString(excerpt)}`,
    "categories:",
    `  - ${yamlString(mapCategory(categories))}`,
    ...(tags.length
      ? ["tags:", ...tags.map((tag) => `  - ${yamlString(decodeEntities(tag))}`)]
      : ["tags: []"]),
    `author: ${yamlString(decodeEntities(post.author?.name || "Salud Agroambiental"))}`,
    ...(feature ? [`image: ${yamlString(feature.publicPath)}`] : []),
    ...(feature ? [`image_alt: ${yamlString(decodeEntities(featuredAttachment?.alt || post.title))}`] : []),
    "featured: false",
    "newsletter: false",
    "show_share: true",
    "show_comments: false",
    ...(post.modified && new Date(post.modified).getTime() > new Date(post.date).getTime()
      ? [`modified_date: ${yamlString(new Date(post.modified).toISOString())}`]
      : []),
    `wordpress_id: ${post.ID}`,
    `source_url: ${yamlString(post.URL)}`,
    "---",
  ].join("\n");

  const content = transformContent(post, localMedia).replace(/(?:\r?\n)+$/g, "");
  return { filename, content: `${frontmatter}\n${content}\n` };
}

async function fetchPosts() {
  const posts = [];
  let page = 1;
  let found = Number.POSITIVE_INFINITY;

  while (posts.length < found) {
    const response = await fetch(`${apiUrl}?number=100&page=${page}`);
    if (!response.ok) throw new Error(`WordPress API respondió ${response.status} en la página ${page}.`);
    const data = await response.json();
    if (!Array.isArray(data.posts) || !Number.isInteger(data.found)) {
      throw new Error("La respuesta de la API de WordPress no tiene el formato esperado.");
    }
    found = data.found;
    posts.push(...data.posts);
    page += 1;
    if (data.posts.length === 0 && posts.length < found) {
      throw new Error("La API de WordPress devolvió una página vacía antes de completar la migración.");
    }
  }

  const publishedPosts = posts.filter((post) => post.status === "publish" && post.type === "post");
  if (publishedPosts.length !== found) {
    throw new Error(`Se esperaban ${found} entradas publicadas y se recibieron ${publishedPosts.length}.`);
  }
  return publishedPosts;
}

async function downloadMedia(media) {
  try {
    await stat(media.diskPath);
    return null;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  let response = await fetch(media.sourceUrl);
  if (response.status === 404 && new URL(media.sourceUrl).searchParams.has("w")) {
    const originalUrl = new URL(media.sourceUrl);
    originalUrl.searchParams.delete("w");
    response = await fetch(originalUrl);
  }
  if (response.status === 404) return media;
  if (!response.ok) throw new Error(`No se pudo descargar ${media.sourceUrl} (${response.status}).`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 50 * 1024 * 1024) {
    throw new Error(`La imagen supera el límite de seguridad de 50 MiB: ${media.sourceUrl}`);
  }
  await mkdir(dirname(media.diskPath), { recursive: true });
  await writeFile(media.diskPath, bytes);
  return null;
}

function removeUnavailableImages(file, missingMedia) {
  let content = file.content;
  for (const media of missingMedia) {
    const reference = liquidUrl(media.publicPath);
    const escapedReference = reference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const imageTag = new RegExp(`<img\\b(?=[^>]*\\bsrc="${escapedReference}")[^>]*>`, "gi");
    content = content.replace(imageTag, "");
    const emptyLink = new RegExp(`<a\\b(?=[^>]*\\bhref="${escapedReference}")[^>]*>\\s*<\\/a>`, "gi");
    content = content.replace(emptyLink, "");
    content = content.replace(new RegExp(`^image: ${yamlString(media.publicPath)}\\r?\\n`, "m"), "");
    content = content.replace(/^image_alt: .*\\r?\n/m, "");
  }
  return { ...file, content };
}

async function run() {
  const posts = await fetchPosts();
  const localMedia = new Map();
  const files = posts.map((post) => createPostFile(post, localMedia));
  const targets = new Set();
  const existing = [];

  for (const { filename } of files) {
    const relativePath = relative(root, filename).split(sep).join("/");
    if (targets.has(relativePath)) throw new Error(`Dos entradas generan el mismo archivo: ${relativePath}`);
    targets.add(relativePath);
    try {
      await readFile(filename);
      existing.push(relativePath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  console.log(`Entradas publicadas encontradas: ${posts.length}`);
  console.log(`Imágenes propias que se copiarán: ${localMedia.size}`);
  console.log(`Archivos ya existentes que no se sobrescribirán: ${existing.length}`);
  if (existing.length) console.log(existing.join("\n"));
  if (!applyChanges) {
    console.log("Simulación completada. Añade --apply para descargar imágenes y crear las entradas.");
    return;
  }
  if (existing.length) {
    throw new Error("No se aplicó la migración porque hay archivos que podrían sobrescribirse.");
  }

  const media = [...localMedia.values()];
  const concurrency = 6;
  const missingMedia = [];
  for (let index = 0; index < media.length; index += concurrency) {
    const results = await Promise.all(media.slice(index, index + concurrency).map(downloadMedia));
    missingMedia.push(...results.filter(Boolean));
    console.log(`Imágenes procesadas: ${Math.min(index + concurrency, media.length)}/${media.length}`);
  }

  if (missingMedia.length) {
    console.warn(`Imágenes no disponibles en la web original: ${missingMedia.length}`);
    for (const missing of missingMedia) console.warn(missing.sourceUrl);
  }

  for (const file of files) {
    const affectedMedia = missingMedia.filter((media) => file.content.includes(liquidUrl(media.publicPath)));
    const outputFile = affectedMedia.length ? removeUnavailableImages(file, affectedMedia) : file;
    const { filename, content } = outputFile;
    await mkdir(dirname(filename), { recursive: true });
    await writeFile(filename, content, "utf8");
  }
  console.log(`Entradas migradas: ${files.length}`);
}

run().catch((error) => {
  console.error("Error al migrar las entradas de WordPress:", error);
  process.exitCode = 1;
});
