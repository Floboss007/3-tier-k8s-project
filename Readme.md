This project uses kind to create a cluster on docker desktop.

`` kind create cluster --name=<any-name> ``

confirm the cluster exists with :

`` kind get clusters ``

Create a namespace in your cluster. 

``kubectl create namespace flo-3tier-stack``

Set kubectl to the created namespace

``kubectl config set-context --current --namespace=flo-3tier-stack``


The Database tier uses 5 objects, all created using manifests in the /db directory. The DB pod uses a readinessProbe to hold traffic till it's ready and a livenessProbe to ensure the container restarts if not healthy:

- Configmap to hold the init.spl
- Secret to hold the env variables
- PersistentVolumeClaim to give the database a persistent volume
- The database pod is deployed using Deployment
- A clusterIp service to give the db pod a consistent address in the cluster.

The API tier: use this command to copy the artifacts from the api dir to a configmap manifest that will then be mounted as volume:

`` kubectl create configmap node-app-files --from-file=./api/package.json --from-file=./api/server.js --dry-run=client -o yaml > ./api/node-configmap.yaml``

note: if using this code to create the manifest, ensure the source codes or configurations are in the lf format and not CRLF

The source codes are then copied from  their mount point to the working dir /app (an emptydir) through initcontainer. where npm will be installed and node_modules will be downloaded in . The main container will then run ``node server.js``

The web tier: loads the frontend source code and the default.conf though configmap and is then copied to their respective location in the pod container. the default.conf file reverse proxies to the "api-tier" service.

To deploy, apply all the .yaml files in /db /api and /web in that order. apply using :
``kubectl apply -f <pathto-.yamlfile>``

to test the project, use port-forward to access the deployment on local browser using:
``kubectl port-forward svc/web-tier 8080:80``

Ingress and Gateway-api are substitute for the port-forward way of managing external traffic but are complex and redundant to implement on a KinD cluster. 