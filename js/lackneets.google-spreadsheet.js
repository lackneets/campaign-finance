var Lackneets = Lackneets || {}
Lackneets.GoogleSpreadsheet = (function(){

	// Class scope

	if(typeof jQuery == 'undefined') throw "jQuery is required";

	function GoogleSpreadsheet(key, sheet, formKey){
		this.url = 'https://spreadsheets.google.com/feeds/list/'+key+'/'+sheet+'/public/values?alt=json'
		this.key = key;
		this.sheet = sheet;
		this.formKey = formKey;
	}

	GoogleSpreadsheet.prototype.query = function(params, callback){
		var queryString = '';
		// for(var key in params){
		// 	queryString += encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
		// }
		this.load(this.url + (queryString && '&sq='+params), callback);
	}
	//https://docs.google.com/spreadsheet/formResponse?formkey=dHlSSnRRR0w5eGFzRExRTWRjbWNLN0E6MQ&ifq&entry.0.single=1&entry.1.single=2&entry.2.single=3&entry.3.single=4&submit=Submit
	//https://docs.google.com/forms/d/1jhuj3SVru5wfqgQbvGqWifK8fGpxIes3NBXssIvoDIE/viewform?entry.1578479226=1&entry.57169067=1
	//https://docs.google.com/forms/d/1EsdgascyFfSHwFchGM_VksuP8x-AJ9HLu6mA5KLishA/formResponse?entry.1250123681=123&entry.579602836=5
	GoogleSpreadsheet.prototype.send = function(dataArray, callback){

		if(! this.formKey ) throw "formKey is required";

		var sendUrl = 'https://docs.google.com/forms/d/1EsdgascyFfSHwFchGM_VksuP8x-AJ9HLu6mA5KLishA/formResponse?'
		// for(var i=0; i<dataArray.length; i++){
		// 	sendUrl += 'entry.'+i+'.single=' + encodeURIComponent(dataArray[i]) + '&'
		// }
		for(var e in dataArray){
			sendUrl += e + '=' + encodeURIComponent(dataArray[e]) + '&';
		}

		$(function(){
			$('<iframe/>', {src: sendUrl}).hide().appendTo('body');
		});

	}

	GoogleSpreadsheet.prototype.load = function(url, callback){
		$.getJSON(url + '&callback=?', function(json){
			var result = $.map(json.feed.entry, function(e){
				return new SpreadsheetEntry(e);
			});
			callback && callback(result)
		});
	}

	function SpreadsheetEntry(obj){
		this.obj = obj;
		$.extend(this, obj);
	}
	SpreadsheetEntry.prototype.get = function(key){
		if(typeof this.obj['gsx$'+ String(key).toLowerCase()] != 'undefined'){
			return this.obj['gsx$'+ String(key).toLowerCase()]['$t'];
		}else{
			return null;
		}
	}

	return GoogleSpreadsheet;
})();
