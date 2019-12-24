function define(name, value) {
	Object.defineProperty(exports, name, {
		value: value,
		enumerable: true,
		writable: false,
		configurable:false
	});
}

define('SET_HISTORIC',
	"INSERT IGNORE INTO historic(data_in, status, date_in) VALUES(?,?,now())");

define('GET_HISTORIC',
	"SELECT \
	(SELECT count(*) FROM historic WHERE status = 1) as is_mutant, \
	(SELECT count(*) FROM historic WHERE status = 0) as is_human");