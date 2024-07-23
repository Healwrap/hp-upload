/**
 * TODO
 * @author pepedd864
 * @date 2024/7/22
 */
const express = require("express");
const readDir = require("../service/list");
const path = require("path");
const router = express.Router();

router.get("/", async (req, res) => {
  const curPath = req.query?.path || "";
  const dirs = await readDir(curPath);
  res.send(dirs);
});

module.exports = router;
