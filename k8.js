




const podName = data.cluster;
const port = 8080;
const child = spawn('kubectl', ['expose', 'pod', podName, '--type=NodePort', `--port=${port}`]);

child.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

child.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

child.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});