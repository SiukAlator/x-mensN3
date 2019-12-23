var ubqti = require('./main.js'),
    pg = require('pg'),
    constants = require('./constants.js'),
    check = require('validator').check;

module.exports.auth = function (token, cb) {
  try {
    check(token).notEmpty();
  }
  catch (e) {
    return cb(constants.BAD_REQUEST);
  }

  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    if (err) { done(); return cb('module.exports.auth.DATABASE_URL' + err + ' - ' + JSON.stringify(err)) };
    client.query(ubqti.sql.USERS_FIND_BY_MT, [token], function(err, result) {
      if (err) { done(); return cb('===> ' + 'module.exports.auth.USERS_FIND_BY_MT: ' + err + ' - ' + JSON.stringify(err)); }
      if (result.rowCount) {
        var user = result.rows[0];
      //   var loginAttempts = (user.audit[user.profile_id].login_attempts ? user.audit[user.profile_id].login_attempts : 0);
      //   if (!user.company_is_active || !user.user_is_active || loginAttempts >= 3) {
      //     user.audit[user.profile_id].login_attempts += 1;
      //     return client.query(ubqti.sql.USERS_UPDATE_LOGIN_ATTEMPTS, [user.user_id, user.audit], function (err, result) {
      //       done();
      //       if (err) return cb('module.exports.auth.USERS_UPDATE_LOGIN_ATTEMPTS' + err + ' - ' + JSON.stringify(err));
      //       return cb(null, null, constants.UNAUTHORIZED);
      //     });
      //   }
      //   else {
          done();
          return cb(null, user);
        // }
      }
      else {
        done();
        return cb(null, null, constants.UNAUTHORIZED);
      }
    });
  });
};

module.exports.version = function (api_version, cb) {
  try {
    check(api_version).notNull().isInt();
  }
  catch (e) {
    return cb(constants.BAD_REQUEST);
  }
  return cb(null);
};

module.exports.chatRoom = function (data, cb) {
  try {
    check(data.room).notEmpty();
  }
  catch (e) {
    return cb(constants.BAD_REQUEST);
  }

  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    if (err) { done(); return cb('module.exports.auth.DATABASE_URL' + err + ' - ' + JSON.stringify(err)) }
    client.query(ubqti.sql.CHAT_FIND, [data.room], function(err, result) {
      done();
      if (err) return cb('===> ' + 'module.exports.auth.CHAT_FIND: ' + err + ' - ' + JSON.stringify(err));
      if (result.rowCount) return cb(null, result.rows);
      else return cb(null, null, constants.NOT_FOUND);
    });
  });
};
