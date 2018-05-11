var mysql = require('mysql');

const mysqlHost = process.env.MYSQL_HOST || '127.0.0.1';
/* Convention to have MySQL be on port 3306 */
const mysqlPort = process.env.DB_PORT || '3306';
const mysqlDB = process.env.MYSQL_DATABASE || 'yelpapi';
const mysqlUser = process.env.DB_USER;
const mysqlPassword = process.env.DB_PASSWORD;


/* Create a pool of connections */
const maxMySQLConnections = 10;
const mysqlPool = mysql.createPool({
  connectionLimit: maxMySQLConnections,
  host: mysqlHost,
  port: mysqlPort,
  database: mysqlDB,
  user: mysqlUser,
  password: mysqlPassword
});



/* Used to call local functions within the module.exports below */
module.exports = {
	/******************************************************
	*				Business Queries
	*******************************************************/
	/*
		* Get the number of businesses in the DB
	*/
	getBusinessesCount: function () {
		return new Promise((resolve, reject) => {
			mysqlPool.query(
				'SELECT COUNT(*) AS count FROM businesses',
				function (err, results) {
					if (err) {
						reject(err);
					}
					else {
						resolve(results[0].count);
					}
				}
			);
		});
	},
	/*
		* Get a page businesses given the page number
		and how many records there are in the DB
	*/
	getBusinessesPage: function(page, count) {
		return new Promise((resolve, reject) => {
			const numPerPage = 10;
			const lastPage = Math.ceil(count / numPerPage);
			page = page < 1 ? 1 : page;
			page = page > lastPage ? lastPage : page;
			const offset = (page - 1) * numPerPage;
			mysqlPool.query(
				'SELECT * FROM businesses ORDER BY id LIMIT ?,?',
				[ offset, numPerPage ],
				function (err, results) {
					if (err) {
						reject(err);
					}
					else {
						resolve({
							businesses: results,
							pageNumber: page,
							totalPages: lastPage,
							pageSize: numPerPage,
							totalCount: count
						});
					}
				}
			);
		});
	},
	postBusiness: function(businessInfo) {
		return new Promise((resolve, reject) => {
			const businessValues = {
				id: null,
				ownerID: businessInfo.ownerID,
				name:  businessInfo.name,
				address:  businessInfo.address,
				city:  businessInfo.city,
				state:  businessInfo.state,
				zip:  businessInfo.zip,
				phone:  businessInfo.phone,
				category:  businessInfo.category,
				subcategory:  businessInfo.subcategory,
				website:  businessInfo.website,
				email:  businessInfo.email
			};
			mysqlPool.query(
				'INSERT INTO businesses SET ?',
				[ businessValues ],
				function (err, result) {
					if (err) {
						reject(err);
					}
					else {
						resolve(result.insertId);
					}
				}
			);
		});
	},
	putBusiness: function(businessInfo, businessID) {
		return new Promise((resolve, reject) => {
			const businessValues = {
				id: businessID,
				ownerID: businessInfo.ownerID,
				name:  businessInfo.name,
				address:  businessInfo.address,
				city:  businessInfo.city,
				state:  businessInfo.state,
				zip:  businessInfo.zip,
				phone:  businessInfo.phone,
				category:  businessInfo.category,
				subcategory:  businessInfo.subcategory,
				website:  businessInfo.website,
				email:  businessInfo.email
			};
			mysqlPool.query(
				'UPDATE businesses SET ? WHERE id = ?',
				[ businessValues, businessID ],
				function (err, result) {
					if (err) {
						reject(err);
					}
					else {
						resolve(result.affectedRows > 0);
					}
				}
			);
		});
	},
  deleteBusiness: function(businessID){
    return new Promise((resolve, reject) => {
      mysqlPool.query(
				'DELETE FROM businesses WHERE id = ?',
				[ businessID ],
				function (err, result) {
					if (err) {
						reject(err);
					}
					else {
						resolve(result.affectedRows > 0);
					}
				}
			);
    });
  },
	getSpecificBusinessDetails: function(businessID){
		return new Promise((resolve, reject) => {
			mysqlPool.query(
				'SELECT * FROM businesses WHERE id = ?',
				[ businessID ],
				function (err, result) {
					if (err) {
						reject(err);
					}
					else {
						resolve(result[0]);
					}
				}
			);
		});
	},
  /******************************************************
  *				Photos Queries
  *******************************************************/
  getPhotosByBusinessID: function(businessID){
    return new Promise((resolve, reject) => {
      mysqlPool.query(
        'SELECT * FROM photos WHERE businessID = ?',
        businessID,
        function(err, result){
          if(err){
            reject(err);
          }
          else{
            resolve(result);
          }
        }
      );

    });
  },
  postPhoto: function(photoInfo){
    return new Promise((resolve, reject) => {
			const photoValues = {
				id: null,
				userID: photoInfo.userID,
				businessID:  photoInfo.businessID,
				caption:  photoInfo.caption,
				data:  photoInfo.data
			};
			mysqlPool.query(
				'INSERT INTO photos SET ?',
				[ photoValues ],
				function (err, result) {
					if (err) {
						reject(err);
					}
					else {
						resolve(result.insertId);
					}
				}
			);
		});
  },
  getPhoto: function(photoID){
    return new Promise((resolve, reject) => {
      mysqlPool.query(
        'SELECT * FROM photos WHERE id = ?',
        [ photoID ],
        function(err, result){
          if(err){
            reject(err);
          }
          else{
            resolve(result[0]);
          }
        }
      )
    });
  },
  putPhoto: function(updatedPhoto, photoID){
    return new Promise((resolve, reject) => {
      const photoValues = {
				id: photoID,
				userID: updatedPhoto.userID,
				businessID:  updatedPhoto.businessID,
				caption:  updatedPhoto.caption,
				data:  updatedPhoto.data
			};

      /*
       * Make sure the updated photo has the same businessID and userID as
       * the existing photo.
       * 1. get the old Photos
       * 2. verify the BID and UID match
       */
       this.getPhoto(photoID)
        .then((oldPhoto) => {
          if(oldPhoto){
            /* Valid photoID, now check conditions */
            if(oldPhoto.businessID != photoValues.businessID || oldPhoto.userID != photoValues.userID){
              /* BID and UID DONT match, don't update new photo */
              reject({code: 403, err: "The new photo's businessID and userID must match the old photo's"})
            }
            else{
              /* BID and UID match, okay to update new photo */
              mysqlPool.query(
                'UPDATE photos SET ? WHERE id = ?',
                [ photoValues, photoID ],
                function(err, result){
                  if(err){
                    reject({code: 500, err: `Unable to update the photo with ID: ${photoID} into the database`});
                  }
                  else{
                    resolve(result.affectedRows > 0);
                  }
                }
              )
            }
          }
          else{
            /* No matching photoID, return and let called handle the 404 */
            resolve(null)
          }
        })
        /* Error from the getPhoto call */
        .catch((err) => {
          reject({code: 500, err: `Unable to update the photo with ID: ${photoID} into the database`});
        });
    });
  },
  deletePhoto: function(photoID){
    return new Promise((resolve, reject) => {
      mysqlPool.query(
				'DELETE FROM photos WHERE id = ?',
				[ photoID ],
				function (err, result) {
					if (err) {
						reject(err);
					}
					else {
						resolve(result.affectedRows > 0);
					}
				}
			);
    });
  },
	/******************************************************
	*				Reviews Queries
	*******************************************************/
	getReviewsByBusinessID: function(businessID){
		return new Promise((resolve, reject) => {
			mysqlPool.query(
				'SELECT * FROM reviews WHERE businessID = ?',
				[ businessID ],
				function(err, result){
					if(err){
						reject(err);
					}
					else{
						resolve(result);
					}
				}
			);

		});
	},
  postReview: function(reviewInfo){
    return new Promise((resolve, reject) => {
      const reviewValues = {
        id: null,
        userID: reviewInfo.userID,
        businessID:  reviewInfo.businessID,
        dollars:  reviewInfo.dollars,
        stars:  reviewInfo.stars,
        review: reviewInfo.review
      };
      /*
       * Make sure the user is not trying to review the same business twice.
       * 1. See if there is already a reivew by this user for this business
       * 2. If no, then insert it
       * 3. If yes, return 403
       */
      mysqlPool.query(
        'SELECT * FROM reviews WHERE businessID = ? AND userID = ?',
        [ reviewValues.businessID, reviewValues.userID ],
        function (err, result) {
          if (err) {
            reject({code: 500, err: "Couldn't insert review into the database"});
          }
          else {
            if(result.length == 0){
              /* User hasn't entered a review for this business yet */
              mysqlPool.query(
                'INSERT INTO reviews SET ?',
                [ reviewValues ],
                function(err, result){
                  if(err){
                    console.log(err)

                    reject({code: 500, err: "Couldn't insert review into the database"});
                  }
                  else{
                    resolve(result.insertId);
                  }
                });
            }
            else{
              /* User has already entered a review for this business */
              reject({code: 403, err: "User has already posted a review of this business"});
            }
          }
        }
      );
    });
  },
  getReview: function(reviewID){
    return new Promise((resolve, reject) => {

      mysqlPool.query(
        'SELECT * FROM reviews WHERE id = ?',
        [ reviewID ],
        function(err, result){
          if(err){
            reject(err);
          }
          else{
            resolve(result[0]);
          }
        }
      )
    });
  },
  putReview: function(updatedReview, reviewID){
    return new Promise((resolve, reject) => {
      const reviewValues = {
        id: reviewID,
        userID: updatedReview.userID,
        businessID:  updatedReview.businessID,
        dollars:  updatedReview.dollars,
        stars:  updatedReview.stars,
        review: updatedReview.review
			};
      /*
       * Make sure the updated review has the same businessID and userID as
       * the existing review.
       * 1. get the old review
       * 2. verify the BID and UID match
       */
       this.getReview(reviewID)
        .then((oldReview) => {
          if(oldReview){
            /* Valid reviewID, now check conditions */
            if(oldReview.businessID != reviewValues.businessID || oldReview.userID != reviewValues.userID){
              /* BID and UID DONT match, don't update new review */
              reject({code: 403, err: "The new review's businessID and userID must match the old review's"})
            }
            else{
              /* BID and UID match, okay to update new review */
              mysqlPool.query(
                'UPDATE reviews SET ? WHERE id = ?',
                [ reviewValues, reviewID ],
                function(err, result){
                  if(err){
                    reject({code: 500, err: `Unable to update the review with ID: ${reviewID} into the database`});
                  }
                  else{
                    resolve(result.affectedRows > 0);
                  }
                }
              )
            }
          }
          else{
            /* No matching reviewID, return and let called handle the 404 */
            resolve(null)
          }
        })
        /* Error from the getReview call */
        .catch((err) => {
          reject({code: 500, err: `Unable to update the review with ID: ${reviewID} into the database`});
        });
    });
  },
  deleteReview: function(reviewID){
    return new Promise((resolve, reject) => {
      mysqlPool.query(
				'DELETE FROM reviews WHERE id = ?',
				[ reviewID ],
				function (err, result) {
					if (err) {
						reject(err);
					}
					else {
						resolve(result.affectedRows > 0);
					}
				}
			);
    });
  }



};
