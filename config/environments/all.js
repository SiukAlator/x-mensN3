global.rootRequire = function(name) {
  return require(__dirname + '/../../' + name);
}

var express = require('express'),
    passport = require('passport'),
    enforce = require('express-sslify'),
    env = process.env.NODE_ENV = process.env.NODE_ENV || 'development';

module.exports = function() {
  this.use(express.static(__dirname + '/../../public'));
  this.use(express.compress());
  this.use(express.logger());
  this.use(express.bodyParser());
  this.use(passport.initialize());
  this.use(passport.session());
  if (env === 'production' || env === 'test') {
    this.use(enforce.HTTPS(true));
  }
  this.use(this.router);
  this.use(express.json());
  this.use(express.urlencoded());
  // this.use(function(req, res, next) {
  //   res.redirect('redirect.html');
  // });
  //this.use(ubqti.logErrors);
};
