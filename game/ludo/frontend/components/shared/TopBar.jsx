(function registerLudoTopBar(globalScope) {
    const ns = globalScope.TapTapLudoComponents = globalScope.TapTapLudoComponents || {};

    ns.TopBar = function TopBar({ onHome }) {
        return (
            <header className="card topbar">
                <div className="topbar-brand">Ludo (local 4-player)</div>
                <div className="topbar-actions">
                    <button type="button" className="btn btn-secondary" onClick={onHome}>
                        Home
                    </button>
                </div>
            </header>
        );
    };
})(window);

