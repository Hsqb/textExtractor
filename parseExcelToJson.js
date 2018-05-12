let fs = require( 'fs');
let R = require('ramda');
let nexcel = require("node-xlsx");
const worksheet  = nexcel.parse(__dirname+'/'+process.argv[2]+".xlsx");
console.log(JSON.stringify(worksheet[0], null, 2));
