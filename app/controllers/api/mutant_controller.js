var locomotive = require('locomotive'),
  ms = require('mysql'),
  xmens = rootRequire('x-mens/index.js'),
  async = require('async'),
  Controller = locomotive.Controller,
  MutantController = new Controller();

MutantController.index = function () {

  let req = this.req,
    res = this.res,
    client = req.client,
    me = this;


  async.waterfall(
    [
      function (callback) {
        return getStats(callback);
      },
      function (result, callback) {
        client.destroy();
        return res.send(xmens.wrapper(xmens.constants.OK, result));
      }
    ],
    function (err, status) {
      client.destroy();
      return res.send(xmens.wrapper(xmens.constants.INTERNAL_ERROR));
    }
  );

  function getStats(cb)
  {
    let queryStr = xmens.sql.GET_HISTORIC;
    return client.query(queryStr, [], function (err, result) {
      if (err) return cb(err, 'GET_HISTORIC')
      else {
        let ratio = 0;
        if ((result[0].is_mutant + result[0].is_human) != 0)
        {
          ratio = (result[0].is_mutant/(result[0].is_mutant + result[0].is_human)).toFixed(1);
        }
        let resultado = {
          'count_mutant_dna':result[0].is_mutant, 
          'count_human_dna':(result[0].is_mutant + result[0].is_human),
          'ratio':ratio
        };
        return cb(null, resultado);
      };

    });
  }
}

MutantController.create = function () {

  let req = this.req,
    res = this.res,
    client = req.client,
    me = this,
    AllowedValues = ['A', 'T', 'C', 'G'],
    dnaString = this.param('dna'),
    pDna = JSON.parse(dnaString);


  async.waterfall(
    [
      function (callback) {
        return isValidateFormat(callback);
      },
      function (resultado, callback) {

        return isMutant(resultado, callback);
      },
      function (resultado, callback) {

        return insertHistoric(resultado, callback);
      },
      function (resultado, callback) {
        // done();
        client.destroy();
        return res.send(resultado);
      }
    ],
    function (err, status) {
      // console.log(err);
      // done();
      client.destroy();
      return res.send(xmens.wrapper(xmens.constants.INTERNAL_ERROR));
    }
  );

  function validateOblicuaIzqDer(posIzq, matriz) {
    /**Función que recorre en forma diagonal de izquierda a derecha la matriz */
    let i = 0;
    let j = posIzq;
    let countOblicua = 0;
    let lastOblicua = '';
    let isMutant = false;
    while (i < matriz.length && j < matriz[i].length) {
      if (i == 0)
        lastOblicua = matriz[i][j];
      else {
        if (lastOblicua == matriz[i][j])
          countOblicua++;
        else {
          lastOblicua = matriz[i][j];
          countOblicua = 0;
        }
        if (countOblicua == 4) {
          isMutant = xmens.wrapper(xmens.constants.IS_MUTANT);
          break;
        }
      }
      i++;
      j++;
    }
    return isMutant;
  }

  function validateOblicuaDerIzq(posIzq, matriz) {
    /**Función que recorre en forma diagonal de derecha a izquierda la matriz */
    let i = 0;
    let j = posIzq;
    let countOblicua = 0;
    let lastOblicua = '';
    let isMutant = false;
    while (i < matriz.length && j >= 0) {
      if (i == 0)
        lastOblicua = matriz[i][j];
      else {
        if (lastOblicua == matriz[i][j])
          countOblicua++;
        else {
          lastOblicua = matriz[i][j];
          countOblicua = 0;
        }
        if (countOblicua == 4) {
          isMutant = xmens.wrapper(xmens.constants.IS_MUTANT);
          break;
        }
      }
      i++;
      j--;
    }
    return isMutant;
  }

  function isValidateFormat(cb) {
    let lengthEjeY = pDna.length;
    for (let i in pDna) {
      if (lengthEjeY != pDna[i].length)
        return cb(null, xmens.wrapper(xmens.constants.BAD_MATRIX));
      for (let j in pDna[i]) {
        if (AllowedValues.indexOf(pDna[i][j]) == -1)
          return cb(null, xmens.wrapper(xmens.constants.BAD_FORMAT_CONTENT));
      }
    }
    return cb(null, true);
  }

  function isMutant(result, cb) {
    if (result != true)
      return cb(null, result);
    let lastLetterHorizontal = '';
    let countHorizontal = 0;
    let lastLetterVertical = '';
    let countVertical = 0;
    for (let i in pDna) {
      for (let j in pDna[i]) {
        if (i == 0) {
          /**Evalua oblicua de izquierda a derecha */
          let res = validateOblicuaIzqDer(j, pDna);
          if (res != false)
            return cb(null, res);
          /**Evalua oblicua de derecha a izquierda*/
          res = validateOblicuaDerIzq(j, pDna);
          if (res != false)
            return cb(null, res);
          /**Evalua vertical */
          lastLetterVertical = pDna[i][j];
          let indexY = i;
          while (indexY < pDna.length) {
            if (lastLetterVertical == pDna[indexY][j])
              countVertical++;
            else {
              lastLetterVertical = pDna[indexY][j];
              countVertical = 0;
            }
            if (countVertical == 4) {
              return cb(null, xmens.wrapper(xmens.constants.IS_MUTANT));

            }
            indexY++;
          }
        }

        if (j == 0) {
          /**Evalua oblicua de izquierda a derecha */
          let res = validateOblicuaIzqDer(j, pDna);
          if (res != false)
            return cb(null, res);
          lastLetterHorizontal = pDna[i][j];
        }
        else {
          /**Evalua horizontal */
          if (lastLetterHorizontal == pDna[i][j])
            countHorizontal++;
          else {
            lastLetterHorizontal = pDna[i][j];
            countHorizontal = 0;
          }
          if (countHorizontal == 4)
            return cb(null, xmens.wrapper(xmens.constants.IS_MUTANT));
        }
        /**Evalua oblicua de derecha a izquierda */
        if (j == pDna[i].length - 1) {
          let res = validateOblicuaDerIzq(j, pDna);
          if (res != false)
            return cb(null, res);
        }

      }


    }
    return cb(null, xmens.wrapper(xmens.constants.IS_NOT_MUTANT));
  }

  function insertHistoric(resultado, cb) {
    let status;

    if (resultado.status.code == '200')
      status = 1;
    else if (resultado.status.code == '403')
      status = 0;
    else
      return cb(null, resultado);
    let queryStr = xmens.sql.SET_HISTORIC;
    return client.query(queryStr, [dnaString, status], function (err, result) {
      if (err) return cb(err, 'SET_HISTORIC')
      else {
        return cb(null, resultado);
      };

    });
  }
};

MutantController.before('*', function (next) {
  var req = this.req;

  var connection = ms.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  connection.connect(function (err) {
    if (err) {
      console.error('error connecting: ' + err.stack);
      return next(err);
    }
    req.client = connection;
    return next();
  });
});

module.exports = MutantController;
