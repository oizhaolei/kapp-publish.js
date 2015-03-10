var config = require('../../config.json');
var path = require('path');

var formidable = require("formidable");
var fs = require("fs");
var apkReader = require('adbkit-apkreader');

var modelAppManager = require('./modules/app-manager');

module.exports = function (app) {
  /* GET Applist page. */
  app.get('/app/apps', function(req, res) {
    modelAppManager.getMyApps(req.session.user.email, function(apps){
      res.render('apps', {
        'udata' : req.session.user,
        "apps" : apps
      });
    });
  });

  /* GET New App page. */
  app.get('/app/new', function(req, res) {
    res.render('appnew', {
      'udata' : req.session.user
    });
  });

  app.get('/app/del', function(req, res) {
    var appid = req.query.id;

    // Submit to the DB
    modelAppManager.delApp(appid, function (err, doc) {
      if (err) {
        // If it failed, return error
        res.send("There was a problem adding the information to the database.");
      } else {
        res.redirect("/app/apps");
      }
    });
  });
  /* POST to Add App Service */
  app.post('/app/add', function(req, res) {
    // Get our form values. These rely on the "name" attributes
    var name = req.body.name;

    // Submit to the DB
    modelAppManager.addApp(req.session.user.email, name, function (err, doc) {
      if (err) {
        // If it failed, return error
        res.send("There was a problem adding the information to the database.");
      } else {
        res.redirect("/app/apps");
      }
    });
  });

  app.get('/app', function(req, res) {
    var appid = req.query.id;
    modelAppManager.getApp(appid, function(app, apks){
      res.render('app', {
        'udata' : req.session.user,
        "app" : app,
        "apks" : apks
      });
    });
  });

  app.post('/app/update', function(req, res) {
    var appid = req.query.id;

    // Submit to the DB
    modelAppManager.updateApp(appid, req.body, function (err, doc) {
      if (err) {
        res.send("There was a problem update the information to the database.");
      } else {
        res.redirect('/app?id=' + appid);
      }
    });
  });

  app.get('/app/toggledeploy', function(req, res) {
    var appid = req.query.id;

    // Submit to the DB
    modelAppManager.toggleDeploy(appid, function (err, doc) {
      if (err) {
        res.send("There was a problem update the information to the database.");
      } else {
        res.redirect('/app?id=' + appid);
      }
    });
  });

  app.post('/upload/apk', function(req, res) {

    var form = new formidable.IncomingForm();
    form.parse(req, function(error, fields, files) {
      var reader = apkReader.readFile(files.file.path);
      var manifest = reader.readManifestSync();

      var destPath = path.join(config.upload.apk, manifest.package);
      try {
        fs.mkdirSync(destPath);
      } catch(e) {
      }
      var destFile = path.join(destPath, manifest.versionCode + '.apk');
      fs.rename(files.file.path, destFile, function(err) {
        console.log(destFile);
      });

      var appid = req.query.id;

      // Submit to the DB
      modelAppManager.addApk(appid, manifest, function (err, doc) {
        if (err) {
          res.send("There was a problem update the information to the database.");
        } else {
          res.redirect('/app?id=' + appid);
        }
      });

    });
  });

  app.post('/upload/icon512', function(req, res) {
    var appid = req.query.id;

    var form = new formidable.IncomingForm();
    form.parse(req, function(error, fields, files) {

      var destFile = path.join(config.upload.icon512, 'icon_512_' + appid + '.png');
      fs.rename(files.file.path, destFile, function(err) {
        console.log(destFile);
        res.redirect('/app?id=' + appid);
      });
    });
  });

  app.post('/upload/icon1024_500', function(req, res) {
    var appid = req.query.id;

    var form = new formidable.IncomingForm();
    form.parse(req, function(error, fields, files) {

      var destFile = path.join(config.upload.icon1024_500, 'icon_1024_500_' + appid + '.png');
      fs.rename(files.file.path, destFile, function(err) {
        console.log(destFile);
        res.redirect('/app?id=' + appid);
      });

    });
  });

};
