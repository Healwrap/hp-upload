/**
 * TODO
 * @author pepedd864
 * @date 2024/7/23
 */
const express = require("express");
const path = require("path");
const fs = require("fs-extra");
const archiver = require("archiver");
const router = express.Router();

/**
 * 下载文件，下载文件夹时会下载压缩包
 */
router.get("/", async (req, res) => {
  if (!req.query?.filename) return res.send("filename is required");
  const fileName = req.query.filename;
  const filePath = path.join(__dirname, "../files", fileName);
  // 判断query.filename是文件还是文件夹
  if (fs.existsSync(filePath)) {
    if (fs.statSync(filePath).isDirectory()) {
      // 如果是文件夹，则压缩文件夹
      const archive = archiver("zip", {
        zlib: { level: 5 } // 设置压缩级别
      });
      archive.on("error", (err) => {
        res.status(500).send(err);
      });
      res.setHeader("Content-Disposition", `attachment; filename=${fileName}.zip`);
      archive.pipe(res);
      archive.directory(filePath, false);
      await archive.finalize();
    } else {
      // 如果是文件，则直接下载文件
      res.download(filePath, fileName);
    }
  } else {
    res.send("file not found");
  }
});

module.exports = router;
