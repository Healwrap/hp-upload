const express = require('express');
const router = express.Router();
const file = require('./file');

/**
 * 导入配置文件。
 */
const config = {
  fieldName: 'file',
  port: require('./config').port,
};

/**
 * 使用Multer中间件处理文件上传。
 * 存储配置为内存存储。
 */
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({
  storage,
}).single(config.fieldName);

/**
 * 处理文件上传的路由。
 * 使用Multer中间件进行文件上传。
 * 如果缺少chunkId或fileId，则返回错误信息。
 * 否则，调用文件处理模块处理分片，并返回结果。
 */
router.post('/', upload, async (req, res) => {
  if (!req.body.chunkId) {
    res.send({
      code: 403,
      msg: '请携带分片编号',
      data: null,
    });
    return;
  }
  if (!req.body.fileId) {
    res.send({
      code: 403,
      msg: '请携带文件编号',
      data: null,
    });
    return;
  }
  try {
    const needs = await file.handleChunk(
      req.body.chunkId,
      req.body.fileId,
      req.file.buffer
    );
    res.send({
      code: 0,
      msg: '',
      data: needs,
    });
  } catch (err) {
    res.send({
      code: 403,
      msg: err.message,
      data: null,
    });
  }
});

/**
 * 处理文件握手协议的路由。
 * 如果缺少fileId、ext或chunkIds，则返回错误信息。
 * 根据文件编号和后缀查询文件信息。
 * 如果文件已存在，返回还需要的分片信息。
 * 否则，创建文件信息并返回还需要的分片信息。
 */
router.post('/handshake', async (req, res) => {
  if (!req.body.fileId) {
    res.send({
      code: 403,
      msg: '请携带文件编号',
      data: null,
    });
    return;
  }
  if (!req.body.ext) {
    res.send({
      code: 403,
      msg: '请携带文件后缀，例如 .mp4',
      data: null,
    });
    return;
  }
  if (!req.body.chunkIds) {
    res.send({
      code: 403,
      msg: '请按顺序设置文件的分片编号数组',
      data: null,
    });
    return;
  }
  const result = await file.getFileInfo(req.body.fileId, req.body.ext);
  if (result === true) {
    // 不用上传了
    res.send({
      code: 0,
      msg: '',
      data: `${req.protocol}://${req.hostname}:${config.port}/upload/${req.body.fileId}${req.body.ext}`,
    });
    return;
  }
  if (result) {
    // 已经有文件了
    res.send({
      code: 0,
      msg: '',
      data: result.needs,
    });
    return;
  }

  const info = await file.createFileInfo(
    req.body.fileId,
    req.body.ext,
    req.body.chunkIds
  );
  res.send({
    code: 0,
    msg: '',
    data: info.needs,
  });
});

module.exports = router;
