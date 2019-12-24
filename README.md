# x-mens
API de detección de mutantes Nivel 3, construida en NodeJS con locomotive.

Requisitos:

.- Tener instalada la versión 8.11.4 de NodeJS
.- BBDD local MySQL o remota.

Instrucciones de uso:

1.- Descargar repositorio. <br/>
2.- Ingresar a la carpeta e instalar los modulos de Node con el comando "npm install"<br/>
3.- Ingresar a carpeta "others", abrir y ejecutar script de base datos "create_table.sql" (crea tabla )
4.- Comprobar que las variables entorno (autenticación BBDD principalmente) sean las correctas (archivo .env).
5.- Desplegar usando un cliente heroku con el comando "heroku local" o creando las variables de entorno (se encuentran en el archivo .env) y luego levantar con "node server.js"<br/>
6.- En caso de no resultar, levantar usando Docker (Se adjunta Dockerfile para la creación de imagen). 

Pruebas:

1.- Usar un cliente API rest, recomendable Postman.<br/>
2.- Datos comprobación de ADN: <br/>
   .-URL: localhost:5000/api/mutant<br/>
   .-METODO: POST<br/>
   .- DATA BODY: {
      "dna": "["ATGCGA","CAGTGC","TTATGT","AGAAGG","CCCCTA","TCACTG"]"
   }<br/>
3.- Datos consulta de estado ADN: <br/>
   .-URL: localhost:5000/api/stats<br/>
   .-METODO: GET<br/>
4.- Imagen de prueba:<br/>
 
 <img src="/others/prueba_consulta.png" />
 <img src="/others/prueba_consulta_2.png" />
 <img src="/others/prueba_stats.png" />
