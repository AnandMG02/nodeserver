
const express = require('express');

const app = express();




app.use( '/second', (req,res,next)=>{
    console.log("Second");
    res.send({"name":"anand"});
})

app.use('/',(req,res,next)=>{
    console.log("First");
    res.send('<h1>First Page</h1>');
    next();
})


app.listen(3000);



