"use strict";

var G0V = G0V || {};
G0V.CFinance = G0V.CFinance || {};

var CFinance = (function(){

	// getTotalCount(callback) : callback(count)
	function getTotalCount(callback){ var s = this; return $.getJSON('http://campaign-finance.g0v.ctiml.tw/api/getcellcount?callback=?', function(response){callback && callback.call(s, response.count); }); }

	// getTable(id, callback) : callback(tables, meta)
	function getTable(id, callback){ var s = this; return $.getJSON('http://campaign-finance.g0v.ronny.tw/api/tables/'+parseInt(id)+'?callback=?', function(response){callback && callback.call(s, response.data.tables, response.data.meta); }); }
	
	// getTables(callback) : callback(data, error)
	function getTables(callback){ var s = this; return $.getJSON('http://campaign-finance.g0v.ronny.tw/api/gettables?callback=?', function(response){callback && callback.call(s, response.data, response.error); }); }
	
	// cellImage(id, row, col) : return url;
	function cellImage(page, row, col){ return 'http://campaign-finance.g0v.ronny.tw/api/getcellimage/'+parseInt(page)+'/'+row+'/'+col+'.png'; }

	function splitFile(files){
		_(files).each(function(f){
			if(!f.__CATEGORY__){
				f.__CATEGORY__ = f.file.split('/');
				f.__CATEGORY__.pop();				
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
			var interval = 5000;
			var current = 0;
			var history = 0;
			var increment = 0;
			var timer;
			(function renew(){
				CFinance.getTotalCount(function(count){
					count = parseInt(count);
					clearInterval(timer);
					if(history){
						increment = count-history; 
						timer = setInterval(function(){
							current += increment/(interval/80);
							$('#counter').text(Math.ceil(current));
						}, 100);
					}

					if(count >= current) {
						$('#counter').text(count);
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
				'click .sidebar-nav li' : 'switchCategory'
				//'click a' : 'avoidHashing'
			},
			
			el: 'body',

			cf: null,
			
			initialize: function(options){
				self = this;
				this.cf = new CFinance(function(){
					self.renderFilesList.call(self);
					self.$el.find('#loading').hide();
					self.$el.find('#main').fadeIn();
					self.$el.find('#filesList .navbar-nav > li:not(.template):first()').click();
				});
			},
			switchCategory: function(ev){
				$(ev.currentTarget).siblings().removeClass('active').end().addClass('active')
			},
			avoidHashing: function(ev){
				if(ev.currentTarget.href = '#'){
					ev.preventDefault();
					return false;
				}
			},
			renderFilesList: function(){
				var self = this;
				var li = this.$el.find('#filesList li.template:first').clone().removeClass('template');

				_.each(this.cf.arrangedFiles.categories, function(cat1, cat1Title){
					var ll = li.clone().appendTo(self.$el.find('#filesList .nav')).find('a').text(cat1Title).append($('<span class="badge" style="margin-left:5px">'+cat1.totalFiles+'</span>')).end();
					ll.click(function(){
						self.renderCategory.call(self, cat1.categories);
					});
				});			
			},

			renderCategory: function(categories){
				var self = this;
				var _panel = this.$el.find('#categoriesFiles .panel.template:first').clone().removeClass('template'); 
				var hash = 2000;

				this.$el.find('#categoriesFiles .panel:not(.template)').remove();

				_(categories).each(function(cat, catTitle){

					cat.files = _(cat.files).sortBy(function(e){ return parseInt(e.page); });

					var currentPage = cat.files[0];
					var pager = $('<select class="form-control"/>');
					_(cat.files).each(function(f){
						$('<option/>', {text: '#' + f.page + '頁', attr: {id: f.id}}).appendTo(pager).data('file', f);
					});

					var p = _panel.clone()
					p.find(".collapse").removeClass("in").on('show.bs.collapse', function(){ self.renderTable(this, currentPage) });
					p.find(".panel-title a").attr("href",  "#cf" + (++hash)).text(catTitle);
					p.find(".panel-title").append(pager);
					p.find(".panel-collapse").attr("id", 'cf'+hash).addClass("collapse").removeClass("in");
					p.find('.panel-body').text('....').end()
					.appendTo(self.$el.find('#categoriesFiles'));

					pager.change(function(ev){
						currentPage = $(this).find(':selected').data('file');
						self.renderTable(p, currentPage);
						p.find(".collapse").collapse('show');
					});

				});

				this.$el.find('#categoriesFiles :not(.template) .collapse:first()').collapse()
			},

			renderTable: function(el, file){
				var self = this;
				$(el).find('.panel-body').text('loading...')
				file.getCells(function(){
					var table = file.buildTable();
					table.addClass('table table-hover table-striped').appendTo($(el).find('.panel-body').empty());
				});
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

$(function(){ 
	window.cftable = new CFTable(); 
})