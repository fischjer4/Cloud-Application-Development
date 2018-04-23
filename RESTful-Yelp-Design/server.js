// Get logger, so every request to server returns info to client
var logger = require('./lib/logger');
var express = require('express');
// Get body-parser, so every request is parsed into JSON
var bodyParser = require('body-parser');
// Used to add UIDs to data
var uniqid = require('uniqid');

var app = express();
var port = process.env.PORT || 8000;

// Get the data to serve and add to
var businesses = require('./data/businesses');
var users = require('./data/users');
var reviews = require('./data/reviews');
var photos = require('./data/photos');
var categories = require('./data/categories');
var subcategories = require('./data/subcategories');

// Parse each request to JSOn
app.use(bodyParser.json());
// Direct server url to openai spec
app.use(express.static(__dirname + '/public'));
// spit back standard info to client for each request
app.use(logger);


businesses.push("asds");

/**********************************************************************
 * Auxiliary functions
 **********************************************************************/
function addToUsers(USERID, subjectID, subject){
	let obj = users.find((o, idx) => {
				if (o.USERID == USERID) {
					// stop searching
					return true; 
				}
			});
	if(obj){
		if(subject == "businesses"){
			obj.business.push(subjectID);
		}
		else if(subject == "photos"){
			obj.photos.push(subjectID);
		}
		else if(subject == "reviews"){
			obj.reviews.push(subjectID);
		}
	}
}

// verify business is valid
function verifyValidBusiness(BID){
	let dummyObj = businesses.find((o, idx) => {
					if (o.BID == BID) {
						// stop searching
						return true;
					}
		});
	if(dummyObj){
		return true;
	}
	return false;
}
// Returns true if all of the business's required fields are present
function verifyReqBusiness(req){
	return req.body.name && req.body.streetAddr && req.body.city && 
		   req.body.state && req.body.zip && req.body.phone &&
		   req.body.category && req.body.subcategory;
}
// Returns true if all of the reviews's required fields are present
function verifyReqReviews(req, BID){
	// verify req params are there
	if(req.body.stars && req.body.dollars){
		// verify params are valid
		if(parseInt(req.body.stars) >= 0 && parseInt(req.body.stars) <= 5 &&
			parseInt(req.body.dollars) >= 1 && parseInt(req.body.dollars) <= 4){
				return true;
			}
		}
	return false;
}
// Returns true if all of the photos's required fields are present
function verifyReqPhotos(req, BID){
	// verify req params are there
	if(req.body.photo){
		return true;
	}
	return false;
}
// Returns true if all of the categories's required fields are present
function verifyReqCategories(req){
	// verify req params are there
	if(req.body.name){
		return true;
	}
	return false;
}
function addSubcategories(CID, subcats){
	if(subcats.constructor != Array){
		subcats = [subcats];
	}
	let dum = subcategories.find((o, idx) => {
			if(o.CID == CID){
				subcats.forEach(function(name){
					o.subcategories.push({
						SCID : uniqid(),
						name: name
					});
				});
				return true;
			}
		});
	if(!dum){
		var json = {};
		json.CID = CID;
		json.subcategories = [];
		subcats.forEach(function(name){
			json.subcategories.push({
				SCID : uniqid(),
				name: name
			});
		});
		subcategories.push(json);
	}
}

/**********************************************************************
 * Beginning of Routes
 **********************************************************************/

/************************
 * Businesses Routes
 ************************/
// Create a business
app.post('/businesses', function (req, res, next) {
	console.log("  -- req.query:", req.query);
	if(verifyReqBusiness(req)){
		var BID = uniqid();
		req.body.BID = BID;
		businesses.push(req.body);
		res.status(201).json({
			BID: BID,
			links: {
				business: "/businesses/" + BID
			}
		});
	}
	else{
		res.status(400).json({
			err: {
				reason: "Request Body is missing required fields.",
				required:{
					name: 	"The business's name",
					streetAddr: "The business's street address",
					city: 	"The business's city",
					state: 	"The business's state",
					zip: 	"The business's zip code",
					phone:	"The business's phone number",
					category: "The business's category (e.g. shopping)",
					subcategory: "The business's subcategory (e.g. grocery store)"
				},
				optional:{
					website: "The business's website URL",
					email:	"The business's email address"
				}
			}
		});
	}
});
// Get ALL businesses
app.get('/businesses', function (req, res, next) {
 console.log("  -- req.query:", req.query);

  var page = parseInt(req.query.page) || 1;
  var numPerPage = 10;
  var lastPage = Math.ceil(businesses.length / numPerPage);
  page = page < 1 ? 1 : page;
  page = page > lastPage ? lastPage : page;

  var start = (page - 1) * numPerPage;
  var end = start + numPerPage;
  var pageBusinesses = businesses.slice(start, end);

  var links = {};
  if (page < lastPage) {
    links.nextPage = '/businesses?page=' + (page + 1);
    links.lastPage = '/businesses?page=' + lastPage;
  }
  if (page > 1) {
    links.prevPage = '/businesses?page=' + (page - 1);
    links.firstPage = '/businesses?page=1';
  }

  res.status(200).json({
    businesses: pageBusinesses,
    pageNumber: page,
    totalPages: lastPage,
    pageSize: numPerPage,
    totalCount: businesses.length,
    links: links
  });
});
// Modify a certain business
app.put('/businesses/:BID', function (req, res, next) {
	var reqBID = req.params.BID;
	// if business 
	var foundBusiness = false;
	let bussObj = businesses.find((o, idx) => {
					if (o.BID == reqBID) {
						foundBusiness = true;
						if(verifyReqBusiness(req)){
							req.body.BID = o.BID
							businesses[idx] = req.body;
							// stop searching
							return true; 
						}
						else{
							// conditions not met, return false
							return false; 
						}
					}
				});
	// If bussiness is found and reqs met
	if(bussObj){
		res.status(200).json({
			BID: req.body.BID,
			links: {
				business: "/businesses/" + req.body.BID
			}
		});
	}
	// If bussiness is found but reqs not met	
	else if(!bussObj && foundBusiness){
		res.status(400).json({
			err: {
				reason: "Request Body is missing required fields.",
				required:{
					name: 	"The business's name",
					streetAddr: "The business's street address",
					city: 	"The business's city",
					state: 	"The business's state",
					zip: 	"The business's zip code",
					phone:	"The business's phone number"
				},
				optional:{
					website: "The business's website URL",
					email:	"The business's email address"
				}
			}
		});
	}
	// If bussiness is not found
	else{
		next();
	}
});
// Delete a certain business
app.delete('/businesses/:BID', function (req, res, next) {
	var reqBID = req.params.BID;
	// if business 
	let bussObj = businesses.find((o, idx) => {
					if (o.BID == reqBID) {
						businesses.splice(idx, 1);
						// stop searching
						return true; 
					}
				});
	// If bussiness is found
	if(bussObj){
		res.status(204).send();
	}
	// If bussiness is not found
	else{
		next();
	}
});
// Get a Detailed Business
app.get('/businesses/:BID', function (req, res, next) {
	console.log("  -- req.query:", req.query);

	var reqBID = req.params.BID;
	// if business 
	let bussObj = businesses.find((o, idx) => {
					if (o.BID == reqBID) {
						// stop searching
						return true; 
					}
				});
	if(bussObj){
		// Reviews
		var reviewPage = parseInt(req.query.reviewPage) || 1;
		var reviewJSON = undefined;
		var reviewNumPerPage = 5;
		var pageReviews = "No reviews for BID = " + reqBID;
		var bidReviews = [];
		let dummyObj = reviews.find((o, i) => {
			if (o.BID == reqBID) {
				bidReviews.push(reviews[i]);
			}
		});

		if(bidReviews){
			var reviewLastPage = Math.ceil(bidReviews.length / reviewNumPerPage);
			reviewPage = reviewPage < 1 ? 1 : reviewPage;
			reviewPage = reviewPage > reviewLastPage ? reviewLastPage : reviewPage;

			var reviewStart = (reviewPage - 1) * reviewNumPerPage;
			var reviewEnd = reviewStart + reviewNumPerPage;
			pageReviews = bidReviews.slice(reviewStart, reviewEnd);

			var reviewLinks = {};
			if (reviewPage < reviewLastPage) {
				reviewLinks.nextPage = '/businesses/' + reqBID + '?reviewPage=' + (reviewPage + 1);
				reviewLinks.lastPage =  '/businesses/' + reqBID + '?reviewPage=' + (reviewLastPage);
			}
			if (reviewPage > 1) {
				reviewLinks.prevPage = '/businesses/' + reqBID + '?reviewPage=' + (reviewPage - 1);
				reviewLinks.firstPage = '/businesses/' + reqBID + '?reviewPage=1';
			}
			reviewJSON =  {
				pageReviews: pageReviews,
				pageNumber: reviewPage,
				totalPages: reviewLastPage,
				pageSize: reviewNumPerPage,
				totalCount: bidReviews.length,
				links: reviewLinks
			};
		}

		// Photos
		var photoPage = parseInt(req.query.photoPage) || 1;
		var photoJSON = undefined;
		var photoNumPerPage = 5;
		var pagePhotos = "No photos for BID = " + reqBID;
		var bidPhotos = [];
		let dummyObj2 = photos.find((o, i) => {
			if (o.BID == reqBID) {
				bidPhotos.push(photos[i]);
			}
		});

		if(bidPhotos){
			var photoLastPage = Math.ceil(bidPhotos.length / photoNumPerPage);
			photoPage = photoPage < 1 ? 1 : photoPage;
			photoPage = photoPage > photoLastPage ? photoLastPage : photoPage;

			var photoStart = (photoPage - 1) * photoNumPerPage;
			var photoEnd = photoStart + photoNumPerPage;
			pagePhotos = bidPhotos.slice(photoStart, photoEnd);

			var photoLinks = {};
			if (photoPage < photoLastPage) {
				photoLinks.nextPage = '/businesses/' + reqBID + '?photoPage=' + (photoPage + 1);
				photoLinks.lastPage =  '/businesses/' + reqBID + '?photoPage=' + (photoLastPage);
			}
			if (photoPage > 1) {
				photoLinks.prevPage = '/businesses/' + reqBID + '?photoPage=' + (photoPage - 1);
				photoLinks.firstPage = '/businesses/' + reqBID + '?photoPage=1';
			}
			photoJSON = {
				pagePhotos: pagePhotos,
				pageNumber: photoPage,
				totalPages: photoLastPage,
				pageSize: photoNumPerPage,
				totalCount: bidPhotos.length,
				links: photoLinks
			};
		}
		res.status(200).json({
			business: bussObj,
			reviews: reviewJSON || pageReviews,
			photos: photoJSON || pagePhotos
		});
	}
	else{
		next();
	}
});





/************************
 * Reviews Routes
 ************************/
// Create a review
app.post('/reviews/:BID', function (req, res, next) {
	console.log("  -- req.query:", req.query);
	var reqBID = req.params.BID;

	if(verifyReqReviews(req) && verifyValidBusiness(reqBID)){
		var RID = uniqid();
		req.body.RID = RID;
		req.body.BID = reqBID;
		reviews.push(req.body);
		res.status(201).json({
			RID: RID,
			links: {
				reviews: "/reviews/" + reqBID +'/' + RID
			}
		});
	}
	else{
		res.status(400).json({
			err: {
				reason: "Request Body is missing required fields.",
				required:{
					stars: "The number of stars, 0 to 5",
					dollars: "The number of dollar signs, 1 to 4"
				},
				optional:{
					written: "A written review"
				}
			}
		});
	}
});
// Modify a review
app.put('/reviews/:BID/:RID', function (req, res, next) {
	var reqBID = req.params.BID;
	var reqRID = req.params.RID;
	// if business 
	var foundReview = false;
	let reviewObj = reviews.find((o, idx) => {
					if (o.BID == reqBID && o.RID == reqRID) {
						foundReview = true;
						if(verifyReqReviews(req)){
							req.body.BID = o.BID
							req.body.RID = o.RID
							reviews[idx] = req.body;
							// stop searching
							return true; 
						}
						else{
							// conditions not met, return false
							return false; 
						}
					}
				});
	// If review is found and reqs met
	if(reviewObj){
		res.status(200).json({
			RID: req.body.RID,
			BID: req.body.BID,		
			links: {
				reviews: "/reviews/" + req.body.BID +'/' + req.body.RID
			}
		});
	}
	// If bussiness is found but reqs not met	
	else if(!reviewObj && foundReview){
		res.status(400).json({
			err: {
				reason: "Request Body is missing required fields.",
				required:{
					stars: "The number of stars, 0 to 5",
					dollars: "The number of dollar signs, 1 to 4"
				},
				optional:{
					written: "A written review"
				}
			}
		});
	}
	// If bussiness is not found
	else{
		next();
	}
});
// Delete a review
app.delete('/reviews/:BID/:RID', function (req, res, next) {
	console.log(req.params);
	var reqBID = req.params.BID;
	var reqRID = req.params.RID;
	// if review 
	let reviewObj = reviews.find((o, idx) => {
					if (o.BID == reqBID && o.RID == reqRID) {
						reviews.splice(idx, 1);
						// stop searching
						return true; 
					}
				});
	// If bussiness is found
	if(reviewObj){
		res.status(204).send();
	}
	// If bussiness is not found
	else{
		next();
	}
});
/************************
 * Photos Routes
 ************************/
// Upload a photo
app.post('/photos/:BID', function (req, res, next) {
	console.log("  -- req.query:", req.query);
	var reqBID = req.params.BID;
	if(verifyReqPhotos(req) && verifyValidBusiness(reqBID)){
		var PID = uniqid();
		req.body.BID = reqBID;
		req.body.PID = PID;
		photos.push(req.body);
		res.status(201).json({
			BID: reqBID,
			PID: PID,
			links: {
				photos: "/photos/" + reqBID + '/' + PID
			}
		});
	}
	else{
		res.status(400).json({
			err: {
				reason: "Request Body is missing required fields.",
				required:{
					photo: 	"The URL to the photo"
				},
				optional:{
					caption: "The photo's caption"
				}
			}
		});
	}
});
// Modify a photo
app.put('/photos/:BID/:PID', function (req, res, next) {
	var reqBID = req.params.BID;
	var reqPID = req.params.PID;
	// if business 
	var foundPhoto = false;
	let photoObj = photos.find((o, idx) => {
					if (o.BID == reqBID && o.PID == reqPID) {
						foundPhoto = true;
						if(verifyReqPhotos(req)){
							req.body.BID = o.BID
							req.body.PID = o.PID
							photos[idx] = req.body;
							// stop searching
							return true; 
						}
						else{
							// conditions not met, return false
							return false; 
						}
					}
				});
	// If bussiness is found and reqs met
	if(photoObj){
		res.status(200).json({
			BID: reqBID,
			PID: reqPID,
			links: {
				photos: "/photos/" + reqBID + '/' + reqBID
			}
		});
	}
	// If bussiness is found but reqs not met	
	else if(!photoObj && foundPhoto){
		res.status(400).json({
			err: {
				reason: "Request Body is missing required fields.",
				required:{
					photo: 	"The URL to the photo"
				},
				optional:{
					caption: "The photo's caption"
				}
			}
		});
	}
	// If photo is not found
	else{
		next();
	}
});
// Delete a photo
app.delete('/photos/:BID/:PID', function (req, res, next) {
	console.log(req.params);
	var reqBID = req.params.BID;
	var reqPID = req.params.PID;
	// if photo 
	let photoObj = photos.find((o, idx) => {
					if (o.BID == reqBID && o.PID == reqPID) {
						photos.splice(idx, 1);
						// stop searching
						return true; 
					}
				});
	// If bussiness is found
	if(photoObj){
		res.status(204).send();
	}
	// If bussiness is not found
	else{
		next();
	}
});





/************************
 * Categories Routes
 ************************/
// Get categories
app.get('/categories', function (req, res, next) {
	console.log("  -- req.query:", req.query);
	var page = parseInt(req.query.page) || 1;
	var json = undefined;
	var numPerPage = 10;
	var pages = "No categories";
	var data = [];

	categories.forEach(function(ele){
		data = data.concat(ele.categories);
	});

	var lastPage = Math.ceil(data.length / numPerPage);
	page = page < 1 ? 1 : page;
	page = page > lastPage ? lastPage : page;

	var start = (page - 1) * numPerPage;
	var end = start + numPerPage;
	pages = data.slice(start, end);

	var links = {};
	if (page < lastPage) {
		links.nextPage = '/categories?page=' + (page + 1);
		links.lastPage =  '/categories?page=' + (page);
	}
	if (page > 1) {
		links.prevPage = '/categories?page=' + (page - 1);
		links.firstPage = '/categories?page=1';
	}
	json = {
		categories: pages,
		pageNumber: page,
		totalPages: lastPage,
		pageSize: numPerPage,
		totalCount: data.length,
		links: links
	};
	res.status(200).json(json || pages);
});
// Create a category
app.post('/categories', function (req, res, next) {
	console.log("  -- req.query:", req.query);

	if(verifyReqCategories(req)){
		var CID = uniqid();
		var json = {};
		json.categories = [];
		json.categories.push({CID: CID, name: req.body.name});
		if(req.body.subcategories){
			addSubcategories(CID, req.body.subcategories);
			delete req.body.subcategories;
		}
		categories.push(json);
		res.status(201).json({
			CID: CID,
			links: {
				categories: "/categories/" + CID
			}
		});
	}
	else{
		res.status(400).json({
			err: {
				reason: "Request Body is missing required fields.",
				required:{
					name: 	"The category's name",
				},
				optional:{
					website: "A list of subcategories"
				}
			}
		});
	}
});
// Modify a category
app.put('/categories/:CID', function (req, res, next) {
	var reqCID = req.params.CID;
	var found = false;
	// if category	
	let catObj = categories.find((o, idx) => {
			var curCats = o.categories;
			if(curCats){
				curCats.find((o2, idx2) => {
					if(o2.CID == reqCID){
						found = true;
						if(verifyReqCategories(req)){
							req.body.CID = reqCID;
							if(req.body.subcategories){
								addSubcategories(reqCID, req.body.subcategories);
								delete req.body.subcategories;
							}
							categories[idx].categories[idx2].name = req.body.name;
							return true;
						}
					}
				});
			}
			if(found){
				return true;
			}
	});
			
	// If category is found and reqs met
	if(catObj){
		res.status(200).json({
			CID: reqCID,
			links: {
				business: "/categories/" + reqCID
			}
		});
	}
	// If bussiness is found but reqs not met	
	else if(!catObj && found){
		res.status(400).json({
			err: {
				reason: "Request Body is missing required fields.",
				required:{
					name: 	"The category's name",
				},
				optional:{
					website: "A list of subcategories"
				}
			}
		});
	}
	// If category is not found
	else{
		next();
	}
});
// Delete a category
app.delete('/categories/:CID', function (req, res, next) {
	var reqCID = req.params.CID;
	var found = false;
	// if category	
	let catObj = categories.find((o, idx) => {
			var curCats = o.categories;
			if(curCats){
				curCats.find((o2, idx2) => {
					if(o2.CID == reqCID){
						found = true;
						categories[idx].categories.splice(idx2,1);
						return true;
					}
				});
			}
			if(found){
				return true;
			}
	});
	// If category is found
	if(catObj){
		res.status(204).send();
	}
	// If category is not found
	else{
		next();
	}
});



/************************
 * Subcategories Routes
 ************************/
// Get subcategories
app.get('/categories/:CID/subcategories', function (req, res, next) {
	console.log("  -- req.query:", req.query);
	var reqCID = req.params.CID;

	var page = parseInt(req.query.page) || 1;
	var json = undefined;
	var numPerPage = 10;
	var pages = "No categories";
	var data = [];

	let dummyObj = subcategories.find((o, idx) => {
					if (o.CID == reqCID) {
						data = o.subcategories
						// stop searching
						return true; 
					}
	});
	if(dummyObj){
		var lastPage = Math.ceil(data.length / numPerPage);
		page = page < 1 ? 1 : page;
		page = page > lastPage ? lastPage : page;

		var start = (page - 1) * numPerPage;
		var end = start + numPerPage;
		pages = data.slice(start, end);

		var links = {};
		if (page < lastPage) {
			links.nextPage = '/categories/' + reqCID + '/subcategories?page=' + (page + 1);
			links.lastPage =  '/categories/' + reqCID + '/subcategories?page=' + (page);
		}
		if (page > 1) {
			links.prevPage = '/categories/' + reqCID + '/subcategories?page=' + (page - 1);
			links.firstPage = '/categories/' + reqCID + '/subcategories?page=1';
		}
		json = {
			subcategories: pages,
			pageNumber: page,
			totalPages: lastPage,
			pageSize: numPerPage,
			totalCount: data.length,
			links: links
		};
		res.status(200).json(json || pages);
	}
	else{
		next();
	}
});
// Create a subcategory
app.post('/categories/:CID/subcategories', function (req, res, next) {
	console.log("  -- req.query:", req.query);
	var reqCID = req.params.CID;

	if(verifyReqCategories(req)){
		addSubcategories(reqCID, req.body.name);
		res.status(201).json({
			CID: reqCID,
			links: {
				categories: "/categories/" + reqCID +'/subcategories'
			}
		});
	}
	else{
		res.status(400).json({
			err: {
				reason: "Request Body is missing required fields.",
				required:{
					name: 	"The subcategory's name",
				}
			}
		});
	}
});
// Modify a subcategory
app.put('/categories/:CID/subcategories/:SCID', function (req, res, next) {
	var reqCID = req.params.CID;
	var reqSCID = req.params.SCID;
	var found = false;
	// if category	
	let catObj = subcategories.find((o, idx) => {
			if(o.CID == reqCID){
				var curSubCats = o.subcategories;
				if(curSubCats){
					curSubCats.find((o2, idx2) => {
						if(o2.SCID == reqSCID){
							found = true;
							if(verifyReqCategories(req)){
								console.log("Asd");
								subcategories[idx].subcategories[idx2].name = req.body.name;
								return true;							
							}
							return false;
						}
					});
				}
			}
			if(found){
				return true;
			}
	});
			
	// If category is found and reqs met
	if(catObj && found){
		res.status(200).json({
			CID: reqCID,
			SCID: reqSCID,
			links: {
				business: "/categories/" + reqCID + '/subcategories/' + reqSCID
			}
		});
	}
	// If bussiness is found but reqs not met	
	else if(!catObj && found){
		res.status(400).json({
			err: {
				reason: "Request Body is missing required fields.",
				required:{
					name: 	"The category's name",
				}
			}
		});
	}
	// If category is not found
	else{
		next();
	}
});
// Delete a subcategory
app.delete('/categories/:CID/subcategories/:SCID', function (req, res, next) {
	var reqCID = req.params.CID;
	var reqSCID = req.params.SCID;
	var found = false;
	// if category	
	let catObj = subcategories.find((o, idx) => {
			if(o.CID == reqCID){
				var curSubCats = o.subcategories;
					curSubCats.find((o2, idx2) => {
					if(o2.SCID == reqSCID){
						found = true;
						subcategories[idx].subcategories.splice(idx2,1);
						return true;
					}
				});
			}
			if(found){
				return true;
			}
	});
	// If category is found
	if(catObj){
		res.status(204).send();
	}
	// If category is not found
	else{
		next();
	}
});





/************************
 * Users Routes
 ************************/
// Get user businesses
app.get('/users/:USERID/businesses', function (req, res, next) {
	console.log("  -- req.query:", req.query);
	var userid = req.params.USERID;
	var page = parseInt(req.query.page) || 1;
	var json = undefined;
	var numPerPage = 10;
	var pages = "No photos for user = " + userid;
	var data = [];
	let dummyObj = users.find((o, i) => {
		if (o.USERID == userid) {
			data = o.bussinesses;
			return true;
		}
	});

	if(data){
		var lastPage = Math.ceil(data.length / numPerPage);
		page = page < 1 ? 1 : page;
		page = page > lastPage ? lastPage : page;

		var start = (page - 1) * numPerPage;
		var end = start + numPerPage;
		pages = data.slice(start, end);

		var links = {};
		if (page < lastPage) {
			links.nextPage = '/users/' + userid + 'businesses?page=' + (page + 1);
			links.lastPage =  '/users/' + userid + 'businesses?page=' + (page);
		}
		if (page > 1) {
			links.prevPage = '/users/' + userid + 'businesses?page=' + (page - 1);
			links.firstPage = '/users/' + userid + 'businesses?page=1';
		}
		json = {
			pageBusinesses: pages,
			pageNumber: page,
			totalPages: lastPage,
			pageSize: numPerPage,
			totalCount: data.length,
			links: links
		};
	}
	res.status(200).json(json || pages);
});
// Get user photos
app.get('/users/:USERID/photos', function (req, res, next) {
	console.log("  -- req.query:", req.query);
	var userid = req.params.USERID;
	var page = parseInt(req.query.page) || 1;
	var json = undefined;
	var numPerPage = 10;
	var pages = "No photos for user = " + userid;
	var data = [];
	let dummyObj = users.find((o, i) => {
		if (o.USERID == userid) {
			data = o.photos;
			return true;
		}
	});

	if(data){
		var lastPage = Math.ceil(data.length / numPerPage);
		page = page < 1 ? 1 : page;
		page = page > lastPage ? lastPage : page;

		var start = (page - 1) * numPerPage;
		var end = start + numPerPage;
		pages = data.slice(start, end);

		var links = {};
		if (page < lastPage) {
			links.nextPage = '/users/' + userid + 'photos?page=' + (page + 1);
			links.lastPage =  '/users/' + userid + 'photos?page=' + (page);
		}
		if (page > 1) {
			links.prevPage = '/users/' + userid + 'photos?page=' + (page - 1);
			links.firstPage = '/users/' + userid + 'photos?page=1';
		}
		json = {
			pagePhotos: pages,
			pageNumber: page,
			totalPages: lastPage,
			pageSize: numPerPage,
			totalCount: data.length,
			links: links
		};
	}
	res.status(200).json(json || pages);
});
// Get user reviews
app.get('/users/:USERID/reviews', function (req, res, next) {
	console.log("  -- req.query:", req.query);
	var userid = req.params.USERID;
	var page = parseInt(req.query.page) || 1;
	var json = undefined;
	var numPerPage = 10;
	var pages = "No reviews for user = " + userid;
	var data = [];
	let dummyObj = users.find((o, i) => {
		if (o.USERID == userid) {
			data = o.reviews;
			return true;
		}
	});

	if(data){
		var lastPage = Math.ceil(data.length / numPerPage);
		page = page < 1 ? 1 : page;
		page = page > lastPage ? lastPage : page;

		var start = (page - 1) * numPerPage;
		var end = start + numPerPage;
		pages = data.slice(start, end);

		var links = {};
		if (page < lastPage) {
			links.nextPage = '/users/' + userid + 'reviews?page=' + (page + 1);
			links.lastPage =  '/users/' + userid + 'reviews?page=' + (page);
		}
		if (page > 1) {
			links.prevPage = '/users/' + userid + 'reviews?page=' + (page - 1);
			links.firstPage = '/users/' + userid + 'reviews?page=1';
		}
		json = {
			pageReviews: pages,
			pageNumber: page,
			totalPages: lastPage,
			pageSize: numPerPage,
			totalCount: data.length,
			links: links
		};
	}
	res.status(200).json(json || pages);
});




// Catch any paths that are not a part of our server
app.use('*', function (req, res, next) {
  res.status(404).json({
    err: "Path " + req.url + " does not exist"
  });
});

// Start up server
app.listen(port, function() {
  console.log("== Server is running on port", port);
});