(function registerSharedPanel(globalScope) {
    const ns = globalScope.TapTap2048Components = globalScope.TapTap2048Components || {};

    ns.Panel = function Panel({ children, className = "" }) {
        const panelClass = className ? `panel ${className}` : "panel";
        return <section className={panelClass}>{children}</section>;
    };
})(window);
