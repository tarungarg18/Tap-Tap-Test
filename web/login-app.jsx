const { useEffect, useState } = React;

function getStoredTheme() {
    return localStorage.getItem("tapTapTheme") || "light";
}

function LoginPage() {
    const api = window.TapTapApi;
    const socialProviders = [
        { id: "google", name: "Google", accent: "google", logo: "G" },
        { id: "github", name: "GitHub", accent: "github", logo: "GH" },
        { id: "linkedin", name: "LinkedIn", accent: "linkedin", logo: "in" }
    ];
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [theme, setTheme] = useState(getStoredTheme);
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [socialMessage, setSocialMessage] = useState("");

    useEffect(() => {
        const token = api.getToken();
        if (!token) return;

        api.getMe()
            .then(() => {
                window.location.href = "/home";
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
            await api.login({ identifier, password });
            window.location.href = "/home";
        } catch (err) {
            setError(err.message || "Login failed");
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
            window.location.href = "/home";
            return;
        }

        if (query.includes("dashboard")) {
            window.location.href = "/dashboard";
            return;
        }

        if (query.includes("about") || query.includes("footer") || query.includes("contact")) {
            scrollToFooter();
            return;
        }

        if (query.includes("signup") || query.includes("create")) {
            window.location.href = "/signup";
        }
    }

    function onSocialClick(providerName) {
        setError("");
        setSocialMessage(`${providerName} login will be available soon.`);
    }

    const [remember, setRemember] = useState(false);

    return (
        <div className="page-wrap auth-page-stack login-page">
            <div className="login-hero-card card login-hero-title-card">
                <div className="hero-eyebrow">Welcome to the website</div>
                <a className="hero-button" href="/signup">Create Account</a>
            </div>

            <div className="login-card card login-panel-card">
                <div className="login-card-header">USER LOGIN</div>
                <form onSubmit={onSubmit} className="auth-form login-form">
                    <div className="field">
                        <label>Username</label>
                        <div className="input-with-icon">
                            <span className="input-icon">👤</span>
                            <input
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="Username"
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
                                placeholder="Password"
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

                    <div className="login-form-footer">
                        <label className="remember-label">
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                            />
                            Remember
                        </label>
                        <a className="forgot-link" href="/forgot-password">Forgot Password?</a>
                    </div>

                    <button type="submit" className="login-submit" disabled={busy}>
                        {busy ? "Signing in..." : "Login"}
                    </button>

                    {error ? <div className="error login-error">{error}</div> : null}
                </form>
                <div className="auth-switch muted">
                    New user? <a href="/signup">Create account</a>
                </div>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<LoginPage />);
