const { useEffect, useRef, useState } = React;

function getStoredTheme() {
    return localStorage.getItem("tapTapTheme") || "light";
}

function AboutPage() {
    const api = window.TapTapApi;
    const [theme, setTheme] = useState(getStoredTheme);
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [user, setUser] = useState(api.getUser());
    const menuRef = useRef(null);

    useEffect(() => {
        document.body.classList.remove("theme-light", "theme-dark");
        document.body.classList.add(`theme-${theme}`);
        localStorage.setItem("tapTapTheme", theme);
    }, [theme]);

    useEffect(() => {
        async function loadUser() {
            try {
                if (!api.getToken()) return;
                const payload = await api.getMe();
                setUser(payload?.user || null);
            } catch (err) {
                setUser(api.getUser());
            }
        }

        loadUser();
    }, []);

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

    function logout() {
        api.logout();
        api.navigate("/login");
    }

    function runSearch(event) {
        event.preventDefault();
        const query = searchText.trim().toLowerCase();
        if (!query) return;

        if (query.includes("home") || query.includes("game")) {
            api.navigate("/home");
            return;
        }

        if (query.includes("dashboard")) {
            api.navigate("/dashboard");
            return;
        }

        if (query.includes("contact")) {
            api.navigate("/home/contact-us");
            return;
        }

        if (query.includes("about")) {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
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
                    <button className="nav-pill" type="button" onClick={() => api.navigate("/home")}>Home</button>
                    <button className="nav-pill" type="button" onClick={() => api.navigate("/dashboard")}>Dashboard</button>
                    <button className="nav-pill active" type="button">About</button>
                    <button className="nav-pill" type="button" onClick={() => api.navigate("/home/contact-us")}>Contact Us</button>
                </div>

                <div className="navbar-actions">
                    <form className="navbar-search-trigger" onSubmit={runSearch}>
                        <span className="search-icon navbar-search-icon"></span>
                        <input
                            className="navbar-search-input"
                            type="text"
                            value={searchText}
                            onChange={(event) => setSearchText(event.target.value)}
                            placeholder="Search"
                            aria-label="Search pages"
                        />
                    </form>
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
                                    <div className="profile-card-name">{user?.username || "Tap Tap Player"}</div>
                                    <div className="profile-card-email">{user?.email || ""}</div>
                                    <button className="profile-card-link" type="button" onClick={() => api.navigate("/dashboard")}>Dashboard</button>
                                    <button className="profile-card-link danger" type="button" onClick={logout}>Logout</button>
                                </div>
                            ) : (
                                <div className="nav-dropdown">
                                    <div className="nav-dropdown-title">Guest</div>
                                    <button className="profile-card-link" type="button" onClick={() => api.navigate("/login")}>Login</button>
                                </div>
                            )
                        ) : null}
                    </div>
                </div>
            </nav>

            <main className="about-page">
                <section className="about-hero card">
                    <div className="about-hero-copy">
                        <div className="contact-eyebrow">About Us</div>
                        <p>
                            This page is ready for your final brand story. For now, it includes polished placeholder content
                            you can replace later with your company details, journey, and vision.
                        </p>
                        <div className="about-hero-actions">
                            <button className="promo-button promo-button-primary" type="button" onClick={() => api.navigate("/home")}>Explore Games</button>
                            <button className="promo-button promo-button-secondary" type="button" onClick={() => api.navigate("/home/contact-us")}>Contact Team</button>
                        </div>
                    </div>

                    <div className="about-hero-panel">
                        <div className="about-stat-card">
                            <span>Platform Focus</span>
                            <strong>Casual Web Games</strong>
                        </div>
                        <div className="about-stat-card">
                            <span>Experience</span>
                            <strong>Fast, Clean, Mobile Ready</strong>
                        </div>
                    </div>
                </section>

                <section className="about-grid">
                    <article className="card about-story-card">
                        <div className="about-section-tag">Our Story</div>
                        <h2>A simple starting point you can customize later</h2>
                        <p>
                            Game Hub started as a place to bring multiple game experiences together in one smooth interface.
                            You can replace this text with your real founder story, timeline, and brand background anytime.
                        </p>
                    </article>

                    <article className="card about-story-card">
                        <div className="about-section-tag">Our Mission</div>
                        <h2>Make games more accessible and enjoyable</h2>
                        <p>
                            This placeholder section can become your mission statement. Talk about the users you serve,
                            the problems you solve, and the kind of experience you want the platform to deliver.
                        </p>
                    </article>
                </section>

            </main>

            <footer id="site-footer" className="site-footer">
                <div className="site-footer-stack">
                    <div className="site-footer-brand">GAME HUB</div>
                    <div className="site-footer-copy">Game Hub (c) 2026. All rights reserved.</div>
                </div>
                <div>
                    <div className="site-footer-column-title">Get To Know Us</div>
                    <div className="site-footer-links">
                        <a className="site-footer-link" href="/home">All Games</a>
                        <a className="site-footer-link" href="/dashboard">Dashboard</a>
                        <a className="site-footer-link" href="/about">About Us</a>
                    </div>
                </div>
                <div>
                    <div className="site-footer-column-title">Support</div>
                    <div className="site-footer-links">
                        <a className="site-footer-link" href="/home/contact-us">Contact Us</a>
                        <a className="site-footer-link" href="/home/contact-us">FAQ</a>
                    </div>
                </div>
                <div>
                    <div className="site-footer-column-title">Privacy and Terms</div>
                    <div className="site-footer-links">
                        <a className="site-footer-link" href="/about">Terms and Conditions</a>
                        <a className="site-footer-link" href="/about">Privacy Policy</a>
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
root.render(<AboutPage />);
