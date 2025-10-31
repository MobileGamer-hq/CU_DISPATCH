// jobs/index.js
const path = require("path");
const fs = require("fs");

module.exports = function loadJobs(bot, appInstance) {
    const jobsPath = __dirname;

    fs.readdirSync(jobsPath).forEach((file) => {
        if (file.endsWith(".js") && file !== "index.js") {
            const job = require(path.join(jobsPath, file));

            // Each job file exports a function that takes (bot, appInstance)
            if (typeof job === "function") {
                job(bot, appInstance);
                console.log(`✅ Loaded job: ${file}`);
            }
        }
    });
};
