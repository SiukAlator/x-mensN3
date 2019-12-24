module.exports = function routes() {
  this.namespace('api', function() {
      this.resources('mutant');
      this.match('stats', 'mutant#index', {via: 'get'});
  });
}
