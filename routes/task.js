const utils = require('../modules/utils');
const neo4j = require('../modules/neo4j-request');
const shortid = require('shortid');

module.exports = {

	query: function (req, res) {
		const prj = req.params.prj;

		const q = `
		MATCH (task:E7:${prj})-[:P2]->(ttask:E55)
		WHERE ttask.content = "task" OR ttask.content = "subproject"
		WITH task, ttask
		MATCH (task)-[:P1]->(title:E41),
    		(task)-[:P3]->(desc:E62)-[:P3_1]->(:E55 {content: "taskDesc"}),
      		(task)-[:P4]->(:E52)-[:P81]->(time:E61),
      		(task)<-[:P94]-(e65:E65)-[:P14]->(user:E21)-[:P131]->(userName:E82),
      		(e65)-[:P4]->(:E52)-[:P82]->(date:E61),
      		(task)<-[:P9]-(parent),
      		(task)-[:P2]->(tprior:E55)-[:P127]->(:E55 {content: "taskPriority"}),
      		(task)-[:P2]->(tstatus:E55)-[:P127]->(:E55 {content: "taskStatus"})
      	OPTIONAL MATCH (task)-[:P14]->(editor:E21)-[:P131]->(editorName:E82)
      	WITH task, title, desc, time, parent, ttask, tprior, tstatus, user, userName, date,
      		collect({id: editor.content, name: editorName.value}) AS editors
      	
      	OPTIONAL MATCH (task)<-[:P31]-(e11:E11)-[:P14]->(mUser:E21)-[:P131]->(mUserName:E82),
      		(e11)-[:P4]->(:E52)-[:P82]->(mDate:E61)
      	OPTIONAL MATCH (task)-[:P9]->(child)
		RETURN task.content AS id,
       		title.value AS title,
       		desc.value AS description,
       		time.value AS from, time.until AS to,
       		parent.content AS parent,
       		collect(child.content) AS children,
       		ttask.content AS type,
       		tprior.value AS priority,
       		tstatus.value AS status,
       		editors,
       		{id: user.content, name: userName.value, date: date.value} AS created,
       		{id: mUser.content, name: mUserName.value, date: mDate.value} AS modified`;

		neo4j.readTransaction(q)
			.then(function (result) {
				res.json(neo4j.removeEmptyArrays(result, 'editors', 'id'));
			})
			.catch(function (err) {
				utils.error.neo4j(res, err, '#task.query');
			});
	},

	get: function (req, res) {
		const prj = req.params.prj;

		const q = `
		MATCH (task:E7:${prj} {content: {taskId}})-[:P2]->(ttask:E55 {content: "task"}),
			(task)-[:P1]->(title:E41),
    		(task)-[:P3]->(desc:E62)-[:P3_1]->(:E55 {content: "taskDesc"}),
      		(task)-[:P4]->(:E52)-[:P81]->(time:E61),
      		(task)<-[:P94]-(e65:E65)-[:P14]->(cUser:E21)-[:P131]->(cUserName:E82),
      		(e65)-[:P4]->(:E52)-[:P82]->(cDate:E61),
      		(task)<-[:P9]-(parent),
      		(task)-[:P2]->(tprior:E55)-[:P127]->(:E55 {content: "taskPriority"}),
      		(task)-[:P2]->(tstatus:E55)-[:P127]->(:E55 {content: "taskStatus"})
      	OPTIONAL MATCH (task)-[:P14]->(editor:E21)-[:P131]->(editorName:E82)
      	OPTIONAL MATCH (task)<-[:P31]-(e11:E11)-[:P14]->(mUser:E21)-[:P131]->(mUserName:E82),
      		(e11)-[:P4]->(:E52)-[:P82]->(mDate:E61)
		RETURN task.content AS id,
       		title.value AS title,
       		desc.value AS description,
       		time.value AS from, time.until AS to,
       		parent.content AS parent,
       		ttask.content AS type,
       		tprior.value AS priority,
       		tstatus.value AS status,
       		collect({id: editor.content, name: editorName.value}) AS editors,
       		{id: cUser.content, name: cUserName.value, date: cDate.value} AS created,
       		{id: mUser.content, name: mUserName.value, date: mDate.value} AS modified`;

		const params = {
			taskId: req.params.id
		};

		neo4j.readTransaction(q, params)
			.then(function (result) {
				res.json(neo4j.removeEmptyArrays(result, 'editors', 'id')[0]);
			})
			.catch(function (err) {
				utils.error.neo4j(res, err, '#task.query');
			});
	},

	create: function (req, res) {
		if (!req.body.title) { utils.abort.missingData(res, '#task.create body.title'); return; }
		if (!req.body.date) { utils.abort.missingData(res, '#task.create body.date'); return; }
		if (!req.body.from || !req.body.to) { utils.abort.missingData(res, '#task.create body.from|body.to'); return; }
		if (!req.body.parent) { utils.abort.missingData(res, '#task.create body.parent'); return; }

		const prj = req.params.prj;
		const id = 'task_' + shortid.generate();

		let priority = 'priority_low';
		if (req.body.priority === 1)
			priority = 'priority_medium';
		else if (req.body.priority === 2)
			priority = 'priority_high';

		const q = `
		MATCH (editor:E21:${prj}-[:P131]->(editorName:E82)
  			WHERE editor.content IN {editors}
  		WITH collect({editor: editor, editorName: editorName}) AS editorsColl
		MATCH (ttask:E55:${prj} {content: "task"}),
     		(tdesc:E55:${prj} {content: "taskDesc"}),
      		(user:E21:${prj} {content: {user}})-[:P131]->(userName:E82),
      		(parent:E7:${prj} {content: {parentId}}),
      		(tprior:E55:${prj} {content: {priority}})-[:P127]->(:E55 {content: "taskPriority"}),
      		(tstatus:E55:${prj} {content: "status_todo"})-[:P127]->(:E55 {content: "taskStatus"})
  			
		CREATE (task:E7:${prj} {content: {taskId}}),
			(task)-[:P2]->(ttask),
			(task)-[:P1]->(title:E41:${prj} {titleContent}),
			(task)-[:P3]->(desc:E62:${prj} {descContent})-[:P3_1]->(tdesc),
			(parent)-[:P9]->(task),
			(task)-[:P2]->(tprior),
			(task)-[:P2]->(tstatus),
			(task)-[:P4]->(:E52:${prj} {content: {timeId}})-[:P81]->(time:E61:${prj} {timeContent}),
			(task)<-[:P94]-(e65:E65:${prj} {content: {e65id}}),
			(e65)-[:P14]->(user),
			(e65)-[:P4]->(:E52:${prj} {content: {e52id}})-[:P82]->(date:E61:${prj} {value: {date}})
			
		WITH task, title, desc, time, parent, ttask, tprior, tstatus, user, userName, date, editorsColl
		
		UNWIND editorsColl AS editors
		FOREACH (e IN editors.editor |
			CREATE (task)-[:P14]->(e)
		)
		RETURN task.content AS id,
       		title.value AS title,
       		desc.value AS description,
       		time.value AS from, time.until AS to,
       		parent.content AS parent,
       		ttask.content AS type,
       		tprior.value AS priority,
       		tstatus.value AS tstatus,
       		collect({id: editors.editor.content, name: editors.editorName.value}) AS editors,
       		{id: user.content, name: userName.value, date: date.value} AS created`;

		const params = {
			taskId: id,
			titleContent: {
				content: 'e41_' + id,
				value: req.body.title
			},
			descContent: {
				content: 'e62_' + id,
				value: req.body.description
			},
			timeContent: {
				value: req.body.from,
				until: req.body.to
			},
			timeId: 'e52_' + id,
			parentId: req.body.parent,
			priority: priority,
			user: req.headers['x-key'],
			date: req.body.date,
			e65id: 'e65_' + id,
			e52id: 'e52_e65_' + id,
			editors: req.body.editors
		};

		neo4j.writeTransaction(q, params)
			.then(function (result) {
				res.json(neo4j.removeEmptyArrays(result, 'editors', 'id')[0]);
			})
			.catch(function (err) {
				utils.error.neo4j(res, err, '#task.create');
			});
	},

	update: function (req, res) {
		const prj = req.params.prj;
		const id = req.params.id;
		const mId = shortid.generate();

		let editors = [];
		if (Array.isArray(req.body.editors) &&
			req.body.editors[0]) {
			if (typeof req.body.editors[0] === 'string')
				editors = req.body.editors;
			else
				editors = req.body.editors.map(function (value) {
					return value.email || value.id;
				});
		}

		const q = `
		MATCH (ttp:E55:${prj} {content: "taskPriority"})<-[:P127]-(tprior:E55:${prj} {value: {priority}}),
			(tts:E55:${prj} {content: "taskStatus"})<-[:P127]-(tstatus:E55:${prj} {value: {status}}),
			(ttd:E55:${prj} {content: "taskDesc"})
		WITH ttp, tprior, tts, tstatus, ttd
		OPTIONAL MATCH (editor:E21:${prj})
  			WHERE editor.content IN {editors}
  		WITH ttp, tprior, tts, tstatus, ttd, collect(editor) AS editorsColl
		MATCH (mUser:E21:${prj} {content: {user}})-[:P131]->(mUserName:E82)
		WITH ttp, tprior, tts, tstatus, ttd, mUser, mUserName, editorsColl
		MATCH (task:E7:${prj} {content: {taskId}})-[:P2]->(ttask:E55 {content: "task"}),
			(task)-[:P1]->(title:E41),
    		(task)-[:P3]->(desc:E62)-[:P3_1]->(ttd),
      		(task)-[:P4]->(:E52)-[:P81]->(time:E61),
      		(task)<-[:P9]-(parent),
      		(task)-[rprior:P2]->(:E55)-[:P127]->(ttp),
      		(task)-[rstatus:P2]->(:E55)-[:P127]->(tts),
      		(task)<-[:P94]-(e65:E65)-[:P14]->(cUser:E21)-[:P131]->(cUserName:E82),
      		(e65)-[:P4]->(:E52)-[:P82]->(cDate:E61)
      		
      	OPTIONAL MATCH (task)-[reditor:P14]->(editorOld:E21)
  		OPTIONAL MATCH (task)<-[:P31]-(e11old:E11)-[:P14]->(:E21),
      		(e11old)-[:P4]->(e52old:E52)-[:P82]->(mDateOld:E61)
  		
  		DELETE rprior, rstatus
      	DETACH DELETE e11old, e52old, mDateOld
  		
  		WITH task, title, desc, time, parent, ttask, tprior, tstatus,
			 editorsColl, mUser, mUserName,
			 collect(reditor) as reditorColl,
			 {id: cUser.content, name: cUserName.value, date: cDate.value} AS created
  				
      	CREATE (task)-[:P2]->(tprior),
      		(task)-[:P2]->(tstatus),
      		(task)<-[:P31]-(e11:E11:${prj} {content: {e11id}}),
			(e11)-[:P14]->(mUser),
			(e11)-[:P4]->(:E52:${prj} {content: {e52id}})-[:P82]->(mDate:E61:${prj} {value: {mDate}})
		SET title.value = {title},
      		desc.value = {desc},
      		time.value = {from},
      		time.until = {until}
      	
      	FOREACH (r IN reditorColl |
		  DELETE r
		)
      	
      	WITH task, title, desc, time, parent, ttask, tprior, tstatus, created,
			{id: mUser.content, name: mUserName.value, date: mDate.value} AS modified,
			editorsColl
      	
      	UNWIND CASE editorsColl WHEN [] THEN [null] ELSE editorsColl END AS editors
      	OPTIONAL MATCH (editors)-[:P131]->(editorsName:E82)
      	FOREACH (e IN CASE WHEN editors IS NOT NULL THEN [1] ELSE [] END |
      		CREATE (task)-[:P14]->(editors)
		)
      	
		RETURN task.content AS id,
       		title.value AS title,
       		desc.value AS description,
       		time.value AS from, time.until AS to,
       		parent.content AS parent,
       		ttask.content AS type,
       		tprior.value AS priority,
       		tstatus.value AS status,
       		CASE WHEN editors IS NOT NULL THEN collect({id: editors.content, name: editorsName.value}) ELSE [] END AS editors,
       		created,
       		modified`;

		const params = {
			taskId: id,
			title: req.body.title,
			desc: req.body.description,
			from: req.body.from,
			until: req.body.to,
			priority: req.body.priority,
			status: req.body.status,
			editors: editors,
			e11id: 'e11_m_' + mId,
			e52id: 'e52_m_' + mId,
			mDate: req.body.date,
			user: req.headers['x-key']
		};

		neo4j.writeTransaction(q, params)
			.then(function (result) {
				res.json(neo4j.removeEmptyArrays(result, 'editors', 'id')[0]);
				// var data = neo4j.removeEmptyArrays(result, 'editors', 'id')[0];
				// console.debug(data);
				// res.json(data);
			})
			.catch(function (err) {
				utils.error.neo4j(res, err, '#task.update');
			});
	},

	delete: function (req, res) {
		const prj = req.params.prj;

		// TODO: delete comments

		const q = `
		MATCH (task:E7:${prj} {content: {taskId}})-[:P2]->(:E55 {content: "task"}),
			(task)-[:P1]->(title:E41),
			(task)-[:P3]->(desc:E62)-[:P3_1]->(:E55 {content: "taskDesc"}),
			(task)-[:P4]->(taske52:E52)-[:P81]->(time:E61),
			(task)<-[:P94]-(e65:E65)-[:P4]->(ce52:E52)-[:P82]->(cDate:E61),
			(task)-[:P2]->(:E55)-[:P127]->(:E55 {content: "taskPriority"}),
			(task)-[:P2]->(:E55)-[:P127]->(:E55 {content: "taskStatus"}),
			(task)<-[:P9]-(parent)

		OPTIONAL MATCH (task)<-[:P31]-(e11:E11)-[:P4]->(me52:E52)-[:P82]->(mDate:E61)
		OPTIONAL MATCH (task)-[:P9]->(child)

		DETACH DELETE task, title, desc, taske52, time, e65, ce52, cDate, e11, me52, mDate

		WITH parent, collect(child) AS children
		FOREACH (c IN children |
			CREATE (parent)-[:P9]->(c)
		)`;

		const params = {
			taskId: req.params.id
		};

		neo4j.writeTransaction(q, params)
			.then(function () {
				res.json({ message: 'Task with ID ' + req.params.id + ' deleted' });
			})
			.catch(function (err) {
				utils.error.neo4j(res, err, '#task.delete');
			});
	}

};
