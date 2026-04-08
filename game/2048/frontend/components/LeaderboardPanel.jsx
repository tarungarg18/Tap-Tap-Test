(function registerLeaderboardPanel(globalScope) {
    const ns = globalScope.TapTap2048Components = globalScope.TapTap2048Components || {};

    ns.LeaderboardPanel = function LeaderboardPanel({ leaderboard, levelLabel }) {
        const Panel = ns.Panel;

        function renderStars(score) {
            const starCount = Math.min(5, Math.max(1, Math.round((score || 0) / 700)));
            return Array.from({ length: starCount }, (_, index) => (
                <span key={index} className="leaderboard-star">★</span>
            ));
        }

        return (
            <Panel className="leaderboard">
                <h2>{levelLabel ? `${levelLabel} Leaderboard` : "Leaderboard"}</h2>
                <ol className="leaderboard-list">
                    {leaderboard.map((entry, index) => (
                        <li key={`${entry.username}-${entry.updatedAt || index}`} className="leaderboard-item">
                            <div className={`leaderboard-rank rank-${Math.min(index + 1, 4)}`}>
                                {index + 1}
                            </div>
                            <div className="leaderboard-player">
                                <div className="leaderboard-avatar">{entry.username?.charAt(0)?.toUpperCase() || "?"}</div>
                                <div className="leaderboard-player-info">
                                    <div className="player-name">{entry.username}</div>
                                    <div className="player-stars">{renderStars(entry.score)}</div>
                                    {entry.level ? <div className="player-level">Level: {entry.level}</div> : null}
                                </div>
                            </div>
                            <div className="leaderboard-score">{entry.score}</div>
                        </li>
                    ))}
                </ol>

                {leaderboard.length === 0 ? (
                    <div className="status">No scores yet. Finish a game to add one.</div>
                ) : null}
            </Panel>
        );
    };
})(window);
