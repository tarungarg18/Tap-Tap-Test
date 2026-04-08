(function registerGameStats(globalScope) {
    const ns = globalScope.TapTap2048Components = globalScope.TapTap2048Components || {};

    ns.GameStats = function GameStats({ score, timeLeft, targetTile, maxTile }) {
        return (
            <div className="stats">
                <div className="stat">
                    <div className="label">Score</div>
                    <div className="value">{score}</div>
                </div>

                <div className="stat">
                    <div className="label">Time Left</div>
                    <div className="value">{timeLeft}s</div>
                </div>

                <div className="stat">
                    <div className="label">Target / Max</div>
                    <div className="value">{targetTile} / {maxTile}</div>
                </div>
            </div>
        );
    };
})(window);

