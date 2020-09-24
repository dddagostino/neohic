# neohic
NeoHIC is a web application for the progressive graph visualization of Hi-C data based on the use of the Neo4j graph database.

It is composed by two main entities: the three files for the analysis and visualization of Hi-C data (neohic.html, neohic-analysis.html and the library neovis-hic.js, representing the NeoHIC web application) and a Neo4j version 3.5.x instance. The NeoHIC web app can be exploited locally or installed on a http server. Also Neo4j can be installed locally for personal use. Otherwise it is necessary to specify the parameters to connect a remote serve in the two HTML files
<BR><BR>
   server_url: "bolt://IP_HERE:7687"<BR>
   server_user: "neo4j"<BR>
   server_password: "PWD_HERE"<BR>
<BR>
The neovis-hic.js is a modified version of the <A href="https://github.com/neo4j-contrib/neovis.js" target="_blank">neovis v 1.14 library</a>. It will be updated after its final release. <BR><BR>
  
The nuchart_dot2csv.js parses the output produced by <A href="https://hub.docker.com/r/imerelli/nuchart" target="_blank">nuchart</a> and it creates three CSV to be uploaded using the neo4j console.<BR><BR>
More details in the paper that will be presented at <a href="http://dinamico2.unibg.it/cazzaniga/cibb2019/call.html" target="_blank">CIBB 2019</A>
