const utils = require('../modules/utils');
const neo4j = require('../modules/neo4j-request');

module.exports = {

	query: function (req, res) {
		const prj = req.params.prj;

		const q = `MATCH (sw:D14:${prj})
			WHERE sw.value =~ $search
			RETURN sw.content AS id,
				sw.value AS name`;

		const params = {
			search: req.query.search ? '(?i).*' + req.query.search + '.*' : '.*'
		};

		neo4j.readTransaction(q, params)
			.then(function (results) {
				res.json(results);
			})
			.catch(function (err) {
				utils.error.neo4j(res, err, '#software.query');
			});
	}

};
