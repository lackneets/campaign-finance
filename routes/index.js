
/*
 * GET home page.
 */

 var cache = {};
 var request = require('request');

 exports.index = function(req, res){
 	res.locals.params = req.params;
 	res.locals.path = decodeURI(req.path).replace(/^\/view\//i, '/');
 	res.render('index', { title: 'Express' });
 };

 exports.gettables = function(req, res){

 	res.header('Content-type','application/json');
 	res.header('Charset','utf8');

 	if(cache.gettables){
 		if(req.query.callback){
 			res.send(req.query.callback + '('+ cache.gettables + ');')
 		}else{
 			res.send(cache.gettables);
 		}
 	}else{
 		request('http://campaign-finance.g0v.ronny.tw/api/gettables', function (error, response, body) {
 			if (!error && response.statusCode == 200) {
 				cache.gettables = body;
 				if(req.query.callback){
 					res.send(req.query.callback + '('+ cache.gettables + ');')
 				}else{
 					res.send(cache.gettables);
 				}
 			}else{
 				res.send(req.query.callback + '('+ JSON.stringify({
 					error: 1,
 					message : 'API proxy get a response code of ' + response.statusCode
 				}) + ');');
 			}
 		});
 		setTimeout(function(){ cache.gettables = null; }, 86400*1000/24)
 	}
 };