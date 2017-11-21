MATCH (e21:E21:Proj_pIFGTJt {content: "e21_bruschie@hotmail.com"})-[:P131]->(userName:E82),
(type:E55:Proj_pIFGTJt {content: "commentModel"})
WITH e21, userName, type
OPTIONAL MATCH (target:Proj_pIFGTJt) WHERE target.content IN ["e73_pM76yde_node-dach_fluegel_wall", "e73_pM76yde_node-fluegel_wall_wand_002", "e73_pM76yde_node-boden_hof"]
WITH e21, userName, type, collect(DISTINCT target) AS targets
OPTIONAL MATCH (ref:Proj_pIFGTJt) WHERE ref.content IN ["e31_pIG0Ozg_ZS_9a_Longuelune_Zwingerschloss_Grundrisse_1.jpg", "e31_pIG8E0I_ZS_9a_Longuelune_Zwingerschloss_Laengsschnitt.jpg"]
WITH e21, userName, type, targets, collect(DISTINCT ref) AS refs

CREATE (e33:E33:Proj_pIFGTJt {content: {e33id}})-[:P3]->(e62:E62:Proj_pIFGTJt {e62content}),
	(e65:E65:Proj_pIFGTJt {content: "e65_" + {e33id}})-[:P4]->(:E52:Proj_pIFGTJt {content: "e52_e65_" + {e33id}})-[:P82]->(e61:E61:Proj_pIFGTJt {value: {date}}),
	(e33)-[:P2]->(type),
	(e33)-[:P102]->(:E35:Proj_pIFGTJt {e35content}),
	(e65)-[:P94]->(e33),
	(e65)-[:P14]->(e21)
FOREACH (t IN targets | CREATE (e33)-[:P129]->(t))
FOREACH (r IN refs | CREATE (e33)-[:P67]->(r))

WITH e33, e62, e61, userName, type
MATCH (tSs:E55:Proj_pIFGTJt {content: "screenshot"}), (tUd:E55:Proj_pIFGTJt {content: "userDrawing"})
CREATE (e33)-[:P106]->(:E73:Proj_pIFGTJt {content: "e73_" + {e33id} + "_pins", pins: {pins}})
FOREACH (s IN {screenshots} |
	CREATE (e33)-[:P67]->(screen:E36 {content: s.screen36content, cameraCenter: s.cameraCenter, cameraFOV: s.cameraFOV, cameraMatrix: s.cameraMatrix})-[:P2]->(tSs),
		(screen)-[:P1]->(:E75 {content: s.screen75content, path: s.path, width: s.width, height: s.height}),
		(screen)-[:P106]->(draw:E36 {content: s.paintId})-[:P2]->(tUd),
		(draw)-[:P1]->(:E75 {content: s.paint75content, path: s.path, width: s.width, height: s.height}) )

RETURN e33.content AS id, e62.value AS value, e61.value AS date, userName.value AS author, type.content AS type


// test
create (:E55 {content: "userDrawing"}),
(:E55 {content: "screenshot"}),
(:E55 {content: "commentModel"}),
(:E21 {content: "e21_bruschie@hotmail.com"})-[:P131]->(:E82 {content: "e82_e21_bruschie@hotmail.com", value: "Brakebein"}),
(:E33 {content: "e31_pIG0Ozg_ZS_9a_Longuelune_Zwingerschloss_Grundrisse_1.jpg"}),
(:E33 {content: "e31_pIG8E0I_ZS_9a_Longuelune_Zwingerschloss_Laengsschnitt.jpg"}),
(:E22 {content: "e22_pM76yde_node-dach_fluegel_wall"}),
(:E22 {content: "e22_pM76yde_node-fluegel_wall_wand_002"}),
(:E22 {content: "e22_pM76yde_node-boden_hof"})

MATCH (e21:E21 {content: "e21_bruschie@hotmail.com"})-[:P131]->(userName:E82),
(type:E55 {content: "commentModel"})
WITH e21, userName, type
OPTIONAL MATCH (target) WHERE target.content IN ["e22_pM76yde_node-dach_fluegel_wall", "e22_pM76yde_node-fluegel_wall_wand_002", "e22_pM76yde_node-boden_hof"]
WITH e21, userName, type, collect(DISTINCT target) AS targets
OPTIONAL MATCH (ref) WHERE ref.content IN ["e31_pIG0Ozg_ZS_9a_Longuelune_Zwingerschloss_Grundrisse_1.jpg", "e31_pIG8E0I_ZS_9a_Longuelune_Zwingerschloss_Laengsschnitt.jpg"]
WITH e21, userName, type, targets, collect(DISTINCT ref) AS refs
CREATE (e33:E33 {content: "e33_pNweIre_comment"})-[:P3]->(e62:E62 {content:"e62_e33_pNweIre_comment",value:"Das ist der eigentliche Kommentar"}),
	(e65:E65 {content: "e65_e33_pNweIre_comment"})-[:P4]->(:E52 {content: "e52_e65_e33_pNweIre_comment"})-[:P82]->(e61:E61 {value: "2016-06-08T09:59:08+02:00"}),
	(e33)-[:P2]->(type),
	(e33)-[:P102]->(:E35 {content:"e35_e33_pNweIre_comment",value:"Dies ist der Titel"}),
	(e65)-[:P94]->(e33),
	(e65)-[:P14]->(e21)
FOREACH (t IN targets | CREATE (e33)-[:P129]->(t))
FOREACH (r IN refs | CREATE (e33)-[:P67]->(r))

WITH e33, e62, e61, userName, type, [{screen36content: "e36_sFilename0", cameraCenter: [3,2,1], cameraFOV: 35,	cameraMatrix: [2,4,5,6,2,2], screen75content: "sFilename0", paintId: "e36_pFilename0", paint75content: "pFilename0", path: "path/to", width: 1273, height: 783},{screen36content: "e36_sFilename1", cameraCenter: [3,2,1], cameraFOV: 35,	cameraMatrix: [2,4,5,6,2,2], screen75content: "sFilename1", paintId: "e36_pFilename1", paint75content: "pFilename1", path: "path/to", width: 1273, height: 783}] AS screenshots
MATCH (tSs:E55 {content: "screenshot"}), (tUd:E55 {content: "userDrawing"})
FOREACH (s IN {screenshots} |
	CREATE (e33)-[:P67]->(screen:E36 {content: s.screen36content, cameraCenter: s.cameraCenter, cameraFOV: s.cameraFOV, cameraMatrix: s.cameraMatrix})-[:P2]->(tSs),
		(screen)-[:P1]->(:E75 {content: s.screen75content, path: s.path, width: s.width, height: s.height}),
		(screen)-[:P106]->(draw:E36 {content: s.paintId})-[:P2]->(tUd),
		(draw)-[:P1]->(:E75 {content: s.paint75content, path: s.path, width: s.width, height: s.height})
	FOREACH (p in s.pins |
		CREATE (screen)-[:P106]->(:E73 {content: p.id, targetId: p.targetId, screenIndex: p.screenIndex, pinMatrix: p.pinMatrix}) ) )

RETURN e33.content AS id, e62.value AS value, e61.value AS date, userName.value AS author, type.content AS type;


// query commentModel
MATCH (tSs:E55 {content: "screenshot"}), (tUd:E55 {content: "userDrawing"}), (tCt:E55 {content: "commentType"})
WITH tSs, tUd, tCt

MATCH (:E7 {content: $subproj})-[:P15|L11*1..9]->(target)<-[:P129]-(e33:E33)-[:P2]->(type:E55)-[:P127]->(tCt)
WHERE type.content <> "commentAnswer"
MATCH (e33)-[:P3]->(text:E62),
			(e33)<-[:P94]-(e65:E65),
			(e65)-[:P14]->(user:E21)-[:P131]->(userName:E82),
			(e65)-[:P4]->(:E52)-[:P82]->(date:E61)

OPTIONAL MATCH (e33)-[:P67]->(refs) WHERE NOT (refs)-[:P2]->(tSs)
OPTIONAL MATCH (target)-[:P1]->(targetFile:E75)
OPTIONAL MATCH (e33)<-[:P129]-(answer:E33)-[:P2]->(:E55 {content: "commentAnswer"})
WITH e33, text, type,
		 {id: user.content, name: userName.value, date: date.value } AS created,
		 collect(DISTINCT target.content) AS targets,
		 collect(DISTINCT refs.content) AS refs,
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
			 answers;


// get complete comment
MATCH (tSs:E55 {content: "screenshot"}), (tUd:E55 {content: "userDrawing"}), (tCt:E55 {content: "commentType"})
WITH tSs, tUd, tCt

MATCH (e33:E33 {content: $id})-[:P2]->(type:E55)-[:P127]->(tCt),
			(e33)-[:P129]->(target),
			(e33)-[:P3]->(text:E62),
			(e33)<-[:P94]-(e65:E65),
			(e65)-[:P14]->(user:E21)-[:P131]->(userName:E82),
			(e65)-[:P4]->(:E52)-[:P82]->(date:E61)

OPTIONAL MATCH (target)-[:P1]->(targetFile:E75)
OPTIONAL MATCH (target)-[:P102]->(targetTitle:E35)
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
			 collect(DISTINCT pin) AS pins;

// OPTIONAL MATCH n
// collect(DISTINCT n) --> NullPointerException