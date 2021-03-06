
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');

var app = express();

var api = require('./routes/api');

var cons = require('consolidate');
// assign the swig engine to .html files
app.engine('html', cons.underscore);



// all environments
app.set('port', process.env.PORT || 5566);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.compress());  
app.use(function(req, res, next) {
	res.locals.request = req;
	res.locals.response = res;
	next();
});
app.use(app.router);
//app.use(express.staticCache()); 
app.use(express.static(path.join(__dirname, 'public')));


// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/?', routes.index);
app.get('/view/:politician?/:file?/:page?', routes.index);
app.get('/api/gettables', api.gettables);
app.get('/api/partyInfo/:query', api.partyInfo);
//app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
