
read -p "Are you sure (y/n)?" choice
case "$choice" in
  y|Y )
    echo "yes";
    docker container stop yelp-api;
    docker container stop db_mysql;

    docker rm yelp-api;
    docker rm db_mysql;

    yes | docker volume prune;;

  n|N ) echo "no";;
  * ) echo "invalid";;
esac
