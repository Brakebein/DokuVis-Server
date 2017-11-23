const utils = require('../modules/utils');
const config = require('../config');
const Promise = require('bluebird');
const neo4j = require('../modules/neo4j-request');
const fs = require('fs-extra-promise');
const exec = require('child-process-promise').execFile;
const shortid = require('shortid');
const uuid = require('uuid/v4');

module.exports = {

	query: function (req, res) {
		var prj = req.params.prj,
			sub = req.params.subprj;

		// noinspection JSAnnotator
		var q = `
			MATCH (tSs:E55:`+prj+` {content: "screenshot"}), (tUd:E55:`+prj+` {content: "userDrawing"}), (tCt:E55:`+prj+` {content: "commentType"})
			WITH tSs, tUd, tCt
			
			MATCH (:E7:`+prj+` {content: $subproj})-[:P15|L11|P9*1..9]->(target)<-[:P129]-(e33:E33)-[:P2]->(type:E55)-[:P127]->(tCt)
			WHERE type.content <> "commentAnswer"
			MATCH (e33)-[:P3]->(text:E62),
				(e33)<-[:P94]-(e65:E65),
				(e65)-[:P14]->(user:E21)-[:P131]->(userName:E82),
				(e65)-[:P4]->(:E52)-[:P82]->(date:E61)
			
			OPTIONAL MATCH (e33)-[:P67]->(ref) WHERE NOT (ref)-[:P2]->(tSs)
			OPTIONAL MATCH (target)-[:P1]->(targetFile:E75)
			OPTIONAL MATCH (e33)<-[:P129]-(answer:E33)-[:P2]->(:E55 {content: "commentAnswer"})
			WITH e33, text, type,
				{id: user.content, name: userName.value, date: date.value } AS created,
				collect(DISTINCT target.content) AS targets,
				collect(DISTINCT ref.content) AS refs,
				collect(DISTINCT targetFile) AS targetFile,
				collect(DISTINCT answer.content) AS answers,
				tSs, tUd
			
			OPTIONAL MATCH (e33)-[:P67]->(screen:E36)-[:P2]->(tSs),
				(screen)-[:P1]->(screenFile:E75),
				(screen)-[:P106]->(paint:E36)-[:P2]->(tUd),
				(paint)-[:P1]->(paintFile:E75)
			WITH e33, text, type, created, targets, refs, targetFile,
				CASE WHEN count(screen) = 0 THEN [] ELSE collect({screenId: screen.content, cameraCenter: screen.cameraCenter, cameraFOV: screen.cameraFOV, cameraMatrix: screen.cameraMatrix, file: screenFile.content, path: screenFile.path, thumb: screenFile.thumb, width: screenFile.width, height: screenFile.height, paint: {id: paint.content, file: paintFile.content, path: paintFile.path, width: paintFile.width, height: paintFile.height}}) END AS screenshots,
				screen, answers
			OPTIONAL MATCH (screen)-[:P106]->(pin:E73)
			RETURN e33.content AS id,
				text.value AS value,
				created,
				type.content AS type,
				targets,
				refs,
				targetFile,
				screenshots,
				collect(DISTINCT pin) AS pins,
				answers;`;

		var params = {
			subproj: sub === 'master' ? prj : sub
		};

		neo4j.readTransaction(q, params)
			.then(function(result) {
				res.json(result);
			})
			.catch(function(err) {
				utils.error.neo4j(res, err, '#cypher');
			});
	},

	get: function (req, res) {
		var prj = req.params.prj;

		// noinspection JSAnnotator
		var q = `
			MATCH (tSs:E55:`+prj+` {content: "screenshot"}), (tUd:E55:`+prj+` {content: "userDrawing"}), (tCt:E55:`+prj+` {content: "commentType"})
			WITH tSs, tUd, tCt
			
			MATCH (e33:E33:`+prj+` {content: $id})-[:P2]->(type:E55)-[:P127]->(tCt),
						(e33)-[:P129]->(target),
						(e33)-[:P3]->(text:E62),
						(e33)<-[:P94]-(e65:E65),
						(e65)-[:P14]->(user:E21)-[:P131]->(userName:E82),
						(e65)-[:P4]->(:E52)-[:P82]->(date:E61)
			
			OPTIONAL MATCH (target)-[:P1]->(targetFile:E75)
			OPTIONAL MATCH (target)-[:P102|P1]->(targetTitle)
			WHERE any(x IN ["E35","E41"] WHERE x IN labels(targetTitle))
			WITH tSs, tUd, tCt, e33, text, type,
				{id: user.content, name: userName.value, date: date.value } AS created,
				CASE WHEN any(x IN ["E31","E7"] WHERE x IN labels(target)) THEN collect({id: target.content, label: targetTitle.value, file: targetFile}) ELSE collect({id: target.content, label: target.name, file: targetFile}) END AS targets
				
			OPTIONAL MATCH (e33)-[:P67]->(refs) WHERE NOT (refs)-[:P2]->(tSs)
			OPTIONAL MATCH (refs)-[:P1]->(refFile:E75)
			OPTIONAL MATCH (refs)-[:P102]->(refTitle:E35)
			WITH tSs, tUd, tCt, e33, text, type, created, targets,
				CASE WHEN "E31" IN labels(refs) THEN collect({id: refs.content, label: refTitle.value, file: refFile}) ELSE collect({id: refs.content, label: refs.name, file: refFile}) END AS refs
				
			OPTIONAL MATCH (e33)<-[:P129]-(ae33:E33)-[:P2]->(atype),
										 (ae33)-[:P3]->(ae62:E62),
										 (ae33)<-[:P94]-(ae65:E65)-[:P14]->(ae21:E21)-[:P131]->(ae82:E82),
										 (ae65)-[:P4]->(:E52)-[:P82]->(ae61:E61)
			WITH tSs, tUd, tCt, e33, text, type, created, targets, refs,
					 collect({id: ae33.content, value: ae62.value, type: atype.content, created: {id: ae21.content, name: ae82.value, date: ae61.value}}) AS answers
			
			OPTIONAL MATCH (e33)-[:P67]->(screen:E36)-[:P2]->(tSs),
										 (screen)-[:P1]->(screenFile:E75),
										 (screen)-[:P106]->(paint:E36)-[:P2]->(tUd),
										 (paint)-[:P1]->(paintFile:E75)
			WITH e33, text, type, created, targets, refs, answers, screen,
					 collect({screenId: screen.content, cameraCenter: screen.cameraCenter, cameraFOV: screen.cameraFOV, cameraMatrix: screen.cameraMatrix, file: screenFile.content, path: screenFile.path, thumb: screenFile.thumb, width: screenFile.width, height: screenFile.height, paint: {id: paint.content, file: paintFile.content, path: paintFile.path, width: paintFile.width, height: paintFile.height}}) AS screenshots
			OPTIONAL MATCH (screen)-[:P106]->(pin:E73)
			RETURN e33.content AS id,
						 text.value AS value,
						 created,
						 type.content AS type,
						 targets,
						 refs,
						 answers,
						 screenshots,
						 collect(DISTINCT pin) AS pins;`;

		var params = {
			id: req.params.id
		};

		neo4j.readTransaction(q, params)
			.then(function (results) {
				results = neo4j.removeEmptyArrays(results, 'answers', 'id');
				results = neo4j.removeEmptyArrays(results, 'refs', 'id');
				results = neo4j.removeEmptyArrays(results, 'screenshots', 'file');
				res.json(results[0]);
			})
			.catch(function (err) {
				utils.error.neo4j(res, err, '#comment.get');
			});
	},

	queryTarget: function (req, res) {
		var prj = req.params.prj;

		// noinspection JSAnnotator
		var q = `
			MATCH (target:`+prj+` {content: {id}})<-[:P129]-(ce33:E33)-[:P2]->(type)-[:P127]->(:E55 {content: "commentType"}),
				(ce33)-[:P3]->(ce62:E62),
				(ce33)<-[:P94]-(ce65:E65)-[:P14]->(ce21:E21)-[:P131]->(ce82:E82),
				(ce65)-[:P4]->(:E52)-[:P82]->(ce61:E61)
			OPTIONAL MATCH (ce33)<-[:P129]-(ae33:E33)-[:P2]->(atype),
				(ae33)-[:P3]->(ae62:E62),
				(ae33)<-[:P94]-(ae65:E65)-[:P14]->(ae21:E21)-[:P131]->(ae82:E82),
				(ae65)-[:P4]->(:E52)-[:P82]->(ae61:E61)
			RETURN ce33.content AS id,
				ce62.value AS value,
				{id: ce21.content, name: ce82.value, date: ce61.value} AS created,
				type.content AS type,
				collect({
					id: ae33.content,
					value: ae62.value,
					created: {id: ae21.content, name: ae82.value, date: ae61.value},
					type: atype.content
				}) AS answers`;

		var params = {
			id: req.params.id
		};

		neo4j.readTransaction(q, params)
			.then(function(result) {
				res.json(neo4j.removeEmptyArrays(result, 'answers', 'id'));
			})
			.catch(function(err) {
				utils.error.neo4j(res, err, '#comment.queryTarget');
			});
	},
	
	create: function (req, res) {
		var prj = req.params.prj;
		var id = shortid.generate();

		// set type
		var cType = '';
		switch (req.body.type) {
			case 'source': cType = 'commentSource'; break;
			case 'answer': cType = 'commentAnswer'; break;
			case 'model': cType = 'commentModel'; break;
			case 'task': cType = 'commentTask'; break;
			default: cType = 'commentGeneral';
		}

		var screens = [], objIds = [];
		var promises = [], p;

		var shortPath = prj + '/screenshots/' + uuid() + '/';
		var path = config.path.data + '/' + shortPath;

		// check, if there is at least one target
		var targets = req.body.targets || [];
		if (!Array.isArray(targets)) targets = [targets];
		if (!targets.length) { utils.abort.missingData(res, 'body.targets'); return; }

		req.body.refs = req.body.refs || [];
		req.body.screenshots = req.body.screenshots || [];



		// prepare screenshots and process image data
		for (var i=0; i<req.body.screenshots.length; i++) {
			(function (screen) {
				var sFilename = id + '_screenshot_' + i + '.jpg';
				var pFilename = id + '_paint_' + i + '.png';
				var tFilename = id + '_thumb_' + i + '.jpg';

				var sData = screen.sData.replace(/^data:image\/\w+;base64,/, "");
				var pData = screen.pData.replace(/^data:image\/\w+;base64,/, "");

				p = fs.ensureDirAsync(path)
					.then(function () {
						// write screenshot image data
						return fs.writeFileAsync(path + sFilename, new Buffer(sData, 'base64'));
					})
					.then(function () {
						// write painting image data
						return fs.writeFileAsync(path + pFilename, new Buffer(pData, 'base64'));
					})
					.catch(function (err) {
						if (err) utils.error.server(res, err, '#writeFile screenshot.jpg or paint.png');
						return Promise.reject();
					})
					.then(function () {
						return exec(config.exec.ImagickConvert, [path + sFilename, '-resize', '160x90^', '-gravity', 'center', '-extent', '160x90', path + tFilename]);
					})
					.catch(function (err) {
						if (err) utils.error.server(res, err, '#ImagickConvert screenshot.jpg or paint.png');
						return Promise.reject();
					});

				promises.push(p);

				var screenMap = {
					screen36content: 'e36_' + sFilename,
					cameraCenter: screen.cameraCenter,
					cameraFOV: screen.cameraFOV,
					cameraMatrix: screen.cameraMatrix,
					screen75content: sFilename,
					screen75thumb: tFilename,
					paintId: 'e36_' + pFilename,
					paint75content: pFilename,
					path: shortPath,
					width: screen.width,
					height: screen.height
				};

				if (cType === 'commentModel') {
					var pins = [];
					targets = targets.map(function (t, index) {
						pins.push({
							id: 'e73_' + id + '_pin_' + index,
							targetId: t.object,
							screenIndex: index,
							pinMatrix: t.pinMatrix
						});
						return t.object;
					});
					// for (var j = 0; j < targets.length; j++) {
					// 	objIds.push(targets[j].object);
					// 	pins.push({
					// 		id: 'e73_' + screenMap.screen36content + '_pin_' + j,
					// 		targetId: targets[j].id,
					// 		screenIndex: i,
					// 		pinMatrix: targets[j].pinMatrix
					// 	});
					// }
					screenMap.pins = pins;
				}

				screens.push(screenMap);

			})(req.body.screenshots[i]);
		}

		// zusätzliche Aufbereitung der Daten für 'commentModel'
		// if(cType === 'commentModel') {
		// 	var statement = 'MATCH (obj:'+prj+') WHERE obj.content IN {objIds} \
		// 		MATCH (obj)<-[:P106]-(:E36)-[:P138]->(target:E22) \
		// 		RETURN target.content AS target';
		//
		// 	p = neo4j.transaction(statement, { objIds: objIds })
		// 		.then(function (response) {
		// 			var res = neo4j.extractTransactionData(response.results[0]);
		// 			targets = [];
		// 			for(var i=0; i<res.length; i++) {
		// 				console.debug(res[i].target);
		// 				targets.push(res[i].target);
		// 			}
		// 		}).catch(function(err) {
		// 			return Promise.reject(err);
		// 		});
		// 	promises.push(p);
		// }

		// refIds rausfiltern
		// var refs = [];
		// for (var j=0; j<req.body.refs.length; j++) {
		// 	refs.push(req.body.refs[j].id);
		// }
		// req.body.refs = refs;

		// fahre erst fort, wenn alle Aufgaben oben fertig sind
		Promise.all(promises)
			.then(function () {

				var q = 'MATCH (e21:E21:'+prj+' {content: $user})-[:P131]->(userName:E82), \
					(type:E55:'+prj+' {content: $type}) \
					WITH e21, userName, type \
					OPTIONAL MATCH (target:'+prj+') WHERE target.content IN $targets \
					WITH e21, userName, type, collect(DISTINCT target) AS targets \
					OPTIONAL MATCH (ref:'+prj+') WHERE ref.content IN $refs \
					WITH e21, userName, type, targets, collect(DISTINCT ref) AS refs \
					CREATE (e33:E33:'+prj+' {content: $e33id})-[:P3]->(e62:E62:'+prj+' $e62content), \
						(e65:E65:'+prj+' {content: "e65_" + $e33id})-[:P4]->(:E52:'+prj+' {content: "e52_e65_" + $e33id})-[:P82]->(e61:E61:'+prj+' {value: $date}), \
						(e33)-[:P2]->(type), \
						(e65)-[:P94]->(e33), \
						(e65)-[:P14]->(e21) \
					FOREACH (t IN targets | CREATE (e33)-[:P129]->(t)) \
					FOREACH (r IN refs | CREATE (e33)-[:P67]->(r)) ';

				if(cType === 'commentModel')
					q += 'WITH e33, e62, e61, e21, userName, type, targets, refs \
						MATCH (tSs:E55:'+prj+' {content: "screenshot"}), (tUd:E55:'+prj+' {content: "userDrawing"}) \
						FOREACH (s IN $screenshots | \
							CREATE (e33)-[:P67]->(screen:E36:'+prj+' {content: s.screen36content, cameraCenter: s.cameraCenter, cameraFOV: s.cameraFOV, cameraMatrix: s.cameraMatrix})-[:P2]->(tSs), \
								(screen)-[:P1]->(:E75:'+prj+' {content: s.screen75content, path: s.path, thumb: s.screen75thumb, width: s.width, height: s.height}), \
								(screen)-[:P106]->(draw:E36:'+prj+' {content: s.paintId})-[:P2]->(tUd), \
								(draw)-[:P1]->(:E75:'+prj+' {content: s.paint75content, path: s.path, width: s.width, height: s.height}) \
							FOREACH (p in s.pins | \
								CREATE (screen)-[:P106]->(:E73:'+prj+' {content: p.id, targetId: p.targetId, screenIndex: p.screenIndex, pinMatrix: p.pinMatrix}) ) ) ';

				q += 'RETURN e33.content AS id,\
					e62.value AS value,\
					{id: e21.content, name: userName.value, date: e61.value} AS created,\
					type.content AS type,\
					targets, refs';

				var params = {
					targets: targets,
					user: req.headers['x-key'],
					type: cType,
					e33id: 'e33_' + id + '_comment',
					e62content: {
						content: 'e62_e33_' + id + '_comment',
						value: req.body.text
					},
					date: req.body.date,
					refs: req.body.refs || [],
					screenshots: screens || []
				};
			
				//console.debug(q, params);
		
				//res.json({statement: q, parameters: params, body: req.body});

				return neo4j.writeTransaction(q, params);
			})
			.then(function (result) {
				if (result.length)
					res.json(result[0]);
				else {
					console.warn('#source.create: no nodes created');
					res.json(null);
					return Promise.reject();
				}
			})
			.catch(function (err) {
				if (err) utils.error.neo4j(res, err, '#comment.create');

				// remove directory
				return fs.existsAsync(path);
			})
			.then(function (exists) {
				if (exists) {
					console.warn('Unlink directory:', path);
					return fs.removeAsync(path);
				}
			})
			.catch(function (err) {
				console.error('Unlink directory failed:', path, err);
			});
	}

};
