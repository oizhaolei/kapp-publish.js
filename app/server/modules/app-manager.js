
// New Code
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/nodetest1');

var apps = db.get('apps');

exports.getMyApps = function(callback) {
  apps.find({}, {}, function(e, o){
    callback(o);
  });
};

exports.getApp = function(appId, callback) {
  apps.findOne({_id:appId}, function(e, o){
    callback(o);
  });
};

exports.addApp = function(appname, callback) {
  apps.insert({
    "appname" : appname
  }, function(e, o) {
    callback(e, o);
  });
};
