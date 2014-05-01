
var $ = jQuery = require('jquery');

var cache = {};

exports.partyInfo = function(req, res){
	var name = req.params.query;

	cache.partyInfo = cache.partyInfo || {};

	if(cache.partyInfo[name]){
		res.json(cache.partyInfo[name]);
		return;
	}

	follow('http://zh.wikipedia.org/wiki/' + encodeURIComponent(name));

	function parse(html){
		//res.send(html)
		if(html.match(/羅列了有相同或相近的標題|羅列了有相同或相近的标题/)){
			console.log('這是一個消歧義頁');
			follow('http://zh.wikipedia.org' + $(html).find('a:contains("'+name+'")').filter(function(){ return $(this).text().match(/立委|議員|立法|委員/)}).attr('href') );
		}else{
			console.log(cache.partyInfo)
			cache.partyInfo[name] = {
				party: $(html).find('.infobox tr:contains("政黨") a:last').text().replace(/(^\s*|\s*$)/g, ''),
				partyImg: $(html).find('.infobox tr:contains("政黨") img:last').attr('src')
			};
			res.json(cache.partyInfo[name]);			
		}
	}

	function follow(href){
		$.ajax({url: href, complete: function(response){
			parse(response.responseText);
		}});
	}

};