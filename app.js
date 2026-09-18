(() => {
  const pageFullscreen = document.getElementById("pageFullscreen");
  const search = document.getElementById("gameSearch");
  const cards = [...document.querySelectorAll(".game-card")];
  const categoryFilters = document.getElementById("categoryFilters");
  if (!categoryFilters || categoryFilters.children.length) return;
  const gameCount = document.getElementById("gameCount");
  const gameSort = document.getElementById("gameSort");
  const menuButton = document.getElementById("menuButton");
  const mainNav = document.getElementById("mainNav");
  const noResults = document.getElementById("noResults");
  const customGameUrl = document.getElementById("customGameUrl");
  const customGameButton = document.getElementById("customGameButton");
  const customGameStatus = document.getElementById("customGameStatus");
  const favoritesKey = "foprox-favorites";
  const recentKey = "foprox-recent";
  const categoryNames = ["All", "Favorites", "Recent", "Action", "Puzzle", "Racing", "Idle", "Horror", "Multiplayer"];
  let activeCategory = "All";
  let favorites = readList(favoritesKey);
  let recentGames = readList(recentKey);

  function readList(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }

  categoryNames.forEach(category => {
    const button = document.createElement("button");
    button.className = "filter-button" + (category === "All" ? " active" : "");
    button.type = "button";
    button.textContent = category;
    button.dataset.category = category;
    categoryFilters.appendChild(button);
  });

  cards.forEach(card => {
    const title = card.querySelector("h3")?.textContent.trim() || "Game";
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    card.dataset.id = id;
    if (!card.querySelector("[data-favorite]")) {
      const top = card.querySelector(".card-top");
      const badge = top?.querySelector(".badge");
      const favorite = document.createElement("button");
      favorite.className = "favorite-button";
      favorite.type = "button";
      favorite.dataset.favorite = id;
      favorite.textContent = "☆";
      favorite.setAttribute("aria-label", `Add ${title} to favorites`);
      const wrapper = document.createElement("div");
      wrapper.append(favorite);
      if (badge) wrapper.append(" ", badge), badge.remove();
      top?.appendChild(wrapper);
    }
  });

  function saveLists() {
    localStorage.setItem(favoritesKey, JSON.stringify(favorites));
    localStorage.setItem(recentKey, JSON.stringify(recentGames));
  }

  function updateFavoriteButtons() {
    document.querySelectorAll("[data-favorite]").forEach(button => {
      const active = favorites.includes(button.dataset.favorite);
      const title = button.closest(".game-card")?.querySelector("h3")?.textContent.trim() || "game";
      button.classList.toggle("active", active);
      button.textContent = active ? "★" : "☆";
      button.setAttribute("aria-label", `${active ? "Remove" : "Add"} ${title} ${active ? "from" : "to"} favorites`);
    });
  }

  function applyFilters() {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const matchesSearch = card.dataset.game.includes(query);
      const matchesCategory = activeCategory === "All" ||
        (activeCategory === "Favorites" ? favorites.includes(card.dataset.id) :
        activeCategory === "Recent" ? recentGames.includes(card.dataset.id) :
        card.dataset.game.includes(activeCategory.toLowerCase()));
      card.hidden = !(matchesSearch && matchesCategory);
      if (!card.hidden) visible++;
    });
    sortCards();
    gameCount.textContent = `${visible} game${visible === 1 ? "" : "s"} shown`;
    noResults.style.display = visible ? "none" : "block";
  }

  function sortCards() {
    const sorted = [...cards].sort((a, b) => {
      if (gameSort.value === "az") return a.querySelector("h3").textContent.localeCompare(b.querySelector("h3").textContent);
      if (gameSort.value === "recent") return recentIndex(a) - recentIndex(b);
      if (gameSort.value === "favorites") return Number(favorites.includes(b.dataset.id)) - Number(favorites.includes(a.dataset.id));
      return cards.indexOf(a) - cards.indexOf(b);
    });
    const grid = document.querySelector(".game-grid");
    sorted.forEach(card => grid.insertBefore(card, noResults));
  }

  function recentIndex(card) {
    const index = recentGames.indexOf(card.dataset.id);
    return index === -1 ? recentGames.length : index;
  }

  gameSort.addEventListener("change", applyFilters);
  search.addEventListener("input", applyFilters);
  menuButton.addEventListener("click", () => {
    const expanded = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!expanded));
    mainNav.classList.toggle("open", !expanded);
  });
  mainNav.addEventListener("click", () => {
    menuButton.setAttribute("aria-expanded", "false");
    mainNav.classList.remove("open");
  });
  categoryFilters.addEventListener("click", event => {
    const button = event.target.closest(".filter-button");
    if (!button) return;
    activeCategory = button.dataset.category;
    document.querySelectorAll(".filter-button").forEach(item => item.classList.toggle("active", item === button));
    applyFilters();
  });
  document.addEventListener("click", event => {
    const playButton = event.target.closest(".play-button");
    const card = playButton?.closest(".game-card");
    if (card && !card.classList.contains("custom-card")) {
      openGame(card.dataset.url, card.querySelector("h3")?.textContent || "Game");
    }

    const favorite = event.target.closest("[data-favorite]");
    if (favorite) {
      event.preventDefault();
      const id = favorite.dataset.favorite;
      favorites = favorites.includes(id) ? favorites.filter(item => item !== id) : [...favorites, id];
      saveLists(); updateFavoriteButtons(); applyFilters(); return;
    }
    const playedCard = event.target.closest(".play-button")?.closest(".game-card");
    if (playedCard) {
      recentGames = [playedCard.dataset.id, ...recentGames.filter(item => item !== playedCard.dataset.id)].slice(0, 5);
      saveLists();
    }
  });
  function updateFullscreenButton() {
    const active = Boolean(document.fullscreenElement);
    pageFullscreen.textContent = active ? "⛶ Exit fullscreen" : "⛶ Fullscreen";
    pageFullscreen.setAttribute("aria-label", active ? "Exit fullscreen" : "Enter fullscreen");
  }
  pageFullscreen.addEventListener("click", async event => {
    event.preventDefault();
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen?.();
    } catch (error) { console.warn("Fullscreen is not available.", error); }
  });
  document.addEventListener("fullscreenchange", updateFullscreenButton);

  function openGame(sourceURL, title) {
    if (!sourceURL) return;
    const tab = popup();
    if (!tab) return;
    tab.document.title = `${title} | Foprox`;
    tab.location.href = sourceURL;
  }

  function openCustomGame() {
    const value = customGameUrl.value.trim();
    let url;
    try { url = new URL(value); } catch { url = null; }
    const allowedHosts = ["raw.githubusercontent.com", "gist.githubusercontent.com"];
    if (!url || url.protocol !== "https:" || !allowedHosts.includes(url.hostname)) {
      customGameStatus.textContent = "Enter a secure raw GitHub URL.";
      customGameStatus.className = "custom-url-status error";
      customGameUrl.focus(); return;
    }
    const tab = popup();
    if (!tab) return;
    fetch(url.href).then(response => {
      if (!response.ok) throw new Error("The page could not be loaded");
      return response.text();
    }).then(source => {
      tab.document.open(); tab.document.write(source); tab.document.close(); tab.focus();
    }).catch(error => {
      console.error("Error loading custom game:", error);
      tab.document.body.innerHTML = "<p class='game-error'>The custom game could not be loaded.</p>";
      customGameStatus.textContent = "The game could not be loaded.";
      customGameStatus.className = "custom-url-status error";
    });
  }
  customGameButton.addEventListener("click", openCustomGame);
  customGameUrl.addEventListener("keydown", event => { if (event.key === "Enter") openCustomGame(); });
  function popup() {
    const tab = window.open("about:blank", "_blank");
    if (!tab) { alert("Popup blocked. Please allow pop-ups for this site."); return null; }
    tab.document.write("<title>Loading game...</title><link rel='stylesheet' href='styles.css'><main class='loading-page'>Loading game...</main>");
    tab.document.close(); return tab;
  }
  updateFavoriteButtons();
  applyFilters();
})();
