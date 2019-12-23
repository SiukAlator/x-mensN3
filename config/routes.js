module.exports = function routes() {
  this.namespace('api', function() {
      this.resources('mutant');
      // this.match('ismutant', 'mutantes#index', {via: 'get'});
  });
}
