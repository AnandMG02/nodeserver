const express = require('express');
const k8s = require('@kubernetes/client-node');
const bodyParser = require('body-parser');
const http = require('http');

// Set up the OpenShift client configuration
const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const cluster = {
  name: 'hackathon2023-mongo-t-mobile',
  server: 'https://c104-e.us-east.containers.cloud.ibm.com:32744',
};

const user = {
  name: 'IAM#anand.mohan.g@ibm.com',
  user: {
    token: 'sha256~049jkbKL_RZ2MjzjHeuXTBNDut7lXS6yVoqQwEZIMWg',
  },
};


const context = {
  name: 'context',
  user: user.name,
  cluster: cluster.name,
};

kc.addCluster(cluster);
kc.addUser(user);
kc.addContext(context);
kc.setCurrentContext(context.name);

// Create the OpenShift client
const coreV1Api = kc.makeApiClient(k8s.CoreV1Api);
const k8sApi = kc.makeApiClient(k8s.CustomObjectsApi);

// Set up the Node.js server
const app = express();
app.use(bodyParser.json());


//CORS

// app.use((req, res, next) => {
//   res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
//   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//   next();
// });

//GET METHOD

app.get('/pods', async (req, res) => {
  try {
    const response = await coreV1Api.listNamespacedPod('hackathon2023-mongo-t-mobile');
    const pods = await Promise.all(response.body.items.map(async (pod) => {

      console.log(pod.metadata);

      if(pod.metadata.name != "nodeserver-ibmdbaas-96f885644-r4jl8"){

        const podName = pod.metadata.name;

      const podIP = await gettingexternalIP(podName, 'hackathon2023-mongo-t-mobile');
      const podPort = pod.spec.containers[0].ports[0].containerPort;
      const mongoUser = pod.spec.containers[0].env[0].value;
      const url = `mongodb://${mongoUser}:${pod.spec.containers[0].env[1].value}@${podIP}:${podPort}/?authSource=admin`;
      const status = pod.status.phase;

      return {
        clustername: podName,
        podip: podIP,
        podport: podPort,
        mongoUser: mongoUser,
        url: url,
        status: status
      };

      }
      

    }));

    // Filter out any undefined values from the map operation
    const filteredPods = pods.filter(pod => pod !== undefined);

    res.json(filteredPods);
  } catch (error) {

    res.status(500).send({
      message: 'Failed to get pods!',
    });
  }
});



//POST METHOD

app.post('/', (req, res) => {

  // Get the data from the request body
  const data = req.body

  const minPort = 27000; // Minimum port number
  const maxPort = 29999; // Maximum port number
  const randomMPort = Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort;

  const minNPort = 30000; // Minimum port number
  const maxNPort = 32767; // Maximum port number
  const randomNPort = Math.floor(Math.random() * (maxNPort - minNPort + 1)) + minNPort;
  const availableMemSizeMB = 1024;
  const wiredTigerCacheSizeGB = Math.min(0.5, availableMemSizeMB / 1024);
  const pvcName = 'mongodb-db';
  const mountPath = '/data/db';

  // Define the pod template
  const pod = {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: {
      name: data.cluster,
      labels: {
        "app": data.cluster,
      },
      securityContext: {
        "allowPrivilegeEscalation": false,
        "capabilities": {
          "drop": [
            "ALL"
          ]
        },
        "runAsNonRoot": true,
        "runAsUser": 1001000000
      },
    },
    spec: {
      volumes: [
        {
          name: 'mongodb-storage',
          persistentVolumeClaim: {
            claimName: pvcName,
          },
        },
      ],
      // Rest of the pod configuration remains unchanged
      containers: [
        {
          name: 'mongo',
          image: 'mongo:latest',
          ports: [
            {
              containerPort: randomMPort,
              name: 'mongodb',
            },
          ],
          command: ['mongod', '--port', randomMPort.toString(), '--wiredTigerCacheSizeGB', wiredTigerCacheSizeGB.toString(), '--oplogSize', "50".toString()],
          env: [
            {
              name: 'MONGO_INITDB_ROOT_USERNAME',
              value: data.user,
            },
            {
              name: 'MONGO_INITDB_ROOT_PASSWORD',
              value: data.pwd,
            },
          ],
          volumeMounts: [
            {
              name: 'mongodb-storage',
              mountPath: mountPath,
            },
          ],
          "resources": {
            "requests": {
              "cpu": "200m",
              "memory": "250Mi"
            },
            "limits": {
              "cpu": "200m",
              "memory": "250Mi"
            }
          }

        },

      ],
    },
  };






  //defining service

  const service = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: data.cluster,
    },
    labels: {
      "app": data.cluster,
    },
    spec: {
      selector: {
        app: data.cluster,
      },
      ports: [
        {
          name: 'mongodb',
          protocol: 'TCP',
          port: randomMPort,
          targetPort: randomMPort,
          nodePort: randomNPort
        },
      ],
      type: 'LoadBalancer',
    },
  };



  coreV1Api.createNamespacedService('hackathon2023-mongo-t-mobile', service)
    .then((response) => {
      console.log("Service Created");
    })
    .catch((error) => {
      console.error(error);
    });



  //Defining Route





  const routeConfig = {
    apiVersion: 'route.openshift.io/v1',
    kind: 'Route',
    metadata: {
      name: data.cluster,
      namespace: "hackathon2023-mongo-t-mobile",
    },
    labels: {
      "app": data.cluster,
    },
    spec: {
      to: {
        kind: 'Service',
        name: data.cluster,
      },
      port: {
        targetPort: randomMPort,
      },
      // Add other route configuration options here
    },
  };


  k8sApi.createNamespacedCustomObject(
    'route.openshift.io',
    'v1',
    'hackathon2023-mongo-t-mobile',
    'routes',
    routeConfig
  )
    .then((response) => {
      console.log('Route created successfully');
    })
    .catch((error) => {
      console.error('Error creating route:', error);
    });



  // Create the pod
  coreV1Api.createNamespacedPod('hackathon2023-mongo-t-mobile', pod)
    .then((response) => {
      const username = kc.getCurrentUser();
      console.log('Current user:', username.name);
      res.status(200).send({
        message: 'Pod created successfully!',
      });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send({
        message: 'Failed to create pod!',
      });
    });
});

//DELETE METHOD

app.delete("/pods/:name", async (req, res) => {
  const podName = req.params.name;
  const serviceName = req.params.name;
  const routeName = req.params.name;
  try {
    await coreV1Api.deleteNamespacedPod(podName, "hackathon2023-mongo-t-mobile");
    console.log(`Pod ${podName} deleting...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log(`Pod ${podName} deleted successfully.`);

    await coreV1Api.deleteNamespacedService(serviceName, "hackathon2023-mongo-t-mobile");
    console.log(`Service ${serviceName} deleting...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log(`Service ${serviceName} deleted successfully.`);

    await k8sApi.deleteNamespacedCustomObject(routeName, "hackathon2023-mongo-t-mobile");
    console.log(`Route ${routeName} deleting...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log(`Route ${serviceName} deleted successfully.`);

    res.status(200).send({
      message: `Pod ${podName} deleted successfully!`,
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      message: `Failed to delete pod ${podName}!`,
    });
  }
});





app.listen(3000, () => {
  console.log('Server running on port 3000');
});


//function

async function gettingexternalIP(podName, namespace) {
  try {
    const response = await coreV1Api.readNamespacedService(podName, namespace);
    console.log(podName);
    console.log(response.body);
    const externalIP = response.body.status.loadBalancer.ingress[0].ip;
    return externalIP;
  } catch (error) {
    console.error(error);
    return ''; // Return an empty string or handle the error as needed
  }
}
