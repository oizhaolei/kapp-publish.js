var config = require('../../config.json');
var path = require('path');

var express = require('express');
var formidable = require("formidable");
var fs = require("fs");
var apkReader = require('adbkit-apkreader');

var modelContryList = require('./modules/country-list');
var modelAccountManager = require('./modules/account-manager');
var modelAppManager = require('./modules/app-manager');
var modelEmailDispatcher = require('./modules/email-dispatcher');


module.exports = function (app) {
  /* GET Applist page. */
  app.get('/report/', function(req, res) {
    modelAppManager.getMyApps(req.session.user.email, function(apps){
      res.render('apps', {
        'udata' : req.session.user,
        "apps" : apps
      });
    });
  });

};
