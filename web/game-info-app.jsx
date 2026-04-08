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
        learnMoreSections: [
            {
                title: "About Game",
                items: [
                    "Tap Tap is a reflex-based arcade game built around speed and precision.",
                    "Players respond quickly to active targets that appear during the round.",
                    "It feels simple at first, but strong performance depends on consistency."
                ]
            },
            {
                title: "Features",
                items: [
                    "Fast-paced gameplay that rewards sharp reactions.",
                    "Simple tap interaction that is easy to understand.",
                    "Score chasing that makes repeat runs fun.",
                    "Energetic visuals and sound feedback."
                ]
            },
            {
                title: "How to Play",
                items: [
                    "Start the game and watch for targets to appear.",
                    "Tap each correct target before it disappears.",
                    "Keep your rhythm steady to maintain scoring momentum.",
                    "Avoid missed taps and wrong inputs during the round."
                ]
            },
            {
                title: "Game Rules",
                items: [
                    "Only the intended active targets should be tapped.",
                    "Wrong taps or missed targets can hurt your run.",
                    "The pace may increase, so reaction time matters more over time."
                ]
            },
            {
                title: "Score Logic",
                items: [
                    "You earn points for each successful target tap.",
                    "Better accuracy helps you build stronger total scores.",
                    "Mistakes reduce overall scoring efficiency compared with a clean run."
                ]
            },
            {
                title: "Control",
                items: [
                    "Use touch input on mobile devices.",
                    "Use the mouse to click targets on desktop.",
                    "Fast and precise input works better than random tapping."
                ]
            },
            {
                title: "Winning Logic",
                items: [
                    "Tap Tap focuses on finishing with the highest score possible.",
                    "A strong run depends on speed, control, and accuracy together.",
                    "Winning can mean beating your best score or leading the leaderboard."
                ]
            },
            {
                title: "Strategy Tips",
                items: [
                    "Prioritize accuracy before trying to play faster.",
                    "Keep your attention on the full play area, not one spot.",
                    "Stay relaxed so your tapping remains controlled.",
                    "Practice short sessions often to improve reaction timing."
                ]
            }
        ]
    },
    "sudoku": {
        title: "Sudoku",
        eyebrow: "Logic Puzzle",
        genre: "Brain / Strategy",
        image: "/web/public/suduko.jpeg",
        level: "level1.json",
        intro: "Classic 9x9 number puzzle that trains logic, focus, and patience with simple rules and endless variety.",
        learnMoreSections: [
            {
                title: "About Game",
                items: [
                    "Classic number puzzle played on a 9x9 grid.",
                    "Improves logic, focus, and problem-solving skills.",
                    "Perfect balance of relaxation and challenge."
                ]
            },
            {
                title: "Features",
                items: [
                    "Multiple difficulty levels from easy to hard.",
                    "Notes and hints to help solve tricky spots.",
                    "Timer mode to track your performance.",
                    "Clean UI for distraction-free gameplay."
                ]
            },
            {
                title: "How to Play",
                items: [
                    "Start a new puzzle.",
                    "Fill numbers from 1 to 9 in empty cells.",
                    "Avoid repeating numbers in rows, columns, or boxes.",
                    "Complete the grid correctly to win."
                ]
            },
            {
                title: "Game Rules",
                items: [
                    "Grid is divided into 9 rows, 9 columns, and 3x3 boxes.",
                    "Each number (19) appears only once per row.",
                    "Each number appears only once per column.",
                    "Each number appears only once per 3x3 box."
                ]
            },
            {
                title: "Score Logic",
                items: [
                    "Faster solving gives better scores.",
                    "Using hints may reduce your score.",
                    "Mistakes can add penalties (if enabled)."
                ]
            },
            {
                title: "Control",
                items: [
                    "Tap cells to select and fill numbers on mobile.",
                    "Use keyboard input on desktop for quick entry.",
                    "Switch to notes mode to record possibilities."
                ]
            },
            {
                title: "Winning Logic",
                items: [
                    "Fill the entire grid correctly with no conflicts.",
                    "Follow all row, column, and box rules.",
                    "Complete faster for a higher ranking."
                ]
            },
            {
                title: "Strategy Tips",
                items: [
                    "Scan rows and columns carefully before placing numbers.",
                    "Focus on one 3x3 box at a time.",
                    "Use notes to narrow down choices.",
                    "Avoid guessing lean on logic first."
                ]
            }
        ]
    },    "2048": {
        title: "2048",
        eyebrow: "Number Merge",
        genre: "Strategy / Puzzle",
        image: "/web/public/2048.jpeg",
        level: "level1.json",
        intro: "Swipe, merge, and plan your next move carefully. 2048 turns simple controls into a satisfying strategy game with strong replay value.",
        learnMoreSections: [
            {
                title: "About Game",
                items: [
                    "2048 is a number-merging puzzle game played on a compact grid.",
                    "Every swipe moves all tiles together, so each action matters.",
                    "Success depends on planning ahead and managing board space."
                ]
            },
            {
                title: "Features",
                items: [
                    "Simple directional controls that feel easy to learn.",
                    "Addictive merge mechanics with strong replay value.",
                    "Score tracking for personal best and competitive runs.",
                    "Strategic gameplay created by limited board space."
                ]
            },
            {
                title: "How to Play",
                items: [
                    "Swipe tiles up, down, left, or right.",
                    "When matching numbers collide, they merge into one tile.",
                    "Keep combining values to create larger numbers.",
                    "Continue building toward the 2048 tile while preserving space."
                ]
            },
            {
                title: "Game Rules",
                items: [
                    "All tiles slide together in the chosen direction.",
                    "Only tiles with the same value can merge.",
                    "A new tile appears after each valid move.",
                    "The game ends when no moves and no merges remain."
                ]
            },
            {
                title: "Score Logic",
                items: [
                    "Points are awarded when matching tiles merge.",
                    "Higher-value merges produce higher score gains.",
                    "Well-organized boards usually lead to better long-term scores."
                ]
            },
            {
                title: "Control",
                items: [
                    "Use swipe gestures on touch devices.",
                    "Use arrow keys or directional controls on desktop when available.",
                    "Choose directions carefully because each move affects the whole board."
                ]
            },
            {
                title: "Winning Logic",
                items: [
                    "The classic objective is to create the 2048 tile.",
                    "Many players continue beyond that to chase higher values.",
                    "If the board locks before the goal is reached, the round is lost."
                ]
            },
            {
                title: "Strategy Tips",
                items: [
                    "Keep your highest tile anchored in one corner.",
                    "Avoid random swipes that break your board order.",
                    "Try to build rows or columns in a consistent value pattern.",
                    "Protect empty spaces so you always have room to recover."
                ]
            }
        ]
    },
    ludo: {
        title: "Ludo",
        eyebrow: "Board Party",
        genre: "Board / Multiplayer",
        image: "/web/public/ludo.jpeg",
        level: "flexible.json",
        intro: "Classic board-game fun with colorful movement, race-to-home tension, and easy-to-follow turns. Ludo is designed for playful competition.",
        learnMoreSections: [
            {
                title: "About Game",
                items: [
                    "Ludo is a classic multiplayer board game centered on racing tokens home.",
                    "Players move colored pieces around the board using dice rolls.",
                    "It mixes luck, timing, and tactical choices in every match."
                ]
            },
            {
                title: "Features",
                items: [
                    "Multiplayer-friendly gameplay for fun competition.",
                    "Simple turn-based movement with colorful tokens.",
                    "Classic capture mechanics that add excitement.",
                    "Easy rules that make the game approachable for all ages."
                ]
            },
            {
                title: "How to Play",
                items: [
                    "Choose players and begin the match.",
                    "Roll the dice during your turn.",
                    "Bring tokens into play and move them along the path.",
                    "Guide all of your tokens safely toward home."
                ]
            },
            {
                title: "Game Rules",
                items: [
                    "A token usually needs a 6 to leave the base.",
                    "Tokens move according to the number rolled on the die.",
                    "Landing on an opponent can send that token back to base unless the space is safe.",
                    "Exact movement is often needed to enter the final home area."
                ]
            },
            {
                title: "Score Logic",
                items: [
                    "Ludo is mainly decided by race progress instead of heavy point scoring.",
                    "Strong play comes from safe advancement and smart captures.",
                    "Reaching home with more tokens faster reflects better performance."
                ]
            },
            {
                title: "Control",
                items: [
                    "Tap or click to roll the dice.",
                    "Select the token you want to move after the roll.",
                    "Use the highlighted legal move options when they appear."
                ]
            },
            {
                title: "Winning Logic",
                items: [
                    "You win by moving all of your tokens into home first.",
                    "Each token must complete the full route before entering the home path.",
                    "The first player to finish all tokens is the winner."
                ]
            },
            {
                title: "Strategy Tips",
                items: [
                    "Try to bring more than one token onto the board early.",
                    "Use safe spaces wisely when opponents are close.",
                    "Balance aggressive captures with steady progress.",
                    "Avoid leaving key tokens exposed without a reason."
                ]
            }
        ]
    }
};

function normalizeGameName(value) {
    return String(value || "").trim().toLowerCase();
}

const REQUIRED_SECTION_TITLES = [
    "About Game",
    "Features",
    "How to Play",
    "Game Rules",
    "Score Logic",
    "Control",
    "Winning Logic",
    "Strategy Tips"
];

function buildLearnMoreSections(sections) {
    const sectionMap = new Map(
        (Array.isArray(sections) ? sections : []).map((section) => [section.title, section])
    );

    return REQUIRED_SECTION_TITLES.map((title) => {
        const items = sectionMap.get(title)?.items;

        return {
            title,
            items: Array.isArray(items) && items.length > 0
                ? items
                : ["Details will be added here soon."]
        };
    });
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
        learnMoreSections: REQUIRED_SECTION_TITLES.map((title) => ({
            title,
            items: ["Details will be added here soon."]
        }))
    };
    const learnMoreSections = useMemo(
        () => buildLearnMoreSections(game.learnMoreSections),
        [game.learnMoreSections]
    );

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
                    {learnMoreSections.map((section) => (
                        <article key={`${game.title}-${section.title}`} className="card game-info-panel">
                            <div className="game-info-section-title">{section.title}</div>
                            <ul className="game-info-card-list">
                                {section.items.map((item, index) => (
                                    <li key={`${game.title}-${section.title}-${index}`} className="game-info-card-item">
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </section>
            </main>

            <footer id="site-footer" className="site-footer">
                <div className="site-footer-stack">
                    <div className="site-footer-brand">Game Hub</div>
                    <div className="site-footer-copy">Game Hub (c) 2026. All rights reserved.</div>
                </div>
                <div>
                    <div className="site-footer-column-title">Get To Know Us</div>
                    <div className="site-footer-links">
                        <a className="site-footer-link" href="/home">All Games</a>
                        <a className="site-footer-link" href="/dashboard">Dashboard</a>
                        <a className="site-footer-link" href="/home">About Us</a>
                    </div>
                </div>
                <div>
                    <div className="site-footer-column-title">Support</div>
                    <div className="site-footer-links">
                        <a className="site-footer-link" href="/home">Contact Us</a>
                        <a className="site-footer-link" href="/home">FAQ</a>
                    </div>
                </div>
                <div>
                    <div className="site-footer-column-title">Privacy and Terms</div>
                    <div className="site-footer-links">
                        <a className="site-footer-link" href="/home">Terms and Conditions</a>
                        <a className="site-footer-link" href="/home">Privacy Policy</a>
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

