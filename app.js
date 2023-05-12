const express = require('express');
const k8s = require('@kubernetes/client-node');
const bodyParser = require('body-parser');

// Set up the OpenShift client configuration
const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const cluster = {
  name: 'cluster',
  server: 'https://c104-e.us-east.containers.cloud.ibm.com:32744',
};

const user = {
  name: 'token',
  user: {
    token: 'sha256~phUrT4h6xW_nROUHpDOdzHluUg1kwAH_MSdj4ituRKs',
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

// Set up the Node.js server
const app = express();
app.use(bodyParser.json());

app.get('/pods', (req, res) => {
  coreV1Api.listNamespacedPod('hackathon2023-mongo-t-mobile')
    .then((response) => {
      const pods = response.body.items.map((pod) => ({
        clustername: pod.metadata.name,
        podip: pod.status.podIP,
        podport: pod.spec.containers[0].ports[0].containerPort,
        mongoUser: pod.spec.containers[0].env[0].value,
        url: 'mongodb://' + pod.spec.containers[0].env[0].value + ':' + pod.spec.containers[0].env[1].value + '@' + pod.status.podIP + ':' + pod.spec.containers.ports + '/?authSource=admin',
        status: pod.status.phase
      }));
      res.json(pods);
   
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send({
        message: 'Failed to get pods!',
      });
    });
});

app.post('/', (req, res) => {
  // Get the data from the request body
  const data = req.body

  const minPort = 27000; // Minimum port number
  const maxPort = 29999; // Maximum port number
   const randomMPort =Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort;

   const minNPort = 30000; // Minimum port number
   const maxNPort = 32767; // Maximum port number
   const randomNPort = Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort;

  // Define the pod template
  const pod = {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: {
      name: data.cluster,
    },
    spec: {
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
          command: ['mongod', '--auth', '--port', randomMPort.toString()],
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
          resources: {
            limits: null,
            requests: null
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
    spec: {
      selector: {
        app: data.cluster,
      },
      ports: [
        {
          name: 'mongodb',
          port: randomMPort,
          targetPort: 'mongodb',
        },
      ],
    },
  };

  coreV1Api.createNamespacedService('hackathon2023-mongo-t-mobile', service)
  .then((response) => {
    console.log(response.body);
  })
  .catch((error) => {
    console.error(error);
  });

  // Create the pod
  coreV1Api.createNamespacedPod('hackathon2023-mongo-t-mobile', pod)
    .then((response) => {
      console.log(response.body);

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


app.delete("/pods/:name", async (req, res) => {
  const podName = req.params.name;

  try {
    await coreV1Api.deleteNamespacedPod(podName, "hackathon2023-mongo-t-mobile");
    console.log(`Pod ${podName} deleted successfully.`);

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
