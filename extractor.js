let fs = require( 'fs');
let R = require('ramda');
let nexcel = require("node-xlsx");
let results = {};
let allValues = {};
const objFromKeys = R.curry((fn, keys) =>
  R.zipObj(keys, R.map(fn, keys)));
const walk  = function(chap, dir, done){
    if(R.isNil(results[chap])) results[chap] = {};
    fs.readdir(dir, function(err, list){
        if(err) return done(err);
        //console.log(JSON.stringify(list, null, 2));
        var i = 0;
         (function next() {
           var file = list[i++];
           if (!file){
             return done(null, results[chap]);
            }
           file = dir + '/' + file;
           fs.stat(file, function(err, stat) {
             if (stat && stat.isDirectory()) {
               walk(chap, file, function(err, res) {
    //             console.log(res);
              //   results = results.concat(res);
                 next();
               });
             } else {
               //console.log(file);
               if(file.indexOf(".json") > 0){
                 let fileDetail = fs.readFileSync(file, 'utf8')
                 let fileJsonObj = JSON.parse(fileDetail);
                 console.log(file)
                 try {
                   results[chap][file] = R.prop("events", fileJsonObj);
                 }catch(e){
                   console.error(e);
                 }
      //           console.log(results);
                 //console.log(results[file]);

               }
               //results.push(file);
               next();
             }
           });
         })();

    })
};
const inserAllValues = function(chap, result){
  allValues[chap] = allValues[chap]||[];
  for(let key in result){
    let val = result[key];
    if(R.is(Object, val)){
      inserAllValues(chap, val);
    }else if(R.is(String, val)){
      const tester = /[一-龠]+|[ぁ-ゔ]+|[ァ-ヴー]+|[々〆〤]+/u;
      if(R.test(tester, val)){

        let str = R.compose(R.trim,
                            R.replace(/c[0-9|l]/g,""),
                            R.replace(/c10/g,""),
                            R.replace(/[CL|L3A1|41|41\s103\s1\sON|L5A1|L1A2]/g,""),
                            R.replace(/[i\d\d\d|i\d\d]/g,""), R.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,''))(val);

        allValues[chap].push(str);
      }
    }else if(R.is(Array, val)){
      inserAllValues(chap, val);
    }else{

    }
  }
}
let totalError = 0;
R.map((chap)=>{
  walk (chap, __dirname+"/"+chap, function(err, result){
    if(err) console.error(err);
    inserAllValues(chap, result);
    const uniqValues = R.uniq(allValues[chap]);

    let countObj = objFromKeys(key => [0, R.length(R.trim(key)),R.length(R.trim(key))], uniqValues)
    //console.log(countObj);

    R.map(str =>{
      try{
        countObj[str][0]++;
        countObj[str][2] = countObj[str][1] * countObj[str][0];
      }catch(e){
        totalError++;
        console.log("Str : "+str);
      }
    }, allValues[chap]);

    let newArrays = R.map(key=>{ return [key].concat(countObj[key])}, R.keys(countObj));
    let newArrStr = R.reduce((acc, arr)=>acc+arr.toString()+",\n","",newArrays)
    console.log(chap+":"+R.reduce((acc, val)=>{
        return acc + R.length(val);
    }, 0, uniqValues));
    var buffer = nexcel.build([{name: chap, data: [["원문","출현수","문장길이","출현수*문장길이"]].concat(newArrays)}]); // Returns a buffer
    fs.writeFileSync(__dirname + "/"+chap+"_Info.xlsx", buffer, 'utf8')
    ///console.log(chap + " leng : "+R.length(allValues[chap]))
  });

},["noel_s1","noel_s2"]);

//,"noel_s3","noel_s4","noel_s5","noel_s6",
/*
  c0 ~ c10;는 제외
  문장은 항상 trim
  데이터는 문장 | 출현수 | 문장길이 | 출현수 * 문장길이
*/
