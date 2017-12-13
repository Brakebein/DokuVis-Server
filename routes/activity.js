const utils = require('../modules/utils');
const neo4j = require('../modules/neo4j-request');
const Promise = require('bluebird');

module.exports = {

	query: function (req, res) {
		var prj = req.params.prj,
			subprj = req.params.subprj;

		var promises = [];

		var params = {
			subId: subprj === 'master' ? prj : subprj,
			subproject: subprj
		};

		// source upload
		// noinspection JSAnnotator
		var q = `MATCH (:E7:`+prj+` {content: $subId})-[:P9|P15*]->(e31:E31)<-[:P15]-(upevent:E7)-[:P2]->(:E55 {content: "sourceUpload"}),
			(upevent)-[:P14]->(user:E21)-[:P131]->(userName:E82),
			(upevent)-[:P4]->(:E52)-[:P82]->(date:E61),
			(e31)-[:P102]->(title:E35),
			(e31)-[:P1]->(file:E75)
			MATCH (e31)<-[:P15]-(subprj:E7)-[:P2]->(pType:E55)
			WHERE pType.content IN ["subproject", "project"]
			RETURN e31.content AS id,
				{id: user.content, name: userName.value} AS user,
				date.value AS date,
				title.value AS label,
				file,
				"source_upload" AS type,
				CASE pType.content WHEN "project" THEN "master" ELSE subprj.content END AS subproject
			ORDER BY date DESC`;
		promises.push(neo4j.readTransaction(q, params));

		// source update
		// noinspection JSAnnotator
		q = `MATCH (:E7:`+prj+` {content: $subId})-[:P9|P15*]->(e31:E31)<-[:P31]-(upevent:E11),
			(upevent)-[:P14]->(user:E21)-[:P131]->(userName:E82),
			(upevent)-[:P4]->(:E52)-[:P82]->(date:E61),
			(e31)-[:P102]->(title:E35),
			(e31)-[:P1]->(file:E75)
			MATCH (e31)<-[:P15]-(subprj:E7)-[:P2]->(pType:E55)
			WHERE pType.content IN ["subproject", "project"]
			RETURN e31.content AS id,
				{id: user.content, name: userName.value} AS user,
				date.value AS date,
				title.value AS label,
				file,
				"source_update" AS type,
				CASE pType.content WHEN "project" THEN "master" ELSE subprj.content END AS subproject
			ORDER BY date DESC`;
		promises.push(neo4j.readTransaction(q, params));

		// model upload
		// noinspection JSAnnotator
		q = `MATCH (:E7:`+prj+` {content: $subId})-[:P9|P15*]->(d7:D7),
			(d7)-[:P14]->(user:E21)-[:P131]->(userName:E82),
			(d7)-[:P4]->(:E52)-[:P82]->(date:E61),
			(d7)-[:P1]->(title:E41)
			MATCH (d7)<-[:P15]-(subprj:E7)-[:P2]->(pType:E55)
			WHERE pType.content IN ["subproject", "project"]
			RETURN d7.content AS id,
				{id: user.content, name: userName.value} AS user,
				date.value AS date,
				title.value AS label,
				"model_upload" AS type,
				CASE pType.content WHEN "project" THEN "master" ELSE subprj.content END AS subproject
			ORDER BY date DESC`;
		promises.push(neo4j.readTransaction(q, params));

		// version update
		// noinspection JSAnnotator
		q = `MATCH (:E7:`+prj+` {content: $subId})-[:P9|P15*]->(d7:D7)<-[:P31]-(upevent:E11),
			(upevent)-[:P14]->(user:E21)-[:P131]->(userName:E82),
			(upevent)-[:P4]->(:E52)-[:P82]->(date:E61),
			(d7)-[:P1]->(title:E41)
			MATCH (d7)<-[:P15]-(subprj:E7)-[:P2]->(pType:E55)
			WHERE pType.content IN ["subproject", "project"]
			RETURN d7.content AS id,
				{id: user.content, name: userName.value} AS user,
				date.value AS date,
				title.value AS label,
				"version_update" AS type,
				CASE pType.content WHEN "project" THEN "master" ELSE subprj.content END AS subproject
			ORDER BY date DESC`;
		promises.push(neo4j.readTransaction(q, params));

		// task create
		// noinspection JSAnnotator
		q = `MATCH (:E7:`+prj+` {content: $subId})-[:P9*]->(task:E7)-[:P2]->(:E55 {content:"task"}),
			(task)<-[:P94]-(event:E65),
			(event)-[:P14]->(user:E21)-[:P131]->(userName:E82),
			(event)-[:P4]->(:E52)-[:P82]->(date:E61),
			(task)-[:P1]->(title:E41)
			MATCH (task)<-[:P9]-(subprj:E7)-[:P2]->(pType:E55)
			WHERE pType.content IN ["subproject", "project"]
			RETURN task.content AS id,
				{id: user.content, name: userName.value} AS user,
				date.value AS date,
				title.value AS label,
				"task_create" AS type,
				CASE pType.content WHEN "project" THEN "master" ELSE subprj.content END AS subproject
			ORDER BY date DESC`;
		promises.push(neo4j.readTransaction(q, params));

		// task update
		// noinspection JSAnnotator
		q = `MATCH (:E7:`+prj+` {content: $subId})-[:P9*]->(task:E7)-[:P2]->(:E55 {content:"task"}),
			(task)<-[:P31]-(upevent:E11),
			(upevent)-[:P14]->(user:E21)-[:P131]->(userName:E82),
			(upevent)-[:P4]->(:E52)-[:P82]->(date:E61),
			(task)-[:P1]->(title:E41)
			MATCH (task)<-[:P9]-(subprj:E7)-[:P2]->(pType:E55)
			WHERE pType.content IN ["subproject", "project"]
			RETURN task.content AS id,
				{id: user.content, name: userName.value} AS user,
				date.value AS date,
				title.value AS label,
				"task_update" AS type,
				CASE pType.content WHEN "project" THEN "master" ELSE subprj.content END AS subproject
			ORDER BY date DESC`;
		promises.push(neo4j.readTransaction(q, params));

		// comments
		// noinspection JSAnnotator
		q = `MATCH (e33:E33:`+prj+`)-[:P2]->(cType:E55)-[:P127]->(:E55 {content: "commentType"}),
				(e33)-[:P129*..2]->(target)<-[:P9|P15|L11*]-(project:E7 {content: $subId})
			OPTIONAL MATCH (project)-[:P9]->(subprj:E7)-[:P9|P15|L11*]->(target),
               (subprj)-[:P2]->(:E55 {content: "subproject"})
			WITH e33, cType, target,
     			CASE WHEN subprj IS NULL THEN project.content ELSE subprj.content END AS subproject
			
			MATCH (e33)<-[:P94]-(event:E65),
				(event)-[:P14]->(user:E21)-[:P131]->(userName:E82),
				(event)-[:P4]->(:E52)-[:P82]->(date:E61)
			OPTIONAL MATCH (target)-[:P1|P102]->(title)
			WHERE any(label IN labels(title) WHERE label IN ["E35","E41"])
			OPTIONAL MATCH (e33)-[:P67]->(screen)-[:P2]->(:E55 {content:"screenshot"}),
				(screen)-[:P1]->(file:E75)
			OPTIONAL MATCH (e33)-[:P129]->(aTarget:E33)-[:P2]->(:E55)-[:P127]->(:E55 {content: "commentType"})
				
			RETURN e33.content AS id,
				{id: user.content, name: userName.value} AS user,
				date.value AS date,
				CASE WHEN title IS NULL AND "D1" IN labels(target) THEN target.name ELSE title.value END AS label,
				cType.content AS commentType,
				CASE WHEN aTarget IS NULL THEN target.content ELSE aTarget.content END AS commentTarget,
				file,
				"comment_create" AS type,
				subproject
			ORDER BY date DESC`;
		promises.push(neo4j.readTransaction(q, params));

		Promise.all(promises)
			.catch(function (err) {
				utils.error.neo4j(res, err, '#activity.query');
				return Promise.reject();
			})
			.then(function (results) {
				var tmp = [];

				results.forEach(function (rarray) {
					tmp = tmp.concat(rarray);
				});

				tmp.sort(function (a, b) {
					if (a.date > b.date) return -1;
					else return 1;
				});

				res.json(tmp);
			})
			.catch(function (err) {
				if (err)
					utils.error.general(res, err, 'Error while processing results');
			});

	}

};
