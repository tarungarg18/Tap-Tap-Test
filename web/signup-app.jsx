const { useEffect, useState } = React;

function SignupPage() {
    const api = window.TapTapApi;

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
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
            await api.signup({ username, email, password });
            window.location.href = "/home";
        } catch (err) {
            setError(err.message || "Signup failed");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="page-wrap">
            <div className="auth-layout card">
                <h1>Create Account</h1>
                <div className="muted" style={{ marginTop: "6px" }}>
                    Unique username and email are required.
                </div>

                <form onSubmit={onSubmit}>
                    <div className="field">
                        <label>Username</label>
                        <input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Choose username"
                            minLength={3}
                            maxLength={32}
                            required
                        />
                    </div>

                    <div className="field">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter email"
                            required
                        />
                    </div>

                    <div className="field">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            minLength={6}
                            required
                        />
                    </div>

                    <div style={{ marginTop: "14px" }}>
                        <button type="submit" disabled={busy}>
                            {busy ? "Creating account..." : "Signup"}
                        </button>
                    </div>
                </form>

                {error ? <div className="error">{error}</div> : null}

                <div style={{ marginTop: "14px" }} className="muted">
                    Already have account? <a href="/login">Login</a>
                </div>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SignupPage />);
