/**
 * TODO
 * @author pepedd864
 * @date 2024/7/22
 */
const express = require("express");
const path = require("path");
const app = express();
const cors = require("cors");
const config = require("./config");
// const port = require("./config").port;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/upload", express.static(path.join(__dirname, "./file")));
app.use("/api/upload", require("./router/uploader"));

app.listen(config.port, () => {
  console.log(`server listen on ${config.port}`);
});
