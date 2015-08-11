"use strict";

var fs = require('fs');
var path = require('path');

var execFile = require('child_process').execFile;
var async = require('async');
var tempfile = require('tempfile');

var round10 = require('./round10');

function Optimizer(param) {
  this.options = param.options || {};
  this.src = param.src;
  this.tmp = tempfile(path.extname(this.src));
  this.dest = param.dest || this.src;
  this.extension = path.extname(this.src);
}

Optimizer.prototype.optipng = function () {
  var args = [];
  args.push('-i 1');
  args.push('-strip all');
  args.push('-fix');
  args.push('-o7');
  args.push('-force');
  args.push(this.tmp);

  return {
    name: 'optipng',
    path: require('optipng-bin'),
    args: args
  };
};

Optimizer.prototype.pngquant = function () {
  var args = [];
  args.push('--ext=.png');
  args.push('--speed=1');
  args.push('--force');
  args.push('256');
  args.push(this.tmp);

  return {
    name: 'pngquant',
    path: require('pngquant-bin'),
    args: args
  };
};

Optimizer.prototype.advpng = function () {
  var args = [];
  args.push('--recompress');
  args.push('--shrink-extra');
  args.push(this.tmp);

  return {
    name: 'advpng',
    path: require('advpng-bin').path,
    args: args
  };
};

Optimizer.prototype.pngcrush = function () {
  var args = [];
  args.push('-rem alla');
  args.push('-rem text');
  args.push('-brute');
  args.push('-reduce');
  args.push(this.tmp);

  return {
    name: 'pngcrush',
    path: require('pngcrush-bin'),
    args: args
  };
};

Optimizer.prototype.pngout = function () {
  var args = [];
  args.push('-s0');
  args.push('-k0');
  args.push('-f0');
  args.push(this.tmp);
  args.push(this.tmp);

  return {
    name: 'pngout',
    path: require('pngout-bin').path,
    args: args
  };
};

Optimizer.prototype.zopflipng = function () {
  var args = [];
  args.push('-m');
  args.push('--iterations=500');
  args.push('--splitting=3');
  args.push('--filters=01234mepb');
  args.push('--lossy_8bit');
  args.push('--lossy_transparent');
  args.push(this.tmp);

  return {
    name: 'zopflipng',
    path: require('zopflipng-bin'),
    args: args
  };
};

Optimizer.prototype.gifsicle = function () {
  var args = [];
  //args.push('--careful');
  //args.push('--interlace');
  args.push('--optimize');
  args.push('--output');
  args.push(this.tmp);
  args.push(this.tmp);

  return {
    name: 'gifsicle',
    path: require('gifsicle'),
    args: args
  };
};

Optimizer.prototype.jpegtran = function () {
  var args = [];
  args.push('-optimize');
  args.push('-progressive');
  args.push('-outfile ' + this.tmp);
  args.push(this.tmp);

  return {
    name: 'jpegtran',
    path: require('jpegtran-bin').path,
    args: args
  };
};

Optimizer.prototype.jpegRecompress = function () {
  var args = [];
  args.push('--strip');
  args.push('--quality medium');
  args.push('--min 40');
  args.push('--max 80');
  args.push(this.tmp);
  args.push(this.tmp);

  return {
    name: 'jpeg-recompress',
    path: require('jpeg-recompress-bin'),
    args: args
  };
};

Optimizer.prototype.jpegoptim = function () {
  var args = [];
  args.push('--override');
  args.push('--strip-all');
  args.push('--strip-iptc');
  args.push('--strip-icc');
  args.push('--all-progressive');
  args.push(this.tmp);

  return {
    name: 'jpegoptim',
    path: require('jpegoptim-bin').path,
    args: args
  };
};

Optimizer.prototype.mozjpeg = function () {
  var args = [];
  args.push('-optimize');
  args.push('-progressive');
  args.push('-outfile ' + this.tmp);
  args.push(this.tmp);

  return {
    name: 'mozjpeg',
    path: require('mozjpeg'),
    args: args
  };
};

Optimizer.prototype.svgo = function () {
  var args = [];
  args.push(this.tmp);
  args.push(this.tmp);

  return {
    name: 'svgo',
    path: './node_modules/svgo/bin/svgo',
    args: args
  };
};

Optimizer.prototype.getOptimizers = function (extension) {
  var optimizers = [];
  extension = extension.toLowerCase();
  switch (extension) {
    case '.png':
      if (this.options.optipng) {
        optimizers.push(this.optipng());
      }
      if (this.options.pngquant) {
        optimizers.push(this.pngquant());
      }
      if (this.options.zopflipng) {
        optimizers.push(this.zopflipng());
      }
      if (this.options.pngcrush) {
        optimizers.push(this.pngcrush());
      }
      if (this.options.advpng) {
        optimizers.push(this.advpng());
      }
      //if (this.options.pngout) {
      //  optimizers.push(this.pngout());
      //}
      break;
    case '.jpg':
      //if (this.options.jpegtran) {
      //  optimizers.push(this.jpegtran());
      //}
      if (this.options.jpegRecompress) {
        optimizers.push(this.jpegRecompress());
      }
      if (this.options.jpegoptim) {
        optimizers.push(this.jpegoptim());
      }
      if (this.options.mozjpeg) {
        optimizers.push(this.mozjpeg());
      }
      break;
    case '.gif':
      if (this.options.gifsicle) {
        optimizers.push(this.gifsicle());
      }
      break;
    case '.svg':
      if (this.options.svgo) {
        optimizers.push(this.svgo());
      }
      break;
  }
  return optimizers;
};

Optimizer.prototype.optimize = function (callback) {

  var src = this.src;
  var tmp = this.tmp;
  var dest = this.dest;

  fs.writeFileSync(this.tmp, fs.readFileSync(this.src));

  var fns = this.getOptimizers(this.extension).map(function (optimizer) {
    return function (callback) {
      execFile(optimizer.path, optimizer.args, function () {
        callback(null, optimizer.name);
      });
    };
  });

  async.series(fns, function (error, result) {

    var isOptimized = null;
    var originalSize = fs.statSync(src).size;
    var optimizedSize = fs.statSync(tmp).size;
    var diffSize = originalSize - optimizedSize;

    if (diffSize > 0) {
      // optimized size is smaller
      isOptimized = true;
      fs.writeFileSync(dest, fs.readFileSync(tmp));
      fs.unlinkSync(tmp);
    } else {
      // original size is smaller
      isOptimized = false;
      fs.writeFileSync(dest, fs.readFileSync(src));
      fs.unlinkSync(tmp);
    }

    callback(error, {
      isOptimized: isOptimized,
      originalSize: originalSize,
      optimizedSize: optimizedSize,
      diffSize: diffSize,
      diffPercent: round10(100 * (diffSize / originalSize), -1)
    });
  });
};

module.exports = Optimizer;
