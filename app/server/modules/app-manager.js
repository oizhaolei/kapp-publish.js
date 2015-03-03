
// New Code
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/nodetest1');

var apps = db.collection('apps');

exports.getMyApps = function(callback) {
  apps.find({}, {}, function(e, o){
    callback(o);
  });
};

exports.addApp = function(appname, packageName, callback) {
  apps.insert({
    "appname" : appname,
    "packagename" : packageName
  }, function(e, o) {
    if (o){
      o.pass == pass ? callback(o) : callback(null);
    }	else{
      callback(null);
    }
  });
};

var findById = function(id, callback) {
  apps.findOne({_id: getObjectId(id)},
	       function(e, res) {
		 if (e) callback(e)
		 else callback(null, res)
	       });
};
