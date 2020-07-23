const router = require('express').Router()
const superAdminModel = require('../models/SuperAdmin.model')
const projectsModel = require('../models/Project.model')
const {upload, uploadf}= require('../db/upload')
const mongoose = require('mongoose')
const adminAuth = require('../middleware/adminAuth');
const { Z_NEED_DICT } = require('zlib')
const { type } = require('os')
const { filter } = require('async')
const _ = require('lodash');
const MonkeyLearn = require('monkeylearn')
const ml = new MonkeyLearn('8b8701a6b32bfe7d6f749095ee6d31123b267daf')
let model_id = 'ex_YCya9nrn'

// route for rendering the project creating page
router.route('/create').get(adminAuth, (req, res) => {
    res.render('create_project', { alerts: req.flash('error'), id: req.admin._id, page_name:"projects" })
})

// route to create project
router.route('/create/').post(adminAuth, upload.any('snapshot_url', 20),  (req, res) => {
  vfeatured=req.body.featured==="on"?true:false;
  vpublished=req.body.published==="on"?true:false;
  if(vfeatured=true){
    vpublished=true
  }
    var snaps = []
    var documentIDs = []
    if (req.files != undefined) {
      snaps = req.files.map(function (file) {
        return file.filename
      })
      req.files.forEach(function (file,index) {
        documentIDs[index]=[file.filename,file.id];
      })
    }
    ml.extractors.extract(model_id,[req.body.description]).then(resp => {
      let response=resp.body
      let tags=[]
      if(!response[0].error){
        let tagsarray=response[0]["extractions"]
        _.forEach(tagsarray, function(tagel){
          if(parseFloat(tagel.relevance)>0.8){
            tags.push(tagel.parsed_value)
          }
        })
      }
    var project = new projectsModel({
      title: req.body.title,
      team_members: req.body.team_member,
      description: req.body.description,
      branch: req.body.branch,
      club: req.body.club,
      degree: req.body.degree,
      snapshot_url: snaps,
      featured : vfeatured,
      published : vpublished,
      documentIDs:documentIDs,
      keywords : tags
    })
  
    project.save((err) => {
      if (err) {
        req.flash("error",err.message)
      }
      res.redirect('/projects/view_all')
    })
  })
})

// route for rendering pre-filled form to update project
router.route('/update/:id').get(adminAuth, (req,res)=>{
    const proj_id = req.params.id
    projectsModel.findById(proj_id)
    .then(project=>{
      res.render('update_project', { alerts: req.flash('error'),project:project, page_name:"projects"})
    })
})

// route to update project
router.route('/update/:id').post(adminAuth, upload.any('pics', 20), (req, res) => {
    const id = req.params.id
    vfeatured=req.body.featured==="on"?true:false;
    vpublished=req.body.published==="on"?true:false;
    if(vfeatured==true){
      vpublished=true
    }
    var documentIDs=[],pics_url_links=[],masterqueue=[],pics_url=[]
    if(req.body.documentIDs){
      documentIDs = JSON.parse(req.body.documentIDs); 
    }
    if(req.body.tags){
      tags = JSON.parse(req.body.tags); 
    }
    if(req.body.pics_url_links)
    pics_url_links=(req.body.pics_url_links).filter(Boolean);
    if (req.files != undefined) {
      pics_url = req.files.map((file) => {
        return file.filename
      })
      req.files.forEach(function (file,index) {
        masterqueue[index]=[file.filename,file.id];
      })
    }
    masterqueue=masterqueue.concat(documentIDs);
    pics_url = pics_url.concat(pics_url_links);
    documentIDs =masterqueue.filter(k => pics_url.includes(k[0])); 
    deletequeue = masterqueue.filter(k =>!pics_url.includes(k[0]));

    var change = {
      title: req.body.title,
      team_members: req.body.team_member,
      description: req.body.description,
      branch: req.body.branch,
      club: req.body.club,
      degree: req.body.degree,
      snapshot_url: pics_url,
      documentIDs:documentIDs,
      featured : vfeatured,
      published : vpublished,
      keywords : tags
    }
  
    projectsModel.findByIdAndUpdate(id, change)
      .then(() => {
        if(deletequeue.length>0){
          var arrPromises = deletequeue.map((path) => 
          {if (req.app.locals.gfs) {
            req.app.locals.gfs.delete(new mongoose.Types.ObjectId(path[1]))
            }
          }
          );
          Promise.all(arrPromises)
            .then((arrdata) => {res.redirect('/projects/view_all')})
            .catch(function (err) {
              req.flash("error",["Alert : Delete failed on some images."])
              res.redirect('/projects/view_all')
            });
        }
        else{
          res.redirect('/projects/view_all')
        }
      }).catch(err => {
        req.flash("error",err.message)
        res.redirect('/projects/view_all')      })
})

// route to delete project
router.route('/delete/:id').get(adminAuth, (req, res) => {
    const project_id = req.params.id
    projectsModel.findByIdAndDelete(project_id)
      .then((data) => {
        if(data.documentIDs){
          deletequeue = data.documentIDs;
          if(deletequeue.length>0){
            var arrPromises = deletequeue.map((path) => 
            {if (req.app.locals.gfs) {
              req.app.locals.gfs.delete(new mongoose.Types.ObjectId(path[1]))
              }
            }
            );
            Promise.all(arrPromises)
              .then((arrdata) => {res.redirect('/projects/view_all')})
              .catch(function (err) {
                req.flash("error",["Alert : Delete failed on some images."])
                res.redirect('/projects/view_all')
              });
          }
          else{
            res.redirect('/projects/view_all')
          }
        }
        else
        res.redirect('/projects/view_all')
      }).catch(err => {
        req.flash("error",err.message)
        res.redirect('/projects/view_all')      })
})

// route to view all projects
router.route('/view_all').get(adminAuth, (req, res) => {
    const admin = req.admin
    projectsModel.find()
      .then(project => {
        res.render('view_projects', { alerts: req.flash('error'), projects: project,_id:admin._id, page_name:"projects"}) //, _id: sess._id
      }).catch(err => {
        req.flash("error",err.message)
        res.redirect('/admin/profile')      })
})

router.route('/details/:id').get(adminAuth, (req,res)=>{
  const admin = req.admin
  projectsModel.findById(req.params.id)
  .then(project=>{
    res.render('details_project',{alerts: req.flash('error'),project:project,_id:admin._id, page_name:"projects"})
  }).catch(err=>{
    req.flash("error",err.message)
    res.redirect('/admin/profile')
  })
})


module.exports = router