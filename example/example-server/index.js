/**
 * TODO
 * @author pepedd864
 * @date 2024/7/22
 */
const express = require("express");
const path = require("path");
const archiver = require("archiver");
const fs = require("fs-extra");
const app = express();
const cors = require("cors");
const config = require("./config");
// const port = require("./config").port;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
/**
 * 下载相关
 */
app.use("/download", require("./router/download"));
/**
 * 获取文件列表
 */
app.use("/api/list", require("./router/list"));
/**
 * 上传相关
 */
app.use("/api/upload", require("./router/uploader"));

app.listen(config.port, () => {
  console.log(`server listen on ${config.port}`);
});
