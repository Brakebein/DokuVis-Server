const shortid = require('shortid');
const utils = require('../modules/utils');
const neo4j = require('../modules/neo4j-request');

module.exports = {

	query: function (req, res) {
		const prj = req.params.prj;

		const q = `MATCH (master:E7:${prj} {content: $master})-[:P9]->(sub:E7)-[:P2]->(:E55 {content: "subproject"}),
				(sub)-[:P1]->(title:E41)
			OPTIONAL MATCH (sub)-[:P3]->(desc:E62)-[:P3_1]->(:E55 {content: "projDesc"})
			RETURN sub.content AS id, title.value AS name, desc.value AS description`;

		const params = {
			master: prj
		};

		neo4j.readTransaction(q, params)
			.then(function (results) {
				res.json(results);
			})
			.catch(function (err) {
				utils.error.neo4j(res, err, '#subproject.query');
			});
	},

	get: function (req, res) {
		const prj = req.params.prj;

		const q = `MATCH (sub:E7:${prj} {content: $id})-[:P2]->(:E55 {content: "subproject"}),
				(sub)-[:P1]->(title:E41)
			OPTIONAL MATCH (sub)-[:P3]->(desc:E62)-[:P3_1]->(:E55 {content: "projDesc"})
			RETURN sub.content AS id, title.value AS name, desc.value AS description`;

		const params = {
			id: req.params.id
		};

		neo4j.readTransaction(q, params)
			.then(function (results) {
				res.json(results[0]);
			})
			.catch(function (err) {
				utils.error.neo4j(res, err, '#subproject.get');
			});
	},

	create: function (req, res) {
		if (!req.body.name) { utils.abort.missingData(res, 'body.name'); return; }

		const prj = req.params.prj;
		const tid = shortid.generate();

		// TODO: project e22_root nodes obsolete
		const q = `MATCH (master:E7:${prj} {content: $master})-[:P15]->(e22m:E22),
				(tsubp:E55:${prj} {content: "subproject"}), (tpdesc:E55:${prj} {content: "projDesc"})
			CREATE (master)-[:P9]->(sub:E7:${prj} {content: $subproj})-[:P2]->(tsubp),
				(sub)-[:P1]->(title:E41:${prj} $title),
				(sub)-[:P3]->(desc:E62:${prj} $desc)-[:P3_1]->(tpdesc)
			RETURN sub.content AS id, title.value AS name, desc.value AS description`;

		const params = {
			master: prj,
			subproj: 'sub' + tid,
			title: {
				content: 'e41_sub' + tid,
				value: req.body.name
			},
			desc: {
				content: 'e62_sub' + tid,
				value: req.body.description || ''
			}
		};
		
		neo4j.writeTransaction(q, params)
			.then(function (results) {
				res.json(results[0]);
			}).catch(function (err) {
				utils.error.neo4j(res, err, '#subproject.create');
			});
	},

	update: function (req, res) {
		const prj = req.params.prj;

		const q = `MATCH (sub:E7:${prj} {content: $id})-[:P2]->(:E55 {content: "subproject"}),
				(tpdesc:E55:${prj} {content: "projDesc"}),
				(sub)-[:P1]->(title:E41),
				(sub)-[:P3]->(desc:E62)-[:P3_1]->(tpdesc)
			SET title.value = $title,
				desc.value = $desc
			RETURN sub.content AS id, title.value AS name, desc.value AS description`;

		const params = {
			id: req.params.id,
			title: req.body.name,
			desc: req.body.description
		};

		neo4j.writeTransaction(q, params)
			.then(function (results) {
				res.json(results[0]);
			})
			.catch(function (err) {
				utils.error.neo4j(res, err, '#subproject.update');
			});
	}
	
	// TODO: subproject delete

};
