// source upload
MATCH (:E7:Proj_q66NrRJ {content: "Proj_q66NrRJ"})-[:P9|P15*]->(e31:E31)<-[:P15]-(upevent:E7)-[:P2]->(:E55 {content: "sourceUpload"}),
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
ORDER BY date DESC;

// source update
MATCH (:E7:Proj_q66NrRJ {content: "Proj_q66NrRJ"})-[:P9|P15*]->(e31:E31)<-[:P31]-(upevent:E11),
      (upevent)-[:P14]->(user:E21)-[:P131]->(userName:E82),
      (upevent)-[:P4]->(:E52)-[:P82]->(date:E61),
      (e31)-[:P102]->(title:E35),
      (e31)-[:P1]->(file:E75)
RETURN e31.content AS id,
       {id: user.content, name: userName.value} AS user,
       date.value AS date,
       title.value AS label,
       file,
       "source_update" AS type
ORDER BY date DESC;

// model upload
MATCH (:E7:Proj_q66NrRJ {content: "Proj_q66NrRJ"})-[:P9|P15*]->(d7:D7),
      (d7)-[:P14]->(user:E21)-[:P131]->(userName:E82),
      (d7)-[:P4]->(:E52)-[:P82]->(date:E61),
      (d7)-[:P1]->(title:E41)
RETURN d7.content AS id,
       {id: user.content, name: userName.value} AS user,
       date.value AS date,
       title.value AS label,
       "model_upload" AS type
ORDER BY date DESC;

// version update
MATCH (:E7:Proj_q66NrRJ {content: "Proj_q66NrRJ"})-[:P9|P15*]->(d7:D7)<-[:P31]-(upevent:E11),
      (upevent)-[:P14]->(user:E21)-[:P131]->(userName:E82),
      (upevent)-[:P4]->(:E52)-[:P82]->(date:E61),
      (d7)-[:P1]->(title:E41)
RETURN d7.content AS id,
       {id: user.content, name: userName.value} AS user,
       date.value AS date,
       title.value AS label,
       "version_update" AS type
ORDER BY date DESC;

// task create
MATCH (:E7:Proj_q66NrRJ {content: "Proj_q66NrRJ"})-[:P9*]->(task:E7)-[:P2]->(:E55 {content:"task"}),
      (task)<-[:P94]-(event:E65),
      (event)-[:P14]->(user:E21)-[:P131]->(userName:E82),
      (event)-[:P4]->(:E52)-[:P82]->(date:E61),
      (task)-[:P1]->(title:E41)
RETURN task.content AS id,
       {id: user.content, name: userName.value} AS user,
       date.value AS date,
       title.value AS label,
       "task_create" AS type
ORDER BY date DESC;

// task update
MATCH (:E7:Proj_q66NrRJ {content: "Proj_q66NrRJ"})-[:P9*]->(task:E7)-[:P2]->(:E55 {content:"task"}),
      (task)<-[:P31]-(upevent:E11),
      (upevent)-[:P14]->(user:E21)-[:P131]->(userName:E82),
      (upevent)-[:P4]->(:E52)-[:P82]->(date:E61),
      (task)-[:P1]->(title:E41)
RETURN task.content AS id,
       {id: user.content, name: userName.value} AS user,
       date.value AS date,
       title.value AS label,
       "task_update" AS type
ORDER BY date DESC;

// comments
MATCH (e33:E33:Proj_q66NrRJ)-[:P2]->(cType:E55)-[:P127]->(:E55 {content: "commentType"}),
      (e33)-[:P129*..2]->(target)<-[:P9|P15|L11*]-(project:E7 {content: "Proj_q66NrRJ"})
OPTIONAL MATCH (project)-[:P9]->(subprj:E7)-[:P9|P15|L11*]->(target),
               (subprj)-[:P2]->(:E55 {content: "subproject"})
WITH e33, cType, target,
     CASE WHEN subprj IS NULL THEN project.content ELSE subprj.content END AS subproject

MATCH (e33)<-[:P94]-(event:E65),
      (event)-[:P14]->(user:E21)-[:P131]->(userName:E82),
      (event)-[:P4]->(:E52)-[:P82]->(date:E61)
OPTIONAL MATCH (target)-[:P1|P102]->(title)
WHERE any(label IN labels(title) WHERE label IN ["E35","E41"])
OPTIONAL MATCH (e33)-[:P129]->(aTarget:E33)-[:P2]->(:E55)-[:P127]->(:E55 {content: "commentType"})

RETURN e33.content AS id,
       {id: user.content, name: userName.value} AS user,
       date.value AS date,
       CASE WHEN title IS NULL AND "D1" IN labels(target) THEN target.name ELSE title.value END AS label,
       CASE WHEN aTarget IS NULL THEN target.content ELSE aTarget.content END AS commentTarget,
       cType.content AS commentType,
       "comment_create" AS type,
       subproject
ORDER BY date DESC;