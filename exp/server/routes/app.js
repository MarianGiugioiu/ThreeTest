var express = require('express');
var router = express.Router();
var io = require('../app');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.send("Hey");
});

module.exports = router;
