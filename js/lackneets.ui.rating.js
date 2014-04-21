"use strict";

var Lackneets = Lackneets || {};
Lackneets.UI = Lackneets.UI || {};
Lackneets.UI.ThreeStarRating = (function(){
	// Class scope

	var defaultScore = 1.5;

	function ThreeStarRating(score){
		// Instance Scope
		var self = this;
		this.score = score;
		this.$el = 
			$('<div>', {class:'rating', html:[
				$('<i class="fa fa-star" data-score="1"></i>'),
				$('<i class="fa fa-star" data-score="2"></i>'),
				$('<i class="fa fa-star" data-score="3"></i>')
			]}).click(function(ev){
				var score;
				if(score = ev.target.getAttribute('data-score')){
					self.setScore(score);
					self.onRating();
				}

			});
		this.init();
		return $.extend(this.$el, this);
	}

	ThreeStarRating.prototype.setScore = function(score){
		this.score = score;
		this.init();
	}

	ThreeStarRating.prototype.onRating = function(){
		this.$el.trigger('rating', this.score);
	}


	ThreeStarRating.prototype.init = function(){
		this.$el.find('i').attr('class', 'fa fa fa-star-o');
		var star = this.score ? this.score : defaultScore;
		var fullStar = Math.floor(star);
		var halfStar = Math.round(star - fullStar);
		for(var i=0; i<3; i++){
			if(i<fullStar){
				this.$el.find('i').eq(i).attr('class', 'fa fa-star')
			}else if(i<fullStar+halfStar){
				this.$el.find('i').eq(i).attr('class', 'fa fa-star-half-o')
			}else{
				this.$el.find('i').eq(i).attr('class', 'fa fa-star-o')
			}
		}
		this.$el.attr('title', '平均 ' + this.score + ' 分' || '未評分');
		this.$el.css('opacity', this.score ? 1 : 0.5);
	}

	return ThreeStarRating;
})()