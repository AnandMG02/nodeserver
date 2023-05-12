app.get('/create-pod', async (req, res) => {
    try {
      const podConfig = {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
          name: 'my-pod',
        },
        spec: {
          containers: [
            {
              name: 'mongod',
              image: 'mongo',
              resources: {
                limits: {
                  memory: '2Gi',
                  cpu: '2',
                  storage: '10Gi',
                },
              },
            },
          ],
        },
      };
  
      const result = await client.api.v1.namespaces('default').pods.post({ body: podConfig });
      res.send(result);
    } catch (error) {
      console.error(error);
      res.status(500).send(error.message);
    }
  });
  
  
  
  