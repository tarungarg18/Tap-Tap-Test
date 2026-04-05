const { useEffect, useMemo, useState } = React;

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
        Tap: {
            title: "Tap",
            copy: "Fast reflex action where timing and speed decide your score.",
            style: "arena"
        },
        sudoku: {
            title: "Sudoku",
            copy: "Solve logic puzzles with clean board controls and smooth play.",
            style: "winter"
        },
        "2048": {
            title: "2048",
            copy: "Combine tiles and chase the highest merging score.",
            style: "matrix"
        },
        ludo: {
            title: "Ludo",
            copy: "Play turn-based Ludo with standard rules in 2, 3, or 4 player modes.",
            style: "arena"
        }
    };
    const spotlightCards = [
        { title: "Internships", icon: "IN", tone: "blue" },
        { title: "Mock Tests", icon: "MT", tone: "violet" },
        { title: "Competitions", icon: "CP", tone: "amber" },
        { title: "Courses", icon: "CR", tone: "cyan" }
    ];
    const featuredCards = [
        { title: "Tap", copy: "Sharpen speed, timing, and leaderboard ranking with fast reflex rounds.", tone: "blue" },
        { title: "Sudoku", copy: "Train logic with polished puzzles and save custom flexible setups instantly.", tone: "lime" },
        { title: "2048", copy: "Build smarter merge strategies and track your highest score in one place.", tone: "violet" },
        { title: "Ludo", copy: "Roll, move, and capture in classic Ludo formats powered by JSON configs.", tone: "amber" }
    ];
    const trendingGames = [
        { title: "Tap", genre: "Speed / Reflex", tone: "tap", game: "Tap" },
        { title: "Sudoku", genre: "Logic / Puzzle", tone: "sudoku", game: "sudoku" },
        { title: "2048", genre: "Merge / Strategy", tone: "2048", game: "2048" },
        { title: "Ludo", genre: "Board / Strategy", tone: "tap", game: "ludo" }
    ];

    const [user, setUser] = useState(api.getUser());
    const [games, setGames] = useState([]);
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
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [allLeaderboards, setAllLeaderboards] = useState(null);
    const [leaderboardsLoading, setLeaderboardsLoading] = useState(false);

    const selectedGameSafe = useMemo(() => selectedGame || "", [selectedGame]);

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
                    ? [api.getMe().catch(() => ({ user: null })), api.getGames()]
                    : [Promise.resolve({ user: null }), api.getGames()];

                const [mePayload, gamesPayload] = await Promise.all(requests);

                setUser(mePayload?.user || null);

                const availableGames = Array.isArray(gamesPayload?.games)
                    ? gamesPayload.games.map((item) => item.name)
                    : [];

                const preferredOrder = ["Tap", "sudoku", "2048", "ludo"];
                const orderedGames = [
                    ...preferredOrder.filter((name) => availableGames.includes(name)),
                    ...availableGames.filter((name) => !preferredOrder.includes(name))
                ];

                setGames(orderedGames);

                if (orderedGames.length > 0) {
                    setSelectedGame(orderedGames[0]);
                }
            } catch (err) {
                setError(err.message || "Failed to load home");
            }
        }

        bootstrap();
    }, []);

    useEffect(() => {
        if (!user || !api.getToken()) {
            setAllLeaderboards(null);
            setLeaderboardsLoading(false);
            return;
        }

        let active = true;
        setLeaderboardsLoading(true);

        api.getAllLeaderboards(10)
            .then((payload) => {
                if (active) {
                    setAllLeaderboards(payload?.leaderboards && typeof payload.leaderboards === "object" ? payload.leaderboards : {});
                }
            })
            .catch(() => {
                if (active) {
                    setAllLeaderboards(null);
                }
            })
            .finally(() => {
                if (active) {
                    setLeaderboardsLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [user?.id]);

    useEffect(() => {
        if (!selectedGameSafe) return;

        async function loadGameData() {
            setError("");
            setSuccess("");

            if (!api.getToken()) {
                setBusy(false);
                setLevels([]);
                setSelectedLevel("");
                setFlexibleRaw("{}");
                setFlexibleBase({});
                return;
            }

            setBusy(true);

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

    function goToPlay(levelName) {
        if (!selectedGameSafe || !levelName) return;
        if (selectedGameSafe.toLowerCase() === "ludo") {
            window.location.href = `/games/${encodeURIComponent(selectedGameSafe)}`;
            return;
        }
        if (!api.getToken()) {
            window.location.href = "/login";
            return;
        }
        const url = `/games/${encodeURIComponent(selectedGameSafe)}?level=${encodeURIComponent(levelName)}`;
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

        if (query.includes("about") || query.includes("footer") || query.includes("contact")) {
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

        if (query.includes("game") || query.includes("tap") || query.includes("sudoku") || query.includes("2048") || query.includes("ludo")) {
            const matchedGame = trendingGames.find((item) => {
                const title = item.title.toLowerCase();
                const game = item.game.toLowerCase();
                return query.includes(title) || query.includes(game);
            });

            if (matchedGame) {
                setSelectedGame(matchedGame.game);
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
                    <div className="navbar-game-brand">
                        <div className="navbar-game-brand-line">Tap Tap</div>
                        <div className="navbar-game-brand-line">games</div>
                    </div>
                </div>

                <div className="navbar-center">
                    <button className="nav-pill active" type="button">Home</button>
                    <button
                        className="nav-pill"
                        type="button"
                        onClick={() => (window.location.href = "/dashboard")}
                    >
                        Dashboard
                    </button>
                    <button className="nav-pill" type="button" onClick={scrollToFooter}>About</button>
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
                                                    setSelectedGame(item.game);
                                                    setSearchOpen(false);
                                                    jumpToSection("games");
                                                }}
                                            >
                                                <div className={`search-card-art ${item.tone === "2048" ? "two048" : item.tone}`}></div>
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

                    <div className="nav-menu-wrap">
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
                                            <div className="profile-card-progress">75%</div>
                                        </div>
                                        <div className="profile-card-top-actions">
                                            <button
                                                className="profile-card-edit"
                                                type="button"
                                                onClick={() => (window.location.href = "/dashboard")}
                                            >
                                                Edit Profile
                                            </button>
                                            <button
                                                className="profile-card-next"
                                                type="button"
                                                onClick={() => (window.location.href = "/dashboard")}
                                                aria-label="Open profile page"
                                            >
                                                <span className="profile-card-next-icon"></span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="profile-card-name">{user?.username || "Tap Tap Player"}</div>
                                    <div className="profile-card-email">{user?.email || "Create an account to save your progress"}</div>

                                    <div className="profile-card-stats">
                                        <div className="profile-card-stat">
                                            <span className="profile-card-stat-icon trophy"></span>
                                            <span>Your Global Rank</span>
                                            <strong>NA</strong>
                                        </div>
                                        <div className="profile-card-stat">
                                            <span className="profile-card-stat-icon star"></span>
                                            <span>Your Points</span>
                                            <strong>0</strong>
                                        </div>
                                    </div>

                                    <button className="profile-card-link danger" type="button" onClick={logout}>Logout</button>
                                </div>
                            ) : (
                                <div className="nav-dropdown">
                                    <div className="nav-dropdown-title">Tap Tap</div>
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
                <aside className="showcase-sidebar card">
                    <button className="showcase-post">+ Start Playing</button>

                    <div className="showcase-menu">
                        <button
                            className={`showcase-menu-item ${activePanel === "home" ? "active" : ""}`}
                            type="button"
                            onClick={() => jumpToSection("home")}
                        >
                            <span className="menu-icon menu-icon-home"></span>
                            <span className="menu-label">Home</span>
                        </button>
                        <button
                            className={`showcase-menu-item ${activePanel === "games" ? "active" : ""}`}
                            type="button"
                            onClick={() => jumpToSection("games")}
                        >
                            <span className="menu-icon menu-icon-games"></span>
                            <span className="menu-label">Games</span>
                        </button>
                        <button
                            className={`showcase-menu-item ${activePanel === "featured" ? "active" : ""}`}
                            type="button"
                            onClick={() => jumpToSection("featured")}
                        >
                            <span className="menu-icon menu-icon-competitions"></span>
                            <span className="menu-label">Competitions</span>
                        </button>
                        <button
                            className={`showcase-menu-item ${activePanel === "featured" ? "active" : ""}`}
                            type="button"
                            onClick={() => jumpToSection("featured")}
                        >
                            <span className="menu-icon menu-icon-mock"></span>
                            <span className="menu-label">Mock Tests</span>
                        </button>
                        <button
                            className={`showcase-menu-item ${activePanel === "editor" ? "active" : ""}`}
                            type="button"
                            onClick={() => jumpToSection("editor")}
                        >
                            <span className="menu-icon menu-icon-flex"></span>
                            <span className="menu-label">Flexible JSON</span>
                        </button>
                        <button
                            className={`showcase-menu-item ${activePanel === "controls" ? "active" : ""}`}
                            type="button"
                            onClick={() => jumpToSection("controls")}
                        >
                            <span className="menu-icon menu-icon-progress"></span>
                            <span className="menu-label">Progress</span>
                        </button>
                        <button
                            className={`showcase-menu-item ${activePanel === "multiplayer" ? "active" : ""}`}
                            type="button"
                            onClick={() => jumpToSection("multiplayer")}
                        >
                            <span className="menu-icon menu-icon-multiplayer"></span>
                            <span className="menu-label">Multiplayer</span>
                        </button>
                    </div>

                    <div className="showcase-profile">
                        <strong>{user?.username || "Player"}</strong>
                        <span>{user?.email || "Ready to play"}</span>
                    </div>
                </aside>

                <main className="showcase-main">
                    <section id="home" className="hero-shell card">
                        <div className="hero-topline">Tap Tap Player Space</div>
                        <div className="hero-banner">
                            <div>
                                <h1 className="hero-title">
                                    Unlock Your <span>Game Flow!</span>
                                </h1>
                                <div className="hero-copy">
                                    Explore polished game modes, launch saved levels, and edit flexible JSON from one attractive Tap Tap dashboard.
                                </div>
                            </div>
                            <div className="hero-chip">Live player tools for Tap, Sudoku, 2048, and Ludo</div>
                        </div>

                        <div className="spotlight-grid">
                            {spotlightCards.map((item) => (
                                <div key={item.title} className={`spotlight-card tone-${item.tone}`}>
                                    <div className="spotlight-title">{item.title}</div>
                                    <div className="spotlight-icon">{item.icon}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="home-grid">
                        <section id="controls" className="card">
                            <h2>Player Controls</h2>
                            <div className="muted" style={{ marginTop: "6px" }}>
                                {user
                                    ? <>Logged in as <strong>{user?.username || "-"}</strong> ({user?.email || "-"})</>
                                    : <>Browse the game list freely. <strong>Log in</strong> to load levels, flexible JSON, leaderboards, and to play.</>}
                            </div>

                            <div className="field" style={{ marginTop: "14px" }}>
                                <label>Select Game</label>
                                <select value={selectedGameSafe} onChange={(e) => setSelectedGame(e.target.value)} disabled={busy}>
                                    {games.map((gameName) => (
                                        <option key={gameName} value={gameName}>{gameName}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="field">
                                <label>Select Level</label>
                                <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} disabled={busy}>
                                    {levels.map((levelName) => (
                                        <option key={levelName} value={levelName}>{levelName}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="row" style={{ marginTop: "12px" }}>
                                <button onClick={() => goToPlay(selectedLevel)} disabled={busy || !selectedLevel}>Play Selected Level</button>
                                <button className="secondary" onClick={() => goToPlay("flexible.json")} disabled={busy}>Play flexible.json</button>
                            </div>

                            {error ? <div className="error">{error}</div> : null}
                            {success ? <div className="success-text">{success}</div> : null}
                        </section>

                        <section id="editor" className="card">
                            <h2>Flexible Level Editor</h2>
                            <div className="muted" style={{ marginTop: "6px" }}>
                                Modify `flexible.json` for <strong>{selectedGameSafe || "-"}</strong> and play instantly.
                            </div>

                            <div className="field" style={{ marginTop: "12px" }}>
                                <label>flexible.json</label>
                                <textarea value={flexibleRaw} onChange={(e) => setFlexibleRaw(e.target.value)} spellCheck={false} />
                            </div>

                            <div className="json-toolbar">
                                <button className="success" onClick={saveFlexible} disabled={busy}>Save flexible.json</button>
                                <button className="secondary" onClick={formatFlexible} disabled={busy}>Format JSON</button>
                                <button className="secondary" onClick={resetFlexible} disabled={busy}>Reset to Loaded</button>
                                <button className="secondary" onClick={() => setFlexibleRaw("{}")} disabled={busy}>Start from Empty</button>
                            </div>
                        </section>
                    </div>

                    <section id="featured" className="featured-shell">
                        <div className="featured-heading">Featured</div>
                        <div className="featured-grid">
                            {featuredCards.map((item) => (
                                <article key={item.title} className={`featured-card tone-${item.tone}`}>
                                    <div className="featured-card-inner">
                                        <h3>{item.title}</h3>
                                        <p>{item.copy}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section id="leaderboards" className="card">
                        <h2>Leaderboards</h2>
                        <div className="muted" style={{ marginTop: "6px" }}>
                            Top players for each title, loaded together for every installed game after you sign in.
                        </div>

                        {!user ? (
                            <div className="muted" style={{ marginTop: "14px" }}>
                                Log in to view leaderboards.
                            </div>
                        ) : leaderboardsLoading ? (
                            <div className="muted" style={{ marginTop: "14px" }}>Loading leaderboards…</div>
                        ) : allLeaderboards ? (
                            <div style={{ marginTop: "14px" }}>
                                <div className="field">
                                    <label>Game</label>
                                    <select
                                        value={selectedGameSafe}
                                        onChange={(event) => setSelectedGame(event.target.value)}
                                        disabled={busy || games.length === 0}
                                    >
                                        {games.map((gameName) => (
                                            <option key={gameName} value={gameName}>{gameName}</option>
                                        ))}
                                    </select>
                                </div>
                                <ol className="list" style={{ marginTop: "12px" }}>
                                    {(Array.isArray(allLeaderboards[selectedGameSafe]) ? allLeaderboards[selectedGameSafe] : []).map((row, index) => (
                                        <li key={`${row.userId}-${index}`} className="list-item">
                                            <span>{index + 1}</span>
                                            <span><strong>{row.username}</strong></span>
                                            <strong>{row.score}</strong>
                                        </li>
                                    ))}
                                </ol>
                                {(Array.isArray(allLeaderboards[selectedGameSafe]) ? allLeaderboards[selectedGameSafe] : []).length === 0 ? (
                                    <div className="muted" style={{ marginTop: "8px" }}>No scores for this game yet.</div>
                                ) : null}
                            </div>
                        ) : (
                            <div className="error" style={{ marginTop: "14px" }}>Could not load leaderboards.</div>
                        )}
                    </section>

                    <section id="games" className="card">
                        <h2>Available Games</h2>
                        <div className="showcase-games">
                            {games.map((name) => (
                                <article
                                    key={name}
                                    className={`promo-game-card ${selectedGame === name ? "active" : ""}`}
                                >
                                    <div className={`promo-game-art promo-game-art-${gameCardMeta[name]?.style || "matrix"}`}>
                                        <div className="promo-game-badge">Skill Games</div>
                                        <div className="promo-game-scene"></div>
                                    </div>

                                    <div className="promo-game-content">
                                        <h3>{gameCardMeta[name]?.title || name}</h3>
                                        <p>{gameCardMeta[name]?.copy || "Jump into this game and start playing right away."}</p>
                                    </div>

                                    <div className="promo-game-actions">
                                        <button
                                            type="button"
                                            className="promo-button promo-button-primary"
                                            onClick={() => setSelectedGame(name)}
                                        >
                                            Learn more
                                        </button>
                                        <button
                                            type="button"
                                            className="promo-button promo-button-secondary"
                                            onClick={() => {
                                                setSelectedGame(name);
                                                goToPlay(name === selectedGame ? (selectedLevel || "level1.json") : "level1.json");
                                            }}
                                        >
                                            Play now
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section id="multiplayer" className="card">
                        <h2>Multiplayer</h2>
                        <div className="muted" style={{ marginTop: "8px" }}>
                            Multiplayer section is ready. You can add your multiplayer games here later.
                        </div>
                    </section>
                </main>
            </div>

            <footer id="site-footer" className="site-footer">
                <div className="site-footer-stack">
                    <div className="site-footer-brand">Tap Tap games</div>
                    <div className="site-footer-copy">Tap Tap © 2026. All rights reserved.</div>
                </div>
                <div>
                    <div className="site-footer-column-title">Get To Know Us</div>
                    <div className="site-footer-links">
                        <span className="site-footer-link">All Games</span>
                        <span className="site-footer-link">All Categories</span>
                        <span className="site-footer-link">All Tags</span>
                        <span className="site-footer-link">Blog</span>
                        <span className="site-footer-link">About Us</span>
                    </div>
                </div>
                <div>
                    <div className="site-footer-column-title">Support</div>
                    <div className="site-footer-links">
                        <span className="site-footer-link">Contact Us</span>
                        <span className="site-footer-link">FAQ</span>
                        <span className="site-footer-link">DMCA</span>
                    </div>
                </div>
                <div>
                    <div className="site-footer-column-title">Privacy and Terms</div>
                    <div className="site-footer-links">
                        <span className="site-footer-link">Terms and Conditions</span>
                        <span className="site-footer-link">Privacy Policy</span>
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

            {showShortcutCard ? (
                <section className="shortcut-card" aria-live="polite">
                    <div className="shortcut-card-brand">
                        <div className="shortcut-card-logo">
                            <div className="shortcut-card-logo-line">Tap Tap</div>
                            <div className="shortcut-card-logo-line">games</div>
                        </div>
                    </div>
                    <div className="shortcut-card-copy">
                        <h3>{shortcutAdded ? "Shortcut ready for Tap Tap" : "Tap Tap on the desktop"}</h3>
                        <p>
                            {shortcutAdded
                                ? "Home link copied. You can pin it as a shortcut anytime."
                                : <>To quickly start games, add a shortcut for Tap, Sudoku, 2048, and Ludo.</>}
                        </p>
                    </div>
                    <div className="shortcut-card-actions">
                        <button className="shortcut-button shortcut-button-secondary" type="button" onClick={dismissShortcutCard}>
                            Later
                        </button>
                        <button className="shortcut-button shortcut-button-primary" type="button" onClick={addShortcutCard}>
                            {shortcutAdded ? "Added" : "Add"}
                        </button>
                    </div>
                </section>
            ) : null}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<HomePage />);

