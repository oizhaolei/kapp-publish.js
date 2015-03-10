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
