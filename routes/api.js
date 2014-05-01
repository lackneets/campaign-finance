var gc = require('gc');
var jsdom = require('jsdom');
var dirty = require('dirty');

var request = require('request');

// jQuery
var $;
var window = jsdom.jsdom().parentWindow;
jsdom.jQueryify(window, "http://code.jquery.com/jquery.js", function () {
	$ = window.$;
	$.support.cors = true;
	console.log('jQuery is ready');
});

var partyInfoStorage = dirty('partyInfo.cache.json');
var gcTimer;

exports.partyInfo = function (req, res) {

	var name = req.params.query;

	if (partyInfoStorage.get(name)) {
		res.json(partyInfoStorage.get(name));
		return;
	}

	follow('http://zh.m.wikipedia.org/wiki/' + encodeURIComponent(name));

	function parse(html) {

		var $html = $($.parseHTML(html));

		if (html.match(/羅列了有相同或相近的標題|羅列了有相同或相近的标题/)) {
			console.log('這是一個消歧義頁');
			follow('http://zh.wikipedia.org' + $html.find('a:contains("' + name + '")').filter(function () {
				return $(this).text().match(/立委|議員|立法|委員/)
			}).attr('href'));
		} else {
			var info = {
				party: $html.find('.infobox tr:contains("政黨") a:last').text().replace(/(^\s*|\s*$)/g, ''),
				partyImg: $html.find('.infobox tr:contains("政黨") img:last').attr('src')
			};
			res.json(info);
			partyInfoStorage.set(name, info);

			// GC after html parse completed (delay 2s)
			gcTimer = setTimeout(gc, 2000);
		}
	}

	function follow(href) {
		//cancel GC task
		clearTimeout(gcTimer);
		$.ajax({
			url: href,
			dataType: 'text',
			success: function (html) {
				parse(html);
			},
			error: function (err) {
				res.json({
					error: 1,
					message: err
				})
			}
		});
	}
};


var cache = {};
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