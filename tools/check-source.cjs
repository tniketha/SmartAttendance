const fs = require("node:fs");
const path = require("node:path");
const { parseSync } = require("@babel/core");
const { spawnSync } = require("node:child_process");

function checkFolder(folder, frontend) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) checkFolder(file, frontend);
    else if (/\.(js|jsx|cjs)$/.test(file)) checkFile(file, frontend);
  }
}
function checkFile(file, frontend) {
  if (frontend)
    parseSync(fs.readFileSync(file, "utf8"), {
      filename: file,
      babelrc: false,
      configFile: false,
      parserOpts: { sourceType: "module", plugins: ["jsx"] },
    });
  else {
    const result = spawnSync(process.execPath, ["--check", file], {
      stdio: "inherit",
      windowsHide: true,
    });
    if (result.status !== 0)
      throw new Error(`JavaScript syntax check failed: ${file}`);
  }
}
checkFile("App.jsx", true);
checkFolder("src", true);
for (const folder of ["server/src", "server/scripts", "server/tests", "tools"])
  checkFolder(folder, false);
console.log("JavaScript syntax checks passed.");
