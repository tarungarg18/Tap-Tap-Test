const { useEffect, useState } = React;

function LoginPage() {
    const api = window.TapTapApi;

    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

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

    return (
        <div className="page-wrap">
            <div className="auth-layout card">
                <h1>Welcome Back</h1>
                <div className="muted" style={{ marginTop: "6px" }}>
                    Log in to continue your progress.
                </div>

                <form onSubmit={onSubmit}>
                    <div className="field">
                        <label>Username or Email</label>
                        <input
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="Enter username or email"
                            required
                        />
                    </div>

                    <div className="field">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                        />
                    </div>

                    <div style={{ marginTop: "14px" }}>
                        <button type="submit" disabled={busy}>
                            {busy ? "Signing in..." : "Login"}
                        </button>
                    </div>
                </form>

                {error ? <div className="error">{error}</div> : null}

                <div style={{ marginTop: "14px" }} className="muted">
                    New user? <a href="/signup">Create account</a>
                </div>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<LoginPage />);
