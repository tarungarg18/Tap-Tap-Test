const { useEffect, useRef, useState } = React;

function getStoredTheme() {
    return localStorage.getItem("tapTapTheme") || "light";
}

function ContactPage() {
    const api = window.TapTapApi;
    const supportContacts = [
        { name: "Tara Chand", phone: "+91 7056202923", email: "tarachandgarg79@gmail.com" },
        { name: "Vasudev", phone: "+91 7678971445", email: "vasudevkumar1445@gmail.com" }
    ];
    const [theme, setTheme] = useState(getStoredTheme);
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [user, setUser] = useState(api.getUser());
    const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", message: "" });
    const [contactBusy, setContactBusy] = useState(false);
    const [contactError, setContactError] = useState("");
    const [contactSuccess, setContactSuccess] = useState("");
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

    function handleContactChange(event) {
        const { name, value } = event.target;
        setContactForm((current) => ({ ...current, [name]: value }));
    }

    async function submitContactForm(event) {
        event.preventDefault();
        setContactBusy(true);
        setContactError("");
        setContactSuccess("");

        try {
            const payload = await api.submitContactRequest(contactForm);
            setContactSuccess(payload?.message || "Your message has been sent successfully.");
            setContactForm({ name: "", email: "", phone: "", message: "" });
        } catch (err) {
            setContactError(err.message || "We could not submit your request right now.");
        } finally {
            setContactBusy(false);
        }
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

        if (query.includes("about")) {
            api.navigate("/about");
            return;
        }

        if (query.includes("contact")) {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }

    return (
        <div className="page-wrap">
            <nav className="navbar">
                <div className="navbar-brand">
                    <button className="navbar-game-brand" type="button" onClick={() => api.navigate("/home")} aria-label="Go to homepage">
                        <div className="navbar-game-brand-line">GAME</div>
                        <div className="navbar-game-brand-line">HUB</div>
                    </button>
                </div>

                <div className="navbar-center">
                    <button className="nav-pill" type="button" onClick={() => api.navigate("/home")}>Home</button>
                    <button className="nav-pill" type="button" onClick={() => api.navigate("/dashboard")}>Dashboard</button>
                    <button className="nav-pill" type="button" onClick={() => api.navigate("/about")}>About</button>
                    <button className="nav-pill active" type="button">Contact Us</button>
                </div>

                <div className="navbar-actions">
                    <form className="navbar-search-trigger" onSubmit={runSearch}>
                        <span className="search-icon navbar-search-icon"></span>
                        <input className="navbar-search-input" type="text" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search" aria-label="Search pages" />
                    </form>
                    <button className="theme-toggle icon-toggle" type="button" aria-label={theme === "light" ? "Enable dark mode" : "Enable light mode"} onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}>
                        <span className={`theme-icon ${theme === "light" ? "theme-icon-moon" : "theme-icon-sun"}`}></span>
                    </button>

                    <div className="nav-menu-wrap" ref={menuRef}>
                        <button className="profile-toggle" type="button" aria-label="Open account menu" onClick={() => setMenuOpen((value) => !value)}>
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
                <section className="contact-shell card">
                    <div className="contact-copy">
                        <div className="contact-eyebrow">Contact Us</div>
                        <h2>Let's plan your next move together.</h2>

                        <div className="contact-people-grid">
                            {supportContacts.map((person) => (
                                <article key={person.email} className="contact-person-card">
                                    <div className="contact-person-badge">{person.name.slice(0, 2).toUpperCase()}</div>
                                    <div>
                                        <h3>{person.name}</h3>
                                        <a className="contact-detail-link" href={`tel:${person.phone.replace(/\s+/g, "")}`}>{person.phone}</a>
                                        <a className="contact-detail-link" href={`mailto:${person.email}`}>{person.email}</a>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <div className="contact-highlight">
                            You can submit the form and wait for our reply, or contact Tara Chand or Vasudev directly for quick assistance.
                        </div>
                    </div>

                    <form className="contact-form-card" onSubmit={submitContactForm}>
                        <div className="contact-form-header">
                            <span className="contact-form-kicker">Reach Out</span>
                            <h3>We would love to hear from you</h3>
                        </div>

                        <div className="row">
                            <div className="field">
                                <label htmlFor="contact-name">Full Name</label>
                                <input id="contact-name" name="name" type="text" value={contactForm.name} onChange={handleContactChange} placeholder="Enter your full name" required />
                            </div>
                            <div className="field">
                                <label htmlFor="contact-phone">Phone Number</label>
                                <input id="contact-phone" name="phone" type="tel" value={contactForm.phone} onChange={handleContactChange} placeholder="+91 98765 43210" required />
                            </div>
                        </div>

                        <div className="field">
                            <label htmlFor="contact-email">Email Address</label>
                            <input id="contact-email" name="email" type="email" value={contactForm.email} onChange={handleContactChange} placeholder="Enter your email address" required />
                        </div>

                        <div className="field">
                            <label htmlFor="contact-message">Message</label>
                            <textarea id="contact-message" className="contact-form-textarea" name="message" value={contactForm.message} onChange={handleContactChange} placeholder="Tell us how we can help you." required></textarea>
                        </div>

                        <button type="submit" className="contact-submit" disabled={contactBusy}>
                            {contactBusy ? "Sending..." : "Send Message"}
                        </button>

                        {contactError ? <div className="error">{contactError}</div> : null}
                        {contactSuccess ? <div className="success-text">{contactSuccess}</div> : null}
                    </form>
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
root.render(<ContactPage />);

