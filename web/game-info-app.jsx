const { useEffect, useMemo, useState } = React;

function getStoredTheme() {
    return localStorage.getItem("tapTapTheme") || "light";
}

const GAME_DETAILS = {
    tap: {
        title: "Tap Tap Game",
        eyebrow: "Arcade Reflex",
        genre: "Arcade / Speed",
        image: "/web/public/tap.jpeg",
        level: "level1.json",
        intro: "Fast, reactive, and competitive. Tap Tap is built around quick decisions, clean controls, and score chasing that keeps each round exciting.",
        featuresTitle: "Features of Tap Tap Game",
        howToPlayTitle: "How to Play (Simple Steps)",
        features: [
            "⚡ Fast-Paced Gameplay - Test your speed and reflexes.",
            "🎯 Simple Controls - Just tap the screen to play.",
            "📈 Increasing Difficulty - Game gets faster as you progress.",
            "🏆 High Score Tracking - Try to beat your best score.",
            "🎮 Addictive & Fun - Easy to learn, hard to master.",
            "🔊 Sound Effects & Animations - Makes gameplay more engaging."
        ],
        howToPlay: [
            "▶️ Start the game.",
            "👆 Tap on the targets as they appear on the screen.",
            "⏱️ Tap quickly before time runs out.",
            "❌ Avoid missing taps or tapping wrong areas.",
            "🏁 Keep playing to score higher points and beat your record."
        ]
    },
    sudoku: {
        title: "Sudoku",
        eyebrow: "Mind Challenge",
        genre: "Puzzle / Brain Game",
        image: "/web/public/suduko.jpeg",
        level: "level1.json",
        intro: "A focused logic game with neat structure and satisfying puzzle solving. Sudoku is perfect for players who enjoy pattern recognition and steady progress.",
        featuresTitle: "Features",
        howToPlayTitle: "How to Play",
        features: [
            "🧠 Brain Training Game - Improves logic and problem-solving skills",
            "📊 Multiple Difficulty Levels - Easy to Hard modes",
            "🖍️ Hints & Notes Option - Helps solve tricky puzzles",
            "⏱️ Timer Mode - Track your solving time",
            "🎯 Clean & Simple Interface - Easy to focus and play"
        ],
        howToPlay: [
            "▶️ Start a new puzzle.",
            "🔢 Fill the grid with numbers from 1 to 9.",
            "🚫 Each number must appear only once in every row, column, and box.",
            "💡 Use hints if you get stuck.",
            "🏁 Complete the grid correctly to win."
        ]
    },
    "2048": {
        title: "2048",
        eyebrow: "Number Merge",
        genre: "Strategy / Puzzle",
        image: "/web/public/2048.jpeg",
        level: "level1.json",
        intro: "Swipe, merge, and plan your next move carefully. 2048 turns simple controls into a satisfying strategy game with strong replay value.",
        featuresTitle: "Features",
        howToPlayTitle: "How to Play",
        features: [
            "🎮 Simple Swipe Gameplay - Easy controls",
            "🔄 Addictive Mechanics - Keep merging numbers",
            "📈 Score Tracking - Beat your highest score",
            "🧠 Strategic Thinking - Plan your moves carefully",
            "✨ Smooth Animations - Clean and engaging design"
        ],
        howToPlay: [
            "▶️ Start the game.",
            "⬆️ ⬇️ ⬅️ ➡️ Swipe in any direction to move tiles.",
            "🔢 Merge tiles with the same number (2+2=4).",
            "🚀 Keep merging to reach 2048 tile.",
            "❌ Game ends when no moves are left."
        ]
    },
    ludo: {
        title: "Ludo",
        eyebrow: "Board Party",
        genre: "Board / Multiplayer",
        image: "/web/public/ludo.jpeg",
        level: "flexible.json",
        intro: "Classic board-game fun with colorful movement, race-to-home tension, and easy-to-follow turns. Ludo is designed for playful competition.",
        featuresTitle: "Features",
        howToPlayTitle: "How to Play",
        features: [
            "👥 Multiplayer Mode - Play with friends or AI",
            "🎲 Classic Board Game - Fun and nostalgic gameplay",
            "🎨 Colorful Design - Red, Blue, Green, Yellow players",
            "🏆 Winning System - Race to reach home first",
            "🔊 Sound Effects & Animations - Interactive experience"
        ],
        howToPlay: [
            "▶️ Start the game and choose players.",
            "🎲 Roll the dice to move your token.",
            "🚪 Get a 6 to bring a token onto the board.",
            "🔄 Move tokens according to dice numbers.",
            "❌ Capture opponents by landing on them.",
            "🏁 Reach the center (home) with all tokens to win."
        ]
    }
};

function normalizeGameName(value) {
    return String(value || "").trim().toLowerCase();
}

function getGameFromPath() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    return normalizeGameName(parts[parts.length - 1]);
}

function GameInfoPage() {
    const api = window.TapTapApi;
    const [theme, setTheme] = useState(getStoredTheme);
    const gameKey = useMemo(() => getGameFromPath(), []);
    const game = GAME_DETAILS[gameKey] || {
        title: gameKey ? gameKey.toUpperCase() : "Game",
        eyebrow: "Game Overview",
        genre: "Game",
        image: "/web/public/tap.jpeg",
        level: "level1.json",
        intro: "Explore this game, learn its core mechanics, and jump in when you are ready.",
        featuresTitle: "Features",
        howToPlayTitle: "How to Play",
        features: [
            "Built to be easy to start and fun to replay.",
            "Designed with quick access and clear controls.",
            "A good fit for casual play sessions and score chasing."
        ],
        howToPlay: [
            "Open the game and review the basic objective.",
            "Follow the on-screen controls to begin your round.",
            "Play a few rounds to get comfortable with the mechanics.",
            "Keep improving your timing, strategy, or accuracy."
        ]
    };

    useEffect(() => {
        document.body.classList.remove("theme-light", "theme-dark");
        document.body.classList.add(`theme-${theme}`);
        localStorage.setItem("tapTapTheme", theme);
    }, [theme]);

    function goHome() {
        api.navigate("/home");
    }

    function playGame() {
        if (!api.getToken()) {
            api.navigate("/login");
            return;
        }
        window.location.href = `/games/${encodeURIComponent(gameKey)}?level=${encodeURIComponent(game.level)}`;
    }

    return (
        <div className="page-wrap game-info-page">
            <nav className="navbar">
                <div className="navbar-brand">
                    <button
                        className="navbar-game-brand"
                        type="button"
                        onClick={goHome}
                        aria-label="Go to homepage"
                    >
                        <div className="navbar-game-brand-line">GAME</div>
                        <div className="navbar-game-brand-line">HUB</div>
                    </button>
                </div>

                <div className="navbar-center">
                    <button className="nav-pill" type="button" onClick={goHome}>Home</button>
                    <button className="nav-pill" type="button" onClick={() => api.navigate("/dashboard")}>Dashboard</button>
                    <button className="nav-pill active" type="button">{game.title}</button>
                </div>

                <div className="navbar-actions">
                    <button
                        className="theme-toggle icon-toggle"
                        type="button"
                        aria-label={theme === "light" ? "Enable dark mode" : "Enable light mode"}
                        onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
                    >
                        <span className={`theme-icon ${theme === "light" ? "theme-icon-moon" : "theme-icon-sun"}`}></span>
                    </button>
                </div>
            </nav>

            <main className="game-info-layout">
                <section className="game-info-hero card">
                    <div className="game-info-orb game-info-orb-a"></div>
                    <div className="game-info-orb game-info-orb-b"></div>
                    <div className="game-info-copy">
                        <span className="game-info-eyebrow">{game.eyebrow}</span>
                        <h1>{game.title}</h1>
                        <div className="game-info-genre">{game.genre}</div>
                        <p>{game.intro}</p>

                        <div className="game-info-actions">
                            <button type="button" className="promo-button promo-button-primary" onClick={playGame}>
                                Play now
                            </button>
                            <button type="button" className="promo-button promo-button-secondary" onClick={goHome}>
                                Back to home
                            </button>
                        </div>
                    </div>

                    <div className="game-info-art-wrap">
                        <img className="game-info-art" src={game.image} alt={game.title} />
                    </div>
                </section>

                <section className="game-info-grid">
                    <article className="card game-info-panel">
                        <div className="game-info-section-title">{game.featuresTitle || "Features"}</div>
                        <div className="game-info-list">
                            {game.features.map((item, index) => (
                                <div key={`${game.title}-feature-${index}`} className="game-info-list-item">
                                    <span className="game-info-list-index">{index + 1}.</span>
                                    <p>{item}</p>
                                </div>
                            ))}
                        </div>
                    </article>

                    <article className="card game-info-panel">
                        <div className="game-info-section-title">{game.howToPlayTitle || "How to Play"}</div>
                        <div className="game-info-list">
                            {game.howToPlay.map((item, index) => (
                                <div key={`${game.title}-how-${index}`} className="game-info-list-item">
                                    <span className="game-info-list-index">{index + 1}.</span>
                                    <p>{item}</p>
                                </div>
                            ))}
                        </div>
                    </article>
                </section>
            </main>

            <footer id="site-footer" className="site-footer">
                <div className="site-footer-stack">
                    <div className="site-footer-brand">Game Hub</div>
                    <div className="site-footer-copy">Game Hub © 2026. All rights reserved.</div>
                </div>
                <div>
                    <div className="site-footer-column-title">Get To Know Us</div>
                    <div className="site-footer-links">
                        <span className="site-footer-link">All Games</span>
                        <span className="site-footer-link">Categories</span>
                        <span className="site-footer-link">Progress</span>
                    </div>
                </div>
                <div>
                    <div className="site-footer-column-title">Support</div>
                    <div className="site-footer-links">
                        <span className="site-footer-link">Contact Us</span>
                        <span className="site-footer-link">FAQ</span>
                        <span className="site-footer-link">Resources</span>
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
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<GameInfoPage />);
