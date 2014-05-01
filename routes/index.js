
var request = require('request');

exports.index = function(req, res){
	res.locals.params = req.params;
	res.locals.path = decodeURI(req.path).replace(/^\/view\//i, '/');
	res.render('index', { title: 'Express' });
};
