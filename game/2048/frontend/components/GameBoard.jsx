(function registerGameBoard(globalScope) {
    const ns = globalScope.TapTap2048Components = globalScope.TapTap2048Components || {};

    ns.GameBoard = function GameBoard({ board, boardSize }) {
        const boardStyle = {
            gridTemplateColumns: `repeat(${boardSize}, minmax(60px, 1fr))`
        };

        return (
            <div className="board" style={boardStyle}>
                {board.flatMap((row, rowIndex) =>
                    row.map((value, colIndex) => {
                        const classByValue = value > 0 ? `v${value}` : "empty";
                        const tileClass = value > 2048 ? "super" : classByValue;

                        return (
                            <div
                                key={`${rowIndex}-${colIndex}`}
                                className={`tile ${tileClass}`}
                            >
                                {value || ""}
                            </div>
                        );
                    })
                )}
            </div>
        );
    };
})(window);
