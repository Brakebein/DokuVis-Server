const config = require('../config');
const utils = require('../modules/utils');
const neo4j = require('../modules/neo4j-request');
const shortid = require('shortid');
const Promise = require('bluebird');
const fs = require('fs-extra-promise');

module.exports = {

	query: function (req, res) {
		const prj = req.params.prj;

		const q = `MATCH (:E7:${prj} {content: $subprj})-[:P15]->(devent:D7),
				(devent)-[:P1]->(summary:E41),
				(devent)-[:P3]->(note:E62),
				(devent)-[:P14]->(user:E21)-[:P131]->(userName:E82),
				(devent)-[:P4]->(:E52)-[:P82]->(date:E61)
			OPTIONAL MATCH (devent)-[:P134]->(prev:D7)
			OPTIONAL MATCH (devent)<-[:P134]-(succ:D7)
			WITH devent, summary, note, user, userName, date, prev, collect(DISTINCT succ.content) AS successor
			
			OPTIONAL MATCH (devent)-[:L23]->(software:D14)
			WITH devent, summary, note, user, userName, date, prev, successor, collect(DISTINCT software.value) AS software
			
			OPTIONAL MATCH (devent)<-[:P31]-(me11:E11)-[:P14]->(mUser:E21)-[:P131]->(mUserName:E82),
				(me11)-[:P4]->(:E52)-[:P82]->(mDate:E61)
			WITH DISTINCT devent, summary, note, user, userName, date, prev, successor, software, mUser, mUserName, mDate
				
			RETURN devent.content AS id,
				summary.value AS summary,
				note.value AS note,
				{id: user.content, name: userName.value, date: date.value} AS created,
				{id: mUser.content, name: mUserName.value, date: mDate.value} AS modified,
				prev.content AS predecessor,
				successor,
				software
			ORDER BY date.value`;

		const params = {
			subprj: req.params.subprj
		};

		neo4j.readTransaction(q, params)
			.then(function (results) {
				res.json(results);
			})
			.catch(function (err) {
				utils.error.neo4j(res, err, '#modelversion.query');
			});
	},

	get: function (req, res) {
		const prj = req.params.prj;

		const q = `MATCH (:E7:${prj} {content: $subprj})-[:P15]->(devent:D7 {content: $deventId}),
				(devent)-[:P1]->(summary:E41),
				(devent)-[:P3]->(note:E62),
				(devent)-[:P14]->(user:E21)-[:P131]->(userName:E82),
				(devent)-[:P4]->(:E52)-[:P82]->(date:E61)
			OPTIONAL MATCH (devent)-[:P134]->(prev:D7)
			OPTIONAL MATCH (devent)<-[:P134]-(succ:D7)
			WITH devent, summary, note, user, userName, date, prev, collect(DISTINCT succ.content) AS successor
			
			OPTIONAL MATCH (devent)-[:L23]->(software:D14)
			WITH devent, summary, note, user, userName, date, prev, successor, collect(DISTINCT software.value) AS software
			
			OPTIONAL MATCH (devent)<-[:P31]-(me11:E11)-[:P14]->(mUser:E21)-[:P131]->(mUserName:E82),
				(me11)-[:P4]->(:E52)-[:P82]->(mDate:E61)
			WITH DISTINCT devent, summary, note, user, userName, date, prev, successor, software, mUser, mUserName, mDate
			RETURN devent.content AS id,
				summary.value AS summary,
				note.value AS note,
				{id: user.content, name: userName.value, date: date.value} AS created,
				{id: mUser.content, name: mUserName.value, date: mDate.value} AS modified,
				prev.content AS predecessor,
				successor,
				software`;

		const params = {
			subprj: req.params.subprj,
			deventId: req.params.id
		};

		neo4j.readTransaction(q, params)
			.then(function (results) {
				res.json(results[0]);
			})
			.catch(function (err) {
				utils.error.neo4j(res, err, '#modelversion.get');
			});
	},

	update: function (req, res) {
		const prj = req.params.prj;
		const mId = shortid.generate();

		const q = `MATCH (mUser:E21:${prj} {content: $user})-[:P131]->(mUserName:E82)
			MATCH (devent:D7:${prj} {content: $deventId}),
				(devent)-[:P1]->(summary:E41),
				(devent)-[:P3]->(note:E62)
			OPTIONAL MATCH (devent)-[rSw:L23]->(:D14)
			OPTIONAL MATCH (devent)<-[:P31]-(:E11)-[rmp14:P14]->(:E21)
			
			DELETE rSw, rmp14
			
			WITH DISTINCT devent, summary, note, mUser, mUserName
				
			MERGE (devent)<-[:P31]-(me11:E11:${prj})-[:P4]->(me52:E52:${prj})-[:P82]->(mDate:E61:${prj})
				ON CREATE SET me11.content = $me11, me52.content = $me52, mDate.value = $mDate
				ON MATCH SET mDate.value = $mDate
			CREATE (me11)-[:P14]->(mUser)
			
			SET summary.value = $summary,
				note.value = $note
				
			WITH devent, summary, note, mUser, mUserName, mDate
			
			FOREACH (sw IN $software | 
				MERGE (software:D14:${prj} {value: sw.value})
					ON CREATE SET software.content = sw.content
				CREATE (devent)-[:L23]->(software)
			)
			
			RETURN devent.content AS id,
				summary.value AS summary,
				note.value AS note,
				{id: mUser.content, name: mUserName.value, date: mDate.value} AS modified,
				extract(sw IN $software | sw.value) AS software`;

		const params = {
			user: req.headers['x-key'],
			deventId: req.params.id,
			summary: req.body.summary,
			note: req.body.note,
			software: req.body.software ? req.body.software.map(function (sw) {
				return {
					content: mId + '_' + utils.replace(sw),
					value: sw
				};
			}) : [],
			mDate: req.body.modificationDate,
			me11: 'e11_m_' + mId,
			me52: 'e52_m_' + mId
		};

		neo4j.writeTransaction(q, params)
			.then(function (results) {
				res.json(Object.assign(results[0], {
					predecessor: req.body.predecessor,
					successor: req.body.successor,
					created: req.body.created
				}));
			})
			.catch(function (err) {
				utils.error.neo4j(res, err, '#modelversion.update');
			});
	},

	delete: function (req, res) {
		const prj = req.params.prj;

		// TODO: consider comments
		// TODO: CALL apoc.do.when (causing problems -> path is not returned)

		const q = `
			MATCH (devent:D7:${prj} {content: $deventId}),
				(devent)-[:P1]->(summary:E41),
				(devent)-[:P3]->(note:E62),
				(devent)-[rUser:P14]->(:E21),
				(devent)-[:P4]->(e52:E52)-[:P82]->(date:E61)
			OPTIONAL MATCH (devent)<-[:P31]-(me11:E11)-[:P4]->(me52:E52)-[:P82]->(mDate:E61)
			OPTIONAL MATCH (devent)-[:L11]->(dobj)-[:P1]->(file:E75),
				(dobj)<-[:P106]-(dglob:D1)-[:P67]->(e22:E22)
			OPTIONAL MATCH (dobj)-[:P2]->(mat:E57)
			OPTIONAL MATCH (dglob)-[rglob:P106]->()
				
			DETACH DELETE devent, summary, note, e52, date, me11, me52, mDate, dobj, mat
			
			WITH file, file.path AS path, dglob, e22, count(rglob) AS rgcount
			
			FOREACH (ignoreMe IN CASE WHEN rgcount < 2 THEN [1] ELSE [] END |
				DETACH DELETE dglob, e22 )
			DETACH DELETE file
			
			RETURN path`;

		const params = {
			deventId: req.params.id
		};

		let path = config.path.data + '/';

		neo4j.writeTransaction(q, params)
			.catch(function (err) {
				utils.error.neo4j(res, err, '#modelversion.delete');
				return Promise.reject();
			})
			.then(function (results) {
				res.json({ message: 'Version with ID ' + req.params.id + ' deleted' });

				// remove directory
				path += results[0].path;
				return fs.existsAsync(path);
			})
			.then(function (exists) {
				if (exists) {
					console.warn('Unlink directory:', path);
					return fs.removeAsync(path);
				}
				else
					console.warn('Directory does not exist:', path);
			})
			.catch(function (err) {
				if (err) console.error('Unlink directory failed:', path, err);
			});
	}

};
