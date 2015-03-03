var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var favicon = require('serve-favicon');
var session = require('express-session')

var logger = require('morgan');
var debug = require('debug')('my-application');

// New Code
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/nodetest1');

var routes = require('./app/server/router');
var appRoutes = require('./app/server/app_router');
var app = express();

app.set('views', path.join(__dirname, 'app/server/views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'app/public')));
app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: 'super-duper-secret-secret'
}));

// Make our db accessible to our router
app.use(function(req,res,next){
    req.db = db;
    next();
});


app.use('/', routes);
app.use('/apps/', appRoutes);

/// catch 404 and forwarding to error handler
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

app.set('port', process.env.PORT || 4100);

var server = app.listen(app.get('port'), function() {
  debug('Express server listening on port ' + server.address().port);

});
