exports.wrapper = function(pCode, pData, pModified, pSecondaryCode) {
  var clonePCode = JSON.parse(JSON.stringify(pCode));
  var count = 0;
  var data = pData || [];
  
  if (pData) {
    count = pData.length;
  }
  
  if (pModified) {
    count = pModified;
  }
  
  if (pSecondaryCode) {
    clonePCode.secondary_code = pSecondaryCode;
  }
  
  var wrapper = {
    "status": clonePCode,
    "response": {
      "count": count,
      "data": data
    }
  };
  return wrapper;
}

exports.error_wrapper = function(ctx, status, err) {
  return '===> ' + ctx.__res.req._locomotive.controller + '.' + JSON.stringify(ctx.__res.req._locomotive.action) + '.' + status + ': ' + err;
}

exports.raiseException = function (ctx, loc, err) {
  return ctx.req.next(ctx.__res.req._locomotive.controller + '.' + JSON.stringify(ctx.__res.req._locomotive.action) + '.' + loc + ': ' + err + ' - ' + JSON.stringify(err))
}

exports.logErrors = function(err, req, res, next) {
  console.log('|------------------|');
  console.log(err);
  console.log('|------------------|');

  next(ubqti.wrapper(err.split(' - ')[1]));
}