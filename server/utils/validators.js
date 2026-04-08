function isSafeName(value) {
    return /^[a-zA-Z0-9_-]+$/.test(value || "");
}

function isSafeLevelFile(value) {
    return /^[a-zA-Z0-9_.-]+\.json$/.test(value || "");
}

module.exports = {
    isSafeName,
    isSafeLevelFile
};

