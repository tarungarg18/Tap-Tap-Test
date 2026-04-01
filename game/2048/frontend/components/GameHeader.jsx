(function registerGameHeader(globalScope) {
    const ns = globalScope.TapTap2048Components = globalScope.TapTap2048Components || {};

    ns.GameHeader = function GameHeader({
        gameTitle,
        selectedLevel,
        levels,
        loading,
        onLevelChange,
        onRestart
    }) {
        return (
            <div className="header">
                <h1 className="title">{gameTitle}</h1>

                <div className="actions">
                    <select
                        value={selectedLevel}
                        onChange={(event) => onLevelChange(event.target.value)}
                        disabled={loading}
                        aria-label="Select level"
                    >
                        {levels.map((levelName) => (
                            <option key={levelName} value={levelName}>{levelName}</option>
                        ))}
                    </select>

                    <button onClick={onRestart} disabled={loading}>Restart</button>
                </div>
            </div>
        );
    };
})(window);
