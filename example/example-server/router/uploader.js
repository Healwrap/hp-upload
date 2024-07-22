/**
 * TODO
 * @author pepedd864
 * @date 2024/7/22
 */
const express = require("express");
const router = express.Router();
router.post("/multipart", async (req, res) => {

});

router.post("/handshake", async (req, res) => {
  console.log(req.body);

});

module.exports = router;
