$(function () {
  var r = Raphael('holder');
  $('#values').on('change', 'input', function() {
    r.clear();
    drawGraph(r);
  });
  $('button#moar').click(function() {
    var template = _.template("<tr><td><input type='input' class='xin'/></td><td><input type='input' class='yin'/></td></tr>");
    $('#values').append(template());
  });
});

window.drawGraph = function(r) {
  var txtattr = { font: "12px sans-serif" };

  var x = getX(), y = getY(), length = Math.min(x.length, y.length);

  if (length <= 1) {
    return;
  }
  x = _.first(x, length);
  y = _.first(y, length);
  r.linechart(20, 0, 900, 550, x, y, {axis: '0 0 1 1'});
  r.linechart(20, 0, 900, 550, x, y, {symbol: 'circle', nostroke: true});
/*  var x = [], y = [], y2 = [], y3 = [];

  for (var i = 0; i < 1e6; i++) {
      x[i] = i * 10;
      y[i] = (y[i - 1] || 0) + (Math.random() * 7) - 3;
      y2[i] = (y2[i - 1] || 150) + (Math.random() * 7) - 3.5;
      y3[i] = (y3[i - 1] || 300) + (Math.random() * 7) - 4;
  }

  var lines = r.linechart(0, 0, 900, 550, [[1, 2, 3, 4, 5, 6, 7],[3.5, 4.5, 5.5, 6.5, 7, 8]], [[12, 32, 23, 15, 17, 27, 22], [10, 20, 30, 25, 15, 28]], 
{ nostroke: false, axis: "0 0 1 1", symbol: "circle", smooth: true }).hoverColumn(function () {
      this.tags = r.set();

      for (var i = 0, ii = this.y.length; i < ii; i++) {
          this.tags.push(r.tag(this.x, this.y[i], this.values[i], 160, 10).insertBefore(this).attr([{ fill: "#fff" }, { fill: this.symbols[i].attr("fill") }]));
      }
  }, function () {
      this.tags && this.tags.remove();
  });

  lines.symbols.attr({ r: 6 }); */

};

window.getX = function() {
  var xVals = _.map($('input.xin'), numberIn);

  return _.reject(xVals, isNaN);
};

window.getY = function() {
  var xVals = _.map($('input.yin'), numberIn);

  return _.reject(xVals, isNaN);
};

window.getXrange = function() {
  return [numberIn('#xmin'), numberIn('#xmax')];
};

window.getYrange = function() {
  return [numberIn('#ymin'), numberIn('#ymax')];
};

window.numberIn = function(el) {
  return parseFloat($(el).val());
}
