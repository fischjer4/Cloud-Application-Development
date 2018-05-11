# Assignment 2

The goals of this assignment are to start to use a MySQL database to store application data and to start using Docker to power our application.  There are a few parts to this assignment, as described below.

## 1. Containerize the API server using Docker

Your first task for this assignment is to write a Dockerfile that packages the API server in this repo (or your own server from assignment 1) into a Docker image along with all of the server's runtime dependencies.  Containers launched from this image should automatically start the server listening on a specified port, and you should be able to successfully make requests to the containerized server from the outside world (e.g. from your host machine).

## 2. Use a MySQL database to power part of your API

Next modify the API server to use a MySQL database to store the following resources:
  * Businesses
  * Reviews
  * Photos

The MySQL database should completely replace the existing JSON/in-memory storage for these resources.  In other words, all API endpoints associated with these resources should use the MySQL database.

You should use the [official MySQL Docker image](https://hub.docker.com/_/mysql/) on Docker Hub to power your MySQL database.  Your MySQL setup should meet the following requirements:

  * You should write a script (e.g. a `.sql` file) to initialize your MySQL database the first time you launch your container.  See the [MySQL Docker Image Docs](https://docs.docker.com/samples/library/mysql/#initializing-a-fresh-instance) for a description of how this works.  Your database initialization should at a minimum create your database and all of the tables you'll need.  If you like, you can also put some initial data into your database.

  * Your database data should be persisted in a Docker volume.  Note that by default, MySQL stores data in the directory `/var/lib/mysql`.  To persist data, it should be sufficient to create a Docker volume and mount it at this location.

  * Your API server should read the location (i.e. hostname, port, and database name) and credentials (i.e. username and password) of the MySQL server from environment variables.

Using this setup, you should be able to launch an API server container and a MySQL container on the same Docker network and  specify the correct environment variables to have your API server use the MySQL database in the MySQL container.

## 3. Use Docker Compose to specify your two-container application

Finally, write a Docker Compose specification in `docker-compose.yml` that defines your two-container (API server and MySQL) application.  Your specification should define everything needed to run the application, e.g. a Docker network, a Docker volume, etc.  Launch and run your application using Docker Compose.
