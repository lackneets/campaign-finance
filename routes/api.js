var gc = require('gc');
var jsdom = require('jsdom');
var dirty = require('dirty');

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