//  Validate matric number (e.g., "23CK033439")
function validateMatricNumber(matricNumber) {
    // Pattern: 2 digits + 2 letters + 6 digits (e.g., 23CK033439)
    const matricPattern = /^[0-9]{2}[A-Z]{2}[0-9]{6}$/i;
    return matricPattern.test(matricNumber);
}

// Validate level (must be one of 100, 200, 300, 400, 500)
function validateLevel(level) {
    const validLevels = [100, 200, 300, 400, 500];
    return validLevels.includes(Number(level));
}

module.exports = {
    validateMatricNumber,
    validateLevel,
}
