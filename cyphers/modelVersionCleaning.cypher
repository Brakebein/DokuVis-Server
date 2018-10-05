MATCH (tmodel:E55:Proj_q66NrRJ {content:"model"})<-[:P2]-(dglob:D1)-[:P106]->(dobj:D1)
  WHERE NOT (dobj)<-[:L11]-(:D7)
MATCH (dobj)-[:P1]->(file:E75)
OPTIONAL MATCH (dobj)-[:P2]->(mat:E57)
RETURN dglob, dobj, file, mat;


MATCH (tmodel:E55:Proj_q66NrRJ {content:"model"})<-[:P2]-(dglob:D1)-[:P67]->(e22:E22)
WHERE NOT (dglob)-[:P106]->(:D1)
RETURN dglob, e22