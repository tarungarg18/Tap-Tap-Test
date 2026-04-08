(function registerDiceFace(globalScope) {
    const ns = globalScope.TapTapLudoComponents = globalScope.TapTapLudoComponents || {};

    const PIP_MAP = {
        1: [4],
        2: [0, 8],
        3: [0, 4, 8],
        4: [0, 2, 6, 8],
        5: [0, 2, 4, 6, 8],
        6: [0, 3, 6, 2, 5, 8]
    };

    ns.DiceFace = function DiceFace({ value, rolling, size = "md" }) {
        const v = Number(value);
        const safe = Number.isInteger(v) && v >= 1 && v <= 6 ? v : null;
        const active = safe ? new Set(PIP_MAP[safe]) : new Set();
        const sizeClass = size === "sm" ? "dice-box-sm" : "";

        return (
            <div
                className={`dice-box ${sizeClass} ${rolling ? "dice-rolling" : ""}`}
                aria-label={safe ? `Dice showing ${safe}` : "Dice"}
            >
                <div className="dice-pips">
                    {Array.from({ length: 9 }, (_, i) => (
                        <span key={i} className={active.has(i) ? "pip on" : "pip"} />
                    ))}
                </div>
            </div>
        );
    };
})(window);

