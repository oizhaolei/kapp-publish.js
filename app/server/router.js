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
    console.dir(req);
    modelAccountManager.manualLogin(req.body.user, req.body.pass, function(e, o){
      if (!o){
        res.status(400).send(e);
      }	else{
        req.session.user = o;
        if (req.body.remember == 'true'){
	  res.cookie('user', o.user, { maxAge: 900000 });
	  res.cookie('pass', o.pass, { maxAge: 900000 });
        }
        res.status(200).send(o);
      }
    });
  });

  app.post('/update_account', function(req, res){
    if (req.body.user != undefined) {
      modelAccountManager.updateAccount({
        user 		: req.body.user,
        name 		: req.body.name,
        email 		: req.body.email,
        country 	: req.body.country,
        pass		: req.body.pass
      }, function(e, o){
        if (e){
	  res.status(400).send('error-updating-account');
        }	else{
	  req.session.user = o;
	  // update the user's login cookies if they exists //
	  if (req.cookies.user != undefined && req.cookies.pass != undefined){
	    res.cookie('user', o.user, { maxAge: 900000 });
	    res.cookie('pass', o.pass, { maxAge: 900000 });
	  }
	  res.status(200).send('ok');
        }
      });
    }
  });

  app.post('/logout', function(req, res){
    res.clearCookie('user');
    res.clearCookie('pass');
    req.session.destroy(function(e){ res.status(200).send('ok'); });
  });

  // creating new accounts //

  app.get('/signup', function(req, res) {
    res.render('signup', {  title: 'Signup', countries : modelContryList });
  });

  app.post('/signup', function(req, res){
    modelAccountManager.addNewAccount({
      name 	: req.body.name,
      email 	: req.body.email,
      user 	: req.body.user,
      pass	: req.body.pass,
      country : req.body.country
    }, function(e){
      if (e){
        res.status(400).send(e);
      }	else{
        res.status(200).send('ok');
      }
    });
  });

  // password reset //

  app.post('/lost-password', function(req, res){
    // look up the user's account via their email //
    modelAccountManager.getAccountByEmail(req.body.email, function(o){
      if (o){
        res.status(200).send('ok');
        modelEmailDispatcher.dispatchResetPasswordLink(o, function(e, m){
	  // this callback takes a moment to return //
	  // should add an ajax loader to give user feedback //
	  if (!e) {
	    //	res.status(200).send('ok');
	  }	else{
	    res.status(400).send('email-server-error');
	    for (k in e) console.log('error : ', k, e[k]);
	  }
        });
      }	else{
        res.status(400).send('email-not-found');
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
    var nPass = req.body.pass;
    // retrieve the user's email from the session to lookup their account and reset password //
    var email = req.session.reset.email;
    // destory the session immediately after retrieving the stored email //
    req.session.destroy();
    modelAccountManager.updatePassword(email, nPass, function(e, o){
      if (o){
        res.status(200).send('ok');
      }	else{
        res.status(400).send('unable to update password');
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
        req.session.destroy(function(e){ res.status(200).send('ok'); });
      }	else{
        res.status(400).send('record not found');
      }
    });
  });

  app.get('/reset', function(req, res) {
    modelAccountManager.delAllRecords(function(){
      res.redirect('/print');
    });
  });
};
