/**
 * 获取文件列表
 * @author pepedd864
 * @date 2024/7/22
 */
const fs = require("fs-extra");
const path = require("path");

/**
 * 读取文件夹，生成树形结构
 * @param dirPath
 * @returns {Promise<void>}
 */
module.exports = async function readDir(dirPath) {
  let result = {
    path: path.join("/", dirPath),
    type: "dir",
    children: []
  };

  async function _traverse(dirPath, parent) {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    for (const file of files) {
      if (file.isDirectory()) {
        const child = {
          name: file.name,
          path: path.join(parent.path, file.name),
          type: "dir",
          children: []
        };
        parent.children.push(child);
        await _traverse(path.join(dirPath, file.name), child);
      } else {
        parent.children.push({
          name: file.name,
          path: path.join(parent.path, file.name),
          suffix: path.extname(file.name),
          type: "file"
        });
      }
    }
  }

  const targetDir = path.join(__dirname, "../files", dirPath);
  await _traverse(targetDir, result);
  return result;
};

