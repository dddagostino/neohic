//USAGE: node nuchart2neo4j.js edges_xxx.csv experimentname

var fs = require('fs');
var readline = require('readline');

var filename = process.argv[2];
var experiment = process.argv[3];

if (experiment.match(/^\d/)) {
   experiment = "E"+experiment;
   console.log("\n*******************************************");
   console.log("Experiment names cannot start with a number\nI'll ad 'E', so it becomes "+experiment);
   console.log("*******************************************\n");
}


var prefixfile = experiment; //filename.split(".")[0];
var nodestream = fs.createWriteStream(prefixfile+"_nodes.csv");
var edgestream = fs.createWriteStream(prefixfile+"_edges.csv");
var experimentstream = fs.createWriteStream(prefixfile+".csv");

var rl = readline.createInterface({
  input: fs.createReadStream(filename)
});

var row;
var closebracket;
var idnum=0;
var nulledge=0;
var edgenum=0;
var mycurrentobject;

var mynodelist = new Object();
var myedgelist = new Object();
//var proteinnames = new Object();

var data, datum, edg;
var first, last;
var cypherquery ="";
var rootgene ="";


function findObjectByKeys(arrname, key1, key2, value1, value2) {
    //let ee = Object.keys(arrname);
    for (var i = 0; i < arrname.length; i++) {
        if ( (arrname[i][key1] === value1) && (arrname[i][key2] === value2) ){
            return 1;
        }
    }
    return 0;
}


rl.on('line', function (line) {
  data = line.trim().split("\t");
  edg = data[0].trim().split("--")

  if (line.search("--") != -1) { //EDGE
      //if(edg[0] != edg[1]) {
      //if(edg[0] != edg[1]) nulledge++;
      var myedge = new Object();

      if(edg[0] < edg[1]) {
        myedge.from = edg[0];
        myedge.to = edg[1];
      } else {
        myedge.from = edg[1];
        myedge.to = edg[0];
      }
      myedge.weight = data[1];
      myedge.prob = data[2];
      myedge.ct = data[3];

      if (myedgelist[myedge.from]) {


        if(!findObjectByKeys(myedgelist[myedge.from],"from","to",myedge.from,myedge.to)) {
          if (mynodelist.hasOwnProperty(myedge.from)) mynodelist[myedge.from]++;
          else mynodelist[myedge.from] = 1;

          if (mynodelist.hasOwnProperty(myedge.to)) mynodelist[myedge.to]++;
          else mynodelist[myedge.to] = 1;

          myedgelist[myedge.from].push(myedge);
          edgenum++;
        } else {
          nulledge++
        }
      } else {
        myedgelist[myedge.from] = [];
        myedgelist[myedge.from].push(myedge);
        edgenum++;
      }



      //} else {
        //console.log("**",edg[0]);
        //nulledge++;
      //}
  } else if (line.search("#Root") != -1) {
    data = line.trim().split(" ");
    rootgene = data[2];
    rootgene = rootgene.replace(/:/g, '_').replace(/,/g, '_').replace(/\t/g, '');
    //console.log("***",rootgene);
  }

});


rl.on('close', function (line) {

  //let ne = Object.keys(mynodelist);
  //Increasing order
  let ne = Object.keys(mynodelist).sort(function(a,b){return mynodelist[b]-mynodelist[a]})

  ///////////////////////// EXPERIMENT /////////////////////////
  experimentstream.write("name,label,nodenum,edgenum,rootgene\n");
  var createcommand = experiment+",experiment,"+ne.length+","+edgenum+","+rootgene.toString().replace(/\:\,/g, '_');
  experimentstream.write(createcommand+"\n");
  experimentstream.close();

  //Commands to be issued within the cypher-sell
  console.log("cp "+prefixfile+"*.csv <neo4j_install_dir>/import\n");
  console.log("LOAD CSV WITH HEADERS FROM \"file:///"+prefixfile+".csv\" AS line");
  console.log("MERGE (n:experiment {label: line.name, nodes: toInteger(line.nodenum), relations: toInteger(line.edgenum), rootgene: line.rootgene});\n");
  //console.log("RETURN n;\n");

  ///////////////////////// GENES /////////////////////////
  nodestream.write("name\n");

  for (var j=0;j<ne.length;j++) {
    //console.log(ne[j]);
    createcommand = ne[j].toString().replace(/\"/g, '');
    nodestream.write(createcommand+"\n");
    //console.log(ne[j],mynodelist[ne[j]]);
  }

  nodestream.close();

  console.log("LOAD CSV WITH HEADERS FROM \"file:///"+prefixfile+"_nodes.csv\" AS line");
  console.log("MERGE(n:gene {label: line.name});\n");

  ///////////////////////// EDGES /////////////////////////
  var ee = Object.keys(myedgelist);
  var wpath = 0;

  edgestream.write("start,end,exp,weight,wpath,prob,link,ct\n");

  for (var j=0;j<ee.length;j++) {

      var eea = myedgelist[ee[j]];
      for (var i=0;i<eea.length;i++) {
        wpath = 1-eea[i].prob;
        createcommand = eea[i].from.toString().replace(/\"/g, '')+","+eea[i].to.toString().replace(/\"/g, '')+","+experiment+",";
        createcommand += eea[i].weight+","+wpath+","+eea[i].prob+",1,"+eea[i].ct;

        edgestream.write(createcommand+"\n");
      }

  }

  console.log("USING PERIODIC COMMIT 5000");
  console.log("LOAD CSV WITH HEADERS FROM \"file:///"+prefixfile+"_edges.csv\" AS csvLine");
  console.log("MATCH (s { label: csvLine.start}),(q { label: csvLine.end})");
  console.log("CREATE (s)-[:"+experiment+" {weight: toFloat(csvLine.weight), wpath: toFloat(csvLine.wpath), prob: toFloat(csvLine.prob), link: toInteger(csvLine.link), ct: csvLine.ct }]->(q);\n");

  console.log("Found "+edgenum+" edges (duplicated "+nulledge+") for "+ne.length+" genes starting from "+rootgene);
  rl.close();
});
