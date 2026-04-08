const { useEffect, useMemo, useRef, useState } = React;

function getStoredTheme() {
    return localStorage.getItem("tapTapTheme") || "light";
}

function isPlainObject(value) {
    return value && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(baseValue, patchValue) {
    if (Array.isArray(patchValue)) {
        return patchValue.slice();
    }

    if (!isPlainObject(patchValue)) {
        return patchValue;
    }

    const base = isPlainObject(baseValue) ? baseValue : {};
    const merged = { ...base };

    Object.keys(patchValue).forEach((key) => {
        merged[key] = deepMerge(base[key], patchValue[key]);
    });

    return merged;
}

function summarizeFlexibleConfig(config) {
    if (!isPlainObject(config)) {
        return "Enter a JSON object to build a flexible level config.";
    }

    const title = config?.game?.title || config?.type || "Untitled";
    const timer = config?.timer?.limit;
    const grid = config?.gridSize;
    const fps = config?.game?.fps;

    return `Preview: ${title}${timer ? ` | ${timer}s timer` : ""}${grid ? ` | grid ${grid}` : ""}${fps ? ` | ${fps} fps` : ""}`;
}

function HomePage() {
    const api = window.TapTapApi;
    const gameCardMeta = {
        tap: {
            title: "Tap",
            copy: "Fast reflex action where timing and speed decide your score.",
            style: "arena",
            image: "/web/public/tap.jpeg"
        },
        sudoku: {
            title: "Sudoku",
            copy: "Solve logic puzzles with clean board controls and smooth play.",
            style: "winter",
            image: "/web/public/suduko.jpeg"
        },
        "2048": {
            title: "2048",
            copy: "Combine tiles and chase the highest merging score.",
            style: "matrix",
            image: "/web/public/2048.jpeg"
        },
        ludo: {
            title: "ludo",
            copy: "Jump into this game and start playing right away.",
            style: "arena",
            image: "/web/public/ludo.jpeg"
        }
    };
    const spotlightCards = [
        { title: "NO OF GAMES", tone: "blue", key: "totalGames" },
        { title: "SINGLE PLAYER GAME", tone: "violet", key: "singlePlayerCount" },
        { title: "MULTIPLAYER GAME", tone: "amber", key: "multiplayerCount" },
        { title: "TOTAL USER", tone: "cyan", key: "totalUsers" }
    ];
    const featuredCards = [
        { title: "Tap", copy: "Sharpen speed, timing, and leaderboard ranking with fast reflex rounds.", tone: "blue" },
        { title: "Sudoku", copy: "Train logic with polished puzzles and save custom flexible setups instantly.", tone: "lime" },
        { title: "2048", copy: "Build smarter merge strategies and track your highest score in one place.", tone: "violet" }
    ];
    const trendingGames = [
        { title: "Tap", genre: "Speed / Reflex", tone: "tap", game: "Tap", image: "/web/public/tap.jpeg" },
        { title: "Sudoku", genre: "Logic / Puzzle", tone: "sudoku", game: "sudoku", image: "/web/public/suduko.jpeg" },
        { title: "2048", genre: "Merge / Strategy", tone: "2048", game: "2048", image: "/web/public/2048.jpeg" }
    ];

    const [user, setUser] = useState(api.getUser());
    const [singleGames, setSingleGames] = useState([]);
    const [multiplayerGames, setMultiplayerGames] = useState([]);
    const [allGames, setAllGames] = useState([]);
    const [selectedGame, setSelectedGame] = useState("");
    const [levels, setLevels] = useState([]);
    const [selectedLevel, setSelectedLevel] = useState("");

    const [flexibleRaw, setFlexibleRaw] = useState("{}");
    const [flexibleBase, setFlexibleBase] = useState({});
    const [theme, setTheme] = useState(getStoredTheme);
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [showShortcutCard, setShowShortcutCard] = useState(true);
    const [shortcutAdded, setShortcutAdded] = useState(false);
    const [activePanel, setActivePanel] = useState("home");
    const [sidebarExpanded, setSidebarExpanded] = useState(false);
    const [sidebarProfileOpen, setSidebarProfileOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [spotlightCounts, setSpotlightCounts] = useState({
        totalGames: 0,
        singlePlayerCount: 0,
        multiplayerCount: 0,
        totalUsers: 0
    });
    const menuRef = useRef(null);

    const userRank = user && user.globalRank != null ? user.globalRank : "NA";
    const userRankDisplay = userRank === "NA" ? "NA" : Number(userRank).toLocaleString();
    const userPoints = user && Number.isFinite(Number(user.totalScore)) ? Number(user.totalScore) : 0;
    const userPointsDisplay = Number.isFinite(userPoints) ? userPoints.toLocaleString() : "0";

    const toSlug = (value) => String(value || "").toLowerCase();

    const selectedGameSafe = useMemo(() => selectedGame || "", [selectedGame]);
    const gameSuggestions = useMemo(() => {
        const query = searchText.trim().toLowerCase();
        if (!query) return [];

        return allGames
            .filter((game) => {
                const name = String(game?.name || "").toLowerCase();
                const slug = String(game?.slug || "").toLowerCase();
                return name.includes(query) || slug.includes(query);
            })
            .slice(0, 6);
    }, [allGames, searchText]);

    function openGameInfo(gameName) {
        if (!gameName) return;
        api.navigate(`/game-info/${encodeURIComponent(gameName)}`);
    }

    function openGame(gameName) {
        if (!gameName) return;
        window.location.href = `/games/${encodeURIComponent(gameName)}`;
    }

    useEffect(() => {
        document.body.classList.remove("theme-light", "theme-dark");
        document.body.classList.add(`theme-${theme}`);
        localStorage.setItem("tapTapTheme", theme);
    }, [theme]);

    useEffect(() => {
        async function bootstrap() {
            try {
                const token = api.getToken();
                const requests = token
                    ? [api.getMe().catch(() => ({ user: null })), api.getGameSummary(), api.getGames().catch(() => ({ games: [] }))]
                    : [Promise.resolve({ user: null }), api.getGameSummary(), api.getGames().catch(() => ({ games: [] }))];

                const [mePayload, summaryPayload, gamesPayload] = await Promise.all(requests);

                setUser(mePayload?.user || null);
                setAllGames(Array.isArray(gamesPayload?.games) ? gamesPayload.games : []);

                const singleList = Array.isArray(summaryPayload?.singlePlayerGames)
                    ? summaryPayload.singlePlayerGames
                    : [];

                const multiList = Array.isArray(summaryPayload?.multiplayerGames)
                    ? summaryPayload.multiplayerGames
                    : [];

                setSingleGames(singleList);
                setMultiplayerGames(multiList);

                setSpotlightCounts({
                    totalGames: summaryPayload && summaryPayload.totalGames != null ? summaryPayload.totalGames : singleList.length + multiList.length,
                    singlePlayerCount: summaryPayload && summaryPayload.singlePlayerCount != null ? summaryPayload.singlePlayerCount : singleList.length,
                    multiplayerCount: summaryPayload && summaryPayload.multiplayerCount != null ? summaryPayload.multiplayerCount : multiList.length,
                    totalUsers: summaryPayload && summaryPayload.totalUsers != null ? summaryPayload.totalUsers : 0
                });

                const singleSlugs = singleList.map((item) => item.slug || toSlug(item.name));
                const preferredOrder = ["tap", "sudoku", "2048"];
                const ordered = [
                    ...preferredOrder.filter((slug) => singleSlugs.includes(slug)),
                    ...singleSlugs.filter((slug) => !preferredOrder.includes(slug))
                ];

                if (ordered.length > 0) {
                    setSelectedGame(ordered[0]);
                }
            } catch (err) {
                setError(err.message || "Failed to load home");
            }
        }

        bootstrap();
    }, []);

    useEffect(() => {
        if (!selectedGameSafe) return;

        async function loadGameData() {
            setBusy(true);
            setError("");
            setSuccess("");

            try {
                const [levelsPayload, flexiblePayload] = await Promise.all([
                    api.getLevels(selectedGameSafe),
                    api.getFlexibleConfig(selectedGameSafe)
                ]);

                const availableLevels = Array.isArray(levelsPayload?.levels)
                    ? levelsPayload.levels
                    : [];

                setLevels(availableLevels);
                setSelectedLevel((current) => {
                    if (current && availableLevels.includes(current)) return current;
                    return availableLevels[0] || "";
                });

                setFlexibleRaw(JSON.stringify(flexiblePayload, null, 2));
                setFlexibleBase(flexiblePayload && typeof flexiblePayload === "object" ? flexiblePayload : {});
            } catch (err) {
                setError(err.message || "Failed to load game data");
            } finally {
                setBusy(false);
            }
        }

        loadGameData();
    }, [selectedGameSafe]);

    useEffect(() => {
        if (!menuOpen) return;

        function handlePointerDown(event) {
            if (!menuRef.current?.contains(event.target)) {
                setMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("touchstart", handlePointerDown);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("touchstart", handlePointerDown);
        };
    }, [menuOpen]);

    function goToPlay(levelName, gameName = selectedGameSafe) {
        if (!gameName || !levelName) return;
        if (!api.getToken()) {
            window.location.href = "/login";
            return;
        }
        const url = `/games/${encodeURIComponent(gameName)}?level=${encodeURIComponent(levelName)}`;
        window.location.href = url;
    }

    async function saveFlexible() {
        if (!selectedGameSafe) return;
        if (!api.getToken()) {
            window.location.href = "/login";
            return;
        }

        setBusy(true);
        setError("");
        setSuccess("");

        try {
            const trimmed = flexibleRaw.trim();
            const parsed = trimmed ? JSON.parse(trimmed) : {};

            if (!isPlainObject(parsed)) {
                throw new Error("Flexible config must be a JSON object.");
            }

            const merged = deepMerge(flexibleBase, parsed);
            const saved = await api.updateFlexibleConfig(selectedGameSafe, merged);
            setFlexibleBase(saved && typeof saved === "object" ? saved : merged);
            setFlexibleRaw(JSON.stringify(saved && typeof saved === "object" ? saved : merged, null, 2));
            setSuccess("flexible.json updated successfully.");
        } catch (err) {
            setError(err.message || "Failed to save flexible config");
        } finally {
            setBusy(false);
        }
    }

    function formatFlexible() {
        setError("");
        setSuccess("");

        try {
            const trimmed = flexibleRaw.trim();
            const parsed = trimmed ? JSON.parse(trimmed) : {};

            if (!isPlainObject(parsed)) {
                throw new Error("Flexible config must be a JSON object.");
            }

            setFlexibleRaw(JSON.stringify(parsed, null, 2));
            setSuccess("JSON formatted successfully.");
        } catch (err) {
            setError(err.message || "Invalid JSON format");
        }
    }

    function resetFlexible() {
        setError("");
        setSuccess("");
        setFlexibleRaw(JSON.stringify(flexibleBase, null, 2));
    }

    const flexiblePreview = useMemo(() => {
        try {
            const trimmed = flexibleRaw.trim();
            const parsed = trimmed ? JSON.parse(trimmed) : {};
            return summarizeFlexibleConfig(deepMerge(flexibleBase, parsed));
        } catch (err) {
            return "Preview unavailable until the JSON becomes valid.";
        }
    }, [flexibleBase, flexibleRaw]);

    function logout() {
        api.logout();
        window.location.href = "/login";
    }

    function jumpToSection(sectionId) {
        setActivePanel(sectionId);
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    function scrollToFooter() {
        document.getElementById("site-footer")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function openContactSection() {
        api.navigate("/home/contact-us");
    }

    function toggleSearchPanel() {
        setSearchOpen((value) => !value);
    }

    function dismissShortcutCard() {
        setShowShortcutCard(false);
    }

    async function addShortcutCard() {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(`${window.location.origin}/home`);
            }
        } catch (err) {
            
        }

        setShortcutAdded(true);
        window.setTimeout(() => {
            dismissShortcutCard();
        }, 900);
    }

    function runSearch(event) {
        event.preventDefault();
        const query = searchText.trim().toLowerCase();
        if (!query) {
            setSearchOpen(true);
            return;
        }

        if (query.includes("home")) {
            jumpToSection("home");
            setSearchOpen(false);
            return;
        }

        if (query.includes("dashboard")) {
            window.location.href = "/dashboard";
            return;
        }

        if (query.includes("contact")) {
            api.navigate("/home/contact-us");
            return;
        }

        if (query.includes("about")) {
            api.navigate("/about");
            return;
        }

        if (query.includes("footer")) {
            scrollToFooter();
            setSearchOpen(false);
            return;
        }

        if (query.includes("flexible") || query.includes("json")) {
            jumpToSection("editor");
            setSearchOpen(false);
            return;
        }

        if (query.includes("progress") || query.includes("controls") || query.includes("play")) {
            jumpToSection("controls");
            setSearchOpen(false);
            return;
        }

        if (query.includes("competition") || query.includes("mock") || query.includes("course") || query.includes("featured")) {
            jumpToSection("featured");
            setSearchOpen(false);
            return;
        }

        const matchedBackendGame = allGames.find((game) => {
            const name = String(game?.name || "").toLowerCase();
            const slug = String(game?.slug || "").toLowerCase();
            return query === name || query === slug;
        });

        if (matchedBackendGame) {
            openGame(matchedBackendGame.slug || matchedBackendGame.name);
            return;
        }

        if (query.includes("game") || query.includes("tap") || query.includes("sudoku") || query.includes("2048")) {
            const matchedGame = trendingGames.find((item) => {
                const title = item.title.toLowerCase();
                const game = item.game.toLowerCase();
                return query.includes(title) || query.includes(game);
            });

            if (matchedGame) {
                setSelectedGame(toSlug(matchedGame.game));
            }

            jumpToSection("games");
            setSearchOpen(true);
            return;
        }

        setSearchOpen(true);
    }

    return (
        <div className="page-wrap">
            <nav className="navbar">
                <div className="navbar-brand">
                    <button
                        className="navbar-game-brand"
                        type="button"
                        onClick={() => api.navigate("/home")}
                        aria-label="Go to homepage"
                    >
                        <div className="navbar-game-brand-line">GAME</div>
                        <div className="navbar-game-brand-line">HUB</div>
                    </button>
                </div>

                <div className="navbar-center">
                    <button className="nav-pill active" type="button">Home</button>
                    <button
                        className="nav-pill"
                        type="button"
                        onClick={() => api.navigate("/dashboard")}
                    >
                        Dashboard
                    </button>
                    <button
                        className="nav-pill"
                        type="button"
                        onClick={() => api.navigate("/about")}
                    >
                        About
                    </button>
                    <button
                        className="nav-pill"
                        type="button"
                        onClick={openContactSection}
                    >
                        Contact Us
                    </button>
                </div>

                <div className="navbar-actions">
                    <div className="search-popover">
                        <form className="navbar-search-trigger" onSubmit={runSearch}>
                            <span className="search-icon navbar-search-icon"></span>
                            <input
                                className="navbar-search-input"
                                type="text"
                                value={searchText}
                                onChange={(event) => setSearchText(event.target.value)}
                                onFocus={() => setSearchOpen(true)}
                                placeholder="Search"
                                aria-label="Search pages and games"
                            />
                        </form>

                        {searchOpen ? (
                            <section className="search-panel card">
                                {gameSuggestions.length > 0 ? (
                                    <>
                                        <div className="search-section-title">Games</div>
                                        <div className="search-suggestion-list">
                                            {gameSuggestions.map((game) => (
                                                <button
                                                    key={game.slug || game.name}
                                                    type="button"
                                                    className="search-suggestion-item"
                                                    onClick={() => {
                                                        setSearchText(game.name || game.slug || "");
                                                        setSearchOpen(false);
                                                        openGame(game.slug || game.name);
                                                    }}
                                                >
                                                    <span className="search-suggestion-name">{game.name}</span>
                                                    <span className="search-suggestion-meta">
                                                        {(game.mode || "game").toUpperCase()}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                ) : null}

                                <div className="search-section-title">Trending Games</div>
                                <div className="search-games-grid">
                                    {trendingGames
                                        .filter((item) => item.title.toLowerCase().includes(searchText.toLowerCase()))
                                        .map((item) => (
                                            <button
                                                key={item.title}
                                                type="button"
                                                className={`search-game-card tone-${item.tone}`}
                                                onClick={() => {
                                                    setSelectedGame(toSlug(item.game));
                                                    setSearchOpen(false);
                                                    openGame(item.game);
                                                }}
                                            >
                                                <div className={`search-card-art ${item.tone === "2048" ? "two048" : item.tone}`}>
                                                    <img className="search-card-image" src={item.image} alt={item.title} />
                                                </div>
                                                <div className="search-game-overlay">
                                                    <strong>{item.title}</strong>
                                                    <span>{item.genre}</span>
                                                </div>
                                            </button>
                                        ))}
                                </div>
                            </section>
                        ) : null}
                    </div>
                    <button
                        className="theme-toggle icon-toggle"
                        type="button"
                        aria-label={theme === "light" ? "Enable dark mode" : "Enable light mode"}
                        onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
                    >
                        <span className={`theme-icon ${theme === "light" ? "theme-icon-moon" : "theme-icon-sun"}`}></span>
                    </button>

                    <div className="nav-menu-wrap" ref={menuRef}>
                        <button
                            className="profile-toggle"
                            type="button"
                            aria-label="Open account menu"
                            onClick={() => setMenuOpen((value) => !value)}
                        >
                            <span className="profile-icon-head"></span>
                            <span className="profile-icon-body"></span>
                        </button>

                        {menuOpen ? (
                            user ? (
                                <div className="profile-card">
                                    <div className="profile-card-top">
                                        <div className="profile-card-avatar-wrap">
                                            <div className="profile-card-avatar">
                                                {(user?.username || "Tap Tap").slice(0, 2).toUpperCase()}
                                            </div>
                                           
                                        </div>
                                      
                                    </div>

                                    <div className="profile-card-name">{user?.username || "Tap Tap Player"}</div>
                                    <div className="profile-card-email">{user?.email || "Create an account to save your progress"}</div>

                                    <div className="profile-card-stats">
                                        <div className="profile-card-stat">
                                            <span className="profile-card-stat-icon trophy"></span>
                                            <span>Your Global Rank</span>
                                            <strong>{userRankDisplay}</strong>
                                        </div>
                                        <div className="profile-card-stat">
                                            <span className="profile-card-stat-icon star"></span>
                                            <span>Your Points</span>
                                            <strong>{userPointsDisplay}</strong>
                                        </div>
                                    </div>

                                    <button className="profile-card-link danger" type="button" onClick={logout}>Logout</button>
                                </div>
                            ) : (
                                <div className="nav-dropdown">
                                    <div className="nav-dropdown-title">Guest</div>
                                    <button
                                        className="profile-card-link"
                                        type="button"
                                        onClick={() => (window.location.href = "/signup")}
                                    >
                                        Sign Up
                                    </button>
                                </div>
                            )
                        ) : null}
                    </div>
                </div>
            </nav>

            {searchOpen ? <div className="search-overlay" onClick={() => setSearchOpen(false)}></div> : null}
            <div className="showcase-layout">
                {sidebarExpanded ? (
                    <button
                        className="showcase-sidebar-backdrop"
                        type="button"
                        aria-label="Close sidebar"
                        onClick={() => {
                            setSidebarExpanded(false);
                            setSidebarProfileOpen(false);
                        }}
                    ></button>
                ) : null}
                <aside className={`showcase-sidebar card ${sidebarExpanded ? "expanded" : ""}`}>
                    <button
                        className={`showcase-sidebar-toggle ${sidebarExpanded ? "active" : ""}`}
                        type="button"
                        onClick={() => setSidebarExpanded((value) => !value)}
                        aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
                        title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
                    >
                        <span className="showcase-sidebar-toggle-bar"></span>
                        <span className="showcase-sidebar-toggle-bar"></span>
                        <span className="showcase-sidebar-toggle-bar"></span>
                    </button>
                    

                    <div className="showcase-menu">
                        <button
                            className={`showcase-menu-item ${activePanel === "home" ? "active" : ""}`}
                            type="button"
                            onClick={() => jumpToSection("home")}
                            aria-label="Home"
                            title="Home"
                        >
                            <span className="menu-icon menu-icon-home"></span>
                            <span className="menu-label">Home</span>
                        </button>
                        <button
                            className={`showcase-menu-item ${activePanel === "games" ? "active" : ""}`}
                            type="button"
                            onClick={() => jumpToSection("games")}
                            aria-label="Games"
                            title="Games"
                        >
                            <span className="menu-icon menu-icon-games"></span>
                            <span className="menu-label">Games</span>
                        </button>
                        <button
                            className="showcase-menu-item"
                            type="button"
                            onClick={() => api.navigate("/dashboard")}
                            aria-label="Dashboard"
                            title="Dashboard"
                        >
                            <span className="menu-icon menu-icon-dashboard"></span>
                            <span className="menu-label">Dashboard</span>
                        </button>
                        <button
                            className={`showcase-menu-item ${activePanel === "multiplayer" ? "active" : ""}`}
                            type="button"
                            onClick={() => jumpToSection("multiplayer")}
                            aria-label="Multiplayer"
                            title="Multiplayer"
                        >
                            <span className="menu-icon menu-icon-multiplayer"></span>
                            <span className="menu-label">Multiplayer</span>
                        </button>
                        <button
                            className={`showcase-menu-item ${activePanel === "contact" ? "active" : ""}`}
                            type="button"
                            onClick={openContactSection}
                            aria-label="Contact Us"
                            title="Contact Us"
                        >
                            <span className="menu-icon menu-icon-dashboard"></span>
                            <span className="menu-label">Contact</span>
                        </button>
                    </div>

                    <div className="showcase-profile-wrap">
                        <button
                            className={`showcase-profile-button ${sidebarProfileOpen ? "active" : ""}`}
                            type="button"
                            onClick={() => setSidebarProfileOpen((value) => !value)}
                            aria-label="Open user profile"
                            title="User profile"
                        >
                            <span className="showcase-profile-icon">
                                <span className="profile-icon-head"></span>
                                <span className="profile-icon-body"></span>
                            </span>
                        </button>

                        {sidebarProfileOpen ? (
                            <div className="showcase-profile">
                                <strong>{user?.username || "Player"}</strong>
                                <span>{user?.email || "Ready to play"}</span>
                            </div>
                        ) : null}
                    </div>
                </aside>

                <main className="showcase-main">
                    <section id="home" className="hero-shell card">
                       
                       

                        <div className="spotlight-grid">
                            {spotlightCards.map((item) => {
                                const value = spotlightCounts[item.key] != null ? spotlightCounts[item.key] : 0;
                                return (
                                    <div key={item.title} className={`spotlight-card tone-${item.tone}`}>
                                        <div className="spotlight-title">{item.title}</div>
                                        <div className="spotlight-icon" aria-hidden="true">{value}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section id="games" className="card">
                        <h2>Available Games</h2>
                        <div className="showcase-games">
                            {singleGames.map((game) => {
                                const slug = game.slug || toSlug(game.name);
                                const meta = gameCardMeta[slug] || {};
                                const title = meta.title || game.name || slug;
                                const copy = meta.copy || "Jump into this game and start playing right away.";
                                const image = meta.image || "/web/public/tap.jpeg";
                                const art = meta.style || "matrix";

                                return (
                                    <article
                                        key={slug}
                                        className={`promo-game-card ${selectedGame === slug ? "active" : ""}`}
                                    >
                                        <div className={`promo-game-art promo-game-art-${art}`}>
                                            <img
                                                className="promo-game-image"
                                                src={image}
                                                alt={title}
                                            />
                                            <div className="promo-game-scene"></div>
                                        </div>

                                        <div className="promo-game-content">
                                            <h3>{title}</h3>
                                            <p>{copy}</p>
                                        </div>

                                        <div className="promo-game-actions">
                                            <button
                                                type="button"
                                                className="promo-button promo-button-primary"
                                                onClick={() => openGameInfo(slug)}
                                            >
                                                Learn more
                                            </button>
                                            <button
                                                type="button"
                                                className="promo-button promo-button-secondary"
                                                onClick={() => {
                                                    setSelectedGame(slug);
                                                    const levelToOpen = slug === selectedGame ? (selectedLevel || "level1.json") : "level1.json";
                                                    goToPlay(levelToOpen, slug);
                                                }}
                                            >
                                                Play now
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                            {singleGames.length === 0 ? <div className="muted">No single player games found.</div> : null}
                        </div>
                    </section>

                    <section id="multiplayer" className="card">
                        <h2>Multiplayer</h2>
                        {multiplayerGames.length === 0 ? (
                            <div className="muted" style={{ marginTop: "8px" }}>
                                Multiplayer section is ready. You can add your multiplayer games here later.
                            </div>
                        ) : (
                            <div className="showcase-games">
                                {multiplayerGames.map((game) => {
                                    const slug = game.slug || toSlug(game.name);
                                    const meta = gameCardMeta[slug] || {};
                                    const title = meta.title || game.name || slug;
                                    const copy = meta.copy || "Jump into this game and start playing right away.";
                                    const image = meta.image || "/web/public/ludo.jpeg";
                                    const art = meta.style || "arena";

                                    return (
                                        <article
                                            key={slug}
                                            className="promo-game-card"
                                        >
                                            <div className={`promo-game-art promo-game-art-${art}`}>
                                                <img className="promo-game-image" src={image} alt={title} />
                                                <div className="promo-game-scene"></div>
                                            </div>

                                            <div className="promo-game-content">
                                                <h3>{title}</h3>
                                                <p>{copy}</p>
                                            </div>

                                            <div className="promo-game-actions">
                                                <button
                                                    type="button"
                                                    className="promo-button promo-button-primary"
                                                    onClick={() => openGameInfo(slug)}
                                                >
                                                    Learn more
                                                </button>
                                                <button
                                                    type="button"
                                                    className="promo-button promo-button-secondary"
                                                    onClick={() => goToPlay("flexible.json", slug)}
                                                >
                                                    Play now
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                </main>
            </div>

            <footer id="site-footer" className="site-footer">
                <div className="site-footer-stack">
                    <div className="site-footer-brand">GAME HUB</div>
                    <div className="site-footer-copy">Game Hub (c) 2026. All rights reserved.</div>
                </div>
                <div>
                    <div className="site-footer-column-title">Get To Know Us</div>
                    <div className="site-footer-links">
                        <button className="site-footer-link" type="button" onClick={() => jumpToSection("games")}>All Games</button>
                        <button className="site-footer-link" type="button" onClick={() => api.navigate("/dashboard")}>Dashboard</button>
                        <button className="site-footer-link" type="button" onClick={() => api.navigate("/about")}>About Us</button>
                    </div>
                </div>
                <div>
                    <div className="site-footer-column-title">Support</div>
                    <div className="site-footer-links">
                        <button className="site-footer-link" type="button" onClick={() => api.navigate("/home/contact-us")}>Contact Us</button>
                        <button className="site-footer-link" type="button" onClick={() => api.navigate("/home/contact-us")}>FAQ</button>
                    </div>
                </div>
                <div>
                    <div className="site-footer-column-title">Privacy and Terms</div>
                    <div className="site-footer-links">
                        <button className="site-footer-link" type="button" onClick={() => api.navigate("/about")}>Terms and Conditions</button>
                        <button className="site-footer-link" type="button" onClick={() => api.navigate("/about")}>Privacy Policy</button>
                    </div>
                </div>
                <div>
                    <div className="site-footer-column-title">Follow Us</div>
                    <div className="site-footer-socials">
                        <span className="site-footer-social social-linkedin">in</span>
                        <span className="site-footer-social social-tiktok">tt</span>
                        <span className="site-footer-social social-youtube">yt</span>
                        <span className="site-footer-social social-instagram">ig</span>
                        <span className="site-footer-social social-facebook">f</span>
                    </div>
                </div>
            </footer>

           
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<HomePage />);


