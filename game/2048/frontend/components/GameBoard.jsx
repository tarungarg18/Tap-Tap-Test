(function registerGameBoard(globalScope) {
    const ns = globalScope.TapTap2048Components = globalScope.TapTap2048Components || {};

    ns.GameBoard = function GameBoard({ board, boardSize, availableWidth = 520 }) {
        const gapSize = boardSize >= 7 ? 8 : 10;
        const maxBoardWidth = Math.max(280, Math.min(availableWidth - 12, 560));
        const cellSize = Math.max(
            34,
            Math.min(64, Math.floor((maxBoardWidth - gapSize * (boardSize - 1)) / (boardSize || 1)))
        );
        const boardPixelWidth = boardSize * cellSize + gapSize * (boardSize - 1);

        const boardStyle = {
            gridTemplateColumns: `repeat(${boardSize}, ${cellSize}px)`,
            gridAutoRows: `${cellSize}px`,
            gap: `${gapSize}px`,
            width: `${boardPixelWidth}px`,
            maxWidth: "100%"
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

