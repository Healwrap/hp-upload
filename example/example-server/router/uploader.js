/**
 * TODO
 * @author pepedd864
 * @date 2024/7/22
 */
const express = require("express");
const router = express.Router();
const { handleChunk, getFileInfo, writeFileInfo } = require("../service/multipart");
const singleUploader = require("../service/single");
/**
 * 使用Multer中间件处理文件上传。
 * 存储配置为内存存储。
 */
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({
  storage
}).single("file");
/**
 * 处理分片文件上传
 */
router.post("/multipart", upload, async (req, res) => {
  const needs = await handleChunk(
    req.body.chunkId,
    req.body.fileId,
    req.file.buffer
  );
  res.send({
    code: 0,
    msg: "",
    data: needs
  });
});
/**
 * 分片文件上传
 * 握手，确认上传信息
 */
router.post("/multipart/handshake", async (req, res) => {
  const result = await getFileInfo(req.body.fileId, req.body.name, req.body.path);
  if (result === true) {
    res.send({
      code: 0,
      msg: "文件已上传"
    });
    return;
  }
  if (result) {
    // 已经上传过分片文件了
    res.send({
      code: 0,
      msg: "",
      data: result.needs
    });
    return;
  }
  // 如果没有的话，创建文件信息
  await writeFileInfo(req.body.fileId, req.body.name, req.body.ext, req.body.path, req.body.chunkIds);
  const info = getFileInfo(req.body.fileId, req.body.name, req.body.path);
  res.send({
    code: 0,
    msg: "",
    data: info.needs
  });
});

/**
 * 单文件上传
 */
router.post("/single", upload, async (req, res) => {
  await singleUploader.writeFile(req.body.path, req.body.name, req.file.buffer);
  res.send({
    code: 0,
    msg: ""
  });
});

module.exports = router;
