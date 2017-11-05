const fs = require('fs-extra-promise');
const Promise = require('bluebird');
const shortid = require('shortid');
const config = require('../config');
const utils = require('../modules/utils');
const mysql = require('../modules/mysql-request');
const neo4j = require('../modules/neo4j-request');

shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$');

module.exports = {
	
	query: function (req, res) {
		var email = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key'];
		var sql = '\
			SELECT p.pid, p.proj_tstamp AS proj, p.name, p.description, role FROM projects p \
			INNER JOIN user_project_role ON p.pid = project_id \
			INNER JOIN roles ON roles.id = role_id \
			INNER JOIN users ON users.id = user_id \
			AND email = ?';
		
		mysql.query(sql, [email])
			.then(function(rows) {
				res.json(rows);
			})
			.catch(function(err) {
				utils.error.mysql(res, err, '#projects.query');
			});
	},
	
	get: function (req, res) {
		var email = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key'];
		var sql = '\
			SELECT p.pid, p.proj_tstamp AS proj, p.name, p.description, role FROM projects p \
			INNER JOIN user_project_role ON p.pid = project_id \
			INNER JOIN roles ON roles.id = role_id \
			INNER JOIN users ON users.id = user_id \
			AND email = ? \
			AND proj_tstamp = ?';
		
		mysql.query(sql, [email, req.params.id])
			.then(function(rows) {
				if(rows.length > 0)
					res.json(rows[0]);
				else
					res.json({ status: 'NO_ENTRY' });
			})
			.catch(function(err) {
				utils.error.mysql(res, err, '#projects.get');
			});
	},
	
	create: function (req, res) {
		if(!req.body.name) { utils.abort.missingData(res, 'body.name'); return; }

		var user = req.headers['x-key'];
		var userName = '';
		var prj = 'Proj_' + shortid.generate();
		var pProj = config.path.data + '/' + prj;

		var connection;
		
		// Ordner anlegen
		fs.mkdirsSync(pProj);
		fs.mkdirsSync(pProj + '/sources');
		fs.mkdirsSync(pProj + '/models/maps');
		fs.mkdirsSync(pProj + '/pictures/_thumbs');
		fs.mkdirsSync(pProj + '/texts/_thumbs');
		fs.mkdirsSync(pProj + '/screenshots/_thumbs');
		fs.mkdirsSync(pProj + '/plans/_thumbs');
		fs.mkdirsSync(pProj + '/plans/models/maps');

		// get userName
		mysql.query('SELECT name FROM users WHERE email = ?', [user]).then(function (rows) {
			if(rows.length === 1) {
				userName = rows[0].name;
				return Promise.resolve();
			}
			else
				return Promise.reject('no user found');
		}).catch(function (err) {
			utils.error.server(res, err, '#user not found');
		}).then(function () {
			// swish.config kopieren und editieren
			return fs.copyAsync(config.path.data + '/default_swish.config', pProj + '/swish.config');
		}).then(function() {
			var addLines = "\nIgnoreWords File: " + pProj + "/blacklist.txt";
			addLines += "\nBuzzwords File: " + pProj + "/whitelist.txt";
			return fs.appendFileAsync(pProj + '/swish.config', addLines.replace(/\//g,"\\"));
		}).then(function() {
			
			// blacklist und whitelist erstellen
			return fs.openAsync(pProj + '/blacklist.txt', 'w');
		}).then(function(fd) {
			fs.closeSync(fd);
			return fs.openAsync(pProj + '/whitelist.txt', 'w');
		}).then(function(fd) {
			fs.closeSync(fd);
			console.log(prj+': folders created');
			return Promise.resolve();
		}).catch(function(err) {
			if(err) utils.error.server(res, err, '#file system create on ' + prj);
			return Promise.reject();
			
		}).then(function() {
			// init project in neo4j database
			return neo4j.cypher('CREATE CONSTRAINT ON (p:'+prj+') ASSERT p.content IS UNIQUE');
		}).then(function(response) {
			if(response.exception) {
				utils.error.neo4j(res, response, '#projects.create constraint on ' + prj);
				return Promise.reject();
			}
			console.log(prj+': constraint created');
			
			var query =	// project
				'CREATE (proj:E7:'+prj+' {content: {master}}), \
				(root:E22:'+prj+' {content:"e22_root_master"}), \
				(tproj:E55:'+prj+' {content:"project"}), \
				(tsubproj:E55:'+prj+' {content:"subproject"}), \
				(tpdesc:E55:'+prj+' {content:"projDesc"}), \
				(tpinfo:E55:'+prj+' {content:"projInfo"}), \
				(proj)-[:P15]->(root), \
				(proj)-[:P2]->(tproj), '
				// source
			  + '(tsource:E55:'+prj+' {content:"sourceType"}), \
				(tplan:E55:'+prj+' {content:"plan"}), \
				(tpic:E55:'+prj+' {content:"picture"}), \
				(ttext:E55:'+prj+' {content:"text"}), \
				(tsource)<-[:P127]-(tplan), \
				(tsource)<-[:P127]-(tpic), \
				(tsource)<-[:P127]-(ttext), \
				(tprime:E55:'+prj+' {content:"primarySource"}), \
				(tsupl:E55:'+prj+' {content:"sourceUpload"}), \
				(tsrepros:E55:'+prj+' {content:"sourceRepros"}), \
				(tscomment:E55:'+prj+' {content:"sourceComment"}), \
				(tspatialize:E55:'+prj+' {content:"spatializeInfo"}), '
				// screenshot
			  + '(tscreen:E55:'+prj+' {content:"screenshot"}),\
				(tscreencomment:E55:'+prj+' {content:"screenshotComment"}), \
				(tudrawing:E55:'+prj+' {content:"userDrawing"}), '
				// model
			  + '(tmodel:E55:'+prj+' {content:"model"}), \
				(tmodelplan:E55:'+prj+' {content:"model/plan"}), '
				// category
			  + '(tcateg:E55:'+prj+' {content:"category"}), '
				// task
			  + '(ttask:E55:'+prj+' {content:"task"}), \
				(ttdesc:E55:'+prj+' {content:"taskDesc"}), \
				(ttprior:E55:'+prj+' {content:"taskPriority"}), \
				(ttphigh:E55:'+prj+' {content:"priority_high"}), \
				(ttpmedium:E55:'+prj+' {content:"priority_medium"}), \
				(ttplow:E55:'+prj+'{content:"priority_low"}), \
				(ttprior)<-[:P127]-(ttphigh), \
				(ttprior)<-[:P127]-(ttpmedium), \
				(ttprior)<-[:P127]-(ttplow), \
				(ttstatus:E55:'+prj+' {content:"taskStatus"}), \
				(ttsdone:E55:'+prj+' {content:"status_done"}), \
				(ttstodo:E55:'+prj+' {content:"status_todo"}), \
				(ttstatus)<-[:P127]-(ttsdone), \
				(ttstatus)<-[:P127]-(ttstodo), '
				// comments
			  +	'(ctype:E55:'+prj+' {content: "commentType"}), \
				(:E55:'+prj+' {content: "commentGeneral"})-[:P127]->(ctype), \
				(:E55:'+prj+' {content: "commentSource"})-[:P127]->(ctype), \
				(:E55:'+prj+' {content: "commentAnswer"})-[:P127]->(ctype), \
				(:E55:'+prj+' {content: "commentModel"})-[:P127]->(ctype), \
				(:E55:'+prj+' {content: "commentTask"})-[:P127]->(ctype), '
				// personal
			  + '(tpproj:E55:'+prj+' {content:"projectPerson"}), \
				(tphist:E55:'+prj+' {content:"historicPerson"}), '
				// user
			  + '(user:E21:'+prj+' {content:{userEmail}}), \
				(username:E82:'+prj+' {content:"e82_"+{userEmail}, value: {userName}}), \
				(user)-[:P2]->(tpproj), \
				(user)-[:P131]->(username)'
				// return
			  + 'RETURN proj';
			
			var params = {
				master: prj,
				userEmail: user,
				userName: userName
			};
		
			return neo4j.cypher(query, params);
		}).then(function(response) {
			if(response.exception) {
				utils.error.neo4j(res, response, '#projects.create nodes on ' + prj);
				return Promise.reject();
			}
			console.log(prj+': nodes created');
			return Promise.resolve();
		}).catch(function(err) {
			if(err) utils.error.neo4j(res, err, '#projects.create on ' + prj);
			return Promise.reject();
			
		}).then(function() {
			// insert into mysql database
			return mysql.getConnection();
		}).then(function(conn) {
			connection = conn;
			return connection.beginTransaction();
		}).then(function() {
			return connection.query('SELECT id INTO @roleid FROM roles WHERE role = "superadmin"');
		}).then(function() {
			return connection.query('SELECT id INTO @userid FROM users WHERE email = ?', [user]);
		}).then(function() {
			return connection.query('INSERT INTO projects(proj_tstamp, name, description) VALUES(?,?,?)', [prj, req.body.name, req.body.description]);
		}).then(function(result) {
			return connection.query('INSERT INTO user_project_role(user_id, project_id, role_id) VALUES(@userid, ?, @roleid)', [result.insertId]);
		}).then(function() {
			return connection.commit();
		}).then(function() {
			mysql.releaseConnection(connection);
			console.log(prj+': mysql insert');
			res.json({ message: 'Project ' + prj + ' created', status: 'SUCCESS' });
		}).catch(function(err) {
			if(err) {
				connection.rollback();
				mysql.releaseConnection(connection);
				utils.error.mysql(res, err, '#projects.create on ' + prj);
			}
		});

		// TODO: delete folder and remove nodes, if something went wrong
		
	},

	update: function (req, res) {
		// TODO: check, if user is superadmin
		// TODO: return name, description (see #project.get)
		
		if(!req.body.name) { utils.abort.missingData(res, 'body.name'); return; }
		
		var sql = 'UPDATE projects SET name = ?, description = ? WHERE proj_tstamp = ?';
		var params = [req.body.name, req.body.description, req.params.id];
		
		mysql.query(sql, params).then(function (result) {
			res.json({ affectedRows: result.affectedRows, status: 'SUCCESS' });
		}).catch(function (err) {
			if(err) utils.error.mysql(res, err, '#projects.update');
		});
	},
	
	delete: function (req, res) {
		// TODO: check, if user is superadmin
		
		var prj = req.params.id;
		var connection;
		
		// delete from mysql database
		mysql.getConnection().then(function (conn) {
			connection = conn;
			return connection.beginTransaction();
		}).then(function() {
			return connection.query('DELETE FROM projects WHERE proj_tstamp = ?', [prj]);
		}).then(function() {
			return connection.commit();
		}).then(function() {
			mysql.releaseConnection(connection);
			console.log(prj+': mysql delete');
			return Promise.resolve();
		}).catch(function(err) {
			if(err) {
				connection.rollback();
				mysql.releaseConnection(connection);
				utils.error.mysql(res, err, '#projects.delete');
			}
		}).then(function() {
			
			// delete nodes in neo4j database
			return neo4j.cypher('MATCH (n:'+prj+') DETACH DELETE n');
		}).then(function(response) {
			if(response.exception) {
				utils.error.neo4j(res, response, '#projects.delete nodes');
				return Promise.reject();
			}
			console.log(prj+': nodes deleted');
			return neo4j.cypher('DROP CONSTRAINT ON (p:'+prj+') ASSERT p.content IS UNIQUE');
		}).then(function(response) {
			if(response.exception) {
				utils.error.neo4j(res, response, '#projects.delete constraint');
				return Promise.reject();
			}
			console.log(prj+': constraint dropped');
			return Promise.resolve();
		}).catch(function(err) {
			if(err) utils.error.neo4j(res, err, '#projects.delete');
			return Promise.reject();
			
		}).then(function() {
			
			// Ordner löschen
			return fs.removeAsync(config.path.data + '/' + prj);
		}).then(function() {
			console.log(prj+': folders deleted');
			res.json({ message: 'Project ' + prj + ' deleted', status: 'SUCCESS' });
		}).catch(function(err) {
			if(err) utils.error.server(res, err, '#file system delete');
		});
		
	},
	
	cypher: function(req, res) {
		neo4j.cypher(req.body.query, req.body.params)
			.then(function(response) {
				res.json(response);
			}).catch(function(err) {
				utils.error.neo4j(res, err, '#cypher');
			});
	}
	
};