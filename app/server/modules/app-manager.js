var config = require('../../../config.json');

// New Code
var mongo = require('mongodb');
var monk = require('monk');
var db = monk(config.mongodb);

var apps = db.get('apps');
var apks = db.get('apks');

exports.getMyApps = function(owner_email, callback) {
  apps.find({
    "owner_email" : owner_email
  }, {
    "sort": "appname"
  }, function(e, o) {
    callback(o);
  });
};

exports.getApp = function(id, callback) {
  apps.findOne({
    _id : id
  }, function(e, app){
    apks.find({
      app_id : id
    }, {}, function(e, apks){
      callback(app, apks);
    });
  });
};

exports.delApp = function(id, callback) {
  apps.remove({
    _id : id
  }, function(e){
    apks.remove({app_id : id}, function(e){
      callback(e);
    });
  });
};

exports.addApp = function(owner_email, appname, callback) {
  apps.insert({
    "owner_email" : owner_email,
    "appname" : appname,
    "deploy" : false,
    createdate : new Date()
  }, function(e, o) {
    callback(e, o);
  });
};

exports.updateApp = function(id, update, callback) {
  update.updatedate = new Date();
  apps.update({
    _id : id
  }, {
    $set : update
  }, function(e, o) {
      callback(e, o);
    });
};

exports.toggleDeploy = function(id, callback) {
  apps.findOne({
    _id : id
  }, function(e, app){
    var deploy =  app.deploy;
    apps.update({
      _id : id
    }, {
      $set : {
        "deploy" : !deploy
      }
    }, function(e, o) {
      callback(e, o);
    });
  });
};

exports.addApk = function(appid, manifest, callback) {
  apks.insert({
    app_id : appid,
    manifest : manifest,
    updatedate : new Date()
  }, function(e, o) {
    apps.update({
      _id : appid
    }, {
      $set: {
        "manifest" : manifest
      }
    }, {
      upsert: true
    }, function(e, o) {
      callback(e, o);
    });
  });

};
