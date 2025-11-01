//  Validate matric number (e.g., "23CK033439")
function validateMatricNumber(matricNumber) {
    // Pattern: 2 digits + 2 letters + 6 digits (e.g., 23CK033400)
    const matricPattern = /^[0-9]{2}[A-Z]{2}[0-9]{6}$/i;

    const regPattern = /^[0-9]{7}$/;
    return matricPattern.test(matricNumber) || regPattern.test(matricNumber);
}

// Validate level (must be one of 100, 200, 300, 400, 500)
function validateLevel(level) {
    const validLevels = [100, 200, 300, 400, 500, "Grad"];
    return validLevels.includes(Number(level));
}

module.exports = {
    validateMatricNumber,
    validateLevel,
}
