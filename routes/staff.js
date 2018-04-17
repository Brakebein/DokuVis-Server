const utils = require('../modules/utils');
const neo4j = require('../modules/neo4j-request');
const mysql = require('../modules/mysql-request');
const Promise = require('bluebird');

module.exports = {
	
	query: function (req, res) {
		const sql = `
			SELECT p.name, email, users.name, role FROM projects p
			INNER JOIN user_project_role ON p.pid = project_id
			INNER JOIN roles ON roles.id = role_id
			INNER JOIN users ON users.id = user_id
			AND p.proj_tstamp = ?
			AND LOWER(users.name) REGEXP ?`;

		let search = '.*';
		if (req.query.search)
			search = '.*' + req.query.search.toLowerCase() + '.*';

		mysql.query(sql, [req.params.prj, search])
			.then(function (rows) {
				res.json(rows);
			})
			.catch(function (err) {
				utils.error.mysql(res, err, '#staff.query');
			});
	},

	get: function (req, res) {
		const sql = `
			SELECT p.name, email, users.name, role FROM projects p
			INNER JOIN user_project_role ON p.pid = project_id
			INNER JOIN roles ON roles.id = role_id
			INNER JOIN users ON users.id = user_id
			AND p.proj_tstamp = ?
			AND users.email = ?`;

		mysql.query(sql, [req.params.prj, req.params.id])
			.then(function (rows) {
				res.json(rows[0]);
			})
			.catch(function (err) {
				utils.error.mysql(res, err, '#staff.query');
			});
	},
	
	create: function (req, res) {
		if (!req.body.user) { utils.abort.missingData(res, '#staff.create body.user'); return; }
		if (!req.body.role) { utils.abort.missingData(res, '#staff.create body.role'); return; }

		const prj = req.params.prj,
			user = req.body.user,
			role = req.body.role;

		let connection, session, tx;
		
		// check if user exists
		const sql = `SELECT proj_tstamp, email, users.name AS name, role FROM projects, users, roles
				WHERE proj_tstamp = ? AND email = ? AND role = ?`;

		mysql.query(sql, [prj, user, role])
			.catch(function (err) {
				utils.error.mysql(res, err, '#staff.create #1');
				return Promise.reject();
			})
			.then(function (rows) {
				if (rows.length !== 1) return Promise.reject('User {' + user + '} doesn\'t exist!');
				else return Promise.resolve(rows[0].name);
			})
			.catch(function (err) {
				if (err) utils.error.general(res, err);
				return Promise.reject();
			})

			// create nodes in graph database
			.then(function (username) {
				const q = `MATCH (tpproj:E55:` + prj + ` {content:"projectPerson"})
					CREATE (user:E21:` + prj + ` {content:{userEmail}}),
					(username:E82:` + prj + ` {content:"e82_"+{userEmail}, value: {userName}}),
					(user)-[:P2]->(tpproj),
					(user)-[:P131]->(username)`;
				const params = {
					userEmail: user,
					userName: username
				};

				session = neo4j.session();
				tx = session.beginTransaction();

				return tx.run(q, params);
			})
			.catch(function (err) {
				if (err) {
					tx.rollback();
					session.close();
					utils.error.neo4j(res, err, '#staff.create #2');
				}
				return Promise.reject();
			})

			// register user with role to project in mysql database
			.then(function () {
				return mysql.getConnection();
			})
			.then(function (conn) {
				connection = conn;
				return connection.beginTransaction();
			})
			.then(function () {
				return connection.query('SELECT id INTO @userid FROM users WHERE email = ?', [user]);
			})
			.then(function () {
				return connection.query('SELECT pid INTO @projectid FROM projects WHERE proj_tstamp = ?', [prj]);
			})
			.then(function () {
				return connection.query('SELECT id INTO @roleid FROM roles WHERE role = ?', [role]);
			})
			.then(function () {
				return connection.query('INSERT INTO user_project_role(user_id, project_id, role_id) VALUES(@userid, @projectid, @roleid)');
			})
			.then(function () {
				// commit mysql transaction
				return connection.commit();
			})
			.then(function () {
				return mysql.releaseConnection(connection);
			})
			.then(function () {
				// commit neo4j transaction
				return tx.commit();
			})

			// everything went well, return success
			.then(function () {
				session.close();
				const message = 'User {' + user + '} joined project {' + prj + '} as {' + role + '}';
				console.log(message);
				res.json({ message: message, status: 'SUCCESS' });
			})

			// something went wrong rollback everything
			.catch(function (err) {
				if (err) {
					tx.rollback().then(function () {
						session.close();
					});
					connection.rollback();
					mysql.releaseConnection(connection);
					utils.error.mysql(res, err, 'staff.create #3');
				}
			});
	},

	queryRoles: function (req, res) {
		mysql.query('SELECT role FROM roles')
			.then(function (rows) {
				let roles = rows.map(function (record) {
					return record.role;
				});
				res.json(roles);
			})
			.catch(function (err) {
				utils.error.mysql(res, err, '#staff.queryRoles');
			});
	}
	
};
