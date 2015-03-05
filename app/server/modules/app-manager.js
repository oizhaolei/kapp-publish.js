var config = require('../../../config.json');

// New Code
var mongo = require('mongodb');
var monk = require('monk');
var db = monk(config.mongodb);

var apps = db.get('apps');
var apks = db.get('apks');

exports.getMyApps = function(email, callback) {
  apps.find({
    "email" : email
  }, {
    "sort": "appname"
  }, function(e, o) {
    callback(o);
  });
};

exports.getApp = function(appid, callback) {
  apps.findOne({_id:appid}, function(e, app){
    apks.find({
      app_id : appid,
    }, {}, function(e, apks){
      callback(app, apks);
    });
  });
};

exports.delApp = function(appid, callback) {
  apps.remove({_id : appid}, function(e){
    apks.remove({app_id : appid}, function(e){
      callback(e);
    });
  });
};

exports.addApp = function(email, appname, callback) {
  apps.insert({
    "email" : email,
    "appname" : appname
  }, function(e, o) {
    callback(e, o);
  });
};

exports.updateApp = function(id, appname, shortDesc, desc, callback) {
  apps.update({
    _id : id
  }, {
    $set : {
      "appname" : appname,
      shortdesc : shortDesc,
      desc : desc,
      updatedate : new Date()
    }
  }, function(e, o) {
      callback(e, o);
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
