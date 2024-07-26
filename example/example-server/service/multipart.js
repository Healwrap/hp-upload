/**
 * TODO
 * @author pepedd864
 * @date 2024/7/22
 */
const path = require("path");
const fs = require("fs");
const fileUtils = require("../utils/fileUtils");

// 相关的路径，不存在的话，会使用函数创建
const fileInfoDir = path.join(__dirname, "../fileInfo");
const filesDir = path.join(__dirname, "../files");
const chunkDir = path.join(__dirname, "../chunks");

/**
 * 获取上传的文件信息
 */
async function getFileInfo(id) {
  const absPath = path.join(fileInfoDir, `${id}.json`);
  if (!fs.existsSync(absPath)) {
    return null;
  }
  const json = await fs.promises.readFile(absPath, "utf-8");
  return JSON.parse(json);
}

/**
 * 写入上传的文件信息
 */
function writeFileInfo(id, filename, ext, filepath, chunkIds, needs = chunkIds) {
  return fs.promises.writeFile(
    path.join(fileInfoDir, `${id}.json`),
    JSON.stringify({
      id,
      filename,
      ext,
      filepath,
      chunkIds,
      needs
    })
  );
}

/**
 * 写入分片到文件中
 */
function createFileChunk(id, buffer) {
  const absPath = path.join(chunkDir, id);
  if (!fs.existsSync(absPath)) {
    fs.writeFileSync(absPath, buffer);
  }
}

/**
 * 写入分片完成之后更新needs
 */
async function addChunkToFileInfo(chunkId, fileId) {
  const fileInfo = await getFileInfo(fileId);
  if (!fileInfo) {
    return null;
  }
  fileInfo.needs = fileInfo.needs.filter((it) => it !== chunkId);
  await writeFileInfo(
    fileId,
    fileInfo.filename,
    fileInfo.ext,
    fileInfo.filepath,
    fileInfo.chunkIds,
    fileInfo.needs
  );
  return getFileInfo(fileId);
}

/**
 * 根据文件信息和文件分片合并文件保存
 */
async function combine(fileInfo) {
  // 1. 将该文件的所有分片合并
  const target = path.join(filesDir, fileInfo.filepath, fileInfo.filename);
  fileUtils.mkdirGuard(path.dirname(target));

  async function _moveChunk(chunkId) {
    const chunkPath = path.join(chunkDir, chunkId);
    const buffer = await fs.promises.readFile(chunkPath);
    await fs.promises.appendFile(target, buffer);
    await fs.promises.rm(chunkPath);
  }

  for (const chunkId of fileInfo.chunkIds) {
    await _moveChunk(chunkId);
  }

  // 删除文件信息
  await fs.promises.rm(path.join(fileInfoDir, `${fileInfo.id}.json`));
}

/**
 * return:
 * null: 没有此文件，也没有文件信息
 * true: 有此文件，无须重新上传
 * object：没有此文件，但有该文件的信息
 */
exports.getFileInfo = async function(id, filename, filepath) {
  const absPath = path.join(filesDir, filepath, filename);
  if (fs.existsSync(absPath)) {
    return true;
  }
  return await getFileInfo(id);
};
/**
 * 写入文件信息
 */
exports.writeFileInfo = writeFileInfo;
/**
 * 处理分片
 */
exports.handleChunk = async function(chunkId, fileId, chunkBuffer) {
  let fileInfo = await getFileInfo(fileId);
  if (!fileInfo) {
    throw new Error("请先提交文件分片信息");
  }
  if (!fileInfo.chunkIds.includes(chunkId)) {
    throw new Error("该文件没有此分片信息");
  }
  if (!fileInfo.needs.includes(chunkId)) {
    // 此分片已经上传
    return fileInfo.needs;
  }
  // 处理分片
  await createFileChunk(chunkId, chunkBuffer);
  fileInfo = await addChunkToFileInfo(chunkId, fileId);
  if (fileInfo.needs.length > 0) {
    return fileInfo.needs;
  } else {
    // 全部传完了
    await combine(fileInfo);
    return [];
  }
};
