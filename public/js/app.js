"use strict";

var G0V = G0V || {};
G0V.CFinance = G0V.CFinance || {};

var CFinance = (function(){

	// getTotalCount(callback) : callback(count)
	function getTotalCount(callback){ var s = this; return $.getJSON('http://campaign-finance.g0v.ctiml.tw/api/getcellcount?callback=?', function(response){callback && callback.call(s, parseInt(response.count), parseInt(response.count)-parseInt(response.todo),  parseInt(response.todo)); }); }

	// getTable(id, callback) : callback(tables, meta)
	function getTable(id, callback){ var s = this; return $.getJSON('http://campaign-finance.g0v.ronny.tw/api/tables/'+parseInt(id)+'?callback=?', function(response){callback && callback.call(s, response.data.tables, response.data.meta); }); }
	
	// getTables(callback) : callback(data, error)
	function getTables(callback){ var s = this; return $.getJSON('/api/gettables?callback=?', function(response){callback && callback.call(s, response.data, response.error); }); }
	
	// cellImage(id, row, col) : return url;
	function cellImage(page, row, col){ return 'http://campaign-finance.g0v.ronny.tw/api/getcellimage/'+parseInt(page)+'/'+row+'/'+col+'.png'; }

	function splitFile(files){
		_(files).each(function(f){
			if(!f.__CATEGORY__){
				//第N屆OOO參選人XXXXXX政治獻金專戶-{帳戶}-{時間區間:Y/m/d-Y/m/d}
				//f.file = f.file.replace(/^([^\/]+)$/, '$1/所有檔案/default');

				f.file = f.file.replace(/-([\?]+)\/([\?]+)\/([\?]+)-([\?]+)\/([\?]+)\/([\?]+)/g, '-未確定資料日期');
				f.file = f.file.replace(/-[^\/\-]+\.pdf$/, '-[未分類帳戶]-未確定資料日期');
				f.file = f.file.replace(/專戶$/, '專戶-[未分類帳戶]-未確定資料日期');

				var pattern = new RegExp(/^(第\d+[屆任]?)(.*?)(擬?參選人)(.+)政治獻金專戶-([^-]+)-?(.+)?$/);

				f.number = f.file.replace(pattern, '$1'); //第N任
				f.title = f.file.replace(pattern, '$2');
				f.people = f.file.replace(pattern, '$4');
				f.date = f.file.replace(pattern, '$6');

				f.file = f.file.replace(pattern, '$4|$5|$6');

				f.__CATEGORY__ = f.file.split('|');
				f.__CATEGORY__.pop();
				f.__CATEGORY__ = f.__CATEGORY__.splice(0,4);
			}
		});
		var grouped = _(files).groupBy(function(f){
			return f.__CATEGORY__.shift() || '__UNGROUPED__';
		});

		var flat = _(grouped.__UNGROUPED__ || []).each(function(o){ return _(o).omit('__CATEGORY__'); });
		var children = _(grouped).chain().omit('__UNGROUPED__').pairs().map(function(group){
			group[1] = splitFile(group[1]);
			return group;
		}).object().value();

		return {
			files: flat,
			allFiles: files,
			totalFiles: _(files).size(),
			categories: children
		};
	}

	function CFinance(callback){
		getTables.call(this, function(dataPages){
			this.totalPage = _(dataPages).size();
			dataPages = _(dataPages).map(function(e){ return new CFinanceTable(e); });
			this.files = _(dataPages).chain().groupBy(function(e){ return e.file; }).value();
			this.sortedFiles = _(this.files).chain().pairs().sortBy(function(e){ return parseInt(_(e).min(function(e){return parseInt(e.id); })); }).value();
			this.arrangedFiles = splitFile(dataPages);
			callback && callback.call(this);
		});
	}
	CFinance.prototype.getTable = function(id){
		return _(this.files).chain().flatten().findWhere({id: id}).value();
	}

	function getCells(page, callback){ var s = this; return $.getJSON('http://campaign-finance.g0v.ctiml.tw/api/getcells/'+parseInt(page)+'?callback=?', function(response){callback && callback.call(s, response); }) }

	function CFinanceTable(tableAttr){
		_.extend(this, tableAttr);
	}
	CFinanceTable.prototype.getCells = function(callback){
		getCells.call(this, this.id, function(cells){
			var table = this;
			this.cells = _(cells).map(function(c){ return new CFinanceCell(c, table); });
			callback && callback.call(this)
		});
	}

	CFinanceTable.prototype.buildTable = function(callback){
		var rows = _(this.cells).groupBy(function(c){ return c.row; });
		var table = $('<table/>');
		table.append($('<thead><tr><th>序號</th><th>交易日期</th><th>收支科目</th><th>捐贈者/支出對象</th><th>身份證/統編</th><th>收入</th><th>支出</th><th>金錢類</th><th>地址</th></tr></thead>'));
			for(var r=0;r<=21;r++){
				var tr = $('<tr/>').appendTo(table);
				if(rows[r]) for(var c=1;c<10;c++){
					var col = _(rows[r]).findWhere({col:c});
					var val = (col && col.ans) || '';

					// switch(c){
					// 	case 1: break;
					// 	case 4: val = String(val).replace(/＊/, '*'); break;
					// 	case 5: val = String(val).replace(/＊/, '*'); break;
					// 	case 6: val = String(val).replace(/＊/, '*'); break;
					// }

					var td = $('<td/>', {text: val }).appendTo(tr);
					$('<i class="fa fa-question" title="Image"></i>').uitooltip({ content: '<img src="'+cellImage(this.id, r, c)+'" style="max-height:40px;" />', track: true }).appendTo(td);
				}
			}
		return $.extend(table, this);
	}

	function CFinanceCell(cellAttr, table){
		_.extend(this, cellAttr);
		this.table = table; 
		this.image = cellImage(this.table.id, this.row, this.col);
	}

	// Public
	_.extend(CFinance, {
		getTotalCount: getTotalCount
	})

	return CFinance;
})();


var CFTable = Backbone.View.extend(
	_.extend({}, (function(){

		//var cf = new CFinance();

		(function refreshCounter(){
			var interval = 3000;
			var current = 0;
			var total = 0;
			var history = 0;
			var increment = 0;
			var timer;
			(function renew(){
				CFinance.getTotalCount(function(total, done, remains){
					var percent = Math.ceil(done*100 / total) + '%';
					var count = done;
					clearInterval(timer);
					if(history){
						increment = count-history; 
						timer = setInterval(function(){
							current += increment/(interval/80);
							$('#counter').text(Math.ceil(current) + ' / ' + percent).attr('title', '還有 ' + remains + ' 格資料未輸入，共：'+total);
						}, 100);
					}

					if(count >= current) {
						$('#counter').text(count + ' / ' + percent).attr('title', '還有 ' + remains + ' 格資料未輸入，共：'+total);
					}
					history = count;
					current = count;
					setTimeout(renew, interval);
				});
			})()		
		})()

		var self;
		var instance = {
			events: {
				'submit form' : 'searchFrom',
				'click #getLocation' : 'returnMyLocation',
				//'click .sidebar-nav li' : 'switchCategory',
				//'click a' : 'avoidHashing'
				'click #politician li' : 'selectPolitician',
				'shown.bs.collapse .collapse': 'showCategoryPage',
				'change select.file-page' : 'selectFilePage'
			},
			
			el: 'body',

			cf: null,
			
			initialize: function(options){
				self = this;
				this.state = {
					path: '/',
					politician: null,
					file: null,
					page: null,
					id: null
				};
				this.cf = new CFinance(function(){
					self.initPolitician.call(self);
					self.$el.find('#loading').hide();
					self.$el.find('#main').fadeIn();
					//self.$el.find('#politician .navbar-nav > li:not(.template):first()').click();

					if(options.navigate){
						self.navigate(options.navigate)
					}
				});
			},
			// switchCategory: function(ev){
			// 	//$(ev.currentTarget).siblings().removeClass('active').end().addClass('active')
			// },
			avoidHashing: function(ev){
				if(ev.currentTarget.href = '#'){
					ev.preventDefault();
					return false;
				}
			},

			selectPolitician: function(politician){
				//from a click event ?
				politician = (politician.currentTarget) ? politician.currentTarget.getAttribute('data-politician') : politician;
				this.state.politician = politician;
				this.state.file = null;
				this.state.page = null;

				
				this.$el.find('#politician li').filter(function(){return this.getAttribute('data-politician') == politician})
				.siblings().removeClass('active').end().addClass('active');
				//this.render();

				this.render();
			},

			selectFile: function(file){
				file = (file.currentTarget) ? file.currentTarget.getAttribute('data-file') : file;
				this.state.file = file;
				//this.render();
			},

			selectPage: function(page){
				page = (page.currentTarget) ? page.currentTarget.getAttribute('data-page') : page;
				this.state.page = page;
				//this.render();
			},

			navigate: function(path){
				var option = path.replace(/(^\/*|\/*$)/g, '').split('/');
				option[0] && this.selectPolitician(option[0]);
				option[1] && this.selectFile(option[1]);
				option[2] && (this.state.id = parseInt(option[2]))
				this.render();
			},

			initPolitician: function(){
				var self = this;
				var li = this.$el.find('#politician li.template:first').clone().removeClass('template');

				this.politicianMenu = this.politicianMenu || {};

				_.each(this.cf.arrangedFiles.categories, function(files, politicianName){
					self.politicianMenu[politicianName] = li.clone().appendTo(self.$el.find('#politician .nav')).find('a').text(politicianName).append([
						$('<span class="badge" style="margin-left:5px">'+files.totalFiles+'</span>'),
						$('<div class="political-title">'+files.allFiles[0].number + files.allFiles[0].title+'</div>'),
					]).end().attr('data-politician', politicianName);

				});			
			},
			pushState: function(){
				history.pushState(this.state, '', '/view'+this.getCurrentPath())
				console.log(this.getCurrentPath());
			},
			getCurrentPath: function(){
				var path = '';
				if(this.state.politician){
					path += '/' + this.state.politician;
				}else{
					return path;
				}
				if(this.state.file){
					path += '/' + this.state.file ;
				}else{
					return path;
				}
				if(this.state.id){
					path += '/' + this.state.id ;
				}else{
					return path;
				}
				return path;
			},

			render: function(){
				this.renderCategory();
				this.renderPageTable();
				this.pushState();
			},

			showCategoryPage: function(ev){ 
				this.state.file = ev.currentTarget.getAttribute('data-file');
				this.state.page = ev.currentTarget.getAttribute('data-page');
				this.state.id = parseInt(ev.currentTarget.getAttribute('data-id')) || null;
				this.renderPageTable();

			},

			renderCategory: function(){
				var self = this;
				var _panel = this.$el.find('#categoriesFiles .panel.template:first').clone().removeClass('template'); 
				var hash = 2000;

				this.$el.find('#categoriesFiles .panel:not(.template)').remove();

				_(this.cf.arrangedFiles.categories[this.state.politician].categories).each(function(subFiles, fileTitle){

					subFiles.files = _(subFiles.files).sortBy(function(e){ return parseInt(e.page); });

					var currentPage = subFiles.files[0];
					var pager = $('<select/>', {
						'class': 'form-control file-page', attr: {'data-file' : fileTitle}});
					_(subFiles.files).each(function(f){
						$('<option/>', {text: '#' + f.page + '頁', val: f.id, attr: {id: f.id}}).appendTo(pager).data('file', f);
					});

					var p = _panel.clone();
	
					p.find(".panel-title a").attr("href",  "#cf" + (++hash)).text(fileTitle).append($('<small/>',{text: subFiles.allFiles[0].date, css: {'margin-left': '10px'} }));
					p.find(".panel-title").append(pager);
					p.find(".panel-collapse").attr('data-file', fileTitle);
					p.find(".panel-collapse").attr("id", 'cf'+hash).addClass("collapse").removeClass("in");
					p.find('.panel-body').text('....').end()
					p.appendTo(self.$el.find('#categoriesFiles'));

				});

				//this.$el.find('#categoriesFiles :not(.template) .collapse:first()').collapse()
			},

			selectFilePage: function(ev){
				this.state.file = ev.currentTarget.getAttribute('data-file');
				this.state.id = parseInt(ev.currentTarget.value);
				this.renderPageTable();
			},

			renderPageTable: function(){

				if(! (this.state.politician && this.state.file)){ return false; }

				var self = this;
				var container = this.$el.find('[data-file]').filter(function(){return this.getAttribute('data-file') == self.state.file});
				var file = self.cf.arrangedFiles.categories[self.state.politician].categories[self.state.file].files;

				if(!this.state.id){
					var page = file[0];
					self.state.id = page.id;
				}else{
					var page = _(file).findWhere({id: self.state.id });
				}

				if(container.attr('data-id') && container.attr('data-id') == this.state.id){
					return false;
				}else{
					container.attr('data-id', this.state.id);
				}
				
				$(container).find('.panel-body').text('loading...');
				page.getCells(function(){
					var table = page.buildTable();
					table.addClass('table table-hover table-striped').appendTo($(container).find('.panel-body').empty());
					if($(container).find('.panel-body').is(':not(:visible)')){
						container.collapse('show');
					}
				});
				this.pushState();

			},

			renderTextList: function(textObj){
				textObj  = _(textObj).sortBy(function(e){ return _(e).size(); }).reverse();
				_(textObj).each(function(arr){
					var obj = _(arr).first();
					var tr = $(_.template("<tr><td><%- ans %></td><td><img src='<%= image %>'></td><tr>")(obj)).appendTo('table');
				});
			}

		}
		
		return instance;
		
	})())
);