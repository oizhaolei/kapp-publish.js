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
    "sort": "name"
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

exports.addApp = function(owner_email, name, callback) {
  apps.insert({
    "owner_email" : owner_email,
    "name" : name,
    "deploy" : false,
    added : new Date(),
    lastupdated : new Date()
  }, function(e, o) {
    callback(e, o);
  });
};

exports.updateApp = function(id, update, callback) {
  update.lastupdated = new Date();
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
        "deploy" : !deploy,
        lastupdated : new Date()
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
    lastupdated : new Date()
  }, function(e, o) {
    apps.update({
      _id : appid
    }, {
      $set: {
        "manifest" : manifest,
        lastupdated : new Date()
      }
    }, {
      upsert: true
    }, function(e, o) {
      callback(e, o);
    });
  });

};
