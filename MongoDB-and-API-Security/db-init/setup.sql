FLUSH PRIVILEGES;

CREATE TABLE businesses (
	id MEDIUMINT NOT NULL AUTO_INCREMENT,
  ownerID VARCHAR (255) NOT NULL,
	name VARCHAR (255) NOT NULL,
	address VARCHAR (255) NOT NULL,
	city VARCHAR (255) NOT NULL,
	state CHAR (2) NOT NULL,
	zip CHAR (5) NOT NULL,
  phone VARCHAR (16) NOT NULL,
	category VARCHAR (255) NOT NULL,
  subcategory VARCHAR (255) NOT NULL,
	website VARCHAR (255),
	email VARCHAR (255),

	PRIMARY KEY (id),
	INDEX idx_ownerid (ownerID),
	UNIQUE(id)
);

CREATE TABLE reviews (
	id MEDIUMINT NOT NULL AUTO_INCREMENT,
  userID VARCHAR (255) NOT NULL,
  businessID MEDIUMINT NOT NULL,
	dollars CHAR (1) NOT NULL,
	stars CHAR (1) NOT NULL,
	review TEXT,

	PRIMARY KEY (id),
	INDEX idx_ownerid (businessID),
	CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`businessID`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
	UNIQUE(id)
);


CREATE TABLE photos (
	id MEDIUMINT NOT NULL AUTO_INCREMENT,
  userID VARCHAR (255) NOT NULL,
  businessID MEDIUMINT NOT NULL,
	caption TEXT,
	data BLOB NOT NULL,

	PRIMARY KEY (id),
	INDEX idx_ownerid (businessID),
	CONSTRAINT `photos_ibfk_1` FOREIGN KEY (`businessID`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
	UNIQUE(id)
);
