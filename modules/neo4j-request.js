const config = require('../config');
const Promise = require('bluebird');
const request = require('request-promise');
const neo4j = require('neo4j-driver').v1;

const driver = neo4j.driver(config.neo4j.uriBolt, neo4j.auth.basic(config.neo4j.user, config.neo4j.password));

driver.onError = function (err) {
	console.error('Neo4j driver instantiation failed', err);
};

process.on('exit', function () {
	driver.close();
});


/**
 * Run cypher query with parameters as READ transaction.
 * @param query {string} Cypher statement
 * @param params {Object=} Map with parameters to use in statement
 * @return {Promise<StatementResult>}
 */
function readTransaction(query, params) {
	const session = driver.session();

	return session.readTransaction(function (tx) {

		return tx.run( query, params || {} );

	}).then(function (result) {

		session.close();
		return extractBoltRecords(result.records);

	}).catch(function (err) {

		session.close();
		return Promise.reject(err);

	});
}

/**
 * Run cypher query with parameters as WRITE transaction.
 * @param query {string} Cypher statement
 * @param params {Object=} Map with parameters to use in statement
 * @return {Promise<StatementResult>}
 */
function writeTransaction(query, params) {
	const session = driver.session();

	return session.writeTransaction(function (tx) {

		return tx.run( query, params || {} );

	}).then(function (result) {

		session.close();
		return extractBoltRecords(result.records);

	}).catch(function (err) {

		session.close();
		return Promise.reject(err);

	});
}

function multipleTransactions(statements) {
	const session = driver.session();
	const tx = session.beginTransaction();
	
	return Promise
		.mapSeries(statements, function (sm) {
			return tx.run(sm.statement, sm.parameters)
				.then(function (result) {
					return extractBoltRecords(result.records);
				})
				.catch(function (err) {
					return Promise.reject(err);
				});
		})
		.then(function (results) {
			return tx.commit().then(function () {
				session.close();
				return results;
			});
		})
		.catch(function (err) {
			tx.rollback().then(function () {
				session.close();
			});
			return Promise.reject(err);
		});
}

function extractBoltRecords (data) {
	if (!data) return [];
	if (!Array.isArray(data)) return data;

	return data.map(function (record) {
		const obj = record.toObject();
		for (let key in obj) {
			obj[key] = convertValues(obj[key]);
		}
		return obj;
	});
}

function convertValues(value) {
	// neo4j integers
	if (neo4j.isInt(value) && neo4j.integer.inSafeRange(value))
		return value.toInt();

	// neo4j Node object
	if (value instanceof neo4j.types.Node) {
		value = value.properties;
	}

	// recursive
	if (Array.isArray(value)) {
		return value.map(function (v) {
			return convertValues(v);
		});
	}
	if (typeof value === 'object') {
		for (let key in value) {
			value[key] = convertValues(value[key]);
		}
	}

	return value;
}

function getHierarchyElement(node, content) {
	if (node.content === content) return node;
	for (var i=0; i<node.children.length; i++) {
		var obj = getHierarchyElement(node.children[i], content);
		if (obj !== undefined) return obj;
	}
	return undefined;
}


module.exports = {

	session: function () {
		return driver.session();
	},

	/**
	 * @deprecated
	 * @param statement
	 * @param parameters
	 */
	transaction: function (statement, parameters) {
		return request({
			method: 'POST',
			uri: config.neo4j.uriTransaction,
			headers: {
				'Content-type': 'application/json',
				'Authorization': config.neo4j.auth
			},
			body: {
				statements: [{ statement: statement, parameters: parameters || {} }]
			},
			json: true
		});
	},

	/**
	 * @deprecated
	 * @param statements
	 */
	transactionArray: function (statements) {
		return request({
			method: 'POST',
			uri: config.neo4j.uriTransaction,
			headers: {
				'Content-type': 'application/json',
				'Authorization': config.neo4j.auth
			},
			body: {
				statements: statements
			},
			json: true
		});
	},

	/**
	 * @deprecated
	 * @param query
	 * @param params
	 */
	cypher: function (query, params) {
		return request({
			method: 'POST',
			uri: config.neo4j.uriCypher,
			headers: {
				'Content-type': 'application/json',
				'Authorization': config.neo4j.auth
			},
			body: {
				query: query,
				params: params || {}
			},
			json: true
		});
	},

	readTransaction: readTransaction,
	writeTransaction: writeTransaction,
	multipleStatements: multipleTransactions,

	extractBoltRecords: extractBoltRecords,
	
	extractTransactionData: function (data) {
		if (!data) return [];
		var results = [];
		for (var i=0, l=data.data.length; i<l; i++) {
			var obj = {};
			for (var j=0; j<data.columns.length; j++) {
				obj[data.columns[j]] = data.data[i].row[j];
			}
			results.push(obj);
		}
		return results;
	},
	
	extractTransactionArrayData: function (data) {
		if (!data) return [];
		var results = [];
		for (var i=0, l=data.length; i<l; i++) {
			var arr = [];
			for (var j=0, m=data[i].data.length; j<m; j++) {
				var obj = {};
				for (var k=0, n=data[i].columns.length; k<n; k++) {
					obj[data[i].columns[k]] = data[i].data[j].row[k];
				}
				arr.push(obj);
			}
			results.push(arr);
		}
		return results;
	},

	removeEmptyArrays: function (data, checkObj, checkKey) {
		for (var i= 0, l=data.length; i<l; i++) {
			if (data[i][checkObj] && data[i][checkObj] instanceof Array && data[i][checkObj][0]) {
				if (data[i][checkObj][0][checkKey] === null)
					data[i][checkObj] = [];
			}
			for (var key in data[i]) {
				if (data[i][key] instanceof Array)
					this.removeEmptyArrays(data[i][key], checkObj, checkKey);
			}
		}
		return data;
	},
	
	createHierarchy: function (data) {
		var results = [];
		for (var i=0; i<data.length; i++) {
			var parent = {
				content: data[i].parent.content,
				children: data[i].children
			};
			for (var j=0, k=parent.children.length; j<k; j++) {
				parent.children[j].children = [];
			}
			results.push(parent);
		}
		for (i=0; i<results.length; i++) {
			for (j=0, k=results.length; j<k; j++) {
				if (i === j) continue;
				var p = getHierarchyElement(results[j], results[i].content);
				if (p !== undefined) {
					p.children = results[i].children;
					results.splice(i,1);
					i--;
					break;
				}
			}
		}
		return results;
	}
	
};
