const request = require('supertest');
const { expect } = require('chai');
const app = require('./app');
const { CoreV1Api,CustomObjectsApi  } = require('@kubernetes/client-node');

describe('Pods API', () => {
  it('should get a list of pods', async () => {
    await request(app)
      .get('/pods')
      .expect(200);
  });

  it('should create a new pod', async () => {
    const requestBody = {
      cluster: 'my-pod',
      user: 'admin',
      pwd: 'password',
    };

    const res = await request(app)
      .post('/')
      .send(requestBody)
      .expect(200);

    expect(res.body.message).to.equal('Pod created successfully!');
  
  });

 

  it('should delete a pod', async () => {
    const podName = 'my-pod';
    const serviceName = 'my-service';
    const routeName = 'my-route';
    const namespace = 'hackathon2023-mongo-t-mobile';
  
    // Mock the CoreV1Api object
    const coreV1Api = new CoreV1Api();
  
    // Mock the deleteNamespacedPod function
    jest.spyOn(coreV1Api, 'deleteNamespacedPod').mockImplementation((name, ns) => {
      expect(name).toBe(podName);
      expect(ns).toBe(namespace); // Verify the namespace value
      return Promise.resolve();
    });
  
    // Mock the deleteNamespacedService function
    jest.spyOn(coreV1Api, 'deleteNamespacedService').mockImplementation((name, ns) => {
      expect(name).toBe(serviceName);
      expect(ns).toBe(namespace); // Verify the namespace value
      return Promise.resolve();
    });

    const customObjectsApi = new CustomObjectsApi();
  
    // Mock the deleteNamespacedCustomObject function
    jest.spyOn(customObjectsApi, 'deleteNamespacedCustomObject').mockImplementation((group, version, ns, plural, name) => {
      expect(group).toBe('route.openshift.io');
      expect(version).toBe('v1');
      expect(ns).toBe(namespace); // Verify the namespace value
      expect(plural).toBe('routes');
      expect(name).toBe(routeName);
      return Promise.resolve();
    });
  
    // Make the delete request
    await request(app)
      .delete(`/pods/${podName}`)
      .expect(200, {
        message: `Pod ${podName} deleted successfully!`,
      });
  });
  
  
 
  



});
