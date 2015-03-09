var config = require('./config.json');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var favicon = require('serve-favicon');
var session = require('express-session');

var logger = require('morgan');
var debug = require('debug')('my-application');

var app = express();

app.set('views', path.join(__dirname, 'app/server/views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'app/public')));
app.use(express.static(path.join(__dirname, 'repository/')));
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: 'super-kapp-secret-secret'
}));

var authCheck = function(req, res, next) {
  if (req.session.user == null){
    res.redirect('/');
  } else {
    next();
  }
};
app.use('/app/*', authCheck);
app.use('/upload/*', authCheck);

require('./app/server/router')(app);
require('./app/server/router_app')(app);
require('./app/server/router_report')(app);
app.get('*', function(req, res) {
  res.render('404', { title: 'Page Not Found'});
});

app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.set('port', config.port);

var server = app.listen(app.get('port'), function() {
  debug('Express server listening on port ' + server.address().port);

});
