const express=require("express");
const router = express.Router();

router.get("/tickets", (req, res) => {
  res.send("hello tikets");
});

module.exports = router;