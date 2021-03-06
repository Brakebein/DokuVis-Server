const utils = require('../modules/utils');
const mysql = require('../modules/mysql-request');

module.exports = function (role) {
	return function (req, res, next) {

		let user = req.headers['x-key'] || '';
		let prj = req.params.prj;

		if (!Array.isArray(role)) role = [role];

		let roles = ['superadmin'];
		if (role.indexOf('admin') !== -1) roles.push('admin');
		if (role.indexOf('historian') !== -1) roles.push('historian');
		if (role.indexOf('modeler') !== -1) roles.push('modeler');
		if (role.indexOf('visitor') !== -1) roles.push('admin', 'historian', 'modeler', 'visitor');

		let sql = `
			SELECT p.proj_tstamp, u.email, r.role FROM users u
			INNER JOIN user_project_role upr ON u.id = upr.user_id AND u.email = ?
			INNER JOIN projects p ON p.pid = upr.project_id AND p.proj_tstamp = ?
			INNER JOIN roles r ON r.id = upr.role_id AND r.role IN ?`;

		return mysql.query(sql, [user, prj, [roles]])
			.catch(function (err) {
				utils.error.mysql(res, err, '#checkPermission #1');
			})
			.then(function (rows) {
				if (rows.length === 1) next();
				else {
					let message = 'No Permission ' + user + ' ' + prj + ' ' + req.method + ' ' + req.originalUrl;
					console.warn(message);
					res.status(403);
					res.json({
						message: 'No Permission!',
						error: message
					});
				}
			});

	}
};
