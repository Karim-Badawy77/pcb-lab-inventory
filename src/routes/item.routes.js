const express = require("express");
const upload = require("../middleware/upload");
const controller = require("../controllers/item.controller");

const router = express.Router();
router
    .route("/")
    .post(upload.array("images"), controller.create)
    .get(controller.list);
    
router
    .route("/:id")
    .get(controller.get)
    .patch(upload.array("images"), controller.update)
    .delete(controller.remove);

module.exports = router;
