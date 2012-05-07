$(function () {
  window.r = Raphael('holder');
  window.rowTemplate = _.template($('script#rowTemplate').html());
  window.dataTemplate = _.template($('script#dataTemplate').html());

  $('#values').on('change', 'input', function() {
    redraw();
  });
  $('#ranges').on('change', 'input', function() {
    redraw();
  });
  $('button#moar').click(function() {
    addRow('','');
  });
  $('#values').on('click', 'a.remove', function(e) {
    e.preventDefault();
    $(e.target).parents('tr').remove();
    redraw();
    return false;
  });
});

window.redraw = function() {
  r.clear();
  var points = loadValues();
  drawGraph(r, points[0], points[1]);
}

window.addRow = function(x, y) {
  $('#values').append(rowTemplate({x:x, y:y}));
}

window.loadValues = function() {
  var x = getX(), y = getY(), length = Math.min(x.length, y.length);

  x = _.first(x, length);
  y = _.first(y, length);

  /* normal order the lists */
  points = _.zip(x, y);
  points = _.sortBy(points, xCoord);
  // the spline will fail disastrously if a x value is duplicated
  // remove offending points
  points = _.uniq(points, true, xCoord);

  x = _.map(points, xCoord);
  y = _.map(points, yCoord);

  pushValues('input.xin', x)
  pushValues('input.yin', y);
  return [x, y];
}

window.pushValues = function(el, x) {
  // push the values back into the table in sorted order
  $(el).each(function(index, e) {
    var newval = x[index];
    if (newval != undefined) {
      $(e).val(newval);
    }
  });
}

window.drawGraph = function(r, x, y) {
  var txtattr = { font: "12px sans-serif" };

  if (x.length <= 2) {
    return;
  }

  var coefs = spline_coef(x, y);
  var expanded_coefs = expand_coefs(x, y, coefs);
  var points = spline_plot(x, y, expanded_coefs);
  window.chart = r.linechart(20, 0, 900, 550, [x, points[0]], [y, points[1]],
                              {
                                axis: '0 0 1 1', axisxstep: niceSteps(x), axisystep: niceSteps(y),
                                symbol: ['circle', ''],
                                nostroke: [true, false],
                                xmin: numberIn('#xmin')+1e-10, xmax: numberIn('#xmax')+1e-10,
                                ymin: numberIn('#ymin')+1e-10, ymax: numberIn('#ymax')+1e-10
                              }).clickColumn(function(ev) {
                                var pt = chart.screenToData(ev.offsetX, ev.offsetY);
                                addRow(pt[0], pt[1]);
                                redraw();
                              });
  $('#results').val(dataTemplate({data: expanded_coefs}).replace(/,\s*]/g,']'));
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

window.nearestPower = function(x) {
  return Math.pow(10, Math.floor(Math.log(x)/Math.LN10));
}

window.xCoord = function(p) { return p[0]; }
window.yCoord = function(p) { return p[1]; }

window.niceSteps = function(a) {
  // find a sensible step count, based on the given values
  var min = _.min(a), max = _.max(a),
      range = max - min,
      nearest = nearestPower(range),
      steps = Math.floor(range/nearest);

  return (steps <= 4 ? Math.floor(5*range/nearest) : steps);
}

window.spline_coef = function(x, y) {
  // returns the second derivatives needed to calculate a natural cubic spline
  // through the given points
  // source: Numerical Mathematics and Computing, 3rd Ed., Cheney & Kincaid, 1994, p. 297
  //
  // expects x and y to be equal-length arrays, with x in normal order

  var n = x.length - 1;
  var h = [], b = [], u = [], v = [], z=[];

  for(var i=0; i<n; i++) {
    h[i] = x[i+1] - x[i];
    b[i] = (y[i+1] - y[i])/h[i];
  }

  u[1] = 2*(h[0]+h[1]);
  v[1] = 6*(b[1]-b[0]);

  for(var i=2; i<n; i++) {
    u[i] = 2*(h[i]+h[i-1]) - (h[i-1]*h[i-1])/u[i-1];
    v[i] = 6*(b[i]-b[i-1]) - (h[i-1]*v[i-1])/u[i-1];
  }

  z[n] = 0;
  z[0] = 0;
  for(var i=n-1; i > 0; i--) {
    z[i] = (v[i] - h[i]*z[i+1])/u[i];
  }

  return z;
}

window.spline_interp_direct = function(x_eval, x, y, coefs) {
  // evaluate the natural cubic spline given by x, y and coefs at x_eval

  var n = x.length - 1;
  var i, h, tmp, diff;

  // handle out-of-bounds cases
  if (x_eval > x[n]) {
    var h = x[n] - x[n-1];
    var dy = y[n] - y[n-1];
    // NOTE: this is tricky, since we're evaluating S'[n-1](x[n])
    var slope = dy/h + h*coefs[n]/3 + h*coefs[n-1]/6;
    return slope*(x_eval - x[n]) + y[n];
  }
  if (x_eval < x[0]) {
    var h = x[1] - x[0];
    var dy = y[1] - y[0];
    // NOTE: B[0]
    var slope = dy/h - h*coefs[0]/3 - h*coefs[1]/6
    return slope*(x_eval - x[0]) + y[0];
  }
  // find the appropriate segment
  for(i=n-1; i >= 0; i--) {
    diff = x_eval - x[i];
    if (diff >= 0) {
      break;
    }
  }

  // evaluate it
  h = x[i+1] - x[i];
  tmp = coefs[i]/2 + diff*(coefs[i+1]-coefs[i])/(6*h);
  tmp = diff*tmp - (h/6)*(coefs[i+1] + 2*coefs[i]) + (y[i+1]-y[i])/h;
  return y[i]+diff*tmp;
}

window.spline_interp = function(x_eval, coefs) {
  // evaluate the spline represented by the coefs array
  // see expand_coefs for details on the format
  var n = coefs.length - 1;
  var diff;
  var i;

  for(i=n; i > 0; i--) {
    diff = x_eval - coefs[i][0];
    if (diff >= 0) {
      break;
    }
  }
  // note: if we complete the loop without breaking, i will be 0
  var c = coefs[i][1];
  return c[0] + diff*(c[1] + diff*(c[2] + diff*c[3]));
}

window.expand_coefs = function(x, y, coefs) {
  // find the coefficients of a chained multiplication explictly
  // each row of the result looks like:
  //   [x0, [a, b, c, d]]
  // which is a cubic segment starting at x0 of the form:
  //   y = a + diff*(b+diff*(c+d*diff))
  // where diff = x - x0
  //
  // the first and last elements in the array encode the coefficients
  // needed to linearly extrapolate the spline outside the original bounds.
  var n = x.length - 1;
  var h = x[1] - x[0];
  var dy = y[1] - y[0];
  var result = [[x[0], [y[0], (dy/h - h*(coefs[1] + 2*coefs[0])/6), 0, 0]]];
  for(var i=0; i<n; i++) {
    h = x[i+1] - x[i];
    dy = y[i+1] - y[i];
    var dz = coefs[i+1] - coefs[i];
    result.push([x[i], [y[i], (dy/h - h*(coefs[i+1]+2*coefs[i])/6), coefs[i]/2, dz/(6*h)]]);
  }
  dy = y[n] - y[n-1];
  h = x[n] - x[n-1];
  result.push([x[n], [y[n], (dy/h + h*(2*coefs[n] + coefs[n-1])/6), 0, 0]]);
  return result;
}

window.spline_plot = function(x, y, coefs) {
  // return an array with an array of x coordinates and an array of y coordinates for the
  // graph of the spline specified by x, y and coefs

  var points = [[], []];
  var xmin = _.min(x), xmax = _.max(x), range = xmax - xmin, full_range = 1.2*range;
  var n = 200;
  var inc = full_range/n;

  xmin = xmin - 0.1*range;
  xmax = xmax + 0.1*range;

  for(var i=0; i<n; i++) {
    var x0 = i*inc + xmin;
    points[0][i] = x0;
    points[1][i] = spline_interp(x0, coefs);
  }

  return points;
}

