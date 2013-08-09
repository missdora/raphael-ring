(function ($) {
  function Ring(domId, options, data) {
    if (!data || !data.length) {
      return;
    }
    var $holder = $('#' + domId);

    this.options = $.extend({
      width: 100,
      height: 100,
      innerR: 50,
      outerR: 50,
      colors: ['#333', '#666'],
      highlight: '#fff',
      angleDistance: 0,
      centerX: 50,
      centerY: 50,
      highlightTimeInterval: 1500,
      animateTime: 1500
    }, options);

    this.options.bigLabel = $.extend({
      width: 200,
      height: 133,
      rectAttr: {},
      titleAttr: {},
      percentAttr: {},
      lineWidth: 2,
      rectRadius: 5,
      paddingV: 10
    }, options.bigLabel);

    this.options.tip = $.extend({
        height: 30,
        minLine: 30,
        offset: 5,
        extendHorizontalLine: 10,
        lineAttr: {},
        textAttr: {}
    }, options.tip);

    this.data = data;
    this.arcEles = [];
    this.glowEles = {};
    this.positionArr = [];
    this.highlightEle = null;
    this.bigLabel = null;
    this.tipEles = [];

    this.init(domId, options);
  }

  Ring.prototype.init = function (domId, options) {
    this.r = Raphael(domId, options.width, options.height);
   
    this.r.customAttributes.arc =  function (centerX, centerY, startAngle, endAngle, innerR, outerR) {
      var radians = Math.PI / 180,
        largeArc = +(endAngle - startAngle > 180);
        // calculate the start and end points for both inner and outer edges of the arc segment
        // the -90s are about starting the angle measurement from the top get rid of these if this doesn't suit your needs
        outerX1 = centerX + outerR * Math.cos((startAngle - 90) * radians),
        outerY1 = centerY + outerR * Math.sin((startAngle - 90) * radians),
        outerX2 = centerX + outerR * Math.cos((endAngle - 90) * radians),
        outerY2 = centerY + outerR * Math.sin((endAngle - 90) * radians),
        innerX1 = centerX + innerR * Math.cos((endAngle - 90) * radians),
        innerY1 = centerY + innerR * Math.sin((endAngle - 90) * radians),
        innerX2 = centerX + innerR * Math.cos((startAngle - 90) * radians),
        innerY2 = centerY + innerR * Math.sin((startAngle - 90) * radians);
      // build the path array
      var path = [
          ["M", outerX1, outerY1], //move to the start point
          ["A", outerR, outerR, 0, largeArc, 1, outerX2, outerY2], //draw the outer edge of the arc
          ["L", innerX1, innerY1], //draw a line inwards to the start of the inner edge of the arc
          ["A", innerR, innerR, 0, largeArc, 0, innerX2, innerY2], //draw the inner arc
          ["z"] //close the path
      ];
      return {path: path};
    };

    this.draw(options, this.data);
  };

  Ring.prototype.getArcOuterPoint = function (index) {
    var options = this.options;
    var args = this.positionArr[index];
    var breakPointX = args.breakPointX;
    var breakPointY = args.breakPointY;
    var midAngle = args.midAngle;

    var pointRightTag = this.ifPointRight(midAngle);// 1 is right, -1 is left
    var pointTopTag = this.ifPointTop(midAngle); // 1 is top, -1 is bottom

    var leftTag = breakPointX < args.midPointX ? -1 : 1;
    var bottomTag = breakPointY > args.midPointY ? -1 : 1;

    //if (options.width > options.height) {
    var labelX = breakPointX + leftTag * options.bigLabel.width;
    var labelY = breakPointY - options.bigLabel.height / 2;

    var LabelLinePointX = labelX;
    var LabelLinePointY = breakPointY;
    /*} else {
      var labelX = breakPointX - options.bigLabel.width / 2;
      var labelY = breakPointY - pointTopTag * options.bigLabel.height;

      var LabelLinePointX = breakPointX;
      var LabelLinePointY = labelY;
    }*/

    var leftMargin = options.leftMargin;
    var rightMargin = options.rightMargin;
    var topMargin = options.topMargin;
    var bottomMargin = options.bottomMargin;

    if (leftTag === 1 && (labelX + options.bigLabel.width < options.width - rightMargin || labelX + options.bigLabel.width > options.width - rightMargin )) {
      labelX = options.width - rightMargin - options.bigLabel.width;
      LabelLinePointX = options.width - rightMargin - options.bigLabel.width;
    } else if (leftTag === -1 && (labelX > leftMargin || labelX < leftMargin)) {
      labelX = leftMargin;
      LabelLinePointX = leftMargin + options.bigLabel.width;
    }
    if (bottomTag === 1 && labelY < topMargin) {
      labelY = topMargin;
    } else if (bottomTag === -1 && labelY + options.bigLabel.height > options.height - bottomMargin) {
      labelY = options.height - bottomMargin;
    }

    return {
      path: [
        ['M', args.midPointX, args.midPointY],
        ['L', breakPointX, breakPointY],
        ['M', breakPointX, breakPointY],
        ['L', LabelLinePointX, LabelLinePointY]
      ],
      labelX: labelX,
      labelY: labelY
    };

  };

  Ring.prototype.sort = function (data) {
    var arr = data.sort(function (a, b) {
      return b.value - a.value;
    });
    return arr;
  };

  Ring.prototype.draw = function (options, data) {
    var self = this;
    data = this.sort(data);
    var total = 0;
    for (var i = 0; i < data.length; i++) {
      total += data[i].value;
    }
    this.total = total;

    var centerX = options.width / 2;
    var centerY = options.height / 2;
    var startAngle = 0;
    for (i = 0; i < data.length; i++) {
      var val = data[i].value / this.total;
      var endAngle = startAngle + val * 360;
      var color = this.getColor(i);
      var midAngle = Math.PI * (startAngle + endAngle - options.angleDistance) / 360;
      var midPointX = Math.sin(midAngle) * options.outerR;
      var midPointY = Math.cos(midAngle) * options.outerR;
      var transPos = this.translateXY(midPointX, midPointY);
      this.drawSector(startAngle, endAngle - options.angleDistance, color, centerX, centerY);
      
      this.positionArr.push({
        startAngle: startAngle + options.angleDistance / 2,
        endAngle: endAngle - options.angleDistance / 2,
        centerX: centerX,
        centerY: centerY,
        color: color,
        key: data[i].name,
        percent: val,
        midPointX: transPos[0],
        midPointY: transPos[1],
        midAngle: midAngle
      });

      startAngle = endAngle;
    }

    this.setTips();

    window.setTimeout(function () {
      self.setHighlightInterval();
    }, options.highlightTimeInterval);
  };

  Ring.prototype.drawSector = function (startAngle, endAngle, color, centerX, centerY) {
    var options = this.options;
    var innerR = options.innerR;
    var outerR = options.outerR;

    var ele = this.r.path().attr({
      fill: color,
      stroke: color,
      opacity: 1
    }).attr({
      arc: [centerX, centerY, startAngle, startAngle, innerR, outerR]
    });
    ele.animate({
      arc: [centerX, centerY, startAngle, endAngle, innerR, outerR]
    }, options.animateTime, 'easing');
    this.arcEles.push(ele);
  };

  Ring.prototype.getColor = function (index) {
    var colorLength = this.options.colors.length;
    if (index > colorLength - 1) {
      index = index % colorLength;
    }
    return this.options.colors[index];
  };

  Ring.prototype.setHighlight = function (index) {
    //console.log(this.glowEles);
    var self = this;
    var arcCounts = this.positionArr.length;
    var options = this.options;
    var color = options.highlight;
    var innerR = options.innerR;
    var outerR = options.outerR;

    index = index % arcCounts;

    if (this.positionArr[index]) {
      var prevIndex = index - 1 >= 0 ? index - 1 : arcCounts - 1;
      if (this.arcEles[prevIndex]) {
        var prevArgs = this.positionArr[prevIndex];
        this.arcEles[prevIndex].animate({
          fill: prevArgs.color,
          stroke: prevArgs.color
        }, 300, 'easing');

        this.tipEles[prevIndex].show();
      }

      self.removeGlows();

      if (this.arcEles[index]) {
        var currentEle = this.arcEles[index];
        var args = this.positionArr[index];
        self.glowEles[index] = currentEle.glow({
          color: color,
          width: 15
        });
        currentEle.animate({
          fill: color,
          stroke: color
        }, 300, 'easing', function () {
        });
        var posObj = this.getArcOuterPoint(index);
        this.showBigLabel(args.key, args.percent, posObj.path, posObj.labelX, posObj.labelY);
        this.tipEles[index].hide();
      }
    }
  };

  Ring.prototype.removeGlows = function () {
    for (var i in this.glowEles) {
      if (this.glowEles.hasOwnProperty(i) && this.glowEles[i]) {
        this.glowEles[i].remove();
        this.glowEles[i] = null;
      }
    }
  };

  Ring.prototype.setHighlightInterval = function () {
    var self = this;
    var index = 0;
    var timer = window.setInterval(function () {
      //clearInterval(timer)
      self.setHighlight(index);
      index++;
    }, 1000);
  };

  Ring.prototype.showBigLabel = function (title, percent, path, x, y) {
    var percentStr = '占比: ' + Math.round(percent * 10000) / 100 + '%';
    var options = this.options;
    var titleAttr = options.bigLabel.titleAttr;
    var percentAttr = options.bigLabel.percentAttr;
    var rectAttr = options.bigLabel.rectAttr;

    if (!this.bigLabel) {
      this.bigLabel = this.r.set();

      this.bigLabel.push(this.r.path(path).attr({ //0
        stroke: options.highlight,
        'stroke-width': options.bigLabel.lineWidth
      }));
      
      this.bigLabel.push(this.r.rect(x, y, options.bigLabel.width, options.bigLabel.height, options.bigLabel.rectRadius).attr(rectAttr)); //1

      var titleEle = this.r.text(x, y, title).attr(titleAttr); //2
      this.bigLabel.push(titleEle);

      var percentEle = this.r.text(x, y, percentStr).attr(percentAttr); //3
      this.bigLabel.push(percentEle);
    } else {
      this.bigLabel[0].remove();
      this.bigLabel[0] = this.r.path(path).attr({
        stroke: options.highlight,
        'stroke-width': options.bigLabel.lineWidth
      });
      
      this.bigLabel[1].attr({x: x, y: y});
      this.bigLabel[2].attr({text: title, x: x, y: y});
      this.bigLabel[3].attr({text: percentStr, x: x, y: y});
    }

    this.resetTextPosInBigLabel(x, y);
  };

  Ring.prototype.setTips = function () {
    var self = this;
    var options = this.options;
    var outerR = options.outerR;
    var tipHeight = options.tip.height;
    var minL = options.tip.minLine;
    var offset = 0 - options.tip.offset;
    var pi = Math.PI;
    var extendLen = options.tip.extendHorizontalLine;

    var n = this.data.length;
    var percentageArr = [];

    var posArr = [];
    var startAngleArr = [];
    var preSum = 0;
    var thr = [0, 0, 0];
    var tmpX, tmpY;
    var j = 1;

    for (var i = 0; i < n; i++) {
      percentageArr[i] = this.data[i].value / this.total;
      startAngleArr[i] = preSum + percentageArr[i] / 2;
      if (startAngleArr[i] > j * 0.25) {
        var jBegin = j;
        while (startAngleArr[i] > j * 0.25 && j < 4) {
          j++;
        }
        for (var k = jBegin + 1; k <= j; k++) {
          thr[k - 2] = i;
        }
      }
      startAngleArr[i] *= 2 * pi;
      preSum += percentageArr[i];
    }

    var preHeight = - (outerR + 10 * minL);
    for (i = thr[0] - 1; i >= 0; i--) {
      if (!posArr[i]) {
        posArr[i] = {};
      }
      tmpY = Math.cos(startAngleArr[i]) * outerR;
      tmpX = Math.sin(startAngleArr[i]) * outerR;
      if ((tmpY - tipHeight / 2) >= preHeight) {
        posArr[i].y = tmpY;
        posArr[i].x = tmpX + minL;
      } else {
        posArr[i].y = preHeight + tipHeight / 2;
        posArr[i].x = posArr[i + 1].x - offset;
      }
      posArr[i].direction = true;
      preHeight = posArr[i].y + tipHeight / 2;
    }

    if (thr[0] > 0) {
      preHeight = posArr[thr[0] - 1].y - tipHeight / 2;
    } else {
      preHeight = (outerR + 10 * minL);
    }
    for (i = thr[0]; i < thr[1]; i++) {
      tmpY = Math.cos(startAngleArr[i]) * outerR;
      tmpX = Math.sin(startAngleArr[i]) * outerR;
      if (!posArr[i]) {
        posArr[i] = {};
      }
      if ((tmpY + tipHeight / 2) <= preHeight) {
        posArr[i].y = tmpY;
        posArr[i].x = tmpX + minL;
      } else {
        posArr[i].y = preHeight - tipHeight / 2;
        posArr[i].x = posArr[i - 1].x - offset;
      }
      posArr[i].direction = true;
      preHeight = posArr[i].y - tipHeight / 2;
    }

    console.log('posArr 2', posArr)

    preHeight = (outerR + 10 * minL);
    for (i = thr[2] - 1; i >= thr[1]; i--) {
      tmpY = Math.cos(startAngleArr[i]) * outerR;
      tmpX = Math.sin(startAngleArr[i]) * outerR;
      if (!posArr[i]) {
        posArr[i] = {};
      }
      if ((tmpY + tipHeight / 2) <= preHeight) {
        posArr[i].y = tmpY;
        posArr[i].x = tmpX - minL;
      } else {
        posArr[i].y = preHeight - tipHeight / 2;
        posArr[i].x = posArr[i + 1].x + offset;
      }
      posArr[i].direction = true;
      preHeight = posArr[i].y - tipHeight / 2;
    }

    preHeight = posArr[thr[2] - 1].y + tipHeight / 2;
    var ifOver = false;
    for (i = thr[2]; i < n; i++) {
      //console.log('preHeight', preHeight, i, options.centerY);
      if (!posArr[i]) {
        posArr[i] = {};
      }
      tmpY = Math.cos(startAngleArr[i]) * outerR;
      tmpX = Math.sin(startAngleArr[i]) * outerR;
      if ((tmpY - tipHeight / 2) >= preHeight && !ifOver) {
        console.log('here', i);
        posArr[i].y = tmpY;
        posArr[i].x = tmpX - minL;

        preHeight = posArr[i].y + tipHeight / 2;
      } else {
        posArr[i].y = preHeight + tipHeight / 2;
        posArr[i].x = posArr[i - 1].x - offset;

        if (posArr[i].y > options.height / 2 - tipHeight / 2) {
          ifOver = true;
        }
        if (ifOver) {
          posArr[i].y = preHeight - tipHeight / 2;
          posArr[i].x = Math.abs(posArr[i].x);
          preHeight = posArr[i].y - tipHeight / 2;
        } else {
          preHeight = posArr[i].y + tipHeight / 2;
        }

      }
      posArr[i].direction = false;
    }

    var minTop = 0 + tipHeight;
    var maxBottom = options.height - tipHeight;
    for (i = 0; i < posArr.length; i++) {
      var transPos = this.translateXY(posArr[i].x, posArr[i].y);
      var args = this.positionArr[i];
      var set = this.r.set();
      var ifInCircle = this.ifInCircle(transPos[0], transPos[1]);
      console.log(ifInCircle);
      var rightTag = transPos[0] < args.midPointX ? -1 : 1;

      var path = [
        ['M', args.midPointX, args.midPointY],
        ['L', transPos[0], transPos[1]]
      ];
      var textX = transPos[0] + ifInCircle * rightTag + rightTag * extendLen;
      var textY = transPos[1];
      path.push(['M', transPos[0], transPos[1]]);
      path.push(['L', textX , transPos[1]]);

      set.push(this.r.path(path).attr(options.tip.lineAttr));
      
      /* 计算出来的TIP线的终点，调试时可以打开
      this.r.circle(transPos[0], transPos[1], 2).attr({
        fill: '#ffa900'
      });
      */
      
      var textAttr = $.extend({
        'text-anchor' : rightTag === 1 ? 'start' :  'end'
      }, options.tip.textAttr);
      set.push(this.r.text(textX + rightTag * 10, textY, args.key).attr(textAttr));
      args.breakPointX = transPos[0];
      args.breakPointY = transPos[1];
      self.tipEles.push(set);
    }
  };

  //将以圆为中心的坐标转换为以画布左上角为起点的坐标
  Ring.prototype.translateXY = function (x, y) {
    var options = this.options;
    var xDis = options.width / 2;
    var yDis = options.height / 2;

    return [x + xDis, - y + yDis];
  };

  //将以圆为中心的坐标转换为以画布左上角为起点的坐标
  Ring.prototype.translateX = function (x) {
    var options = this.options;
    var xDis = options.width / 2;

    return x + xDis;
  };

  //将以圆为中心的坐标转换为以画布左上角为起点的坐标
  Ring.prototype.translateY = function (y) {
    var options = this.options;
    var yDis = options.height / 2;

    return - y + yDis;
  };

  //根据角度值计算是否在第一象限和第四象限
  Ring.prototype.ifPointTop = function (angle) {
    // 1 is top, -1 is bottom
    return (Math.cos(angle) / Math.abs(Math.cos(angle)));
  };

  //根据角度值计算是否在第二象限和第三象限
  Ring.prototype.ifPointRight = function (angle) {
    // 1 is right, -1 is left
    return (Math.sin(angle) / Math.abs(Math.sin(angle)));
  };

  Ring.prototype.ifInCircle = function (x, y) {
    var options = this.options;
    var outerR = options.outerR;
    var centerX = options.centerX;
    var centerY = options.centerY;

    var disX = Math.abs(x - centerX);
    var disY = Math.abs(y - centerY);
    var disPow = Math.pow(disX, 2) + Math.pow(disY, 2);

    if (disPow < Math.pow(outerR, 2)) {
      return Math.max(outerR - disX, outerR - disY);
    }
    return 0;
  };

  Ring.prototype.resetTextPosInBigLabel = function (x, y) {
    var options = this.options.bigLabel;
    var titleWidth = this.bigLabel[2].getBBox().width;
    var titleHeight = this.bigLabel[2].getBBox().height;
    var percentWidth = this.bigLabel[3].getBBox().width;
    var percentHeight = this.bigLabel[3].getBBox().height;
    var maxWidth =  Math.max(titleWidth, percentWidth);
    var disX = (options.width - maxWidth) / 2;
    var disY = (options.height - 2 * options.paddingV - titleHeight - percentHeight);

    this.bigLabel[2].attr({x: x + disX, y: y + options.paddingV + titleHeight / 2});
    this.bigLabel[3].attr({x: x + disX, y: y + options.height - options.paddingV - percentHeight / 2});
  };
  window.Ring = Ring;
})(jQuery);


