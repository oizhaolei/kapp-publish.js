var config = require('../../config.json');
var express = require('express');
var router = express.Router();
var formidable = require("formidable");
var fs = require("fs");
var apkReader = require('adbkit-apkreader');

var modelContryList = require('./modules/country-list');
var modelAccountManager = require('./modules/account-manager');
var modelAppManager = require('./modules/app-manager');
var modelEmailDispatcher = require('./modules/email-dispatcher');


// main login page //

router.get('/', function(req, res){
  // check if the user's credentials are saved in a cookie //
  if (req.cookies.user == undefined || req.cookies.pass == undefined){
    res.render('login', { title: 'Hello - Please Login To Your Account' });
  } else {
    // attempt automatic login //
    modelAccountManager.autoLogin(req.cookies.user, req.cookies.pass, function(o){
      if (o != null){
	req.session.user = o;
	res.redirect('/apps');
      }	else{
	res.render('login', { title: 'Hello - Please Login To Your Account' });
      }
    });
  }
});

router.post('/login', function(req, res){
  modelAccountManager.manualLogin(req.param('user'), req.param('pass'), function(e, o){
    if (!o){
      res.send(e, 400);
    }	else{
      req.session.user = o;
      if (req.param('remember-me') == 'true'){
	res.cookie('user', o.user, { maxAge: 900000 });
	res.cookie('pass', o.pass, { maxAge: 900000 });
      }
      res.send(o, 200);
    }
  });
});

router.post('/update_account', function(req, res){
  if (req.param('user') != undefined) {
    modelAccountManager.updateAccount({
      user 		: req.param('user'),
      name 		: req.param('name'),
      email 		: req.param('email'),
      country 	: req.param('country'),
      pass		: req.param('pass')
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

router.post('/logout', function(req, res){
    res.clearCookie('user');
    res.clearCookie('pass');
    req.session.destroy(function(e){ res.send('ok', 200); });
});

// creating new accounts //

router.get('/signup', function(req, res) {
  res.render('signup', {  title: 'Signup', countries : modelContryList });
});

router.post('/signup', function(req, res){
  modelAccountManager.addNewAccount({
    name 	: req.param('name'),
    email 	: req.param('email'),
    user 	: req.param('user'),
    pass	: req.param('pass'),
    country : req.param('country')
  }, function(e){
    if (e){
      res.send(e, 400);
    }	else{
      res.send('ok', 200);
    }
  });
});

// password reset //

router.post('/lost-password', function(req, res){
  // look up the user's account via their email //
  modelAccountManager.getAccountByEmail(req.param('email'), function(o){
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

router.get('/reset-password', function(req, res) {
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

router.post('/reset-password', function(req, res) {
  var nPass = req.param('pass');
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
router.get('/print', function(req, res) {
  modelAccountManager.getAllRecords( function(e, accounts){
    res.render('print', { title : 'Account List', accts : accounts });
  });
});

router.post('/delete', function(req, res){
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

router.get('/reset', function(req, res) {
  modelAccountManager.delAllRecords(function(){
    res.redirect('/print');
  });
});
/* GET Applist page. */
router.get('/apps', function(req, res) {
  if (req.session.user == null){
    // if user is not logged-in redirect back to login page //
    res.redirect('/');
    return;
  }

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
router.get('/app/new', function(req, res) {
  if (req.session.user == null){
    // if user is not logged-in redirect back to login page //
    res.redirect('/');
    return;
  }
  res.render('appnew', {
    'udata' : req.session.user,
    'pathToAssets': '/dashboard',
    'pathToSelectedTemplateWithinBootstrap' : '/dashboard'
  });
});

router.get('/app/del', function(req, res) {
  if (req.session.user == null){
    // if user is not logged-in redirect back to login page //
    res.redirect('/');
    return;
  }

  var appid = req.param('id');

  // Submit to the DB
  modelAppManager.delApp(appid, function (err, doc) {
    if (err) {
      // If it failed, return error
      res.send("There was a problem adding the information to the database.");
    } else {
      res.redirect("/apps");
    }
  });
});
/* POST to Add App Service */
router.post('/app/add', function(req, res) {
  if (req.session.user == null){
    // if user is not logged-in redirect back to login page //
    res.redirect('/');
    return;
  }

  // Get our form values. These rely on the "name" attributes
  var appname = req.body.appname;

  // Submit to the DB
  modelAppManager.addApp(req.session.user.email, appname, function (err, doc) {
    if (err) {
      // If it failed, return error
      res.send("There was a problem adding the information to the database.");
    } else {
      res.redirect("/apps");
    }
  });
});

router.get('/app', function(req, res) {
  if (req.session.user == null){
    // if user is not logged-in redirect back to login page //
    res.redirect('/');
    return;
  }
  var appid = req.param('id');

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

router.post('/app/update', function(req, res) {
  if (req.session.user == null){
    // if user is not logged-in redirect back to login page //
    res.redirect('/');
    return;
  }
  var appid = req.param('id');
  console.dir(req.body);

  // Submit to the DB
  modelAppManager.updateApp(appid, req.body, function (err, doc) {
    if (err) {
      res.send("There was a problem update the information to the database.");
    } else {
      res.redirect('/app?id=' + appid);
    }
  });
});

router.get('/app/toggledeploy', function(req, res) {
  if (req.session.user == null){
    // if user is not logged-in redirect back to login page //
    res.redirect('/');
    return;
  }
  var appid = req.param('id');

  // Submit to the DB
  modelAppManager.toggleDeploy(appid, function (err, doc) {
    if (err) {
      res.send("There was a problem update the information to the database.");
    } else {
      res.redirect('/app?id=' + appid);
    }
  });
});

router.post('/apk/upload', function(req, res) {
  if (req.session.user == null){
    // if user is not logged-in redirect back to login page //
    res.redirect('/');
    return;
  }

  var form = new formidable.IncomingForm();
  form.parse(req, function(error, fields, files) {
    var reader = apkReader.readFile(files.file.path);
    var manifest = reader.readManifestSync()

    var destPath = config.upload.apk + '/' + manifest.package;
    try {
      fs.mkdirSync(destPath);
    } catch(e) {
    }
    var destFile = destPath + '/' + manifest.versionCode + '.apk';
    fs.rename(files.file.path, destFile, function(err) {
      console.log(destFile);
    });

    var appid = req.param('id');

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

router.post('/apk/icon512_upload', function(req, res) {
  if (req.session.user == null){
    // if user is not logged-in redirect back to login page //
    res.redirect('/');
    return;
  }

  var appid = req.param('id');

  var form = new formidable.IncomingForm();
  form.parse(req, function(error, fields, files) {
    console.dir(files);

    var destFile = config.upload.icon512 + '/icon_512_' + appid + '.png';
    fs.rename(files.file.path, destFile, function(err) {
      console.log(destFile);
      res.redirect('/app?id=' + appid);
    });
  });
});

router.post('/apk/icon1024_500_upload', function(req, res) {
  if (req.session.user == null){
    // if user is not logged-in redirect back to login page //
    res.redirect('/');
    return;
  }

  var appid = req.param('id');

  var form = new formidable.IncomingForm();
  form.parse(req, function(error, fields, files) {
    console.dir(files);

    var destFile = config.upload.icon1024_500 + '/icon_1024_500_' + appid + '.png';
    fs.rename(files.file.path, destFile, function(err) {
      console.log(destFile);
      res.redirect('/app?id=' + appid);
    });

  });
});

router.get('*', function(req, res) { res.render('404', { title: 'Page Not Found'}); });

module.exports = router;
