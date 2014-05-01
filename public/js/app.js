"use strict";

var G0V = G0V || {};
G0V.CFinance = G0V.CFinance || {};

var CFinance = (function () {

	// getTotalCount(callback) : callback(count)
	function getTotalCount(callback) {
		var s = this;
		return $.getJSON('http://campaign-finance.g0v.ctiml.tw/api/getcellcount?callback=?', function (response) {
			callback && callback.call(s, parseInt(response.count), parseInt(response.count) - parseInt(response.todo), parseInt(response.todo));
		});
	}

	// getTable(id, callback) : callback(tables, meta)
	function getTable(id, callback) {
		var s = this;
		return $.getJSON('http://campaign-finance.g0v.ronny.tw/api/tables/' + parseInt(id) + '?callback=?', function (response) {
			callback && callback.call(s, response.data.tables, response.data.meta);
		});
	}

	// getTables(callback) : callback(data, error)
	function getTables(callback) {
		var s = this;
		return $.getJSON('/api/gettables?callback=?', function (response) {
			callback && callback.call(s, response.data, response.error);
		});
	}

	// cellImage(id, row, col) : return url;
	function cellImage(page, row, col) {
		return 'http://campaign-finance.g0v.ronny.tw/api/getcellimage/' + parseInt(page) + '/' + row + '/' + col + '.png';
	}

	function CFinance(callback) {
		getTables.call(this, function (dataPages) {
			this.totalPage = _(dataPages).size();
			this.pages = _(dataPages).map(function (e) {
				return new CFinancePage(e);
			});
			callback && callback.call(this);
		});
	}
	CFinance.prototype.getFiles = function (politician) {
		return _(this.pages).chain().where({
			politician: politician
		}).groupBy(function (e) {
			return e.file
		}).value();
	},
	CFinance.prototype.getFilePages = function (politician, file) {
		return _(this.pages).where({
			politician: politician,
			file: file
		});
	},
	CFinance.prototype.getPoliticians = function () {
		return _(this.pages).chain().pluck('politician').unique().value();
	},
	CFinance.prototype.getPoliticiansPages = function () {
		return _(this.pages).groupBy(function (e) {
			return e.politician
		});
	},
	CFinance.prototype.find = function (cond) {
		return _(this.pages).findWhere(cond);
	},
	CFinance.prototype.where = function (cond) {
		return _(this.pages).where(cond);
	},


	CFinance.prototype.getTable = function (id) {
		return _(this.files).chain().flatten().findWhere({
			id: id
		}).value();
	}

	function getCells(page, callback) {
		var s = this;
		return $.getJSON('http://campaign-finance.g0v.ctiml.tw/api/getcells/' + parseInt(page) + '?callback=?', function (response) {
			callback && callback.call(s, response);
		})
	}

	function CFinanceFile(fileAttr) {
		_.extend(this, fileAttr);
	}

	function CFinancePage(tableAttr) {
		_.extend(this, tableAttr);

		this.file = this.file.replace(/-([\?]+)\/([\?]+)\/([\?]+)-([\?]+)\/([\?]+)\/([\?]+)/g, '-未確定資料日期');
		this.file = this.file.replace(/-[^\/\-]+\.pdf$/, '-[未分類帳戶]-未確定資料日期');
		this.file = this.file.replace(/專戶$/, '專戶-[未分類帳戶]-未確定資料日期');

		var pattern = new RegExp(/^(第[\d一二三四五六七八九十]+[屆任]?)(.*?)(擬?參選人)(.+)政治獻金專戶-([^-]+)-?(.+)?$/);

		this.number = this.file.replace(pattern, '$1'); //第N任
		this.title = this.file.replace(pattern, '$2');
		this.people = this.file.replace(pattern, '$4');
		this.politician = this.file.replace(pattern, '$4');
		this.date = this.file.replace(pattern, '$6');
		this.page_id = this.id;

		this.__CATEGORY__ = this.file.replace(pattern, '$4|$5|$6');
		this.file = this.file.replace(pattern, '$5');

		this.__CATEGORY__ = this.__CATEGORY__.split('|');
		this.__CATEGORY__.pop();
		this.__CATEGORY__ = this.__CATEGORY__.splice(0, 4);

	}
	CFinancePage.prototype.getCells = function (callback) {
		getCells.call(this, this.id, function (cells) {
			var table = this;
			this.cells = _(cells).map(function (c) {
				return new CFinanceCell(c, table);
			});
			callback && callback.call(this)
		});
	}

	CFinancePage.prototype.buildTable = function (callback) {
		var rows = _(this.cells).groupBy(function (c) {
			return c.row;
		});
		var table = $('<table/>');
		table.append($('<thead><tr><th>序號</th><th>交易日期</th><th>收支科目</th><th>捐贈者/支出對象</th><th>身份證/統編</th><th>收入</th><th>支出</th><th>金錢類</th><th>地址</th></tr></thead>'));
		for (var r = 0; r <= 21; r++) {
			var tr = $('<tr/>').appendTo(table);
			if (rows[r])
				for (var c = 1; c < 10; c++) {
					var col = _(rows[r]).findWhere({
						col: c
					});
					var val = (col && col.ans) || '';

					// switch(c){
					// 	case 1: break;
					// 	case 4: val = String(val).replace(/＊/, '*'); break;
					// 	case 5: val = String(val).replace(/＊/, '*'); break;
					// 	case 6: val = String(val).replace(/＊/, '*'); break;
					// }

					var td = $('<td/>', {
						text: val
					}).appendTo(tr);
					$('<i class="fa fa-question" title="Image"></i>').uitooltip({
						content: '<img src="' + cellImage(this.id, r, c) + '" style="max-height:40px;" />',
						track: true
					}).appendTo(td);
				}
		}
		return $.extend(table, this);
	}

	function CFinanceCell(cellAttr, table) {
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
	_.extend({}, (function () {

		//var cf = new CFinance();

		(function refreshCounter() {
			var interval = 3000;
			var current = 0;
			var total = 0;
			var history = 0, incrementBuffer = 0;
			var increment = 0;
			var timer;

			function numberUpEffect(n){
				$('#counter').css('position', 'relative')
				return $('<span/>', {
					text: '+' + n,
					css: {
						'color' : '#FF4500',
						'font-famiy' : 'Arial Black',
						'font-weight' : 'bold',
						'position':'absolute',
						'left' : 5 + Math.random()*80,
						'top' : 35 - Math.random()*5
					}
				}).insertAfter('#counter').animate({
					top: '-=45' ,
					opacity: 0
				}, 1000, 'easeInQuad', function(){
					$(this).remove();
				});
			}

			(function renew() {
				CFinance.getTotalCount(function (total, done, remains) {
					var percent = Math.ceil(done * 100 / total) + '%';
					var count = done;
					clearInterval(timer);
					if (history) {
						increment = count - history;
						timer = setInterval(function () {
							current += increment / (interval / 80);
							incrementBuffer+= increment / (interval / 80);

							if(incrementBuffer>=1){
								var up = Math.floor(incrementBuffer);
								incrementBuffer-=up;
								numberUpEffect(up);
							}

							$('#counter').text(Math.ceil(current) + ' / ' + percent).attr('title', '還有 ' + remains + ' 格資料未輸入，共：' + total);
						}, 100);
					}

					if (count >= Math.ceil(current)) {
						var up = count - Math.ceil(current);
						history && up && numberUpEffect(up);
						$('#counter').text(count + ' / ' + percent).attr('title', '還有 ' + remains + ' 格資料未輸入，共：' + total);
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
				'submit form': 'searchFrom',
				'click #getLocation': 'returnMyLocation',
				'click #politician li': 'selectPolitician',
				'change select.file-page': 'selectFile',
				'shown.bs.collapse .collapse': 'showCategoryPage'
			},

			el: 'body',
			cf: null,

			initialize: function (options) {
				self = this;
				this.state = {
					path: '/',
					politician: null,
					page_id: null
				};

				this.cf = new CFinance(function () {
					self.initPolitician.call(self);
					self.$el.find('#loading').hide();
					self.$el.find('#main').fadeIn();

					if (options.navigate) {
						self.navigate(options.navigate)
					}
				});

				$(window).on('popstate', function (ev) {
					var path = decodeURI(location.pathname).replace(/^\/view\//, '/');
					self.navigate(path);
				})

			},

			avoidHashing: function (ev) {
				if (ev.currentTarget.href = '#') {
					ev.preventDefault();
					return false;
				}
			},

			selectPolitician: function (politician, file, page_id) {
				//from a click event ?
				politician = (politician.currentTarget) ? politician.currentTarget.getAttribute('data-politician') : politician;
				this.state.politician = politician;
				this.state.file = file && null;
				this.state.page = null;
				this.state.page_id = page_id && null;


				this.pushState();
				this.renderCategory();
			},

			selectFile: function (file, page_id) {

				this.state.file = (file && file.currentTarget) ? file.currentTarget.getAttribute('data-file') : file;
				this.state.page_id = page_id || ((file.currentTarget) && parseInt(file.currentTarget.value));

				if (!this.state.page_id) {
					var pages = this.cf.where({
						politician: this.state.politician,
						file: file
					});
					this.state.page_id = page_id || (pages.length && pages[0].id);
				}

				this.pushState();
				this.renderPageTable();
			},

			navigate: function (path) {
				var option = path.replace(/(^\/*|\/*$)/g, '').split('/');
				//option[0] && this.selectPolitician(option[0]);
				//option[1] && this.selectFile(option[1], parseInt(option[2]) || null);
				// && (this.state.id = parseInt(option[2]))
				//this.render();

				this.state.politician = option[0] || null;
				this.state.file = option[1] || null;
				this.state.page_id = (parseInt(option[2])) || null;
				this.renderCategory();
				this.renderPageTable();
			},

			initPolitician: function () {
				var self = this;
				var li = this.$el.find('#politician li.template:first').clone().removeClass('template');

				this.politicianMenu = this.politicianMenu || {};

				_.each(this.cf.getPoliticiansPages(), function (pages, politicianName) {
					self.politicianMenu[politicianName] = li.clone().appendTo(self.$el.find('#politician .nav')).find('a').text(politicianName).append([
						$('<span class="badge" style="margin-left:5px">' + _(pages).size() + '</span>'),
						$('<div class="political-title">' + pages[0].title + '</div>'),
					]).end().attr('data-politician', politicianName);

					var oneName = politicianName.split(/[、\s\,]/)[0];

					$.get('/api/partyInfo/' + oneName, function(res){
						if(res.party){
							$('<img/>', {
								title: res.party,
								css: {'margin-right': '5px'},
								src: res.partyImg
							}).prependTo(self.politicianMenu[politicianName].find('a'))
						}
					})

				});
			},
			pushState: function () {
				// prevent the same page
				if(history.state && history.state.page_id == this.state.page_id) {
					return
				}
				this.getCurrentPath() && history.pushState(this.state, '', '/view' + this.getCurrentPath());
				this.getCurrentPath() && ga && ga('send', 'pageview', this.getCurrentPath());
				// https://developers.google.com/analytics/devguides/collection/analyticsjs/pages
			},
			getCurrentPath: function () {
				var path = '';
				if (this.state.politician) {
					path += '/' + this.state.politician;
				} else {
					return path;
				}
				if (this.state.file) {
					path += '/' + this.state.file;
				} else {
					return path;
				}
				if (this.state.page_id) {
					path += '/' + this.state.page_id;
				} else {
					return path;
				}
				return path;
			},

			// render: function () {
			// 	this.renderCategory();
			// 	this.renderPageTable();
			// 	this.pushState();
			// },

			showCategoryPage: function (ev) {
				this.state.file = ev.currentTarget.getAttribute('data-file');
				this.state.page_id = parseInt(ev.currentTarget.getAttribute('data-page_id')) || null;
				this.selectFile(this.state.file, this.state.page_id);
			},

			renderCategory: function () {
				var self = this;
				var _panel = this.$el.find('#categoriesFiles .panel.template:first').clone().removeClass('template');
				var hash = 2000;

				if (!this.state.politician) {
					return false;
				}

				// render politician selection
				this.$el.find('#politician li').filter(function () {
					return this.getAttribute('data-politician') == self.state.politician
				}).siblings().removeClass('active').end().addClass('active');
				//hide politician menu
				this.$el.find('#politician .collapse').collapse('hide');


				// Clean FilesView
				this.$el.find('#categoriesFiles > *:not(.template)').remove();

				_(this.cf.getFiles(this.state.politician)).each(function (subFiles, fileTitle) {

					subFiles = _(subFiles).sortBy(function (e) {
						return parseInt(e.page);
					});

					var pager = $('<select/>', {
						'class': 'form-control file-page',
						attr: {
							'data-file': fileTitle
						}
					});
					_(subFiles).each(function (f) {
						$('<option/>', {
							text: '' + f.page + '頁 #' + f.page_id,
							val: f.id,
							attr: {
								page_id: f.id
							}
						}).appendTo(pager).data('file', f);
					});

					var p = _panel.clone();

					p.find(".panel-title span.badge").text(_(subFiles).size());
					p.find(".panel-title a").attr("href", "#cf" + (++hash)).text(fileTitle).append($('<small/>', {
						text: subFiles[0].date,
						css: {
							'margin-left': '10px'
						}
					}));
					p.find(".panel-title").append(pager);
					p.find(".panel-collapse").attr('data-file', fileTitle);
					p.find(".panel-collapse").attr("id", 'cf' + hash).addClass("collapse").removeClass("in");
					p.find('.panel-body').text('....').end()
					p.appendTo(self.$el.find('#categoriesFiles'));

				});

				$('body').stop(true).scrollTo(this.$el.find('#categoriesFiles'), 500, {
					offset: {
						top: -100
					}
				});
			},

			renderPageTable: function () {

				if (!(this.state.politician && this.state.file)) {
					return false;
				}

				var self = this;
				var container = this.$el.find('[data-file]').filter(function () {
					return this.getAttribute('data-file') == self.state.file
				});


				// prevent double rendering
				if (container[0].getAttribute('data-file') == self.state.file && parseInt(container[0].getAttribute('data-page_id')) == self.state.page_id) {
					container.collapse('show');
					return false;
				}

				//write current page
				container.attr('data-page_id', this.state.page_id);

				var page = this.cf.find({
					//politician: this.state.politician,
					page_id: this.state.page_id
				});

				//scroll to page container
				$('body').stop(true).scrollTo(container, 500, {
					offset: {
						top: -100
					}
				});

				//render contents
				$(container).find('.panel-body').text('loading...');
				page.getCells(function () {
					var table = page.buildTable();
					table.addClass('table table-hover table-striped').appendTo($(container).find('.panel-body').empty());
					if ($(container).find('.panel-body').is(':not(:visible)')) {
						container.collapse('show');
					}
				});

			},

			renderTextList: function (textObj) {
				textObj = _(textObj).sortBy(function (e) {
					return _(e).size();
				}).reverse();
				_(textObj).each(function (arr) {
					var obj = _(arr).first();
					var tr = $(_.template("<tr><td><%- ans %></td><td><img src='<%= image %>'></td><tr>")(obj)).appendTo('table');
				});
			}

		}

		return instance;

	})())
);