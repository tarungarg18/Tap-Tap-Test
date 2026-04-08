const { useEffect, useState } = React;

function getStoredTheme() {
    return localStorage.getItem("tapTapTheme") || "light";
}

function SignupPage() {
    const api = window.TapTapApi;
    const socialProviders = [
        { id: "google", name: "Google", accent: "google", logo: "G" },
        { id: "github", name: "GitHub", accent: "github", logo: "GH" },
        { id: "linkedin", name: "LinkedIn", accent: "linkedin", logo: "in" }
    ];
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [theme, setTheme] = useState(getStoredTheme);
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [socialMessage, setSocialMessage] = useState("");

    const passwordReady = password.length >= 6;

    useEffect(() => {
        const token = api.getToken();
        if (!token) return;

        api.getMe()
            .then(() => {
                api.navigate("/home", { replace: true });
            })
            .catch(() => {
                api.clearSession();
            });
    }, []);

    useEffect(() => {
        document.body.classList.remove("theme-light", "theme-dark");
        document.body.classList.add(`theme-${theme}`);
        localStorage.setItem("tapTapTheme", theme);
    }, [theme]);

    async function onSubmit(event) {
        event.preventDefault();
        setBusy(true);
        setError("");

        try {
            await api.signup({ username, email, password });
            api.navigate("/home");
        } catch (err) {
            setError(err.message || "Signup failed");
        } finally {
            setBusy(false);
        }
    }

    function scrollToFooter() {
        document.getElementById("site-footer")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function runSearch(event) {
        event.preventDefault();
        const query = searchText.trim().toLowerCase();
        if (!query) return;

        if (query.includes("home") || query.includes("tap") || query.includes("sudoku") || query.includes("2048")) {
            api.navigate("/home");
            return;
        }

        if (query.includes("dashboard")) {
            api.navigate("/dashboard");
            return;
        }

        if (query.includes("about") || query.includes("footer") || query.includes("contact")) {
            scrollToFooter();
            return;
        }

        if (query.includes("login")) {
            api.navigate("/login");
        }
    }

    function onSocialClick(providerName) {
        setError("");
        setSocialMessage(`${providerName} signup will be available soon.`);
    }

    return (
        <div className="page-wrap auth-page-stack auth-page-grid login-page">
            <div className="login-hero-card card login-hero-title-card">
                <div className="hero-eyebrow">WELCOME TO  GAMEHUB</div>
              <p className="hero-text" >Your Next Game Starts Here</p>
            </div>

            <div className="login-card card login-panel-card">
                <div className="login-card-header">CREATE ACCOUNT</div>
                <form onSubmit={onSubmit} className="auth-form login-form">
                    <div className="field">
                        <label>Username</label>
                        <div className="input-with-icon">
                            <span className="input-icon">👤</span>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Choose username"
                                minLength={3}
                                maxLength={32}
                                required
                            />
                        </div>
                    </div>

                    <div className="field">
                        <label>Email</label>
                        <div className="input-with-icon">
                            <span className="input-icon">📧</span>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email address"
                                required
                            />
                        </div>
                    </div>

                    <div className="field">
                        <label>Password</label>
                        <div className="input-with-icon">
                            <span className="input-icon">🔒</span>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="At least 6 characters"
                                minLength={6}
                                required
                            />
                            <button
                                type="button"
                                className="inline-button"
                                onClick={() => setShowPassword((value) => !value)}
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="login-submit" disabled={busy}>
                        {busy ? "Creating account..." : "Signup"}
                    </button>

                    {error ? <div className="error login-error">{error}</div> : null}
                    {socialMessage ? <div className="success-text">{socialMessage}</div> : null}
                </form>
                <div className="auth-switch muted">
                    Already have an account? <a href="/login">Login</a>
                </div>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SignupPage />);

