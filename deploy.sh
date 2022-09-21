#!/bin/bash

echo What should the version be deployed?
read VERSION 

docker build --platform linux/amd64 -t lyslim/kewl-server:$VERSION .
docker push lyslim/kewl-server:$VERSION
ssh root@167.99.226.95 "docker pull lyslim/kewl-server:$VERSION && docker tag lyslim/kewl-server:$VERSION dokku/api:$VERSION && dokku tags:deploy api $VERSION"