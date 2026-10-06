(() => {
  const pagination = document.querySelector("[data-blog-pagination]");
  const entries = [...document.querySelectorAll("#blog-entries > .blog-entry")];
  if (!pagination || entries.length <= Number(pagination.dataset.pageSize)) return;

  const pageSize = Number(pagination.dataset.pageSize);
  const totalPages = Math.ceil(entries.length / pageSize);
  const previous = pagination.querySelector("[data-blog-previous]");
  const next = pagination.querySelector("[data-blog-next]");
  const status = pagination.querySelector("[data-blog-pagination-status]");
  const listingTop = document.querySelector(".listing-topline");

  function pageFromUrl() {
    const requested = Number(new URLSearchParams(window.location.search).get("pagina"));
    return Number.isInteger(requested) && requested >= 1 && requested <= totalPages ? requested : 1;
  }

  let currentPage = pageFromUrl();

  function renderPage() {
    const firstEntry = (currentPage - 1) * pageSize;
    const lastEntry = Math.min(firstEntry + pageSize, entries.length);

    entries.forEach((entry, index) => {
      entry.hidden = index < firstEntry || index >= lastEntry;
    });

    previous.disabled = currentPage === 1;
    next.disabled = currentPage === totalPages;
    status.textContent = `Mostrando ${firstEntry + 1}–${lastEntry} de ${entries.length} entradas · Página ${currentPage} de ${totalPages}`;
    pagination.hidden = false;
  }

  function goToPage(page, updateHistory = true) {
    currentPage = Math.min(Math.max(page, 1), totalPages);
    renderPage();

    if (updateHistory) {
      const url = new URL(window.location.href);
      if (currentPage === 1) url.searchParams.delete("pagina");
      else url.searchParams.set("pagina", String(currentPage));
      window.history.pushState({ blogPage: currentPage }, "", url);
    }

    listingTop?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  previous.addEventListener("click", () => goToPage(currentPage - 1));
  next.addEventListener("click", () => goToPage(currentPage + 1));
  window.addEventListener("popstate", () => {
    currentPage = pageFromUrl();
    renderPage();
  });

  renderPage();
})();
