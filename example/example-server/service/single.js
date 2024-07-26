/**
 * TODO
 * @author pepedd864
 * @date 2024/7/22
 */
const fs = require("fs");
const path = require("path");
const fileUtils = require("../utils/fileUtils");
const filesDir = path.join(__dirname, "../files");

function writeFile(filepath, filename, buffer) {
  fileUtils.mkdirGuard(path.join(filesDir, filepath));
  return fs.promises.writeFile(path.join(filesDir, filepath, filename), buffer);
}

exports.writeFile = writeFile;
