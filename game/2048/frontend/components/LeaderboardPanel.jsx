(function registerLeaderboardPanel(globalScope) {
    const ns = globalScope.TapTap2048Components = globalScope.TapTap2048Components || {};

    ns.LeaderboardPanel = function LeaderboardPanel({ leaderboard }) {
        const Panel = ns.Panel;

        return (
            <Panel className="leaderboard">
                <h2>Leaderboard</h2>
                <ol className="leaderboard-list">
                    {leaderboard.map((entry, index) => (
                        <li key={`${entry.username}-${entry.updatedAt}-${index}`} className="leaderboard-item">
                            <span className="rank">{index + 1}</span>
                            <span className="player">{entry.username}</span>
                            <span className="score">{entry.score}</span>
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
