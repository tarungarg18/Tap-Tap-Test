(function registerLudoGameHeader(globalScope) {
    const ns = globalScope.TapTapLudoComponents = globalScope.TapTapLudoComponents || {};

    ns.GameHeader = function GameHeader({
        title,
        turnNumber,
        currentPlayerName,
        statusText,
        errorText,
        winner,
        localPlay
    }) {
        const bannerText = winner
            ? `${winner.name} wins.`
            : errorText || statusText || (localPlay ? "" : `Turn ${turnNumber || 1}: ${currentPlayerName || "-"}`);

        const bannerClass = winner ? "status-banner winner" : errorText ? "status-banner error" : "status-banner";

        return (
            <div className="game-header">
                <div className="game-header-top">
                    <h1 className="game-title">{title || "Ludo"}</h1>
                    <div className="turn-badge mine">
                        {localPlay ? `${currentPlayerName || "Player"}'s turn` : "Turn"}
                    </div>
                </div>

                {!localPlay ? (
                    <div className="summary-stats">
                        <article className="summary-stat">
                            <div className="summary-label">Turn</div>
                            <div className="summary-value">{turnNumber || 1}</div>
                        </article>
                    </div>
                ) : (
                    <div className="summary-stats summary-stats-compact">
                        <article className="summary-stat">
                            <div className="summary-label">Round</div>
                            <div className="summary-value">{turnNumber || 1}</div>
                        </article>
                    </div>
                )}

                {bannerText ? <div className={bannerClass}>{bannerText}</div> : null}
            </div>
        );
    };
})(window);

