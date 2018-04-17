const utils = require('../modules/utils');
const neo4j = require('../modules/neo4j-request');

module.exports = {
	
	query: function (req, res) {
		const q = `MATCH (n:${req.params.label}:${req.params.prj})<--(:${req.params.from})
			RETURN n.${req.params.prop} AS content`;

		neo4j.readTransaction(q)
			.then(function (results) {
				res.json(results);
			})
			.catch(function (err) {
				utils.error.neo4j(res, err, '#typeahead.query');
			});
	},

	queryTags: function (req, res) {
		const q = `MATCH (n:TAG:${req.params.prj})
				WHERE n.content =~ $regex
				RETURN n.content as tag ORDER BY tag`;

		const params = {
			regex: '.*' + req.query.search + '.*'
		};

		neo4j.readTransaction(q, params)
			.then(function (result) {
				res.json(result);
			})
			.catch(function (err) {
				utils.error.neo4j(res, err, '#typeahead.queryTags');
			});
	}
	
};
