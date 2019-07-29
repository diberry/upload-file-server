// node: v0.10.7
// express: 3.4.4
var fs = require('fs');
const azure = require('azure-storage');
var express = require('express');
var bodyParser = require('body-parser');
var fileUpload = require('express-fileupload');

const compress = require('compression'),
    path = require("path"),
    cors = require('cors'),
    timeout = require('connect-timeout'),
    session = require('express-session')

const uploadTempDirectory = "../tmp";
const uploadDirectory = "../uploads";
const filesMultiformName = "uploadFile";
const secret = "1234$#@!";
const timeoutLimit = 900000;
const maxFileUploadSize = 50 * 1024 * 1024;
const useTempFile = true;
const port = 3000;

const app = express();

app.use(compress());
app.use(cors());
app.use(express.json());
app.use(timeout(timeoutLimit));
app.use(fileUpload({
    limits: { fileSize:  maxFileUploadSize},
    useTempFiles: useTempFile,
    tempFileDir: path.join(__dirname, uploadTempDirectory)
}));
app.use(session({secret: secret}))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

const getError = (req, res, next) => {
    next(new Error("This is an error and it should be logged to the console"));
}
app.use(function (err, req, res, next) {
    if (err.message == "Not Found" || err.statusCode == 404) {
        return res.status(404).send("file not found");
    } else if (err.name === 'UnauthorizedError') {
        // failed authentication on routes that require it
        res.status(401).send('invalid token : ' + err);

    } else {
        res.status(err.statusCode || 500).send(err);
    }
});


app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header('Access-Control-Allow-Headers', '*');
    if ('OPTIONS' == req.method) {
        res.sendStatus(200);
    } else {
        next();
    }
});



app.get('/', (req, res, next) => {
    res.send("hello world");
});

app.post('/uploads', async (req, res, next) => {

    try{

        if (req.files) {

            var name = req.files[filesMultiformName].name;
            var streamLength = req.files[filesMultiformName].size;

            var moveFileTo = path.join(__dirname, uploadDirectory, name);

            //move file - not with stream
            await req.files[filesMultiformName].mv(moveFileTo);

            
            const blobService = new azure.BlobService("");

            const containerOptions = {
                publicAccessLevel: 'blob'
            };

            const blobContainerName = "multer-server";
            const blobFileName = name;

            blobService.createContainerIfNotExists(blobContainerName,containerOptions, (error, result) => {

                if(error) throw error;

                //res.pipe(blobService.createWriteStreamToBlockBlob(blobContainerName, blobFileName, {}));
                res.json(result);
            });
            
           
        }
    }catch(err){
        next(err);
    }
});

app.listen(port, () => {
    console.log(`Server running on: ${port}`);
});