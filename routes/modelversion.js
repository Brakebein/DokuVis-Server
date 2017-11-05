const utils = require('../modules/utils');
const neo4j = require('../modules/neo4j-request');

module.exports = {

	query: function (req, res) {
		var prj = req.params.prj;

		// noinspection JSAnnotator
		var q = `MATCH (:E7:`+prj+` {content: $subprj})-[:P15]->(devent:D7),
				(devent)-[:P1]->(summary:E41),
				(devent)-[:P3]->(note:E62),
				(devent)-[:P14]->(user:E21)-[:P131]->(userName:E82),
				(devent)-[:P4]->(:E52)-[:P82]->(date:E61)
			OPTIONAL MATCH (devent)-[:P134]->(prev:D7)
			OPTIONAL MATCH (devent)-[:L23]->(software:D14)
			WITH devent, summary, note, user, userName, date, prev, collect(software.value) AS software
			RETURN devent.content AS id,
				summary.value AS summary,
				note.value AS note,
				{id: user.content, name: userName.value, date: date.value} AS created,
				prev.content AS predecessor,
				software
			ORDER BY date.value`;

		var params = {
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
		var prj = req.params.prj;

		// noinspection JSAnnotator
		var q = `MATCH (:E7:`+prj+` {content: $subprj})-[:P15]->(devent:D7 {content: $deventId}),
				(devent)-[:P1]->(summary:E41),
				(devent)-[:P3]->(note:E62),
				(devent)-[:P14]->(user:E21)-[:P131]->(userName:E82),
				(devent)-[:P4]->(:E52)-[:P82]->(date:E61)
			OPTIONAL MATCH (devent)-[:P134]->(prev:D7)
			OPTIONAL MATCH (devent)-[:L23]->(software:D14)
			WITH devent, summary, note, user, userName, date, prev, collect(software.value) AS software
			RETURN devent.content AS id,
				summary.value AS summary,
				note.value AS note,
				{id: user.content, name: userName.value, date: date.value} AS created,
				prev.content AS predecessor,
				software`;

		var params = {
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
	}

};