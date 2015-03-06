var config = require('../../config.json');
var express = require('express');
var formidable = require("formidable");
var fs = require("fs");
var apkReader = require('adbkit-apkreader');

var modelContryList = require('./modules/country-list');
var modelAccountManager = require('./modules/account-manager');
var modelAppManager = require('./modules/app-manager');
var modelEmailDispatcher = require('./modules/email-dispatcher');


module.exports = function (app) {
  // main login page //

  app.get('/', function(req, res){
    // check if the user's credentials are saved in a cookie //
    if (req.cookies.user == undefined || req.cookies.pass == undefined){
      res.render('login', { title: 'Hello - Please Login To Your Account' });
    } else {
      // attempt automatic login //
      modelAccountManager.autoLogin(req.cookies.user, req.cookies.pass, function(o){
        if (o != null){
	  req.session.user = o;
	  res.redirect('/app/apps');
        }	else{
	  res.render('login', { title: 'Hello - Please Login To Your Account' });
        }
      });
    }
  });

  app.post('/login', function(req, res){
    modelAccountManager.manualLogin(req.query.user, req.query.pass, function(e, o){
      if (!o){
        res.send(e, 400);
      }	else{
        req.session.user = o;
        if (req.query.remember == 'true'){
	  res.cookie('user', o.user, { maxAge: 900000 });
	  res.cookie('pass', o.pass, { maxAge: 900000 });
        }
        res.send(o, 200);
      }
    });
  });

  app.post('/update_account', function(req, res){
    if (req.query.user != undefined) {
      modelAccountManager.updateAccount({
        user 		: req.query.user,
        name 		: req.query.name,
        email 		: req.query.email,
        country 	: req.query.country,
        pass		: req.query.pass
      }, function(e, o){
        if (e){
	  res.send('error-updating-account', 400);
        }	else{
	  req.session.user = o;
	  // update the user's login cookies if they exists //
	  if (req.cookies.user != undefined && req.cookies.pass != undefined){
	    res.cookie('user', o.user, { maxAge: 900000 });
	    res.cookie('pass', o.pass, { maxAge: 900000 });
	  }
	  res.send('ok', 200);
        }
      });
    }
  });

  app.post('/logout', function(req, res){
    res.clearCookie('user');
    res.clearCookie('pass');
    req.session.destroy(function(e){ res.send('ok', 200); });
  });

  // creating new accounts //

  app.get('/signup', function(req, res) {
    res.render('signup', {  title: 'Signup', countries : modelContryList });
  });

  app.post('/signup', function(req, res){
    modelAccountManager.addNewAccount({
      name 	: req.query.name,
      email 	: req.query.email,
      user 	: req.query.user,
      pass	: req.query.pass,
      country : req.query.country
    }, function(e){
      if (e){
        res.send(e, 400);
      }	else{
        res.send('ok', 200);
      }
    });
  });

  // password reset //

  app.post('/lost-password', function(req, res){
    // look up the user's account via their email //
    modelAccountManager.getAccountByEmail(req.query.email, function(o){
      if (o){
        res.send('ok', 200);
        modelEmailDispatcher.dispatchResetPasswordLink(o, function(e, m){
	  // this callback takes a moment to return //
	  // should add an ajax loader to give user feedback //
	  if (!e) {
	    //	res.send('ok', 200);
	  }	else{
	    res.send('email-server-error', 400);
	    for (k in e) console.log('error : ', k, e[k]);
	  }
        });
      }	else{
        res.send('email-not-found', 400);
      }
    });
  });

  app.get('/reset-password', function(req, res) {
    var email = req.query["e"];
    var passH = req.query["p"];
    modelAccountManager.validateResetLink(email, passH, function(e){
      if (e != 'ok'){
        res.redirect('/');
      } else{
        // save the user's email in a session instead of sending to the client //
        req.session.reset = { email:email, passHash:passH };
        res.render('reset', { title : 'Reset Password' });
      }
    });
  });

  app.post('/reset-password', function(req, res) {
    var nPass = req.query.pass;
    // retrieve the user's email from the session to lookup their account and reset password //
    var email = req.session.reset.email;
    // destory the session immediately after retrieving the stored email //
    req.session.destroy();
    modelAccountManager.updatePassword(email, nPass, function(e, o){
      if (o){
        res.send('ok', 200);
      }	else{
        res.send('unable to update password', 400);
      }
    });
  });

  // view & delete accounts //
  app.get('/print', function(req, res) {
    modelAccountManager.getAllRecords( function(e, accounts){
      res.render('print', { title : 'Account List', accts : accounts });
    });
  });

  app.post('/delete', function(req, res){
    modelAccountManager.deleteAccount(req.body.id, function(e, obj){
      if (!e){
        res.clearCookie('user');
        res.clearCookie('pass');
        req.session.destroy(function(e){ res.send('ok', 200); });
      }	else{
        res.send('record not found', 400);
      }
    });
  });

  app.get('/reset', function(req, res) {
    modelAccountManager.delAllRecords(function(){
      res.redirect('/print');
    });
  });
  /* GET Applist page. */
  app.get('/app/apps', function(req, res) {
    modelAppManager.getMyApps(req.session.user.email, function(apps){
      res.render('apps', {
        'udata' : req.session.user,
        'pathToAssets': '/dashboard',
        'pathToSelectedTemplateWithinBootstrap' : '/dashboard',
        "apps" : apps
      });
    });
  });

  /* GET New App page. */
  app.get('/app/new', function(req, res) {
    res.render('appnew', {
      'udata' : req.session.user,
      'pathToAssets': '/dashboard',
      'pathToSelectedTemplateWithinBootstrap' : '/dashboard'
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
    var appname = req.body.appname;

    // Submit to the DB
    modelAppManager.addApp(req.session.user.email, appname, function (err, doc) {
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
        'pathToAssets': '/dashboard',
        'pathToSelectedTemplateWithinBootstrap' : '/dashboard',
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

      var destPath = config.upload.apk + '/' + manifest.package;
      try {
        fs.mkdirSync(destPath);
      } catch(e) {
      }
      var destFile = destPath + '/' + manifest.versionCode + '.apk';
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

      var destFile = config.upload.icon512 + '/icon_512_' + appid + '.png';
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

      var destFile = config.upload.icon1024_500 + '/icon_1024_500_' + appid + '.png';
      fs.rename(files.file.path, destFile, function(err) {
        console.log(destFile);
        res.redirect('/app?id=' + appid);
      });

    });
  });

  app.get('*', function(req, res) { res.render('404', { title: 'Page Not Found'}); });

};
