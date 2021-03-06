const config = require('../config');
const utils = require('../modules/utils');
const express = require('express');
const shortid = require('shortid');
const router = express.Router();

// multer
const multer = require('multer');
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, config.path.tmp);
	},
	filename: function (req, file, cb) {
		if (req.body.tid)
			cb(null, req.body.tid + '_' + utils.replace(file.originalname));
		else if (req.body.newFileName)
			cb(null, req.body.newFileName);
		else
			cb(null, file.fieldname + '-' + shortid.generate());
	}
});
const mUpload = multer({ storage: storage });

const can = require('../middlewares/checkPermission');

// index

// routes that can be accessed by any one
const auth = require('./auth');
router.post('/login', auth.login);
router.post('/register', auth.register);

// routes that can be only accessed by authenticated users
router.get('/auth/check', auth.checkJWT);

//router.post('/auth/cypher', project.cypher);

// routes that can be only accessed by authenticated & authorized users

// project
const project = require('./project');
router.get('/auth/project', project.query);
router.get('/auth/project/:prj', project.get);
router.post('/auth/project', project.create);
router.put('/auth/project/:prj', can('superadmin'), project.update);
router.delete('/auth/project/:prj', can('superadmin'), project.delete);

// subproject
const subproject = require('./subproject');
router.get('/auth/project/:prj/subproject', subproject.query);
router.post('/auth/project/:prj/subproject', subproject.create);
router.get('/auth/project/:prj/subproject/:id', subproject.get);
router.put('/auth/project/:prj/subproject/:id', subproject.update);

// project infos
const projinfo = require('./projinfo');
router.get('/auth/project/:id/:subprj/projinfo', projinfo.query);
router.post('/auth/project/:id/:subprj/projinfo', projinfo.create);
router.get('/auth/project/:id/:subprj/projinfo/:piId', projinfo.get);
router.put('/auth/project/:id/:subprj/projinfo/:piId', projinfo.update);
router.delete('/auth/project/:id/:subprj/projinfo/:piId', projinfo.delete);
router.put('/auth/project/:id/:subprj/projinfo', projinfo.swap);

// models
const models = require('./models');
const upload = require('./upload');
router.get('/auth/project/:id/:subprj/models', models.queryTree);
router.get('/auth/project/:id/model/:modelId', models.get);
router.put('/auth/project/:id/model/:modelId', models.update);
router.post('/auth/project/:id/:subprj/models', models.insert);
router.post('/auth/project/:id/:subprj/assignCategory', models.assignCategory);
router.get('/auth/project/:id/:subprj/model/:modelId/connect', models.getConnections);
router.post('/auth/project/:prj/:subprj/model/upload', mUpload.single('uploadModelFile'), upload);

// model version / digital object
const modelversion = require('./modelversion');
const digitalobject = require('./digitalobject');
const software = require('./software');
router.get('/auth/project/:prj/:subprj/model/version', modelversion.query);
router.get('/auth/project/:prj/:subprj/model/version/:id', modelversion.get);
router.put('/auth/project/:prj/:subprj/model/version/:id', modelversion.update);
router.delete('/auth/project/:prj/:subprj/model/version/:id', modelversion.delete);
router.get('/auth/project/:prj/:subprj/model/version/:id/object', digitalobject.query);
router.post('/auth/project/:prj/:subprj/model/version', mUpload.single('uploadModelFile'), upload);
router.get('/auth/project/:prj/software', software.query);

// categories
const category = require('./category');
router.get('/auth/project/:id/category', category.query);
router.post('/auth/project/:id/category', category.create);
router.put('/auth/project/:id/category/:cid', category.update);
router.delete('/auth/project/:id/category/:cid', category.delete);
router.post('/auth/project/:id/category/:cid/attribute', category.createAttr);
router.put('/auth/project/:id/category/:cid/attribute/:aid', category.updateAttr);
router.delete('/auth/project/:id/category/:cid/attribute/:aid', category.deleteAttr);

// sources
const source = require('./source');
router.get('/auth/project/:prj/:subprj/source', source.query);
router.get('/auth/project/:prj/:subprj/source/:id', source.get);
router.post('/auth/project/:prj/:subprj/source', mUpload.single('uploadSourceFile'), source.create);
router.put('/auth/project/:prj/:subprj/source/:id', source.update);
router.post('/auth/project/:prj/:subprj/source/:id/file', mUpload.single('updateSourceFile'), source.updateFile);
router.delete('/auth/project/:prj/:subprj/source/:id', source.delete);
router.post('/auth/project/:id/:subprj/source/:sourceId/connect', source.link);
router.get('/auth/project/:id/:subprj/source/:sourceId/connect', source.getLinks);
router.put('/auth/project/:prj/:subprj/source/:id/spatial', source.setSpatial);
router.get('/auth/project/:prj/:subprj/source/:id/spatial', source.getSpatial);

// comments
const comment = require('./comment');
router.get('/auth/project/:prj/:subprj/comment', comment.query);
router.get('/auth/project/:prj/:subprj/comment/:id', comment.get);
router.post('/auth/project/:prj/:subprj/comment', comment.create);
router.get('/auth/project/:prj/:subprj/comment/target/:id', comment.queryTarget);

// graph
const graph = require('./graph');
router.get('/auth/project/:id/graph/:nodeId', graph.getPaths);
router.get('/auth/project/:id/graph/:nodeId/:label', graph.getTitle);
router.get('/auth/project/:id/graph/:nodeId/:label', graph.getAbstractNodes);
router.get('/auth/project/:id/graph/:nodeId/e22', graph.getE22Name);

// authors
const author = require('./author');
router.get('/auth/project/:prj/author', author.query);
router.get('/auth/project/:prj/author/:id', author.get);
router.post('/auth/project/:prj/author', author.create);
router.put('/auth/project/:prj/author/:id', author.update);
router.delete('/auth/project/:prj/author/:id', author.delete);

// archives
const archive = require('./archive');
router.get('/auth/project/:prj/archive', archive.query);
router.get('/auth/project/:prj/archive/:id', archive.get);
router.post('/auth/project/:prj/archive', archive.create);
router.put('/auth/project/:prj/archive/:id', archive.update);
router.delete('/auth/project/:prj/archive/:id', archive.delete);

// staff
const staff = require('./staff');
router.get('/auth/project/:prj/staff', staff.query);
router.get('/auth/project/:prj/staff/:id', staff.get);
router.post('/auth/project/:prj/staff', can('admin'), staff.create);
router.get('/roles', staff.queryRoles);

//tasks
const task = require('./task');
router.get('/auth/project/:prj/task', task.query);
router.post('/auth/project/:prj/task', task.create);
router.get('/auth/project/:prj/task/:id', task.get);
router.put('/auth/project/:prj/task/:id', task.update);
router.delete('/auth/project/:prj/task/:id', task.delete);

// activities
const activity = require('./activity');
router.get('/auth/project/:prj/:subprj/activity', activity.query);

const typeahead = require('./typeahead');
router.get('/auth/project/:prj/typeahead/:label/:prop/:from', typeahead.query);
router.get('/auth/project/:prj/typeahead/tag', typeahead.queryTags);

module.exports = router;
