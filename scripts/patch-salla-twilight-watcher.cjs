const fs = require("fs");

const watcherPath = (() => {
  try {
    return require.resolve("@salla.sa/twilight/watcher.js");
  } catch (error) {
    console.warn("[patch-twilight-watcher] watcher.js was not found, skipping.");
    return null;
  }
})();

if (!watcherPath) {
  process.exit(0);
}

const brokenCommand =
  'theme sync -f "${file}" -id ${this.theme_id}  -store_id ${this.store_id} -draft_id ${this.draft_id}  -upload_url ${this.upload_url}';
const fixedCommand =
  'theme sync -f "${file}" -i ${this.theme_id} --store_id ${this.store_id} --draft_id ${this.draft_id} --upload_url ${this.upload_url}';

const source = fs.readFileSync(watcherPath, "utf8");

if (source.includes(fixedCommand)) {
  console.log("[patch-twilight-watcher] watcher sync command is already patched.");
  process.exit(0);
}

if (!source.includes(brokenCommand)) {
  console.warn("[patch-twilight-watcher] expected sync command was not found, skipping.");
  process.exit(0);
}

fs.writeFileSync(watcherPath, source.replace(brokenCommand, fixedCommand));
console.log("[patch-twilight-watcher] patched watcher sync command.");
