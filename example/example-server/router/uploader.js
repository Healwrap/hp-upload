/**
 * TODO
 * @author pepedd864
 * @date 2024/7/22
 */
const express = require("express");
const router = express.Router();
const { handleChunk, getFileInfo, writeFileInfo } = require("../service/multipart");
/**
 * 处理分片文件上传
 */
router.post("/multipart", async (req, res) => {
  const needs = await handleChunk(
    req.body.chunkId,
    req.body.fileId,
    req.body.file.buffer
  );
  res.send({
    code: 0,
    msg: "",
    data: needs
  });
});
/**
 * 握手，确认上传信息
 */
router.post("/multipart/handshake", async (req, res) => {
  const result = await getFileInfo(req.body.fileId, req.body.filename, req.body.path);
  if (result === true) {
    res.send({
      code: 0,
      msg: "文件已上传"
    });
  }
  if (result) {
    // 已经上传过分片文件了
    res.send({
      code: 0,
      msg: "",
      data: result.needs
    });
  }
  // 如果没有的话，创建文件信息
  writeFileInfo(req.body.fileId, req.body.filename, req.body.path, req.body.chunkIds);
  const info = getFileInfo(req.body.fileId, req.body.filename, req.body.path);
  res.send({
    code: 0,
    msg: "",
    data: info.needs
  });
});

module.exports = router;
